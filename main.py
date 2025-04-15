from flask import Flask, render_template, request, jsonify, send_from_directory
from app import app, db
from models import Produto, LogAtividade
import os
import json
from datetime import datetime
import csv
import io

@app.route('/')
def index():
    """Render the main admin interface"""
    return render_template('index.html')

@app.route('/api/produtos', methods=['GET'])
def get_produtos():
    """Retorna todos os produtos"""
    query = Produto.query
    
    # Filtros
    categoria = request.args.get('categoria')
    if categoria:
        query = query.filter(Produto.categoria == categoria)
    
    estoque_baixo = request.args.get('estoque_baixo')
    if estoque_baixo == 'true':
        query = query.filter(Produto.estoque <= 5)
    
    estoque_zerado = request.args.get('estoque_zerado')
    if estoque_zerado == 'true':
        query = query.filter(Produto.estoque == 0)
    
    em_promocao = request.args.get('em_promocao')
    if em_promocao == 'true':
        query = query.filter(Produto.em_promocao == True)
    
    preco_min = request.args.get('preco_min')
    if preco_min:
        query = query.filter(Produto.preco >= float(preco_min))
    
    preco_max = request.args.get('preco_max')
    if preco_max:
        query = query.filter(Produto.preco <= float(preco_max))
    
    tag = request.args.get('tag')
    if tag:
        query = query.filter(Produto.tags.like(f'%{tag}%'))
    
    search = request.args.get('search')
    if search:
        query = query.filter(Produto.nome.ilike(f'%{search}%'))
    
    # Ordenação
    sort_field = request.args.get('sort_field', 'nome')
    sort_order = request.args.get('sort_order', 'asc')
    
    if sort_field == 'nome':
        if sort_order == 'asc':
            query = query.order_by(Produto.nome.asc())
        else:
            query = query.order_by(Produto.nome.desc())
    elif sort_field == 'preco':
        if sort_order == 'asc':
            query = query.order_by(Produto.preco.asc())
        else:
            query = query.order_by(Produto.preco.desc())
    elif sort_field == 'estoque':
        if sort_order == 'asc':
            query = query.order_by(Produto.estoque.asc())
        else:
            query = query.order_by(Produto.estoque.desc())
    
    produtos = query.all()
    return jsonify([produto.to_dict() for produto in produtos])

