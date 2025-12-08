import os
import pandas as pd
import shutil
import threading
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Config
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
TEMP_DIR = os.path.join(BASE_DIR, 'temp_chunks')
UPLOAD_DIR = os.path.join(BASE_DIR, 'uploads')
os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(BASE_DIR, 'dataview.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['MAX_CONTENT_LENGTH'] = 1024 * 1024 * 1024 * 5  # 5GB max upload

db = SQLAlchemy(app)

# Models
class Dataset(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default='pending') # pending, processing, ready, failed
    
    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'created_at': self.created_at.isoformat(),
            'status': self.status
        }

class DataPoint(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    dataset_id = db.Column(db.Integer, db.ForeignKey('dataset.id'), nullable=False, index=True)
    timestamp = db.Column(db.DateTime, nullable=False, index=True)
    metric = db.Column(db.String(50), nullable=False)
    value = db.Column(db.Float, nullable=True)

# Helper: Parse CSV (Background Task)
def process_csv_task(file_path, dataset_id):
    with app.app_context():
        dataset = Dataset.query.get(dataset_id)
        if not dataset:
            return
        
        dataset.status = 'processing'
        db.session.commit()
        
        try:
            # Use chunksize to process large files
            chunk_size = 10000
            first_chunk = True
            
            # Pre-check columns to filter 'Unnamed' and strip whitespace
            # We read the header first
            header_df = pd.read_csv(file_path, nrows=0)
            # Filter rule: Only keep columns that are not empty and not 'Unnamed'
            usecols = [c for c in header_df.columns if c and not str(c).startswith('Unnamed:')]
            
            if not usecols:
                raise ValueError("No valid columns found in CSV")

            for df in pd.read_csv(file_path, chunksize=chunk_size, usecols=usecols):
                # Clean headers (strip whitespace) - though usecols handles reading, we might want to normalize names
                df.columns = df.columns.str.strip()
                
                # Heuristic for date column
                if first_chunk:
                    date_col = None
                    for col in df.columns:
                        if 'date' in col.lower() or 'time' in col.lower():
                            date_col = col
                            break
                    if not date_col:
                        date_col = df.columns[0]
                    first_chunk = False
                
                # Convert to datetime with error coercion
                df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
                df = df.dropna(subset=[date_col]) # Drop rows with invalid dates
                
                data_points = []
                value_cols = [c for c in df.columns if c != date_col]
                
                for _, row in df.iterrows():
                    ts = row[date_col]
                    for col in value_cols:
                        try:
                            val = float(row[col])
                            # Basic cleaning: ignore NaN/Inf if needed, or keep them
                            if pd.isna(val):
                                continue
                            data_points.append(DataPoint(
                                dataset_id=dataset_id,
                                timestamp=ts,
                                metric=col,
                                value=val
                            ))
                        except (ValueError, TypeError):
                            continue
                
                if data_points:
                    db.session.bulk_save_objects(data_points)
                    db.session.commit()
            
            dataset.status = 'ready'
            db.session.commit()
            
        except Exception as e:
            dataset.status = 'failed'
            db.session.commit()
            print(f"Error processing CSV: {e}")
        finally:
            # Cleanup file if needed, or keep it
            pass

# Routes
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

# Resumable Upload: Check Chunks
@app.route('/api/upload/check', methods=['GET'])
def check_chunks():
    upload_id = request.args.get('uploadId')
    if not upload_id:
        return jsonify({'error': 'Missing uploadId'}), 400
    
    chunk_dir = os.path.join(TEMP_DIR, upload_id)
    uploaded_chunks = []
    if os.path.exists(chunk_dir):
        try:
            uploaded_chunks = [int(f) for f in os.listdir(chunk_dir) if f.isdigit()]
        except:
            pass
            
    return jsonify({'uploadedChunks': uploaded_chunks})

# Resumable Upload: Upload Chunk
@app.route('/api/upload/chunk', methods=['POST'])
def upload_chunk():
    upload_id = request.form.get('uploadId')
    chunk_index = request.form.get('chunkIndex')
    file = request.files.get('file')
    
    if not upload_id or chunk_index is None or not file:
        return jsonify({'error': 'Missing parameters'}), 400
        
    chunk_dir = os.path.join(TEMP_DIR, upload_id)
    os.makedirs(chunk_dir, exist_ok=True)
    
    chunk_path = os.path.join(chunk_dir, str(chunk_index))
    file.save(chunk_path)
    
    return jsonify({'status': 'success'})

# Resumable Upload: Merge
@app.route('/api/upload/merge', methods=['POST'])
def merge_chunks():
    data = request.json
    upload_id = data.get('uploadId')
    filename = data.get('filename')
    
    if not upload_id or not filename:
        return jsonify({'error': 'Missing parameters'}), 400
        
    chunk_dir = os.path.join(TEMP_DIR, upload_id)
    if not os.path.exists(chunk_dir):
        return jsonify({'error': 'Chunks not found'}), 404
        
    # Create final file
    unique_filename = f"{upload_id}_{filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    try:
        with open(file_path, 'wb') as dest:
            # Iterate chunks in order
            chunks = sorted([int(f) for f in os.listdir(chunk_dir) if f.isdigit()])
            for i in chunks:
                chunk_path = os.path.join(chunk_dir, str(i))
                with open(chunk_path, 'rb') as source:
                    shutil.copyfileobj(source, dest)
                    
        # Clean up chunks
        shutil.rmtree(chunk_dir)
        
        # Create Dataset record
        dataset = Dataset(filename=filename, status='pending')
        db.session.add(dataset)
        db.session.commit()
        
        # Start background processing
        thread = threading.Thread(target=process_csv_task, args=(file_path, dataset.id))
        thread.start()
        
        return jsonify(dataset.to_dict())
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Legacy/Simple Upload (Redirect to background processing too for consistency)
@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file:
        # Save to file
        unique_filename = f"{datetime.now().timestamp()}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        file.save(file_path)
        
        # Create Dataset record
        dataset = Dataset(filename=file.filename, status='pending')
        db.session.add(dataset)
        db.session.commit()
        
        # Start background processing
        thread = threading.Thread(target=process_csv_task, args=(file_path, dataset.id))
        thread.start()
            
        return jsonify(dataset.to_dict()), 201

@app.route('/api/datasets', methods=['GET'])
def get_datasets():
    datasets = Dataset.query.order_by(Dataset.created_at.desc()).all()
    return jsonify([d.to_dict() for d in datasets])

@app.route('/api/data/<int:dataset_id>', methods=['GET'])
def get_data(dataset_id):
    # Time range filter
    start_str = request.args.get('start')
    end_str = request.args.get('end')
    target_metric = request.args.get('metric')
    
    query = DataPoint.query.filter_by(dataset_id=dataset_id)
    
    if target_metric:
        query = query.filter_by(metric=target_metric)
    
    if start_str:
        query = query.filter(DataPoint.timestamp >= datetime.fromisoformat(start_str))
    if end_str:
        query = query.filter(DataPoint.timestamp <= datetime.fromisoformat(end_str))
        
    # Sort by timestamp
    points = query.order_by(DataPoint.timestamp).all()
    
    # Python-side Downsampling for Large Datasets
    # If specific metric is requested, we can be more aggressive if needed, 
    # but let's stick to a reasonable limit (e.g. 5000 points) to keep UI responsive.
    limit = 5000
    if len(points) > limit:
        step = len(points) // limit
        if step > 1:
            points = points[::step]
    
    if target_metric:
        return jsonify([{'timestamp': p.timestamp.isoformat(), 'value': p.value} for p in points])

    # Format for ECharts: Series based on metric
    # Output: { categories: [t1, t2], series: [ {name: 'temp', data: [v1, v2]} ] }
    # To do this efficiently, we might need to pivot back or just aggregate in python
    
    data_map = {} # metric -> { timestamp -> value }
    all_timestamps = set()
    
    for p in points:
        ts_str = p.timestamp.isoformat()
        all_timestamps.add(ts_str)
        if p.metric not in data_map:
            data_map[p.metric] = {}
        data_map[p.metric][ts_str] = p.value
        
    sorted_timestamps = sorted(list(all_timestamps))
    
    series_list = []
    for metric, values in data_map.items():
        series_data = []
        for ts in sorted_timestamps:
            series_data.append(values.get(ts, None)) # Handle missing data
        series_list.append({
            'name': metric,
            'type': 'line',
            'data': series_data
        })
        
    return jsonify({
        'timestamps': sorted_timestamps,
        'series': series_list
    })

@app.route('/api/stats/<int:dataset_id>', methods=['GET'])
def get_stats(dataset_id):
    # Use SQL for aggregation
    from sqlalchemy import func
    stats = db.session.query(
        DataPoint.metric,
        func.min(DataPoint.value).label('min'),
        func.max(DataPoint.value).label('max'),
        func.avg(DataPoint.value).label('avg'),
        func.count(DataPoint.value).label('count')
    ).filter_by(dataset_id=dataset_id).group_by(DataPoint.metric).all()
    
    result = []
    for s in stats:
        result.append({
            'metric': s.metric,
            'min': s.min,
            'max': s.max,
            'avg': round(s.avg, 2),
            'count': s.count
        })
    return jsonify(result)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5001)