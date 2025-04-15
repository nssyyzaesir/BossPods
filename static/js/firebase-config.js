// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCl_NEvqOLaHjbhx3pDfnZrhBR4iqav9h8",
  authDomain: "bosspods.firebaseapp.com",
  projectId: "bosspods",
  storageBucket: "bosspods.firebasestorage.app",
  messagingSenderId: "319819159324",
  appId: "1:319819159324:web:953f64130fe51842600cd9"
};

// Variáveis de estado do Firebase
let firebaseInitialized = false;
let firestoreDB = null;
let firebaseAuth = null;
let localDevMode = false; // Usando Firebase real com as credenciais fornecidas
let currentUser = null;
let authInitialized = false;
let dbInitialized = false;

// Inicialização do Firebase (na ordem correta)
console.log("Inicializando Firebase...");

try {
  // 1. Inicializar o app Firebase
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase App inicializado com sucesso");
  } else {
    console.log("Firebase App já estava inicializado");
  }
  
  // 2. Inicializar Authentication
  firebaseAuth = firebase.auth();
  console.log("Firebase Auth inicializado");
  
  // 3. Inicializar Firestore
  firestoreDB = firebase.firestore();
  console.log("Firestore inicializado");
  
  // 4. Configurar o listener de autenticação
  firebaseAuth.onAuthStateChanged((user) => {
    console.log("Estado de autenticação alterado:", user ? "Usuário autenticado" : "Usuário não autenticado");
    currentUser = user;
    authInitialized = true;
    
    // Atualizar estado
    if (user) {
      console.log("Usuário autenticado:", user.email);
      localStorage.setItem('currentUser', JSON.stringify({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      }));
      localStorage.setItem('lastLoginTime', new Date().getTime());
    }
  });
  
  // Marcar como inicializado
  firebaseInitialized = true;
  dbInitialized = true;
  // Usar Firebase real com as credenciais fornecidas
  localDevMode = false;
  
  console.log("Firebase completamente inicializado com sucesso");
} catch (error) {
  console.error("Erro ao inicializar Firebase:", error);
  console.warn("Usando modo de desenvolvimento local devido ao erro");
  firebaseInitialized = false;
  localDevMode = true;
}

