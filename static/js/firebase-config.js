// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCl_NEvqOLaHjbhx3pDfnZrhBR4iqav9h8",
  authDomain: "bosspods-store.firebaseapp.com",
  projectId: "bosspods-store",
  storageBucket: "bosspods-store.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456ghi789jkl"
};

// Inicializar Firebase (com fallback para modo de desenvolvimento local)
let firebaseInitialized = false;
let firestoreDB = null;
let firebaseAuth = null;
let localDevMode = true; // Forçar modo de desenvolvimento local por enquanto

// Deixando comentado para futuro uso real com Firebase
// try {
//   // Inicializar Firebase
//   firebase.initializeApp(firebaseConfig);
//   
//   // Obter instâncias
//   firestoreDB = firebase.firestore();
//   
//   // Autenticação
//   firebaseAuth = firebase.auth();
//   
//   // Marcar como inicializado
//   firebaseInitialized = true;
//   localDevMode = false;
//   
//   console.log("Firebase inicializado com sucesso");
// } catch (error) {
//   console.warn("Erro ao inicializar Firebase, usando modo de desenvolvimento local:", error);
//   firebaseInitialized = false;
//   localDevMode = true;
// }

// Forçando modo de desenvolvimento local
console.log("Utilizando modo de desenvolvimento local para autenticação e armazenamento");

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
        
        // Criar documento do usuário no Firestore com role padrão
        await firestoreDB.collection('users').doc(userCredential.user.uid).set({
          email: email,
          displayName: displayName || "",
          role: 'user',
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
  // Obter todos os produtos
  async getAllProducts() {
    if (!localDevMode) {
      try {
        const snapshot = await firestoreDB.collection('produtos').get();
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error("Erro ao buscar produtos:", error);
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
    if (!localDevMode) {
      try {
        // Adicionar timestamps
        const dataWithTimestamps = {
          ...produtoData,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Adicionar ao Firestore
        const docRef = await firestoreDB.collection('produtos').add(dataWithTimestamps);
        
        // Registrar log
        await this.registrarLog('criar', docRef.id, produtoData.nome, produtoData);
        
        return {
          id: docRef.id,
          ...produtoData
        };
      } catch (error) {
        console.error("Erro ao adicionar produto:", error);
        throw error;
      }
    } else {
      // Modo de desenvolvimento local
      return fakeProducts.addProduct(produtoData);
    }
  },
  
  // Atualizar um produto existente
  async updateProduct(id, produtoData) {
    if (!localDevMode) {
      try {
        // Adicionar timestamp de atualização
        const dataWithTimestamp = {
          ...produtoData,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Obter produto antes da atualização para o log
        const oldProduct = await firestoreDB.collection('produtos').doc(id).get();
        const oldData = oldProduct.exists ? oldProduct.data() : null;
        
        // Atualizar no Firestore
        await firestoreDB.collection('produtos').doc(id).update(dataWithTimestamp);
        
        // Registrar log
        await this.registrarLog('editar', id, produtoData.nome, {
          old: oldData,
          new: produtoData
        });
        
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
    if (!localDevMode) {
      try {
        // Obter produto antes da exclusão para o log
        const product = await firestoreDB.collection('produtos').doc(id).get();
        const produtoData = product.exists ? product.data() : null;
        
        // Excluir do Firestore
        await firestoreDB.collection('produtos').doc(id).delete();
        
        // Registrar log
        if (produtoData) {
          await this.registrarLog('excluir', id, produtoData.nome, produtoData);
        }
        
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
      email: 'gmail@nsyz',
      password: 'admin123',
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
  
  currentUser: null,
  
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
    
    return this.currentUser;
  },
  
  async login(email, password) {
    // Buscar usuário
    const user = this.users.find(u => u.email === email && u.password === password);
    
    if (!user) {
      throw new Error('Email ou senha inválidos');
    }
    
    // Definir usuário atual
    this.currentUser = { ...user };
    delete this.currentUser.password;
    
    return this.currentUser;
  },
  
  async getCurrentUser() {
    return this.currentUser;
  },
  
  isUserAdmin(uid) {
    const user = this.users.find(u => u.uid === uid);
    return user && user.role === 'admin';
  },
  
  async logout() {
    this.currentUser = null;
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
    const id = 'prod' + (this.produtos.length + 1);
    
    const novoProduto = {
      id,
      ...produtoData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.produtos.push(novoProduto);
    
    // Registrar log
    this.registrarLog('criar', id, produtoData.nome, produtoData);
    
    // Notificar listeners
    this.notifyListeners();
    
    return novoProduto;
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