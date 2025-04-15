import os
import json
import firebase_admin
from firebase_admin import credentials, firestore, auth
import pyrebase

# Configuração do Firebase para autenticação e armazenamento
config = {
    "apiKey": "AIzaSyCl_NEvqOLaHjbhx3pDfnZrhBR4iqav9h8",
    "authDomain": "bosspods.firebaseapp.com",
    "projectId": "bosspods",
    "storageBucket": "bosspods.firebasestorage.app",
    "messagingSenderId": "319819159324",
    "appId": "1:319819159324:web:953f64130fe51842600cd9",
    "databaseURL": ""  # Não usamos Realtime Database, mas o Pyrebase precisa desta chave
}

# Inicializar Firebase para autenticação (via Pyrebase)
firebase = pyrebase.initialize_app(config)
auth_firebase = firebase.auth()

# Para o SDK Admin, vamos usar um certificado temporário para desenvolvimento
# Em produção, seria um arquivo JSON real de conta de serviço
service_account_info = {
    "type": "service_account",
    "project_id": "bosspods",
    "private_key_id": "fake-key-for-development",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDNk/+EEJoI3vae\nOlHU4WxQEaWQpVBKQxrV8Y1AVyRcFB3dhZ8x7GfSzmb2r5Vpyk/IDV2l/OBiSjTX\nuCaLuh+Y1tLX6cvlS1oq3zSgGgV7Vt4iUQxqVXZ+RyfHXHNguKE1cq4HBMTgXKxF\nTyJDLXXSPKVEhIR5SSdjn6VGvMSvtQFgYXrPd/9tj17z8Z5CwzwXLRt1gitgdTgY\nAWSvF85QvQLvMQgf/qsA/cQ5VEYjd3/bwouNQbfXx7NjvxSvYlCFZdqxn8Y0aE3m\nYMzJbFJ6V6HBBnLJFGPYAJzMfvk9W+J0Jlw6m3Gpd4hOvY+mBkmMvCYZPFHPf05+\nHDgFXHGdAgMBAAECggEACi5A5NsjP8g3UOieVl6YpqQvmPD6Rw1+NYFT+kX2F9eT\nIcKw4cMJEBpIvCwUK0a8xD0xrNlJrSg7kTy2Mn7ZuWnFZIrTbxKWviUC8y5viZ1U\nKIhJ6yYiO6YmvyvTRmr9K6Y0jqiCyIKxHJQ/NNSWUjYTPiRKb30/wO8YkB4LTEHF\nxn0D8SoyJZMdNMY9NQA0TnVnI7hOI7d/xW7BYhppLNQxPpTvZxAEQYsVcEd+JCmm\nLZWQA+OnBQpRGJVI+KcBt0Vzn7XoddR/9DGF8cCesjG3lbzOk3GKRBkHfQKUdfrK\nBbJWp5dv6yQaprw2B0m9ssbP1GKh1IQAvfSxqYhF7QKBgQD+7LgxqqHDYhLu/2a/\nNhTlRwXdcJ5W/fjDDYQrQs6CL1nLiWoMSUEJrPJoXD9/pUwvwOIr1MJEOU1sXznk\nWsPSZZpvkrqPpYJDHBFP6PL0UtmZW8nR4+cMzUTAJCsXfqPFRFhoI7a7QZ7cStMK\nI5/wH1LnL1AzwJSFEZZAePrIvwKBgQDOcvBuW2Z9Rzr1qinR3waG7j0dFCnQNYQD\nvUJC07iP1+CcGEbZm3VO/kcjMYv8+5CGUT/UF4jkkJJC/fPMVbUBhgl1Z3DYH5QU\naNZ+JFoHv5idwHpJnXxQANuO7Tqb+FRKYcky8x6Pl0v9UQJ2jrJHFcKhCxBG39rY\nRe5YVTZsAwKBgQD3XHBtYAQ7tbXD4oykCEYXFaZXMVwE+0fOQKmyHl5QQfXQYD+E\nb3la7RHC5wqAi36CJmm2FsrZF56aAzBCA22dK8Pwitd1ISlyCT2XaGR/raYzwP4d\nf1vd+3m8yCKLHinAeX0y5MjA0v4J2O6kVJjqX2Lv/BWtrc75ybk+1HCQ6wKBgH97\n64YXlwEo6hIT68LwnLJ6VevR10QTxbf+KJUu1oCcWYdPQIzxcN0j67wgXzr5x1ng\nVmMnrpLKsLHfgf3Ga4fjZLKpr1WhoDiWczWX7B4pPvDpzJAUqx+UveLliL+em3Bb\n+eR7jmMIz7EOXF8IOtgqAW/SY94LiYkbLLBpxwu1AoGBAIXHBgvVxTNzRzvJ2Y/E\nf9bOg5TupCfmVqSX6a3vWwcsd54ZfJD+FXY2ZRHjGARbTzTLKVHYDgYbWSsRVKUz\ns1eJL5UrAZNIcHF8UhUmzA7De37hMd1+OTpxPy6ZYUyJLaSj85D0qmvd61IYKL6p\n7WtVIFOxXSwYLaN9F+d1h2O8\n-----END PRIVATE KEY-----\n",
    "client_email": "firebase-adminsdk-sample@bosspods.iam.gserviceaccount.com",
    "client_id": "000000000000000000000",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-sample%40bosspods.iam.gserviceaccount.com",
    "universe_domain": "googleapis.com"
}

try:
    # Inicializar Firebase Admin SDK
    cred = credentials.Certificate(service_account_info)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    
    print("Firebase inicializado com sucesso!")
except Exception as e:
    print(f"Erro ao inicializar Firebase: {e}")
    # Fallback para modo sem Firebase se houver erro
    db = None

# Funções auxiliares para autenticação
def create_user(email, password, display_name=None, role='user'):
    """Cria um novo usuário no Firebase Authentication e Firestore"""
    try:
        # Criar usuário no Firebase Auth
        user = auth_firebase.create_user_with_email_and_password(email, password)
        uid = user['localId']
        
        # Definir o display name se fornecido
        if display_name:
            auth_firebase.update_profile(user['idToken'], display_name=display_name)
        
        # Salvar dados extras do usuário no Firestore
        if db:
            user_data = {
                'email': email,
                'displayName': display_name or email.split('@')[0],
                'role': role,
                'createdAt': firestore.SERVER_TIMESTAMP,
                'lastLogin': None
            }
            db.collection('users').document(uid).set(user_data)
        
        return {'success': True, 'uid': uid}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def login_user(email, password):
    """Faz login de um usuário e retorna token"""
    try:
        user = auth_firebase.sign_in_with_email_and_password(email, password)
        
        # Atualizar último login no Firestore
        if db:
            uid = user['localId']
            db.collection('users').document(uid).update({
                'lastLogin': firestore.SERVER_TIMESTAMP
            })
        
        return {
            'success': True, 
            'token': user['idToken'],
            'refreshToken': user['refreshToken'],
            'uid': user['localId'],
            'expiresIn': user['expiresIn']
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}

def get_user_role(uid):
    """Obter o role/papel do usuário do Firestore"""
    try:
        if db:
            user_ref = db.collection('users').document(uid)
            user_data = user_ref.get()
            if user_data.exists:
                return user_data.to_dict().get('role', 'user')
        return 'user'  # default
    except Exception as e:
        print(f"Erro ao obter role do usuário: {e}")
        return 'user'

def verify_token(token):
    """Verifica se um token é válido"""
    try:
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token['uid']
        return {'success': True, 'uid': uid}
    except Exception as e:
        return {'success': False, 'error': str(e)}