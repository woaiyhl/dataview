from flask import Blueprint, request, jsonify
from ..models import User
from ..extensions import db

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'Invalid JSON data'}), 400
            
        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            return jsonify({'error': '用户名和密码不能为空'}), 400

        if User.query.filter_by(username=username).first():
            return jsonify({'error': '用户名已存在'}), 400

        user = User(username=username)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        return jsonify({'id': user.id, 'username': user.username}), 201
    except Exception as e:
        db.session.rollback()
        print(f"Registration error: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/login', methods=['POST'])
def login():
    data = request.json
    if not data:
        return jsonify({'error': 'Invalid JSON data'}), 400
        
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()

    if user and user.check_password(password):
        return jsonify({'id': user.id, 'username': user.username}), 200
    
    return jsonify({'error': '用户名或密码错误'}), 401
