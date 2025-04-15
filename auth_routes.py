from flask import Blueprint, request, jsonify, session, redirect, url_for, render_template
from functools import wraps
import firebase_config as firebase
import json
import os
import logging
from datetime import datetime, timedelta
import jwt

# Configurar logger
logger = logging.getLogger(__name__)

# Criar blueprint para as rotas de autenticação
auth_bp = Blueprint('auth', __name__)

# Chave secreta para assinar os JWT locais (mantida para compatibilidade)
JWT_SECRET = os.environ.get('SESSION_SECRET', 'secret-key-for-development')
JWT_EXPIRATION = 3600  # 1 hora em segundos

# Credenciais do administrador
ADMIN_EMAIL = 'nsyzaesir@gmail.com'

# Funções auxiliares (mantidas para compatibilidade com código existente)
def generate_token(user_data):
    """Gera um token JWT com os dados do usuário (compatibilidade com código existente)"""
    payload = {
        'uid': user_data.get('uid'),
        'email': user_data.get('email'),
        'role': user_data.get('role', 'user'),
        'exp': datetime.utcnow() + timedelta(seconds=JWT_EXPIRATION)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm='HS256')
    return token

def verify_session_token(token):
    """Verifica se um token JWT de sessão é válido (compatibilidade com código existente)"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

# Decoradores (mantidos para compatibilidade com código existente)
def login_required(f):
    """Decorator para verificar se o usuário está autenticado"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # A verificação principal agora é feita pelo Firebase Auth no frontend
        logger.warning("Usando decorator login_required. A verificação principal agora é feita pelo Firebase Auth no frontend.")
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    """Decorator para verificar se o usuário é administrador"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # A verificação principal agora é feita pelo Firebase Auth no frontend
        logger.warning("Usando decorator admin_required. A verificação principal agora é feita pelo Firebase Auth no frontend.")
        return f(*args, **kwargs)
    return decorated_function

# Rotas de autenticação simplificadas
@auth_bp.route('/login', methods=['GET'])
def login():
    """Redireciona para a página de login principal"""
    return redirect(url_for('login'))

@auth_bp.route('/logout')
def logout():
    """Redireciona para a página de logout principal"""
    return redirect(url_for('logout'))

# APIs de autenticação simplificadas (mantidas para compatibilidade)
@auth_bp.route('/api/login', methods=['POST'])
def api_login():
    """Endpoint para login via API (compatibilidade com código existente)"""
    logger.warning("Usando API de login pelo backend. Prefira o Firebase Auth no frontend.")
    return jsonify({'success': False, 'error': 'Esta API foi descontinuada. Use Firebase Auth no frontend.'}), 400

@auth_bp.route('/api/register', methods=['POST'])
def api_register():
    """Endpoint para registro de usuário via API (compatibilidade com código existente)"""
    logger.warning("Usando API de registro pelo backend. Prefira o Firebase Auth no frontend.")
    return jsonify({'success': False, 'error': 'Esta API foi descontinuada. Use Firebase Auth no frontend.'}), 400

@auth_bp.route('/api/verify-token', methods=['POST'])
def api_verify_token():
    """Verifica se um token de sessão é válido (compatibilidade com código existente)"""
    logger.warning("Usando API de verificação de token pelo backend. Prefira o Firebase Auth no frontend.")
    return jsonify({'valid': False, 'error': 'Esta API foi descontinuada. Use Firebase Auth no frontend.'}), 401

@auth_bp.route('/api/refresh-token', methods=['POST'])
def api_refresh_token():
    """Renova um token de sessão expirado (compatibilidade com código existente)"""
    logger.warning("Usando API de refresh de token pelo backend. Prefira o Firebase Auth no frontend.")
    return jsonify({'success': False, 'error': 'Esta API foi descontinuada. Use Firebase Auth no frontend.'}), 400
        
# Rota para verificação de admin (compatibilidade com código existente)
@auth_bp.route('/api/check-admin', methods=['GET'])
def check_admin():
    """Verifica se o usuário atual é administrador"""
    logger.warning("Usando API de verificação de admin pelo backend. Prefira o Firebase Auth no frontend.")
    return jsonify({
        'isAdmin': False, 
        'error': 'Esta API foi descontinuada. Use Firebase Auth no frontend.',
        'message': 'Para verificar se o usuário é admin, compare o email com ' + ADMIN_EMAIL
    }), 400