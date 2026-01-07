from flask import Flask
from .config import Config
from .extensions import db, cors

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    cors.init_app(app)

    # Register Blueprints
    from .routes.main import bp as main_bp
    from .routes.auth import bp as auth_bp
    from .routes.upload import bp as upload_bp
    from .routes.dataset import bp as dataset_bp
    from .routes.annotation import bp as annotation_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(upload_bp)
    app.register_blueprint(dataset_bp)
    app.register_blueprint(annotation_bp)

    # Create database tables
    # Import models to ensure they are registered with SQLAlchemy
    from . import models 
    
    with app.app_context():
        db.create_all()

    return app
