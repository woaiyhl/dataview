import os
from app import app, db

def init_db():
    print("Initializing database...")
    try:
        # Ensure DATA_DIR exists
        data_dir = os.environ.get('DATA_DIR')
        if data_dir and not os.path.exists(data_dir):
            print(f"Creating DATA_DIR at {data_dir}")
            os.makedirs(data_dir, exist_ok=True)
            
        with app.app_context():
            db.create_all()
            print("Database tables created successfully.")
    except Exception as e:
        print(f"Error initializing database: {e}")
        exit(1)

if __name__ == "__main__":
    init_db()
