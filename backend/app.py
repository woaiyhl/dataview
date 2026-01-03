import os
import pandas as pd
import shutil
import threading
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy import event
from sqlalchemy.engine import Engine

app = Flask(__name__)
CORS(app)

# Config
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATA_DIR = os.environ.get('DATA_DIR', BASE_DIR)
TEMP_DIR = os.path.join(DATA_DIR, 'temp_chunks')
UPLOAD_DIR = os.path.join(DATA_DIR, 'uploads')
os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(DATA_DIR, 'dataview.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['MAX_CONTENT_LENGTH'] = 1024 * 1024 * 1024 * 5  # 5GB max upload
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'connect_args': {
        'check_same_thread': False
    },
    'pool_pre_ping': True
}

db = SQLAlchemy(app)

@event.listens_for(Engine, 'connect')
def _set_sqlite_pragmas(dbapi_connection, connection_record):
    try:
        cursor = dbapi_connection.cursor()
        cursor.execute('PRAGMA journal_mode=WAL')
        cursor.execute('PRAGMA synchronous=NORMAL')
        cursor.execute('PRAGMA busy_timeout=30000')
        cursor.close()
    except Exception:
        pass

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

class Annotation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    dataset_id = db.Column(db.Integer, db.ForeignKey('dataset.id'), nullable=False, index=True)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)
    content = db.Column(db.String(500), nullable=True)
    status = db.Column(db.String(50), default='info')
    color = db.Column(db.String(20), default='#1890ff')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'dataset_id': self.dataset_id,
            'start_time': self.start_time.isoformat(),
            'end_time': self.end_time.isoformat(),
            'content': self.content,
            'status': self.status,
            'color': self.color,
            'created_at': self.created_at.isoformat()
        }

# Helper: Parse CSV (Background Task)
def process_csv_task(file_path, dataset_id):
    with app.app_context():
        dataset = Dataset.query.get(dataset_id)
        if not dataset:
            return
        
        try:
            dataset.status = 'processing'
            db.session.commit()
        except Exception:
            db.session.rollback()
            return
        
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
            try:
                dataset.status = 'failed'
                db.session.commit()
            except Exception:
                db.session.rollback()
            print(f"Error processing CSV: {e}")
        finally:
            db.session.remove()

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
        except Exception as e:
            print(f"Error checking chunks for {upload_id}: {e}")
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
    # unique_filename = f"{upload_id}_{filename}"
    
    # Generate a safe unique filename to avoid "File name too long" errors
    name, ext = os.path.splitext(filename)
    if len(name) > 50:
        name = name[:50]
        
    unique_filename = f"{int(datetime.now().timestamp())}_{name}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    try:
        with open(file_path, 'wb') as dest:
            # Iterate chunks in order
            chunks = sorted([int(f) for f in os.listdir(chunk_dir) if f.isdigit()])
            for i in chunks:
                chunk_path = os.path.join(chunk_dir, str(i))
                with open(chunk_path, 'rb') as source:
                    shutil.copyfileobj(source, dest, 10 * 1024 * 1024) # 10MB buffer
                    
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

@app.route('/api/datasets/<int:dataset_id>', methods=['DELETE'])
def delete_dataset(dataset_id):
    dataset = Dataset.query.get(dataset_id)
    if not dataset:
        return jsonify({'error': 'Dataset not found'}), 404
    
    try:
        # Delete associated data points
        DataPoint.query.filter_by(dataset_id=dataset_id).delete()
        
        # Delete associated annotations
        Annotation.query.filter_by(dataset_id=dataset_id).delete()
        
        # Delete dataset record
        db.session.delete(dataset)
        db.session.commit()
        
        return jsonify({'status': 'success'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

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
        query = query.filter(DataPoint.timestamp >= datetime.fromisoformat(start_str.replace('Z', '+00:00')))
    if end_str:
        query = query.filter(DataPoint.timestamp <= datetime.fromisoformat(end_str.replace('Z', '+00:00')))
        
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
    import math
    
    def safe_float(val):
        if val is None:
            return 0
        try:
            f = float(val)
            if math.isnan(f) or math.isinf(f):
                return 0
            return f
        except (ValueError, TypeError):
            return 0

    try:
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
            metric_name = s.metric if s.metric is not None else "Unknown"
            min_val = safe_float(s.min)
            max_val = safe_float(s.max)
            avg_val = safe_float(s.avg)
            
            result.append({
                'metric': metric_name,
                'min': min_val,
                'max': max_val,
                'avg': round(avg_val, 2),
                'count': s.count
            })
        return jsonify(result)
    except Exception as e:
        print(f"Error in get_stats: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# Annotation Routes
@app.route('/api/annotations/<int:dataset_id>', methods=['GET'])
def get_annotations(dataset_id):
    anns = Annotation.query.filter_by(dataset_id=dataset_id).order_by(Annotation.start_time).all()
    return jsonify([a.to_dict() for a in anns])

@app.route('/api/annotations', methods=['POST'])
def create_annotation():
    data = request.json
    try:
        ann = Annotation(
            dataset_id=data['dataset_id'],
            start_time=datetime.fromisoformat(data['start_time'].replace('Z', '+00:00')),
            end_time=datetime.fromisoformat(data['end_time'].replace('Z', '+00:00')),
            content=data.get('content', ''),
            status=data.get('status', 'info'),
            color=data.get('color', '#1890ff')
        )
        db.session.add(ann)
        db.session.commit()
        return jsonify(ann.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/annotations/<int:ann_id>', methods=['PUT'])
def update_annotation(ann_id):
    ann = Annotation.query.get(ann_id)
    if not ann:
        return jsonify({'error': 'Annotation not found'}), 404
        
    data = request.json
    if 'content' in data:
        ann.content = data['content']
    if 'status' in data:
        ann.status = data['status']
    if 'color' in data:
        ann.color = data['color']
        
    db.session.commit()
    return jsonify(ann.to_dict())

@app.route('/api/annotations/<int:ann_id>', methods=['DELETE'])
def delete_annotation(ann_id):
    ann = Annotation.query.get(ann_id)
    if not ann:
        return jsonify({'error': 'Annotation not found'}), 404
        
    db.session.delete(ann)
    db.session.commit()
    return jsonify({'status': 'success'})

@app.route('/api/download/<int:dataset_id>', methods=['GET'])
def download_data(dataset_id):
    start_str = request.args.get('start')
    end_str = request.args.get('end')
    target_metric = request.args.get('metric')

    query = DataPoint.query.filter_by(dataset_id=dataset_id)
    if target_metric:
        query = query.filter_by(metric=target_metric)
    if start_str:
        query = query.filter(DataPoint.timestamp >= datetime.fromisoformat(start_str.replace('Z', '+00:00')))
    if end_str:
        query = query.filter(DataPoint.timestamp <= datetime.fromisoformat(end_str.replace('Z', '+00:00')))
    
    points = query.order_by(DataPoint.timestamp).all()
    
    # Generate CSV in memory
    import io
    import csv
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['timestamp', 'metric', 'value'])
    
    for p in points:
        writer.writerow([p.timestamp.isoformat(), p.metric, p.value])
        
    output.seek(0)
    
    from flask import Response
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-disposition": f"attachment; filename=data_{dataset_id}.csv"}
    )

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5001)
