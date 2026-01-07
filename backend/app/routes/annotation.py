from flask import Blueprint, request, jsonify
from datetime import datetime
from ..models import Annotation
from ..extensions import db

bp = Blueprint('annotation', __name__, url_prefix='/api/annotations')

@bp.route('/<int:dataset_id>', methods=['GET'])
def get_annotations(dataset_id):
    anns = Annotation.query.filter_by(dataset_id=dataset_id).order_by(Annotation.start_time).all()
    return jsonify([a.to_dict() for a in anns])

@bp.route('', methods=['POST'])
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

@bp.route('/<int:ann_id>', methods=['PUT'])
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

@bp.route('/<int:ann_id>', methods=['DELETE'])
def delete_annotation(ann_id):
    ann = Annotation.query.get(ann_id)
    if not ann:
        return jsonify({'error': 'Annotation not found'}), 404
        
    db.session.delete(ann)
    db.session.commit()
    return jsonify({'status': 'success'})
