import os
import json
import datetime

# Modo de desenvolvimento local, sem Firebase
print("Inicializando em modo de desenvolvimento local (sem Firebase)")

# Armazenamento local simulado
local_users = {
    'admin1@gmail.com': {
        'uid': 'admin123',
        'password': 'admin123',
        'displayName': 'Administrador 1',
        'role': 'admin',
        'createdAt': datetime.datetime.now().isoformat(),
        'lastLogin': None
    },
    'admin2@gmail.com': {
        'uid': 'admin456',
        'password': 'admin456',
        'displayName': 'Administrador 2',
        'role': 'admin',
        'createdAt': datetime.datetime.now().isoformat(),
        'lastLogin': None
    },
    'user@bosspods.com': {
        'uid': 'user123',
        'password': 'user123',
        'displayName': 'Usuário Teste',
        'role': 'user',
        'createdAt': datetime.datetime.now().isoformat(),
        'lastLogin': None
    }
}

db = None  # Simulação de banco de dados

# Funções auxiliares para autenticação (versão local)
def create_user(email, password, display_name=None, role='user'):
    """Cria um novo usuário no modo de desenvolvimento local"""
    try:
        if email in local_users:
            return {'success': False, 'error': 'Email já está em uso'}
        
        uid = f"user_{len(local_users) + 1}"
        local_users[email] = {
            'uid': uid,
            'password': password,
            'displayName': display_name or email.split('@')[0],
            'role': role,
            'createdAt': datetime.datetime.now().isoformat(),
            'lastLogin': None
        }
        
        return {'success': True, 'uid': uid}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def login_user(email, password):
    """Faz login de um usuário local e retorna token simulado"""
    try:
        if email not in local_users:
            return {'success': False, 'error': 'Usuário não encontrado'}
            
        user = local_users[email]
        if user['password'] != password:
            return {'success': False, 'error': 'Senha incorreta'}
            
        # Atualizar último login
        user['lastLogin'] = datetime.datetime.now().isoformat()
        
        # Gerar token simulado
        token = f"local_token_{user['uid']}_{datetime.datetime.now().timestamp()}"
        
        return {
            'success': True, 
            'token': token,
            'refreshToken': f"refresh_{token}",
            'uid': user['uid'],
            'expiresIn': 3600,  # 1 hora
            'email': email,
            'role': user['role']
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}

def get_user_role(uid):
    """Obter o role/papel do usuário no modo local"""
    try:
        for email, user_data in local_users.items():
            if user_data.get('uid') == uid:
                return user_data.get('role', 'user')
        return 'user'  # default
    except Exception as e:
        print(f"Erro ao obter role do usuário: {e}")
        return 'user'

def verify_token(token):
    """Verifica se um token local é válido"""
    try:
        # Formato do token local: local_token_uid_timestamp
        parts = token.split('_')
        if len(parts) >= 3 and parts[0] == 'local' and parts[1] == 'token':
            uid = parts[2]
            return {'success': True, 'uid': uid}
        return {'success': False, 'error': 'Token inválido'}
    except Exception as e:
        return {'success': False, 'error': str(e)}