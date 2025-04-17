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

// Rota para obter produtos (protegida por autenticação)
app.get('/produtos', autenticarToken, async (req, res) => {
  try {
    const snapshot = await db.collection('produtos').get();
    const produtos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(produtos);
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({ error: 'Erro ao buscar produtos', detalhes: error.message });
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