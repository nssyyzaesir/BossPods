from flask import Flask, render_template, redirect, url_for, request, jsonify, session
import os
import logging
from auth_routes import auth_bp

# Configurar logging
logging.basicConfig(level=logging.DEBUG)

# Criar a aplicação Flask
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev_secret_key")

# Registrar o blueprint de autenticação
app.register_blueprint(auth_bp, url_prefix='/auth')

# Rota principal - redireciona para a loja
@app.route('/')
def index():
    """Redirect to store page"""
    return redirect(url_for('loja'))

# Rota para a loja
@app.route('/loja')
def loja():
    """Render the public store"""
    return render_template('loja.html')

# Rota para o painel admin
@app.route('/admin')
def admin():
    """Render the admin interface - protegido por autenticação"""
    return render_template('admin.html')

# Rota para o carrinho
@app.route('/carrinho')
def carrinho():
    """Render the shopping cart"""
    return render_template('carrinho.html')

# Rota para a página de login
@app.route('/login')
def login():
    """Render the login page"""
    return render_template('login.html')

# Inicializar a aplicação
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)