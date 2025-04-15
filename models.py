from datetime import datetime
from app import db
import json

class Produto(db.Model):
    """Modelo para os produtos"""
    __tablename__ = 'produtos'
    
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    preco = db.Column(db.Float, nullable=False)
    estoque = db.Column(db.Integer, default=0)
    imagem = db.Column(db.String(255))
    categoria = db.Column(db.String(50))
    tags = db.Column(db.String(255))  # Tags armazenadas como string JSON
    em_promocao = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        """Converte o modelo para um dicionário"""
        return {
            'id': self.id,
            'nome': self.nome,
            'preco': self.preco,
            'estoque': self.estoque,
            'imagem': self.imagem,
            'categoria': self.categoria,
            'tags': json.loads(self.tags) if self.tags else [],
            'em_promocao': self.em_promocao,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    @staticmethod
    def from_dict(data):
        """Cria um objeto a partir de um dicionário"""
        tags = json.dumps(data.get('tags', [])) if isinstance(data.get('tags', []), list) else data.get('tags', '[]')
        
        return Produto(
            nome=data.get('nome'),
            preco=data.get('preco'),
            estoque=data.get('estoque', 0),
            imagem=data.get('imagem'),
            categoria=data.get('categoria'),
            tags=tags,
            em_promocao=data.get('em_promocao', False)
        )

class LogAtividade(db.Model):
    """Modelo para os logs de atividade"""
    __tablename__ = 'logs_atividade'
    
    id = db.Column(db.Integer, primary_key=True)
    tipo = db.Column(db.String(50), nullable=False)  # criar, editar, excluir, limpar
    produto_id = db.Column(db.String(50))
    nome_produto = db.Column(db.String(100))
    detalhes = db.Column(db.Text)  # Detalhes do log em formato JSON
    data = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """Converte o modelo para um dicionário"""
        return {
            'id': self.id,
            'tipo': self.tipo,
            'produto_id': self.produto_id,
            'nome_produto': self.nome_produto,
            'detalhes': json.loads(self.detalhes) if self.detalhes else {},
            'data': self.data.isoformat() if self.data else None
        }
    
    @staticmethod
    def from_dict(data):
        """Cria um objeto a partir de um dicionário"""
        detalhes = json.dumps(data.get('detalhes', {})) if isinstance(data.get('detalhes', {}), dict) else data.get('detalhes', '{}')
        
        return LogAtividade(
            tipo=data.get('tipo'),
            produto_id=data.get('produto_id'),
            nome_produto=data.get('nome_produto'),
            detalhes=detalhes
        )