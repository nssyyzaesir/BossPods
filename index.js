import express from 'express';
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// UID fixo do admin (proteção nas rotas)
const ADMIN_UID = '96rupqrpWjbyKtSksDaISQ94y6l2';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Firebase SDK Initialization
try {
  const firebaseConfigJson = process.env.FIREBASE_ADMIN_SDK;

  if (!firebaseConfigJson) throw new Error("FIREBASE_ADMIN_SDK está vazia!");

  const serviceAccount = JSON.parse(firebaseConfigJson);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  console.log('Firebase inicializado com sucesso!');
} catch (err) {
  console.error('Erro ao inicializar Firebase:', err.message);
}

// Firestore Database
const db = admin.firestore();

// Middleware para autenticação com Firebase Token
async function autenticarToken(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido ou inválido' });
  }
  
  const idToken = authHeader.split('Bearer ')[1];
  
  try {
    // Verificar o token com o Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Verificar se o UID corresponde ao UID do admin
    const uidHeader = req.headers['x-admin-uid'];
    
    if (decodedToken.uid !== ADMIN_UID || uidHeader !== ADMIN_UID) {
      return res.status(403).json({ 
        error: 'Acesso negado. Você não tem permissão para acessar este recurso.',
        uid: decodedToken.uid,
        expected: ADMIN_UID
      });
    }
    
    // Adicionar o usuário autenticado ao objeto de requisição
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    return res.status(401).json({ error: 'Token inválido ou expirado', detalhes: error.message });
  }
}

// Rotas para servir arquivos HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/loja', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'loja.html'));
});

app.get('/carrinho', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'carrinho.html'));
});

// Middleware para validação e sanitização de dados
function validateProductData(req, res, next) {
  try {
    const produto = req.body;
    
    // Verificar se os campos obrigatórios existem
    if (!produto.nome || typeof produto.nome !== 'string' || produto.nome.trim() === '') {
      return res.status(400).json({ error: 'Nome do produto é obrigatório' });
    }
    
    // Sanitizar e validar os campos
    req.sanitizedData = {
      nome: produto.nome.trim().substring(0, 100), // Limitar tamanho
      descricao: produto.descricao ? produto.descricao.trim().substring(0, 1000) : '',
      categoria: produto.categoria ? produto.categoria.trim().substring(0, 50) : '',
      preco: typeof produto.preco === 'number' && produto.preco >= 0 ? produto.preco : 0,
      estoque: typeof produto.estoque === 'number' && produto.estoque >= 0 ? Math.floor(produto.estoque) : 0,
      imagem: produto.imagem ? produto.imagem.trim().substring(0, 500) : '',
      destaque: !!produto.destaque, // Converter para boolean
      novidade: !!produto.novidade, // Converter para boolean
      tags: Array.isArray(produto.tags) ? produto.tags.map(tag => tag.trim()).filter(tag => tag !== '') : []
    };
    
    next();
  } catch (error) {
    console.error('Erro na validação de dados:', error);
    res.status(400).json({ error: 'Dados inválidos', detalhes: error.message });
  }
}

// Rotas API para produtos (todas protegidas por autenticação)
// Obter todos os produtos
app.get('/api/produtos', autenticarToken, async (req, res) => {
  try {
    const snapshot = await db.collection('produtos').get();
    const produtos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(produtos);
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({ error: 'Erro ao buscar produtos', detalhes: error.message });
  }
});

// Criar novo produto
app.post('/api/produtos', autenticarToken, validateProductData, async (req, res) => {
  try {
    const produto = req.sanitizedData;
    
    // Adicionar timestamps
    produto.createdAt = admin.firestore.FieldValue.serverTimestamp();
    produto.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    
    // Salvar no Firestore
    const docRef = await db.collection('produtos').add(produto);
    
    // Registrar log
    await db.collection('logs_atividade').add({
      tipo: 'criar',
      produto_id: docRef.id,
      nome_produto: produto.nome,
      usuario: req.user.email || req.user.uid,
      detalhes: JSON.stringify(produto),
      data: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.status(201).json({ 
      id: docRef.id, 
      ...produto,
      message: 'Produto criado com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ error: 'Erro ao criar produto', detalhes: error.message });
  }
});

// Atualizar produto existente
app.put('/api/produtos/:id', autenticarToken, validateProductData, async (req, res) => {
  try {
    const { id } = req.params;
    const produto = req.sanitizedData;
    
    // Verificar se o produto existe
    const docRef = db.collection('produtos').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    
    // Adicionar timestamp de atualização
    produto.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    
    // Atualizar no Firestore
    await docRef.update(produto);
    
    // Registrar log
    await db.collection('logs_atividade').add({
      tipo: 'editar',
      produto_id: id,
      nome_produto: produto.nome,
      usuario: req.user.email || req.user.uid,
      detalhes: JSON.stringify(produto),
      data: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ 
      id, 
      ...produto,
      message: 'Produto atualizado com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ error: 'Erro ao atualizar produto', detalhes: error.message });
  }
});

// Excluir produto
app.delete('/api/produtos/:id', autenticarToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se o produto existe
    const docRef = db.collection('produtos').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    
    // Obter dados do produto antes de excluir (para o log)
    const produtoData = doc.data();
    
    // Excluir do Firestore
    await docRef.delete();
    
    // Registrar log
    await db.collection('logs_atividade').add({
      tipo: 'excluir',
      produto_id: id,
      nome_produto: produtoData.nome || 'Produto sem nome',
      usuario: req.user.email || req.user.uid,
      detalhes: JSON.stringify({ id, ...produtoData }),
      data: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ 
      message: 'Produto excluído com sucesso',
      id
    });
  } catch (error) {
    console.error('Erro ao excluir produto:', error);
    res.status(500).json({ error: 'Erro ao excluir produto', detalhes: error.message });
  }
});

// Obter logs de atividade
app.get('/api/logs', autenticarToken, async (req, res) => {
  try {
    const snapshot = await db.collection('logs_atividade')
      .orderBy('data', 'desc')
      .limit(100)
      .get();
      
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      data: doc.data().data ? doc.data().data.toDate() : new Date()
    }));
    
    res.json(logs);
  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    res.status(500).json({ error: 'Erro ao buscar logs', detalhes: error.message });
  }
});

// Middleware para tratar rotas inexistentes
app.use((req, res, next) => {
  res.status(404).send('Página não encontrada');
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT} (0.0.0.0)`);
});