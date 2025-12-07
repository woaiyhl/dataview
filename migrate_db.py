import sqlite3
import os

# Define database path
db_path = os.path.join(os.path.dirname(__file__), 'backend/dataview.db')

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

print(f"Migrating database at {db_path}...")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check if column exists
cursor.execute("PRAGMA table_info(dataset)")
columns = [info[1] for info in cursor.fetchall()]

if 'status' not in columns:
    print("Adding 'status' column to 'dataset' table...")
    try:
        cursor.execute("ALTER TABLE dataset ADD COLUMN status VARCHAR(20) DEFAULT 'ready'")
        conn.commit()
        print("Migration successful: Added 'status' column.")
    except Exception as e:
        print(f"Migration failed: {e}")
else:
    print("'status' column already exists.")

conn.close()