// API Firebase Auth
const firebaseAuthAPI = {
  // Registrar um novo usuário
  async register(email, password, displayName = null) {
    if (!localDevMode) {
      try {
        // Criar usuário no Firebase Auth
        const userCredential = await firebaseAuth.createUserWithEmailAndPassword(email, password);
        
        // Atualizar nome de exibição
        if (displayName) {
          await userCredential.user.updateProfile({
            displayName: displayName
          });
        }
        
        // Criar documento do usuário no Firestore com role admin (para que o usuário possa acessar o painel)
        await firestoreDB.collection('users').doc(userCredential.user.uid).set({
          email: email,
          displayName: displayName || "",
          role: 'admin', // Definindo como admin automaticamente
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        return userCredential.user;
      } catch (error) {
        console.error("Erro ao registrar usuário:", error);
        throw error;
      }
    } else {
      // Modo de desenvolvimento local
      return await fakeAuth.register(email, password, displayName);
    }
  },
  
  // Login de usuário
  async login(email, password) {
    if (!localDevMode) {
      try {
        const userCredential = await firebaseAuth.signInWithEmailAndPassword(email, password);
        return userCredential.user;
      } catch (error) {
        console.error("Erro ao fazer login:", error);
        throw error;
      }
    } else {
      // Modo de desenvolvimento local
      return await fakeAuth.login(email, password);
    }
  },
  
  // Verificar se um usuário está autenticado
  async getCurrentUser() {
    if (!localDevMode) {
      return new Promise((resolve, reject) => {
        const unsubscribe = firebaseAuth.onAuthStateChanged(user => {
          unsubscribe();
          resolve(user);
        }, reject);
      });
    } else {
      // Modo de desenvolvimento local
      return fakeAuth.getCurrentUser();
    }
  },
  
  // Verificar se um usuário é admin
  async isAdmin(user) {
    if (!user) return false;
    
    if (!localDevMode) {
      try {
        const userDoc = await firestoreDB.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
          return userDoc.data().role === 'admin';
        }
        return false;
      } catch (error) {
        console.error("Erro ao verificar role do usuário:", error);
        return false;
      }
    } else {
      // Modo de desenvolvimento local
      return fakeAuth.isUserAdmin(user.uid);
    }
  },
  
  // Fazer logout
  async logout() {
    if (!localDevMode) {
      try {
        await firebaseAuth.signOut();
        return true;
      } catch (error) {
        console.error("Erro ao fazer logout:", error);
        throw error;
      }
    } else {
      // Modo de desenvolvimento local
      return fakeAuth.logout();
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
    if (!currentUser) {
      console.error("Usuário não autenticado");
      throw new Error("Usuário não autenticado. Faça login novamente.");
    }
  },
  
  // Log de operação com detalhes
  _logOperation(operation, details) {
    console.log(`[${new Date().toISOString()}] Operação ${operation}:`, details);
  },
  
  // Obter todos os produtos
  async getAllProducts() {
    this._logOperation('getAllProducts', 'Iniciando busca de todos os produtos');
    
    if (!localDevMode) {
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
    } else {
      // Modo de desenvolvimento local
      return fakeProducts.getAllProducts();
    }
  },
  
  // Escutar por mudanças nos produtos
  listenToProducts(callback) {
    if (!localDevMode) {
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
    } else {
      // Modo de desenvolvimento local
      fakeProducts.mockListener(callback);
      return () => {}; // Unsubscribe vazio
    }
  },
  
  // Adicionar um novo produto
  async addProduct(produtoData) {
    this._logOperation('addProduct', 'Iniciando adição de produto');
    console.log("Chamada de addProduct recebida com dados:", produtoData);
    
    if (!localDevMode) {
      console.log("Modo Firebase: Tentando adicionar produto ao Firestore");
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
    } else {
      // Modo de desenvolvimento local
      console.log("Modo local: Adicionando produto ao fakeProducts");
      try {
        // Validar dados mínimos necessários
        if (!produtoData.nome) {
          console.error("Erro: Nome do produto é obrigatório");
          throw new Error("Nome do produto é obrigatório");
        }
        
        // Verificar se fakeProducts está disponível
        if (!fakeProducts) {
          console.error("Erro: fakeProducts não está definido");
          throw new Error("Sistema de produtos não está disponível");
        }
        
        // Chamar método da implementação local
        const resultado = fakeProducts.addProduct(produtoData);
        console.log("Produto adicionado com sucesso no modo local:", resultado);
        return resultado;
      } catch (error) {
        console.error("Erro ao adicionar produto no modo local:", error);
        console.error("Detalhes do erro:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
        throw error;
      }
    }
  },
  
  // Atualizar um produto existente
  async updateProduct(id, produtoData) {
    this._logOperation('updateProduct', `Iniciando atualização do produto ID: ${id}`);
    
    if (!localDevMode) {
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
    } else {
      // Modo de desenvolvimento local
      return fakeProducts.updateProduct(id, produtoData);
    }
  },
  
  // Excluir um produto
  async deleteProduct(id) {
    this._logOperation('deleteProduct', `Iniciando exclusão do produto ID: ${id}`);
    
    if (!localDevMode) {
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
    } else {
      // Modo de desenvolvimento local
      return fakeProducts.deleteProduct(id);
    }
  },
  
  // Obter um produto específico pelo ID
  async getProduct(id) {
    if (!localDevMode) {
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
    } else {
      // Modo de desenvolvimento local
      return fakeProducts.getProduct(id);
    }
  },
  
  // Registrar log de atividade
  async registrarLog(tipo, produtoId, nomeProduto, detalhes) {
    if (!localDevMode) {
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
    } else {
      // Modo de desenvolvimento local
      return fakeProducts.registrarLog(tipo, produtoId, nomeProduto, detalhes);
    }
  },
  
  // Obter logs de atividade
  async getLogs() {
    if (!localDevMode) {
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
    } else {
      // Modo de desenvolvimento local
      return fakeProducts.getLogs();
    }
  }
};

// API Estatísticas
const firebaseStats = {
  // Obter estatísticas básicas
  async getBasicStats() {
    if (!localDevMode) {
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
    } else {
      // Modo de desenvolvimento local
      return fakeStats.getBasicStats();
    }
  },
  
  // Obter todas as categorias
  async getAllCategories() {
    if (!localDevMode) {
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
    } else {
      // Modo de desenvolvimento local
      return fakeStats.getAllCategories();
    }
  },
  
  // Obter todas as tags
  async getAllTags() {
    if (!localDevMode) {
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
    } else {
      // Modo de desenvolvimento local
      return fakeStats.getAllTags();
    }
  }
};

// ---------------------------------------------------
// Implementações de modo de desenvolvimento local
// ---------------------------------------------------

console.log("Inicializando em modo de desenvolvimento local (sem Firebase)");

// Simulação de autenticação local
const fakeAuth = {
  users: [
    {
      uid: 'admin123',
      email: 'admin@bosspods.com',
      password: 'admin123',
      displayName: 'Administrador',
      role: 'admin'
    },
    {
      uid: 'admin456',
      email: 'nsyz@gmail.com',
      password: 'nsyz123',
      displayName: 'Novo Administrador',
      role: 'admin'
    },
    {
      uid: 'user123',
      email: 'user@example.com',
      password: 'user123',
      displayName: 'Usuário Teste',
      role: 'user'
    }
  ],
  
  // Inicializar currentUser com dados do localStorage, se disponível e se o token não estiver expirado
  currentUser: (() => {
    try {
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        // Verificar se o token expirou (considerando validade de 1 hora = 3600000 ms)
        const lastLogin = localStorage.getItem('lastLoginTime');
        if (lastLogin) {
          const loginTime = parseInt(lastLogin, 10);
          const currentTime = new Date().getTime();
          // Se passou mais de 1 hora, invalidar a sessão
          if (currentTime - loginTime > 3600000) {
            console.log('Sessão expirada, removendo dados de autenticação');
            localStorage.removeItem('currentUser');
            localStorage.removeItem('lastLoginTime');
            return null;
          }
        } else {
          // Se não tem timestamp de login, também invalidar
          localStorage.removeItem('currentUser');
          return null;
        }
        return parsedUser;
      }
      return null;
    } catch (e) {
      console.error('Erro ao recuperar usuário do localStorage:', e);
      localStorage.removeItem('currentUser');
      localStorage.removeItem('lastLoginTime');
      return null;
    }
  })(),
  
  // Função para salvar o usuário atual no localStorage
  _saveCurrentUser() {
    if (this.currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
      console.log('Usuário salvo no localStorage:', this.currentUser.email);
    } else {
      localStorage.removeItem('currentUser');
      console.log('Dados de usuário removidos do localStorage');
    }
  },
  
  async register(email, password, displayName = null) {
    // Verificar se o email já existe
    const existingUser = this.users.find(u => u.email === email);
    if (existingUser) {
      throw new Error('Email já registrado');
    }
    
    // Criar novo usuário
    const newUser = {
      uid: 'user' + Date.now(),
      email,
      password,
      displayName: displayName || email.split('@')[0],
      role: 'user'
    };
    
    // Adicionar à lista
    this.users.push(newUser);
    
    // Definir usuário atual
    this.currentUser = { ...newUser };
    delete this.currentUser.password;
    
    // Salvar no localStorage
    this._saveCurrentUser();
    
    return this.currentUser;
  },
  
  async login(email, password) {
    console.log('Tentando login com email:', email);
    
    // Buscar usuário
    const user = this.users.find(u => u.email === email && u.password === password);
    
    if (!user) {
      console.error('Usuário não encontrado ou senha incorreta');
      throw new Error('Email ou senha inválidos');
    }
    
    console.log('Usuário encontrado:', user.email, 'Role:', user.role);
    
    // Definir usuário atual
    this.currentUser = { ...user };
    delete this.currentUser.password;
    
    // Salvar no localStorage
    this._saveCurrentUser();
    
    // Registrar o timestamp de login
    localStorage.setItem('lastLoginTime', new Date().getTime().toString());
    console.log('Timestamp de login registrado:', new Date().getTime());
    
    return this.currentUser;
  },
  
  async getCurrentUser() {
    console.log('getCurrentUser chamado, usuário atual:', this.currentUser?.email || 'nenhum');
    return this.currentUser;
  },
  
  isUserAdmin(uid) {
    const user = this.users.find(u => u.uid === uid);
    const isAdmin = user && user.role === 'admin';
    console.log('Verificando se usuário é admin:', uid, isAdmin);
    return isAdmin;
  },
  
  async logout() {
    console.log('Fazendo logout');
    this.currentUser = null;
    
    // Remover do localStorage
    this._saveCurrentUser();
    
    // Remover timestamp de login
    localStorage.removeItem('lastLoginTime');
    console.log('Timestamp de login removido');
    
    return true;
  }
};

// Simulação de produtos no modo local
const fakeProducts = {
  produtos: [
    {
      id: 'prod1',
      nome: 'BOSSPODS Pro',
      categoria: 'Fones',
      preco: 399.90,
      estoque: 15,
      imagem: 'https://i.imgur.com/3MDt9Ki.png',
      descricao: 'Fones de ouvido wireless com cancelamento de ruído ativo e qualidade sonora superior. Autonomia de até 24 horas com o estojo de recarga.',
      tags: ['wireless', 'premium', 'cancelamento de ruído'],
      em_promocao: false,
      createdAt: new Date('2025-03-15')
    },
    {
      id: 'prod2',
      nome: 'BOSSPODS Air',
      categoria: 'Fones',
      preco: 299.90,
      estoque: 8,
      imagem: 'https://i.imgur.com/0VqQhQX.png',
      descricao: 'Versão compacta com excelente qualidade sonora e design inovador. Bateria de longa duração e estojo de recarga compacto.',
      tags: ['wireless', 'compacto'],
      em_promocao: true,
      createdAt: new Date('2025-03-20')
    },
    {
      id: 'prod3',
      nome: 'BOSSPODS Studio',
      categoria: 'Headphones',
      preco: 599.90,
      estoque: 5,
      imagem: 'https://i.imgur.com/OPdKCOJ.png',
      descricao: 'Headphones over-ear de qualidade profissional para estúdio. Som cristalino e estrutura robusta para uso intenso.',
      tags: ['estúdio', 'profissional', 'premium'],
      em_promocao: false,
      createdAt: new Date('2025-03-25')
    },
    {
      id: 'prod4',
      nome: 'BOSSPODS Sport',
      categoria: 'Fones',
      preco: 249.90,
      estoque: 0,
      imagem: 'https://i.imgur.com/Lx9tgxO.png',
      descricao: 'Fones de ouvido resistentes à água e suor, perfeitos para a prática de esportes. Design anatômico que não cai durante exercícios.',
      tags: ['esporte', 'resistente à água'],
      em_promocao: false,
      createdAt: new Date('2025-03-27')
    },
    {
      id: 'prod5',
      nome: 'BOSSPODS Mini',
      categoria: 'Fones',
      preco: 199.90,
      estoque: 12,
      imagem: 'https://i.imgur.com/Q2pOb9g.png',
      descricao: 'Versão ultra compacta e leve, perfeita para uso diário. Excelente custo-benefício com qualidade BOSSPODS.',
      tags: ['compacto', 'leve', 'econômico'],
      em_promocao: true,
      createdAt: new Date('2025-04-01')
    }
  ],
  
  logs: [],
  
  listeners: [],
  
  getAllProducts() {
    return [...this.produtos];
  },
  
  mockListener(callback) {
    // Adicionar callback à lista de listeners
    this.listeners.push(callback);
    
    // Chamar imediatamente com dados
    setTimeout(() => {
      callback([...this.produtos]);
    }, 500);
  },
  
  notifyListeners() {
    // Notificar todos os listeners
    this.listeners.forEach(callback => {
      callback([...this.produtos]);
    });
  },
  
  addProduct(produtoData) {
    console.log("fakeProducts: Iniciando addProduct com dados:", produtoData);
    
    try {
      // Validar dados mínimos
      if (!produtoData || !produtoData.nome) {
        const erro = new Error("Dados do produto inválidos. Nome é obrigatório.");
        console.error("Erro na validação dos dados:", erro);
        throw erro;
      }
      
      // Gerar ID único para o produto
      const id = 'prod' + (this.produtos.length + 1) + '_' + Date.now();
      console.log("ID gerado para o novo produto:", id);
      
      // Criar objeto com dados completos do produto
      const novoProduto = {
        id,
        ...produtoData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log("Objeto do novo produto criado:", novoProduto);
      
      // Adicionar à lista de produtos
      this.produtos.push(novoProduto);
      console.log("Produto adicionado à lista. Total de produtos agora:", this.produtos.length);
      
      // Registrar log
      console.log("Registrando log para criação do produto");
      this.registrarLog('criar', id, produtoData.nome, produtoData);
      
      // Notificar listeners sobre a mudança
      console.log("Notificando listeners sobre o novo produto");
      this.notifyListeners();
      
      console.log("Produto criado com sucesso:", novoProduto);
      return novoProduto;
    } catch (error) {
      console.error("Erro crítico ao adicionar produto no fakeProducts:", error);
      console.error("Detalhes do erro:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
      throw error;
    }
  },
  
  updateProduct(id, produtoData) {
    const index = this.produtos.findIndex(p => p.id === id);
    
    if (index === -1) {
      throw new Error('Produto não encontrado');
    }
    
    const oldData = { ...this.produtos[index] };
    
    // Atualizar produto
    this.produtos[index] = {
      ...this.produtos[index],
      ...produtoData,
      id,
      updatedAt: new Date()
    };
    
    // Registrar log
    this.registrarLog('editar', id, produtoData.nome, {
      old: oldData,
      new: produtoData
    });
    
    // Notificar listeners
    this.notifyListeners();
    
    return { id, ...produtoData };
  },
  
  deleteProduct(id) {
    const index = this.produtos.findIndex(p => p.id === id);
    
    if (index === -1) {
      throw new Error('Produto não encontrado');
    }
    
    const produtoRemovido = this.produtos[index];
    
    // Remover produto
    this.produtos.splice(index, 1);
    
    // Registrar log
    this.registrarLog('excluir', id, produtoRemovido.nome, produtoRemovido);
    
    // Notificar listeners
    this.notifyListeners();
    
    return true;
  },
  
  getProduct(id) {
    return this.produtos.find(p => p.id === id) || null;
  },
  
  registrarLog(tipo, produtoId, nomeProduto, detalhes) {
    const log = {
      id: 'log' + (this.logs.length + 1),
      tipo,
      produtoId,
      nomeProduto,
      detalhes,
      data: new Date()
    };
    
    this.logs.push(log);
    return true;
  },
  
  getLogs() {
    return [...this.logs].sort((a, b) => b.data - a.data);
  }
};

// Simulação de estatísticas no modo local
const fakeStats = {
  getBasicStats() {
    const produtos = fakeProducts.getAllProducts();
    
    // Estatísticas básicas
    const totalProdutos = produtos.length;
    const valorTotal = produtos.reduce((sum, p) => sum + (p.preco || 0) * (p.estoque || 0), 0);
    const estoqueBaixo = produtos.filter(p => p.estoque > 0 && p.estoque <= 5).length;
    const estoqueZerado = produtos.filter(p => !p.estoque || p.estoque === 0).length;
    
    // Distribuição por categoria
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
  },
  
  getAllCategories() {
    const produtos = fakeProducts.getAllProducts();
    
    // Extrair categorias únicas
    const categoriasSet = new Set();
    produtos.forEach(produto => {
      if (produto.categoria) {
        categoriasSet.add(produto.categoria);
      }
    });
    
    return Array.from(categoriasSet).sort();
  },
  
  getAllTags() {
    const produtos = fakeProducts.getAllProducts();
    
    // Extrair tags únicas
    const tagsSet = new Set();
    produtos.forEach(produto => {
      if (produto.tags && Array.isArray(produto.tags)) {
        produto.tags.forEach(tag => tagsSet.add(tag));
      }
    });
    
    return Array.from(tagsSet).sort();
  }
};