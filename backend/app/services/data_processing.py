import pandas as pd
from ..extensions import db
from ..models import Dataset, DataPoint

def process_csv_task(app, file_path, dataset_id):
    """
    Background task to process CSV file and save data points.
    Args:
        app: Flask application instance
        file_path: Path to the CSV file
        dataset_id: ID of the dataset
    """
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
