import os

class Config:
    BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    DATA_DIR = os.environ.get('DATA_DIR', BASE_DIR)
    
    # Ensure DATA_DIR exists
    if not os.path.exists(DATA_DIR):
        try:
            os.makedirs(DATA_DIR, exist_ok=True)
            print(f"Created DATA_DIR: {DATA_DIR}")
        except Exception as e:
            print(f"Error creating DATA_DIR {DATA_DIR}: {e}")

    TEMP_DIR = os.path.join(DATA_DIR, 'temp_chunks')
    UPLOAD_DIR = os.path.join(DATA_DIR, 'uploads')
    
    # Ensure directories exist
    os.makedirs(TEMP_DIR, exist_ok=True)
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(DATA_DIR, 'dataview.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    MAX_CONTENT_LENGTH = 1024 * 1024 * 1024 * 5  # 5GB max upload
    SQLALCHEMY_ENGINE_OPTIONS = {
        'connect_args': {
            'check_same_thread': False
        },
        'pool_pre_ping': True
    }
