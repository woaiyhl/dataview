from flask import Blueprint, request, jsonify, Response
from sqlalchemy import func
from datetime import datetime
import io
import csv
from ..models import Dataset, DataPoint, Annotation
from ..extensions import db

bp = Blueprint('dataset', __name__, url_prefix='/api')

@bp.route('/datasets', methods=['GET'])
def get_datasets():
    try:
        datasets = Dataset.query.order_by(Dataset.created_at.desc()).all()
        return jsonify([d.to_dict() for d in datasets])
    except Exception as e:
        print(f"Error getting datasets: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@bp.route('/datasets/<int:dataset_id>', methods=['DELETE'])
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

@bp.route('/data/<int:dataset_id>', methods=['GET'])
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

@bp.route('/stats/<int:dataset_id>', methods=['GET'])
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

@bp.route('/download/<int:dataset_id>', methods=['GET'])
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
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['timestamp', 'metric', 'value'])
    
    for p in points:
        writer.writerow([p.timestamp.isoformat(), p.metric, p.value])
        
    output.seek(0)
    
    return Response(
        output,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=data.csv"}
    )
