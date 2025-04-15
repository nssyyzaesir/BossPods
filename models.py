from app import db
from datetime import datetime
from sqlalchemy import String, Text, Integer, Float, DateTime, JSON

class DataTool(db.Model):
    """Data analysis tool model"""
    __tablename__ = 'data_tools'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    type = db.Column(db.String(50), nullable=False)
    popularity = db.Column(db.Integer, default=0)
    datasets = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'type': self.type,
            'popularity': self.popularity,
            'datasets': self.datasets,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Insight(db.Model):
    """Data insight model"""
    __tablename__ = 'insights'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    data_source = db.Column(db.String(100), nullable=True)
    tags = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'data_source': self.data_source,
            'tags': self.tags,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class ActivityLog(db.Model):
    """Activity log model for tracking changes"""
    __tablename__ = 'activity_logs'

    id = db.Column(db.Integer, primary_key=True)
    action = db.Column(db.String(50), nullable=False)  # create, update, delete
    entity_type = db.Column(db.String(50), nullable=False)  # tool, insight
    entity_id = db.Column(db.Integer, nullable=False)
    entity_name = db.Column(db.String(100), nullable=True)
    user = db.Column(db.String(100), nullable=True)
    details = db.Column(db.JSON, nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'action': self.action,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'entity_name': self.entity_name,
            'user': self.user,
            'details': self.details,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }