// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCl_NEvqOLaHjbhx3pDfnZrhBR4iqav9h8",
  authDomain: "bosspods.firebaseapp.com",
  projectId: "bosspods",
  storageBucket: "bosspods.firebasestorage.app",
  messagingSenderId: "319819159324",
  appId: "1:319819159324:web:953f64130fe51842600cd9"
};

// Credenciais do administrador
const ADMIN_EMAIL = 'nsyzaesir@gmail.com';
const ADMIN_PASSWORD = 'nsyz123';

// Variáveis de estado do Firebase
let firebaseInitialized = false;
let firestoreDB = null;
let firebaseAuth = null;
let currentUser = null;
let authInitialized = false;
let dbInitialized = false;

// Função para inicializar Firebase
function initializeFirebase() {
  console.log("Inicializando Firebase...");
  
  try {
    // 1. Inicializar o app Firebase
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
      console.log("Firebase App inicializado com sucesso");
    } else {
      console.log("Firebase App já está inicializado");
    }
    
    // 2. Inicializar Authentication
    firebaseAuth = firebase.auth();
    console.log("Firebase Auth inicializado");
    
    // 3. Configurar o listener de autenticação
    firebaseAuth.onAuthStateChanged((user) => {
      console.log("Estado de autenticação alterado:", user ? "Usuário autenticado" : "Usuário não autenticado");
      currentUser = user;
      authInitialized = true;
      
      // 4. Inicializar Firestore DEPOIS da autenticação
      if (!dbInitialized) {
        firestoreDB = firebase.firestore();
        dbInitialized = true;
        console.log("Firestore inicializado após autenticação");
      }
      
      // Atualizar estado
      if (user) {
        console.log("Usuário autenticado:", user.email);
        
        // Verificar se é o admin baseado no email
        const isAdmin = user.email === ADMIN_EMAIL;
        
        // Salvar dados do usuário no localStorage para persistência
        localStorage.setItem('currentUser', JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
          isAdmin: isAdmin
        }));
        
        localStorage.setItem('lastLoginTime', new Date().getTime());
        
        // Redirecionamento baseado no tipo de usuário e localização atual
        const currentPath = window.location.pathname;
        
        if (isAdmin) {
          // Se for admin na página de login, redirecionar para admin
          if (currentPath === '/login') {
            window.location.href = '/admin';
          }
        } else {
          // Se for usuário normal tentando acessar área administrativa
          if (currentPath === '/admin') {
            alert('Você não tem permissão para acessar esta área.');
            window.location.href = '/loja';
          }
        }
      } else {
        // Se não há usuário autenticado e está em página restrita
        if (window.location.pathname === '/admin') {
          alert('Você precisa fazer login como administrador para acessar esta área.');
          window.location.href = '/login';
        }
        
        // Limpar dados de autenticação local
        localStorage.removeItem('currentUser');
        localStorage.removeItem('lastLoginTime');
      }
    });
    
    // Marcar como inicializado
    firebaseInitialized = true;
    console.log("Firebase completamente inicializado com sucesso");
    
  } catch (error) {
    console.error("Erro ao inicializar Firebase:", error);
    firebaseInitialized = false;
  }
}

// Inicializar Firebase imediatamente
initializeFirebase();

