from flask import Blueprint, request, jsonify, session, redirect, url_for, render_template
from functools import wraps
import firebase_config as firebase
import json
import os
from datetime import datetime, timedelta
import jwt

# Criar blueprint para as rotas de autenticação
auth_bp = Blueprint('auth', __name__)

# Chave secreta para assinar os JWT locais
JWT_SECRET = os.environ.get('SESSION_SECRET', 'secret-key-for-development')
JWT_EXPIRATION = 3600  # 1 hora em segundos

# Funções auxiliares para autenticação
def generate_token(user_data):
    """Gera um token JWT com os dados do usuário"""
    payload = {
        'uid': user_data.get('uid'),
        'email': user_data.get('email'),
        'role': user_data.get('role', 'user'),
        'exp': datetime.utcnow() + timedelta(seconds=JWT_EXPIRATION)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm='HS256')
    return token

def verify_session_token(token):
    """Verifica se um token JWT de sessão é válido"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def login_required(f):
    """Decorator para verificar se o usuário está autenticado"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = session.get('token')
        
        if not token:
            return redirect(url_for('auth.login'))
        
        user_data = verify_session_token(token)
        if not user_data:
            # Token expirou ou é inválido
            session.pop('token', None)
            return redirect(url_for('auth.login'))
        
        # Adiciona dados do usuário à request
        request.user = user_data
        return f(*args, **kwargs)
    
    return decorated_function

def admin_required(f):
    """Decorator para verificar se o usuário é administrador"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = session.get('token')
        
        if not token:
            return redirect(url_for('auth.login'))
        
        user_data = verify_session_token(token)
        if not user_data:
            session.pop('token', None)
            return redirect(url_for('auth.login'))
        
        # Verificar role do usuário
        if user_data.get('role') not in ['admin', 'root']:
            return jsonify({'error': 'Acesso negado. Permissões insuficientes.'}), 403
        
        request.user = user_data
        return f(*args, **kwargs)
    
    return decorated_function

# Rotas de autenticação
@auth_bp.route('/login', methods=['GET'])
def login():
    """Renderiza a página de login"""
    # Se o usuário já estiver logado, redirecionar para o dashboard
    token = session.get('token')
    if token and verify_session_token(token):
        return redirect(url_for('admin'))
    
    return render_template('login.html')

@auth_bp.route('/logout')
def logout():
    """Realiza logout do usuário"""
    session.pop('token', None)
    return redirect(url_for('auth.login'))

# API de autenticação
@auth_bp.route('/api/login', methods=['POST'])
def api_login():
    """Endpoint para login via API"""
    data = request.json
    
    if not data or 'email' not in data or 'password' not in data:
        return jsonify({'success': False, 'error': 'Email e senha são obrigatórios'}), 400
    
    # Tentar fazer login local
    result = firebase.login_user(data['email'], data['password'])
    
    if result['success']:
        # Criar dados do usuário
        user_data = {
            'uid': result['uid'],
            'email': data['email'],
            'role': result['role']
        }
        
        # Gerar token de sessão local
        token = generate_token(user_data)
        
        # Armazenar token na sessão
        session['token'] = token
        
        return jsonify({'success': True, 'role': result['role']})
    else:
        return jsonify({'success': False, 'error': 'Email ou senha incorretos'}), 401

@auth_bp.route('/api/register', methods=['POST'])
def api_register():
    """Endpoint para registro de usuário via API"""
    data = request.json
    
    if not data or 'email' not in data or 'password' not in data or 'name' not in data:
        return jsonify({'success': False, 'error': 'Dados insuficientes para registro'}), 400
    
    # Criar usuário local
    result = firebase.create_user(
        email=data['email'],
        password=data['password'],
        display_name=data['name'],
        role=data.get('role', 'user')  # Default para 'user'
    )
    
    if result['success']:
        return jsonify({'success': True, 'uid': result['uid']})
    else:
        return jsonify({'success': False, 'error': result.get('error', 'Erro ao criar usuário')}), 400

@auth_bp.route('/api/verify-token', methods=['POST'])
def api_verify_token():
    """Verifica se um token de sessão é válido"""
    # Verificar o token da sessão atual
    token = session.get('token')
    
    if not token:
        return jsonify({'valid': False, 'error': 'Não há sessão ativa'}), 401
    
    user_data = verify_session_token(token)
    if user_data:
        return jsonify({'valid': True, 'user': user_data})
    else:
        # Token expirou ou é inválido
        session.pop('token', None)
        return jsonify({'valid': False, 'error': 'Token inválido ou expirado'}), 401

@auth_bp.route('/api/refresh-token', methods=['POST'])
def api_refresh_token():
    """Renova um token de sessão expirado (versão local)"""
    try:
        # Obter token atual da sessão
        token = session.get('token')
        if not token:
            return jsonify({'success': False, 'error': 'Não há sessão ativa'}), 401
        
        # Tentar decodificar para obter dados do usuário (mesmo que expirado)
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'], options={"verify_exp": False})
        except:
            return jsonify({'success': False, 'error': 'Token inválido'}), 401
        
        # Gerar novo token com os mesmos dados
        new_token = generate_token(payload)
        session['token'] = new_token
        
        return jsonify({'success': True, 'token': new_token})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400
        
# Rotas para proteção de APIs administrativas
@auth_bp.route('/api/check-admin', methods=['GET'])
def check_admin():
    """Verifica se o usuário atual é administrador"""
    token = session.get('token')
    
    if not token:
        return jsonify({'isAdmin': False, 'error': 'Não há sessão ativa'}), 401
    
    user_data = verify_session_token(token)
    if not user_data:
        # Token expirou ou é inválido
        session.pop('token', None)
        return jsonify({'isAdmin': False, 'error': 'Sessão expirada'}), 401
    
    # Verificar role do usuário
    is_admin = user_data.get('role') in ['admin', 'root']
    
    return jsonify({
        'isAdmin': is_admin, 
        'user': {
            'email': user_data.get('email'),
            'role': user_data.get('role')
        }
    })