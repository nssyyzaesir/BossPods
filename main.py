from flask import render_template, request, jsonify, session, redirect, url_for
import os
import logging
import json
from datetime import datetime
from app import app, db
from models import DataTool, Insight, ActivityLog

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Initialize database tables
with app.app_context():
    db.create_all()
    
    # Add sample data if database is empty
    if not DataTool.query.first():
        sample_tools = [
            DataTool(
                name="Statistical Analysis Tool",
                description="Analyze numerical data for patterns and insights",
                type="Analysis",
                popularity=85,
                datasets=["financial", "scientific", "marketing"]
            ),
            DataTool(
                name="Data Visualization Dashboard",
                description="Interactive charts and graphs for data visualization",
                type="Visualization",
                popularity=92,
                datasets=["sales", "user metrics", "performance"]
            ),
            DataTool(
                name="Predictive Modeling Engine",
                description="Machine learning models for future predictions",
                type="Prediction",
                popularity=78,
                datasets=["time-series", "customer behavior", "market trends"]
            )
        ]
        for tool in sample_tools:
            db.session.add(tool)
        db.session.commit()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/tools', methods=['GET'])
def get_tools():
    """Return all data tools"""
    tools = DataTool.query.all()
    return jsonify([tool.to_dict() for tool in tools])

@app.route('/api/tools', methods=['POST'])
def add_tool():
    """Add a new data tool"""
    data = request.json
    if not data or 'name' not in data:
        return jsonify({"error": "Invalid tool data"}), 400
    
    # Create new tool
    new_tool = DataTool(
        name=data['name'],
        description=data.get('description', ''),
        type=data.get('type', 'Unknown'),
        popularity=data.get('popularity', 0),
        datasets=data.get('datasets', [])
    )
    
    # Save to database
    db.session.add(new_tool)
    db.session.commit()
    
    # Log the action
    log = ActivityLog(
        action="create",
        entity_type="tool",
        entity_id=new_tool.id,
        entity_name=new_tool.name,
        user=session.get('user', 'anonymous')
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify(new_tool.to_dict()), 201

@app.route('/api/tools/<int:tool_id>', methods=['GET'])
def get_tool(tool_id):
    """Get a specific tool by ID"""
    tool = DataTool.query.get(tool_id)
    if not tool:
        return jsonify({"error": f"Tool with ID {tool_id} not found"}), 404
    return jsonify(tool.to_dict())

@app.route('/api/tools/<int:tool_id>', methods=['PUT'])
def update_tool(tool_id):
    """Update a tool by ID"""
    tool = DataTool.query.get(tool_id)
    if not tool:
        return jsonify({"error": f"Tool with ID {tool_id} not found"}), 404
    
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    # Track changes for logging
    changes = {}
    
    # Update fields if provided
    if 'name' in data and data['name'] != tool.name:
        changes['name'] = {'old': tool.name, 'new': data['name']}
        tool.name = data['name']
        
    if 'description' in data and data['description'] != tool.description:
        changes['description'] = {'old': tool.description, 'new': data['description']}
        tool.description = data['description']
        
    if 'type' in data and data['type'] != tool.type:
        changes['type'] = {'old': tool.type, 'new': data['type']}
        tool.type = data['type']
        
    if 'popularity' in data and data['popularity'] != tool.popularity:
        changes['popularity'] = {'old': tool.popularity, 'new': data['popularity']}
        tool.popularity = data['popularity']
        
    if 'datasets' in data and data['datasets'] != tool.datasets:
        changes['datasets'] = {'old': tool.datasets, 'new': data['datasets']}
        tool.datasets = data['datasets']
    
    # Only update if there were changes
    if changes:
        # Update timestamp automatically via onupdate
        db.session.commit()
        
        # Log the action with details
        log = ActivityLog(
            action="update",
            entity_type="tool",
            entity_id=tool.id,
            entity_name=tool.name,
            user=session.get('user', 'anonymous'),
            details=changes
        )
        db.session.add(log)
        db.session.commit()
    
    return jsonify(tool.to_dict())

@app.route('/api/tools/<int:tool_id>', methods=['DELETE'])
def delete_tool(tool_id):
    """Delete a tool by ID"""
    tool = DataTool.query.get(tool_id)
    if not tool:
        return jsonify({"error": f"Tool with ID {tool_id} not found"}), 404
    
    # Store info before deletion for log
    tool_name = tool.name
    
    # Delete the tool
    db.session.delete(tool)
    db.session.commit()
    
    # Log the action
    log = ActivityLog(
        action="delete",
        entity_type="tool",
        entity_id=tool_id,
        entity_name=tool_name,
        user=session.get('user', 'anonymous')
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify({"message": f"Tool {tool_id} deleted successfully"})

@app.route('/api/insights', methods=['GET'])
def get_insights():
    """Return all insights"""
    insights = Insight.query.all()
    return jsonify([insight.to_dict() for insight in insights])

@app.route('/api/insights', methods=['POST'])
def add_insight():
    """Add a new insight"""
    data = request.json
    if not data or 'description' not in data or 'title' not in data:
        return jsonify({"error": "Invalid insight data"}), 400
    
    new_insight = Insight(
        title=data['title'],
        description=data['description'],
        data_source=data.get('data_source', ''),
        tags=data.get('tags', [])
    )
    
    db.session.add(new_insight)
    db.session.commit()
    
    # Log the action
    log = ActivityLog(
        action="create",
        entity_type="insight",
        entity_id=new_insight.id,
        entity_name=new_insight.title,
        user=session.get('user', 'anonymous')
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify(new_insight.to_dict()), 201

@app.route('/api/logs', methods=['GET'])
def get_logs():
    """Return activity logs"""
    logs = ActivityLog.query.order_by(ActivityLog.timestamp.desc()).limit(100).all()
    return jsonify([log.to_dict() for log in logs])

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Return statistics about the data"""
    # Count tools
    total_tools = DataTool.query.count()
    total_insights = Insight.query.count()
    
    # Get tools by type
    tools_by_type = {}
    type_counts = db.session.query(
        DataTool.type, 
        db.func.count(DataTool.id)
    ).group_by(DataTool.type).all()
    
    for type_name, count in type_counts:
        tools_by_type[type_name] = count
    
    # Calculate average popularity
    avg_popularity = 0
    if total_tools > 0:
        avg_result = db.session.query(db.func.avg(DataTool.popularity)).scalar()
        avg_popularity = round(float(avg_result or 0), 2)
    
    stats = {
        "total_tools": total_tools,
        "total_insights": total_insights,
        "tools_by_type": tools_by_type,
        "average_popularity": avg_popularity
    }
    
    return jsonify(stats)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)