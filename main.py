from flask import Flask, render_template, redirect, url_for, request, jsonify, session
import os
import logging
from auth_routes import auth_bp

# Configurar logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Criar a aplicação Flask
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev_secret_key")

# Registrar o blueprint de autenticação
app.register_blueprint(auth_bp, url_prefix='/auth')

# Rota principal - redireciona para a página inicial
@app.route('/')
def index():
    """Redirect to index page"""
    return render_template('index.html')

# Rota para a loja (pública)
@app.route('/loja')
def loja():
    """Render the public store"""
    logger.debug("Acessando loja pública")
    return render_template('loja.html')

# Rota para o painel admin (protegida por JavaScript)
@app.route('/admin')
def admin():
    """Render the admin interface - proteção feita pelo Firebase Auth no frontend"""
    logger.debug("Acessando painel administrativo")
    return render_template('admin.html')

# Rota para o carrinho 
@app.route('/carrinho')
def carrinho():
    """Render the shopping cart page"""
    logger.debug("Acessando carrinho de compras")
    return render_template('carrinho.html')

# Rota para a página de login
@app.route('/login')
def login():
    """Render the login page"""
    logger.debug("Acessando página de login")
    return render_template('login.html')

# Rota para logout (redireciona para login)
@app.route('/logout')
def logout():
    """Logout and redirect to login page"""
    logger.debug("Realizando logout")
    return redirect(url_for('login'))

# Inicializar a aplicação
if __name__ == '__main__':
    logger.info("Iniciando aplicação Flask na porta 5000")
    app.run(host='0.0.0.0', port=5000, debug=True)