import os
import shutil
import threading
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from ..models import Dataset
from ..extensions import db
from ..services.data_processing import process_csv_task

bp = Blueprint('upload', __name__, url_prefix='/api/upload')

@bp.route('/check', methods=['GET'])
def check_chunks():
    upload_id = request.args.get('uploadId')
    if not upload_id:
        return jsonify({'error': 'Missing uploadId'}), 400
    
    temp_dir = current_app.config['TEMP_DIR']
    chunk_dir = os.path.join(temp_dir, upload_id)
    uploaded_chunks = []
    if os.path.exists(chunk_dir):
        try:
            uploaded_chunks = [int(f) for f in os.listdir(chunk_dir) if f.isdigit()]
        except Exception as e:
            print(f"Error checking chunks for {upload_id}: {e}")
            pass
            
    return jsonify({'uploadedChunks': uploaded_chunks})

@bp.route('/chunk', methods=['POST'])
def upload_chunk():
    upload_id = request.form.get('uploadId')
    chunk_index = request.form.get('chunkIndex')
    file = request.files.get('file')
    
    if not upload_id or chunk_index is None or not file:
        return jsonify({'error': 'Missing parameters'}), 400
        
    temp_dir = current_app.config['TEMP_DIR']
    chunk_dir = os.path.join(temp_dir, upload_id)
    os.makedirs(chunk_dir, exist_ok=True)
    
    chunk_path = os.path.join(chunk_dir, str(chunk_index))
    file.save(chunk_path)
    
    return jsonify({'status': 'success'})

@bp.route('/merge', methods=['POST', 'GET'])
def merge_chunks():
    if request.method == 'GET':
        return jsonify({'message': 'This endpoint expects POST requests. Please use the application interface to upload files.'}), 405
        
    data = request.json
    upload_id = data.get('uploadId')
    filename = data.get('filename')
    
    if not upload_id or not filename:
        return jsonify({'error': 'Missing parameters'}), 400
        
    temp_dir = current_app.config['TEMP_DIR']
    chunk_dir = os.path.join(temp_dir, upload_id)
    if not os.path.exists(chunk_dir):
        return jsonify({'error': 'Chunks not found'}), 404
        
    # Generate a safe unique filename to avoid "File name too long" errors
    name, ext = os.path.splitext(filename)
    if len(name) > 50:
        name = name[:50]
        
    unique_filename = f"{int(datetime.now().timestamp())}_{name}{ext}"
    upload_dir = current_app.config['UPLOAD_DIR']
    file_path = os.path.join(upload_dir, unique_filename)
    
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
        # Pass the actual app object to the thread
        app = current_app._get_current_object()
        thread = threading.Thread(target=process_csv_task, args=(app, file_path, dataset.id))
        thread.start()
        
        return jsonify(dataset.to_dict())
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Legacy/Simple Upload (Redirect to background processing too for consistency)
@bp.route('', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file:
        # Save to file
        unique_filename = f"{datetime.now().timestamp()}_{file.filename}"
        upload_dir = current_app.config['UPLOAD_DIR']
        file_path = os.path.join(upload_dir, unique_filename)
        file.save(file_path)
        
        # Create Dataset record
        dataset = Dataset(filename=file.filename, status='pending')
        db.session.add(dataset)
        db.session.commit()
        
        # Start background processing
        app = current_app._get_current_object()
        thread = threading.Thread(target=process_csv_task, args=(app, file_path, dataset.id))
        thread.start()
            
        return jsonify(dataset.to_dict()), 201
