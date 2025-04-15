from flask import Flask, render_template, send_from_directory, jsonify
import os

app = Flask(__name__)

@app.route('/')
def index():
    """Render the main admin interface"""
    return render_template('index.html')

@app.route('/static/<path:path>')
def serve_static(path):
    """Serve static files"""
    return send_from_directory('static', path)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)