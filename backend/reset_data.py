import os
import shutil
from app import app, db, Dataset, DataPoint, UPLOAD_DIR, TEMP_DIR

def reset_data():
    print("Starting data reset...")
    
    with app.app_context():
        # 1. Clear Database
        try:
            num_points = DataPoint.query.delete()
            num_datasets = Dataset.query.delete()
            db.session.commit()
            print(f"Database cleared: {num_datasets} datasets, {num_points} data points removed.")
        except Exception as e:
            print(f"Error clearing database: {e}")
            db.session.rollback()

    # 2. Clear Upload Directory
    if os.path.exists(UPLOAD_DIR):
        for filename in os.listdir(UPLOAD_DIR):
            file_path = os.path.join(UPLOAD_DIR, filename)
            try:
                if os.path.isfile(file_path) or os.path.islink(file_path):
                    os.unlink(file_path)
                elif os.path.isdir(file_path):
                    shutil.rmtree(file_path)
            except Exception as e:
                print(f"Failed to delete {file_path}. Reason: {e}")
        print(f"Upload directory cleaned: {UPLOAD_DIR}")

    # 3. Clear Temp Directory
    if os.path.exists(TEMP_DIR):
        for filename in os.listdir(TEMP_DIR):
            file_path = os.path.join(TEMP_DIR, filename)
            try:
                if os.path.isfile(file_path) or os.path.islink(file_path):
                    os.unlink(file_path)
                elif os.path.isdir(file_path):
                    shutil.rmtree(file_path)
            except Exception as e:
                print(f"Failed to delete {file_path}. Reason: {e}")
        print(f"Temp directory cleaned: {TEMP_DIR}")

    print("Data reset complete.")

if __name__ == "__main__":
    reset_data()
