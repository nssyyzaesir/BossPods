import os
import json
import datetime
import logging

# Configurar logging
logger = logging.getLogger(__name__)

# Modo de utilização com Firebase CDN
print("Inicializando em modo de desenvolvimento local (sem Firebase)")

# Credenciais do administrador
ADMIN_EMAIL = 'nsyzaesir@gmail.com'
ADMIN_PASSWORD = 'nsyz123'

# Esta versão do firebase_config.py é mantida apenas para compatibilidade
# com o código existente. A autenticação é realizada pelo Firebase Auth no frontend.

# Funções auxiliares para compatibilidade com código legado
def create_user(email, password, display_name=None, role='user'):
    """Compatibilidade com o código legado - não usado mais"""
    logger.warning("Tentativa de criar usuário pelo backend. Use Firebase Auth no frontend.")
    return {'success': False, 'error': 'Esta função foi descontinuada. Use Firebase Auth.'}

def login_user(email, password):
    """Compatibilidade com o código legado - não usado mais"""
    logger.warning("Tentativa de login pelo backend. Use Firebase Auth no frontend.")
    return {'success': False, 'error': 'Esta função foi descontinuada. Use Firebase Auth.'}

def get_user_role(uid):
    """Compatibilidade com o código legado - retorna 'admin' se for o admin conhecido"""
    logger.warning("Tentativa de obter role pelo backend. Use Firebase Auth no frontend.")
    if uid == 'admin':
        return 'admin'
    return 'user'

def verify_token(token):
    """Compatibilidade com o código legado - não usado mais"""
    logger.warning("Tentativa de verificar token pelo backend. Use Firebase Auth no frontend.")
    return {'success': False, 'error': 'Esta função foi descontinuada. Use Firebase Auth.'}