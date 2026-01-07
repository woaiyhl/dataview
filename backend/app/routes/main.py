from flask import Blueprint, jsonify

bp = Blueprint('main', __name__, url_prefix='/api')

@bp.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})