@app.route('/api/produtos', methods=['POST'])
def add_produto():
    """Adiciona um novo produto"""
    data = request.json
    
    # Converter tags para o formato correto
    if 'tags' in data and isinstance(data['tags'], list):
        data['tags'] = json.dumps(data['tags'])
    
    produto = Produto.from_dict(data)
    db.session.add(produto)
    db.session.commit()
    
    # Registrar log
    log = LogAtividade(
        tipo='criar',
        produto_id=str(produto.id),
        nome_produto=produto.nome,
        detalhes=json.dumps({'produto': produto.to_dict()})
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify(produto.to_dict()), 201

@app.route('/api/produtos/<int:id>', methods=['GET'])
def get_produto(id):
    """Retorna um produto específico"""
    produto = Produto.query.get_or_404(id)
    return jsonify(produto.to_dict())

@app.route('/api/produtos/<int:id>', methods=['PUT'])
def update_produto(id):
    """Atualiza um produto"""
    produto = Produto.query.get_or_404(id)
    data = request.json
    
    # Salvar estado original para log
    old_produto = produto.to_dict()
    
    # Atualizar o produto
    if 'nome' in data:
        produto.nome = data['nome']
    
    if 'preco' in data:
        produto.preco = data['preco']
    
    if 'estoque' in data:
        produto.estoque = data['estoque']
    
    if 'imagem' in data:
        produto.imagem = data['imagem']
    
    if 'categoria' in data:
        produto.categoria = data['categoria']
    
    if 'tags' in data:
        produto.tags = json.dumps(data['tags']) if isinstance(data['tags'], list) else data['tags']
    
    if 'em_promocao' in data:
        produto.em_promocao = data['em_promocao']
    
    produto.updated_at = datetime.utcnow()
    db.session.commit()
    
    # Gerar mudanças para o log
    new_produto = produto.to_dict()
    mudancas = {}
    
    for key in old_produto:
        if key in new_produto and old_produto[key] != new_produto[key]:
            mudancas[key] = {'antes': old_produto[key], 'depois': new_produto[key]}
    
    # Registrar log se houve mudanças
    if mudancas:
        log = LogAtividade(
            tipo='editar',
            produto_id=str(produto.id),
            nome_produto=produto.nome,
            detalhes=json.dumps(mudancas)
        )
        db.session.add(log)
        db.session.commit()
    
    return jsonify(produto.to_dict())

@app.route('/api/produtos/<int:id>', methods=['DELETE'])
def delete_produto(id):
    """Exclui um produto"""
    produto = Produto.query.get_or_404(id)
    produto_dict = produto.to_dict()
    
    db.session.delete(produto)
    db.session.commit()
    
    # Registrar log
    log = LogAtividade(
        tipo='excluir',
        produto_id=str(id),
        nome_produto=produto_dict['nome'],
        detalhes=json.dumps({'produto': produto_dict})
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify({'message': 'Produto excluído com sucesso'})

@app.route('/api/logs', methods=['GET'])
def get_logs():
    """Retorna todos os logs"""
    logs = LogAtividade.query.order_by(LogAtividade.data.desc()).all()
    return jsonify([log.to_dict() for log in logs])

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Retorna estatísticas sobre os produtos"""
    total_produtos = Produto.query.count()
    valor_total = db.session.query(db.func.sum(Produto.preco * Produto.estoque)).scalar() or 0
    estoque_zerado = Produto.query.filter(Produto.estoque == 0).count()
    estoque_baixo = Produto.query.filter(Produto.estoque <= 5, Produto.estoque > 0).count()
    
    # Produtos com maior estoque
    maiores_estoques = Produto.query.order_by(Produto.estoque.desc()).limit(5).all()
    
    # Distribuição por categoria
    categorias = db.session.query(
        Produto.categoria, 
        db.func.count(Produto.id)
    ).group_by(Produto.categoria).all()
    
    categorias_data = [{'categoria': cat, 'count': count} for cat, count in categorias]
    
    return jsonify({
        'total_produtos': total_produtos,
        'valor_total': valor_total,
        'estoque_zerado': estoque_zerado,
        'estoque_baixo': estoque_baixo,
        'maiores_estoques': [produto.to_dict() for produto in maiores_estoques],
        'distribuicao_categorias': categorias_data
    })

@app.route('/api/tags', methods=['GET'])
def get_tags():
    """Retorna todas as tags distintas usadas nos produtos"""
    produtos = Produto.query.all()
    todas_tags = []
    
    for produto in produtos:
        if produto.tags:
            tags = json.loads(produto.tags)
            todas_tags.extend(tags)
    
    # Remover duplicatas
    tags_unicas = list(set(todas_tags))
    
    return jsonify(tags_unicas)

@app.route('/api/categorias', methods=['GET'])
def get_categorias():
    """Retorna todas as categorias distintas"""
    categorias = db.session.query(Produto.categoria).distinct().all()
    return jsonify([cat[0] for cat in categorias if cat[0]])

@app.route('/api/export', methods=['GET'])
def export_data():
    """Exporta os dados dos produtos em formato JSON ou CSV"""
    format_type = request.args.get('format', 'json')
    produtos = Produto.query.all()
    
    if format_type == 'json':
        produtos_dict = [produto.to_dict() for produto in produtos]
        return jsonify(produtos_dict)
    
    elif format_type == 'csv':
        si = io.StringIO()
        writer = csv.writer(si)
        
        # Escrever cabeçalho
        writer.writerow(['ID', 'Nome', 'Preço', 'Estoque', 'Categoria', 'Tags', 'Em Promoção', 'Imagem', 'Data de Criação', 'Última Atualização'])
        
        # Escrever dados
        for produto in produtos:
            p_dict = produto.to_dict()
            writer.writerow([
                p_dict['id'],
                p_dict['nome'],
                p_dict['preco'],
                p_dict['estoque'],
                p_dict['categoria'],
                ', '.join(p_dict['tags']) if p_dict['tags'] else '',
                'Sim' if p_dict['em_promocao'] else 'Não',
                p_dict['imagem'],
                p_dict['created_at'],
                p_dict['updated_at']
            ])
        
        output = si.getvalue()
        
        return output, 200, {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename=produtos.csv'
        }
    
    return jsonify({'error': 'Formato inválido. Use json ou csv.'}), 400

@app.route('/api/import', methods=['POST'])
def import_data():
    """Importa dados de produtos"""
    if 'file' not in request.files:
        return jsonify({'error': 'Nenhum arquivo enviado'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'Nenhum arquivo selecionado'}), 400
    
    if file.filename.endswith('.json'):
        try:
            data = json.load(file)
            
            # Limpar todos os produtos se solicitado
            if request.args.get('clear') == 'true':
                Produto.query.delete()
                
                # Log de limpeza
                log = LogAtividade(
                    tipo='limpar',
                    produto_id='todos',
                    nome_produto='Todos os Produtos',
                    detalhes=json.dumps({'message': 'Limpeza antes da importação'})
                )
                db.session.add(log)
                db.session.commit()
            
            # Adicionar novos produtos
            for produto_data in data:
                produto = Produto.from_dict(produto_data)
                db.session.add(produto)
            
            db.session.commit()
            
            # Log de importação
            log = LogAtividade(
                tipo='importar',
                produto_id='batch',
                nome_produto='Importação em Lote',
                detalhes=json.dumps({'count': len(data)})
            )
            db.session.add(log)
            db.session.commit()
            
            return jsonify({'message': f'Importados {len(data)} produtos com sucesso'})
            
        except Exception as e:
            return jsonify({'error': f'Erro ao processar o arquivo JSON: {str(e)}'}), 400
    
    return jsonify({'error': 'Formato de arquivo não suportado. Use JSON.'}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)