// API Firebase Auth
const firebaseAuthAPI = {
  // Registrar um novo usuário
  async register(email, password, displayName = null) {
    try {
      // Verificar se já está inicializado
      if (!firebaseInitialized) {
        throw new Error("Firebase não está inicializado");
      }
      
      // Verificar se é o email do administrador
      if (email === ADMIN_EMAIL) {
        throw new Error("Este email está reservado para o administrador");
      }
      
      // Criar usuário no Firebase Auth
      const userCredential = await firebaseAuth.createUserWithEmailAndPassword(email, password);
      
      // Atualizar nome de exibição
      if (displayName) {
        await userCredential.user.updateProfile({
          displayName: displayName
        });
      }
      
      // Criar documento do usuário no Firestore
      await firestoreDB.collection('users').doc(userCredential.user.uid).set({
        email: email,
        displayName: displayName || email.split('@')[0],
        role: 'user',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      return userCredential.user;
    } catch (error) {
      console.error("Erro ao registrar usuário:", error);
      throw error;
    }
  },
  
  // Login de usuário
  async login(email, password) {
    try {
      // Verificar se já está inicializado
      if (!firebaseInitialized) {
        throw new Error("Firebase não está inicializado");
      }
      
      // Login no Firebase Auth
      const userCredential = await firebaseAuth.signInWithEmailAndPassword(email, password);
      
      // Se for o admin, verificar a senha correta
      if (email === ADMIN_EMAIL && password !== ADMIN_PASSWORD) {
        // Mesmo que o login tenha sucesso, se a senha não for exatamente 'nsyz123'
        // vamos rejeitar como medida adicional de segurança
        await firebaseAuth.signOut();
        throw new Error("Credenciais de administrador inválidas");
      }
      
      // Conceder permissão de admin no Firestore se for o email do admin
      if (email === ADMIN_EMAIL) {
        await firestoreDB.collection('users').doc(userCredential.user.uid).set({
          email: email,
          displayName: userCredential.user.displayName || email.split('@')[0],
          role: 'admin',
          lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } else {
        // Atualizar último login para usuários normais
        await firestoreDB.collection('users').doc(userCredential.user.uid).set({
          lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }
      
      return userCredential.user;
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      throw error;
    }
  },
  
  // Verificar se um usuário está autenticado
  async getCurrentUser() {
    return new Promise((resolve, reject) => {
      // Se já temos o usuário atual, retornar imediatamente
      if (authInitialized) {
        resolve(currentUser);
        return;
      }
      
      // Caso contrário, verificar no Firebase Auth
      const unsubscribe = firebaseAuth.onAuthStateChanged(user => {
        unsubscribe();
        resolve(user);
      }, reject);
    });
  },
  
  // Verificar se um usuário é admin
  async isAdmin(user) {
    if (!user) return false;
    
    // Verificação direta por e-mail do administrador
    return user.email === ADMIN_EMAIL;
  },
  
  // Fazer logout
  async logout() {
    try {
      await firebaseAuth.signOut();
      return true;
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      throw error;
    }
  }
};

// API Produtos (Firestore)
const firestoreProducts = {
  // Verificar inicialização do Firebase e do Firestore
  _checkFirebaseInit() {
    if (!firebaseInitialized || !dbInitialized) {
      console.error("Firebase ou Firestore não inicializado ainda");
      throw new Error("Firebase não inicializado. Aguarde a inicialização ou recarregue a página.");
    }
  },
  
  // Verificar autenticação do usuário
  _checkAuthentication() {
    // Verificar diretamente no Firebase Auth
    const firebaseUser = firebase.auth().currentUser;
    
    if (!firebaseUser) {
      console.error("Usuário não autenticado");
      throw new Error("Usuário não autenticado. Faça login novamente.");
    }
    
    // Sincronizar com nossa variável local
    currentUser = firebaseUser;
    
    // Verificar se é administrador
    if (currentUser.email !== ADMIN_EMAIL) {
      console.error("Usuário não é administrador");
      throw new Error("Você não tem permissão para realizar esta operação.");
    }
    
    console.log("Usuário autenticado e é administrador:", currentUser.email);
  },
  
  // Log de operação com detalhes
  _logOperation(operation, details) {
    console.log(`[${new Date().toISOString()}] Operação ${operation}:`, details);
  },
  
  // Obter todos os produtos
  async getAllProducts() {
    this._logOperation('getAllProducts', 'Iniciando busca de todos os produtos');
    
    try {
      // Verificar inicialização, mas não requer autenticação para leitura pública
      this._checkFirebaseInit();
      
      this._logOperation('getAllProducts', 'Acessando collection produtos');
      const snapshot = await firestoreDB.collection('produtos').get();
      
      const produtos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      this._logOperation('getAllProducts', `${produtos.length} produtos encontrados`);
      return produtos;
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
      this._logOperation('getAllProducts', `ERRO: ${error.message}`);
      return [];
    }
  },
  
  // Escutar por mudanças nos produtos
  listenToProducts(callback) {
    try {
      return firestoreDB.collection('produtos').onSnapshot(snapshot => {
        const produtos = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        callback(produtos);
      }, error => {
        console.error("Erro ao escutar mudanças nos produtos:", error);
        callback([]);
      });
    } catch (error) {
      console.error("Erro ao configurar listener de produtos:", error);
      callback([]);
      return () => {}; // Unsubscribe vazio
    }
  },
  
  // Adicionar um novo produto
  async addProduct(produtoData) {
    this._logOperation('addProduct', 'Iniciando adição de produto');
    console.log("Chamada de addProduct recebida com dados:", produtoData);
    
    try {
      // Verificar inicialização do Firebase e autenticação (ambos necessários para escrita)
      this._checkFirebaseInit();
      this._checkAuthentication();
      
      // Validar dados mínimos necessários
      if (!produtoData.nome) {
        console.error("Erro: Nome do produto é obrigatório");
        throw new Error("Nome do produto é obrigatório");
      }
      
      // Adicionar timestamps
      const dataWithTimestamps = {
        ...produtoData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      this._logOperation('addProduct', 'Dados preparados com timestamps');
      
      // Adicionar ao Firestore
      this._logOperation('addProduct', 'Adicionando ao Firestore collection produtos');
      const docRef = await firestoreDB.collection('produtos').add(dataWithTimestamps);
      this._logOperation('addProduct', `Produto adicionado com sucesso, ID: ${docRef.id}`);
      
      // Registrar log
      await this.registrarLog('criar', docRef.id, produtoData.nome, produtoData);
      this._logOperation('addProduct', 'Log de criação registrado');
      
      const resultado = {
        id: docRef.id,
        ...produtoData
      };
      this._logOperation('addProduct', 'Operação concluída com sucesso');
      return resultado;
    } catch (error) {
      console.error("Erro ao adicionar produto:", error);
      console.error("Detalhes do erro:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
      throw error;
    }
  },
  
  // Atualizar um produto existente
  async updateProduct(id, produtoData) {
    this._logOperation('updateProduct', `Iniciando atualização do produto ID: ${id}`);
    
    try {
      // Verificar inicialização do Firebase e autenticação (ambos necessários para escrita)
      this._checkFirebaseInit();
      this._checkAuthentication();
      
      // Validações básicas
      if (!id) {
        throw new Error("ID do produto é obrigatório para atualização");
      }
      
      if (!produtoData.nome) {
        throw new Error("Nome do produto é obrigatório");
      }
      
      // Adicionar timestamp de atualização
      const dataWithTimestamp = {
        ...produtoData,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      this._logOperation('updateProduct', 'Obtendo dados do produto antes da atualização');
      // Obter produto antes da atualização para o log
      const oldProduct = await firestoreDB.collection('produtos').doc(id).get();
      
      if (!oldProduct.exists) {
        throw new Error(`Produto com ID ${id} não encontrado`);
      }
      
      const oldData = oldProduct.exists ? oldProduct.data() : null;
      
      this._logOperation('updateProduct', 'Atualizando produto no Firestore');
      // Atualizar no Firestore
      await firestoreDB.collection('produtos').doc(id).update(dataWithTimestamp);
      
      this._logOperation('updateProduct', 'Registrando log de alteração');
      // Registrar log
      await this.registrarLog('editar', id, produtoData.nome, {
        old: oldData,
        new: produtoData
      });
      
      this._logOperation('updateProduct', 'Operação concluída com sucesso');
      return {
        id,
        ...produtoData
      };
    } catch (error) {
      console.error("Erro ao atualizar produto:", error);
      throw error;
    }
  },
  
  // Excluir um produto
  async deleteProduct(id) {
    this._logOperation('deleteProduct', `Iniciando exclusão do produto ID: ${id}`);
    
    try {
      // Verificar inicialização do Firebase e autenticação (ambos necessários para escrita)
      this._checkFirebaseInit();
      this._checkAuthentication();
      
      // Validações básicas
      if (!id) {
        throw new Error("ID do produto é obrigatório para exclusão");
      }
      
      this._logOperation('deleteProduct', 'Obtendo dados do produto antes da exclusão');
      // Obter produto antes da exclusão para o log
      const product = await firestoreDB.collection('produtos').doc(id).get();
      
      if (!product.exists) {
        throw new Error(`Produto com ID ${id} não encontrado`);
      }
      
      const produtoData = product.exists ? product.data() : null;
      
      this._logOperation('deleteProduct', 'Excluindo produto do Firestore');
      // Excluir do Firestore
      await firestoreDB.collection('produtos').doc(id).delete();
      
      this._logOperation('deleteProduct', 'Registrando log de exclusão');
      // Registrar log
      if (produtoData) {
        await this.registrarLog('excluir', id, produtoData.nome, produtoData);
      }
      
      this._logOperation('deleteProduct', 'Operação concluída com sucesso');
      return true;
    } catch (error) {
      console.error("Erro ao excluir produto:", error);
      throw error;
    }
  },
  
  // Obter um produto específico pelo ID
  async getProduct(id) {
    try {
      const doc = await firestoreDB.collection('produtos').doc(id).get();
      
      if (doc.exists) {
        return {
          id: doc.id,
          ...doc.data()
        };
      }
      
      return null;
    } catch (error) {
      console.error("Erro ao buscar produto:", error);
      throw error;
    }
  },
  
  // Registrar log de atividade
  async registrarLog(tipo, produtoId, nomeProduto, detalhes) {
    try {
      const logData = {
        tipo,
        produtoId,
        nomeProduto,
        detalhes,
        data: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      await firestoreDB.collection('logs_atividade').add(logData);
      return true;
    } catch (error) {
      console.error("Erro ao registrar log:", error);
      return false;
    }
  },
  
  // Obter logs de atividade
  async getLogs() {
    try {
      const snapshot = await firestoreDB.collection('logs_atividade')
        .orderBy('data', 'desc')
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Erro ao buscar logs:", error);
      return [];
    }
  }
};

// API Estatísticas
const firebaseStats = {
  // Obter estatísticas básicas
  async getBasicStats() {
    try {
      const produtos = await firestoreProducts.getAllProducts();
      
      // Calcular estatísticas
      const totalProdutos = produtos.length;
      const valorTotal = produtos.reduce((sum, p) => sum + (p.preco || 0) * (p.estoque || 0), 0);
      const estoqueBaixo = produtos.filter(p => p.estoque > 0 && p.estoque <= 5).length;
      const estoqueZerado = produtos.filter(p => !p.estoque || p.estoque === 0).length;
      
      // Obter distribuição por categoria
      const categoriasMap = new Map();
      produtos.forEach(produto => {
        if (produto.categoria) {
          if (categoriasMap.has(produto.categoria)) {
            categoriasMap.set(produto.categoria, categoriasMap.get(produto.categoria) + 1);
          } else {
            categoriasMap.set(produto.categoria, 1);
          }
        }
      });
      
      const distribuicaoCategorias = Array.from(categoriasMap.entries())
        .map(([categoria, count]) => ({ categoria, count }))
        .sort((a, b) => b.count - a.count);
      
      // Produtos com maior estoque
      const maioresEstoques = [...produtos]
        .sort((a, b) => (b.estoque || 0) - (a.estoque || 0))
        .slice(0, 10);
      
      return {
        totalProdutos,
        valorTotal,
        estoqueBaixo,
        estoqueZerado,
        distribuicaoCategorias,
        maioresEstoques
      };
    } catch (error) {
      console.error("Erro ao obter estatísticas:", error);
      return {
        totalProdutos: 0,
        valorTotal: 0,
        estoqueBaixo: 0,
        estoqueZerado: 0,
        distribuicaoCategorias: [],
        maioresEstoques: []
      };
    }
  },
  
  // Obter todas as categorias
  async getAllCategories() {
    try {
      const produtos = await firestoreProducts.getAllProducts();
      
      // Extrair categorias únicas
      const categoriasSet = new Set();
      produtos.forEach(produto => {
        if (produto.categoria) {
          categoriasSet.add(produto.categoria);
        }
      });
      
      return Array.from(categoriasSet).sort();
    } catch (error) {
      console.error("Erro ao obter categorias:", error);
      return [];
    }
  },
  
  // Obter todas as tags
  async getAllTags() {
    try {
      const produtos = await firestoreProducts.getAllProducts();
      
      // Extrair tags únicas
      const tagsSet = new Set();
      produtos.forEach(produto => {
        if (produto.tags && Array.isArray(produto.tags)) {
          produto.tags.forEach(tag => tagsSet.add(tag));
        }
      });
      
      return Array.from(tagsSet).sort();
    } catch (error) {
      console.error("Erro ao obter tags:", error);
      return [];
    }
  }
};