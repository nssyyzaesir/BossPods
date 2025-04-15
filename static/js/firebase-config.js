// Configuração do Firebase para o projeto BOSSPODS
const firebaseConfig = {
  apiKey: "AIzaSyCl_NEvqOLaHjbhx3pDfnZrhBR4iqav9h8",
  authDomain: "bosspods.firebaseapp.com",
  projectId: "bosspods",
  storageBucket: "bosspods.firebasestorage.app",
  messagingSenderId: "319819159324",
  appId: "1:319819159324:web:953f64130fe51842600cd9"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referências para serviços do Firebase
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// Coleções principais
const produtosRef = db.collection('produtos');
const logsRef = db.collection('logs');
const usuariosRef = db.collection('usuarios');

// Configurações do Firestore
db.settings({
  cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
});

// Habilitar persistência offline (funciona mesmo sem internet)
db.enablePersistence({ synchronizeTabs: true })
  .catch(err => {
    if (err.code === 'failed-precondition') {
      console.warn('Persistência falhou: múltiplas abas abertas');
    } else if (err.code === 'unimplemented') {
      console.warn('Persistência não suportada neste navegador');
    }
  });

// Funções de utilidade para autenticação
const firebaseAuth = {
  // Login com email e senha
  loginWithEmail: async (email, password) => {
    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Erro no login:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Criar conta
  createAccount: async (email, password, displayName) => {
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      
      // Adicionar nome de exibição
      await userCredential.user.updateProfile({
        displayName: displayName
      });
      
      // Registrar usuário no Firestore
      await usuariosRef.doc(userCredential.user.uid).set({
        email: email,
        nome: displayName,
        role: 'user',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Erro ao criar conta:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Logout
  logout: async () => {
    try {
      await auth.signOut();
      return { success: true };
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Verificar estado atual do usuário
  getCurrentUser: () => {
    return new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged(user => {
        unsubscribe();
        resolve(user);
      });
    });
  },
  
  // Obter informações adicionais do usuário do Firestore
  getUserData: async (uid) => {
    try {
      const doc = await usuariosRef.doc(uid).get();
      if (doc.exists) {
        return { success: true, data: doc.data() };
      } else {
        return { success: false, error: 'Usuário não encontrado' };
      }
    } catch (error) {
      console.error('Erro ao obter dados do usuário:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Verificar se o usuário tem permissão de admin
  isAdmin: async (user) => {
    if (!user) return false;
    
    try {
      const doc = await usuariosRef.doc(user.uid).get();
      if (doc.exists) {
        const userData = doc.data();
        return userData.role === 'admin';
      }
      return false;
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      return false;
    }
  }
};

// Funções de utilidade para produtos
const firestoreProducts = {
  // Obter todos os produtos
  getAllProducts: async () => {
    try {
      const snapshot = await produtosRef.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      throw error;
    }
  },
  
  // Obter produto por ID
  getProductById: async (productId) => {
    try {
      const doc = await produtosRef.doc(productId).get();
      if (doc.exists) {
        return { id: doc.id, ...doc.data() };
      } else {
        throw new Error('Produto não encontrado');
      }
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      throw error;
    }
  },
  
  // Adicionar um novo produto
  addProduct: async (productData) => {
    try {
      const docRef = await produtosRef.add({
        ...productData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Registrar no log
      await logsRef.add({
        tipo: 'criar',
        produtoId: docRef.id,
        nomeProduto: productData.nome,
        detalhes: { produto: productData },
        data: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      return { id: docRef.id, ...productData };
    } catch (error) {
      console.error('Erro ao adicionar produto:', error);
      throw error;
    }
  },
  
  // Atualizar um produto
  updateProduct: async (productId, productData) => {
    try {
      // Obter versão antiga para o log
      const oldDoc = await produtosRef.doc(productId).get();
      const oldData = oldDoc.data();
      
      // Atualizar produto
      await produtosRef.doc(productId).update({
        ...productData,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Determinar o que mudou
      const changes = {};
      for (const key in productData) {
        if (JSON.stringify(oldData[key]) !== JSON.stringify(productData[key])) {
          changes[key] = {
            antes: oldData[key],
            depois: productData[key]
          };
        }
      }
      
      // Registrar no log se houve mudanças
      if (Object.keys(changes).length > 0) {
        await logsRef.add({
          tipo: 'editar',
          produtoId: productId,
          nomeProduto: productData.nome || oldData.nome,
          detalhes: changes,
          data: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      
      return { id: productId, ...productData };
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      throw error;
    }
  },
  
  // Excluir um produto
  deleteProduct: async (productId) => {
    try {
      // Obter dados do produto para o log
      const doc = await produtosRef.doc(productId).get();
      const productData = doc.data();
      
      // Excluir produto
      await produtosRef.doc(productId).delete();
      
      // Registrar no log
      await logsRef.add({
        tipo: 'excluir',
        produtoId: productId,
        nomeProduto: productData.nome,
        detalhes: { produto: productData },
        data: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      throw error;
    }
  },
  
  // Escutar mudanças em tempo real
  listenToProducts: (callback) => {
    return produtosRef.onSnapshot(snapshot => {
      const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(products);
    }, error => {
      console.error('Erro ao escutar produtos:', error);
    });
  },
  
  // Obter todos os logs
  getLogs: async () => {
    try {
      const snapshot = await logsRef.orderBy('data', 'desc').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
      throw error;
    }
  }
};

// Funções de utilidade para estatísticas e relatórios
const firebaseStats = {
  // Obter estatísticas básicas
  getBasicStats: async () => {
    try {
      const snapshot = await produtosRef.get();
      const produtos = snapshot.docs.map(doc => doc.data());
      
      // Total de produtos
      const totalProdutos = produtos.length;
      
      // Valor total do estoque
      const valorTotal = produtos.reduce((total, produto) => {
        return total + (produto.preco * produto.estoque);
      }, 0);
      
      // Contagem de estoque zerado
      const estoqueZerado = produtos.filter(produto => produto.estoque === 0).length;
      
      // Contagem de estoque baixo (5 ou menos)
      const estoqueBaixo = produtos.filter(produto => produto.estoque > 0 && produto.estoque <= 5).length;
      
      // Produtos com maior estoque
      const maioresEstoques = [...produtos]
        .sort((a, b) => b.estoque - a.estoque)
        .slice(0, 5);
      
      // Distribuição por categoria
      const categorias = {};
      produtos.forEach(produto => {
        if (produto.categoria) {
          if (!categorias[produto.categoria]) {
            categorias[produto.categoria] = 0;
          }
          categorias[produto.categoria]++;
        }
      });
      
      const distribuicaoCategorias = Object.entries(categorias).map(([categoria, count]) => ({
        categoria,
        count
      }));
      
      return {
        totalProdutos,
        valorTotal,
        estoqueZerado,
        estoqueBaixo,
        maioresEstoques,
        distribuicaoCategorias
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      throw error;
    }
  },
  
  // Obter todas as tags únicas
  getAllTags: async () => {
    try {
      const snapshot = await produtosRef.get();
      const produtos = snapshot.docs.map(doc => doc.data());
      
      const todasTags = [];
      produtos.forEach(produto => {
        if (produto.tags && Array.isArray(produto.tags)) {
          todasTags.push(...produto.tags);
        }
      });
      
      // Remover duplicatas
      return [...new Set(todasTags)];
    } catch (error) {
      console.error('Erro ao obter tags:', error);
      throw error;
    }
  },
  
  // Obter todas as categorias
  getAllCategories: async () => {
    try {
      const snapshot = await produtosRef.get();
      const produtos = snapshot.docs.map(doc => doc.data());
      
      const categorias = new Set();
      produtos.forEach(produto => {
        if (produto.categoria) {
          categorias.add(produto.categoria);
        }
      });
      
      return Array.from(categorias);
    } catch (error) {
      console.error('Erro ao obter categorias:', error);
      throw error;
    }
  }
};