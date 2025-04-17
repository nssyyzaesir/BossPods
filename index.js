import express from 'express';
import admin from 'firebase-admin';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Inicializar Firebase com a variável de ambiente
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// UID fixo do admin (proteção nas rotas)
const ADMIN_UID = '96rupqrpWjbyKtSksDaISQ94y6l2';

// Middleware de autenticação por UID via Header
function autenticarAdmin(req, res, next) {
  const uid = req.headers['x-admin-uid'];
  if (uid === ADMIN_UID) {
    next();
  } else {
    res.status(401).json({ error: 'Acesso negado. UID inválido.' });
  }
}

// Rota raiz só pra confirmar que tá vivo
app.get('/', (req, res) => {
  res.send('Servidor BossPods rodando com Firebase e Firestore, caralho!');
});

// [CREATE] Adicionar novo produto
app.post('/produtos', autenticarAdmin, async (req, res) => {
  try {
    const { nome, preco, estoque, imagem, categoria } = req.body;
    const novo = {
      nome,
      preco: parseFloat(preco),
      estoque: parseInt(estoque),
      imagem: imagem || '',
      categoria,
      dataInclusao: new Date().toISOString()
    };

    const docRef = await db.collection('produtos').add(novo);
    res.json({ id: docRef.id, ...novo });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao adicionar produto', detalhes: err.message });
  }
});

// [READ] Listar todos os produtos
app.get('/produtos', async (req, res) => {
  try {
    const snapshot = await db.collection('produtos').get();
    const produtos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(produtos);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar produtos', detalhes: err.message });
  }
});

// [UPDATE] Editar produto
app.put('/produtos/:id', autenticarAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const atualizacoes = req.body;
    await db.collection('produtos').doc(id).update(atualizacoes);
    res.json({ message: 'Produto atualizado com sucesso', id });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar produto', detalhes: err.message });
  }
});

// [DELETE] Deletar produto
app.delete('/produtos/:id', autenticarAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    await db.collection('produtos').doc(id).delete();
    res.json({ message: 'Produto deletado com sucesso', id });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar produto', detalhes: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porra da porta ${PORT}`);
});