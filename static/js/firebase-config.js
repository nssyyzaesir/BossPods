// Configuração do Firebase (v8 CDN)
const firebaseConfig = {
  apiKey: "AIzaSyCl_NEvqOLaHjbhx3pDfnZrhBR4iqav9h8",
  authDomain: "bosspods.firebaseapp.com",
  projectId: "bosspods",
  storageBucket: "bosspods.appspot.com", // Corrigido para o domínio correto
  messagingSenderId: "319819159324",
  appId: "1:319819159324:web:953f64130fe51842600cd9"
};

// Credenciais do administrador
const ADMIN_UID = '96rupqrpWjbyKtSksDaISQ94y6l2';

// Configurações de autenticação globais
const AUTH_CONFIG = {
  ADMIN_UID: ADMIN_UID
};

// Variáveis globais para acesso ao Firebase
let firebaseInitialized = false;
let firestoreDB = null;
let firebaseAuth = null;

// API para produtos e logs
let firestoreProducts = null;
let firebaseStats = null;

// Função para inicializar Firebase
function initializeFirebase() {
  console.log("Inicializando Firebase...");
  
  try {
    // Verificar se o Firebase já foi inicializado
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
      console.log("Firebase App inicializado com sucesso");
    } else {
      console.log("Firebase App já está inicializado");
    }
    
    // Inicializar Authentication
    firebaseAuth = firebase.auth();
    console.log("Firebase Auth inicializado");
    
    // Inicializar Firestore
    firestoreDB = firebase.firestore();
    console.log("Firebase Firestore inicializado");
    
    // Inicializar produtos e stats API
    firestoreProducts = createProductsAPI(firestoreDB);
    firebaseStats = createStatsAPI(firestoreDB);
    
    // Configurar estado de persistência para continuar logado
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .then(() => {
        console.log("Persistência de autenticação configurada com sucesso");
      })
      .catch((error) => {
        console.error("Erro ao configurar persistência:", error);
      });
    
    // Marcar como inicializado
    firebaseInitialized = true;
    console.log("Firebase completamente inicializado com sucesso");
    
  } catch (error) {
    console.error("Erro ao inicializar Firebase:", error);
    firebaseInitialized = false;
  }
}

// Criar API para produtos
function createProductsAPI(db) {
  return {
    // Obter todos os produtos
    async getAllProducts() {
      try {
        const snapshot = await db.collection('produtos').get();
        
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error("Erro ao buscar produtos:", error);
        return [];
      }
    },
    
    // Obter um produto específico
    async getProduct(id) {
      try {
        const doc = await db.collection('produtos').doc(id).get();
        
        if (doc.exists) {
          return {
            id: doc.id,
            ...doc.data()
          };
        } else {
          return null;
        }
      } catch (error) {
        console.error("Erro ao buscar produto:", error);
        return null;
      }
    },
    
    // Criar produto (compatibilidade com código existente)
    async addProduct(produto) {
      return this.createProduct(produto);
    },
    
    // Criar produto
    async createProduct(produto) {
      try {
        // Verificar se usuário é admin
        const currentUser = firebase.auth().currentUser;
        if (!currentUser || currentUser.uid !== ADMIN_UID) {
          throw new Error("Permissão negada: apenas administradores podem criar produtos");
        }
        
        const docRef = await db.collection('produtos').add({
          ...produto,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Registrar log
        await this.registrarLog('criar', docRef.id, produto.nome, produto);
        
        return {
          id: docRef.id,
          ...produto
        };
      } catch (error) {
        console.error("Erro ao criar produto:", error);
        throw error;
      }
    },
    
    // Atualizar produto
    async updateProduct(id, produto) {
      try {
        // Verificar se usuário é admin
        const currentUser = firebase.auth().currentUser;
        if (!currentUser || currentUser.uid !== ADMIN_UID) {
          throw new Error("Permissão negada: apenas administradores podem atualizar produtos");
        }
        
        await db.collection('produtos').doc(id).update({
          ...produto,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Registrar log
        await this.registrarLog('editar', id, produto.nome, produto);
        
        return true;
      } catch (error) {
        console.error("Erro ao atualizar produto:", error);
        throw error;
      }
    },
    
    // Excluir produto
    async deleteProduct(id, nomeProduto) {
      try {
        // Verificar se usuário é admin
        const currentUser = firebase.auth().currentUser;
        if (!currentUser || currentUser.uid !== ADMIN_UID) {
          throw new Error("Permissão negada: apenas administradores podem excluir produtos");
        }
        
        // Obter nome do produto se não foi fornecido
        if (!nomeProduto) {
          const doc = await db.collection('produtos').doc(id).get();
          if (doc.exists) {
            nomeProduto = doc.data().nome || 'Produto sem nome';
          } else {
            nomeProduto = 'Produto não encontrado';
          }
        }
        
        await db.collection('produtos').doc(id).delete();
        
        // Registrar log
        await this.registrarLog('excluir', id, nomeProduto, { id, nome: nomeProduto });
        
        return true;
      } catch (error) {
        console.error("Erro ao excluir produto:", error);
        throw error;
      }
    },
    
    // Registrar um log de atividade
    async registrarLog(tipo, produtoId, nomeProduto, detalhes) {
      try {
        // Verificar se usuário está autenticado
        const currentUser = firebase.auth().currentUser;
        const userEmail = currentUser ? currentUser.email : 'sistema';
        
        await db.collection('logs_atividade').add({
          tipo: tipo,
          produto_id: produtoId,
          nome_produto: nomeProduto,
          usuario: userEmail,
          detalhes: JSON.stringify(detalhes),
          data: firebase.firestore.FieldValue.serverTimestamp()
        });
        return true;
      } catch (error) {
        console.error("Erro ao registrar log:", error);
        return false;
      }
    },
    
    // Obter logs
    async getLogs() {
      try {
        // Verificar se usuário é admin
        const currentUser = firebase.auth().currentUser;
        if (!currentUser || currentUser.uid !== ADMIN_UID) {
          console.error("Permissão negada: apenas administradores podem visualizar logs");
          return [];
        }
        
        const snapshot = await db.collection('logs_atividade')
          .orderBy('data', 'desc')
          .limit(100)
          .get();
          
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          data: doc.data().data ? doc.data().data.toDate() : new Date()
        }));
      } catch (error) {
        console.error("Erro ao buscar logs:", error);
        return [];
      }
    },
    
    // Escutar mudanças nos produtos
    listenToProducts(callback) {
      try {
        return db.collection('produtos').onSnapshot(snapshot => {
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
        return () => {}; // Unsubscribe vazio
      }
    }
  };
}

// Criar API para estatísticas
function createStatsAPI(db) {
  return {
    // Obter estatísticas básicas
    async getBasicStats() {
      try {
        // Verificar autenticação
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) {
          console.error("Usuário não autenticado para obter estatísticas");
          return {
            totalProdutos: 0,
            valorTotal: 0,
            estoqueBaixo: 0,
            estoqueZerado: 0,
            maioresEstoques: []
          };
        }
        
        // Buscar todos os produtos
        const snapshot = await db.collection('produtos').get();
        const produtos = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Calcular estatísticas
        let valorTotal = 0;
        let estoqueBaixo = 0;
        let estoqueZerado = 0;
        
        // Produtos ordenados por estoque (maior para menor)
        const produtosOrdenadosPorEstoque = [...produtos].sort((a, b) => (b.estoque || 0) - (a.estoque || 0));
        
        // Maiores estoques (top 5)
        const maioresEstoques = produtosOrdenadosPorEstoque.slice(0, 5);
        
        produtos.forEach(produto => {
          // Valor total em estoque
          valorTotal += (produto.preco || 0) * (produto.estoque || 0);
          
          // Estoque baixo (menos de 5 unidades, mas não zero)
          if (produto.estoque !== undefined && produto.estoque > 0 && produto.estoque < 5) {
            estoqueBaixo++;
          }
          
          // Estoque zerado
          if (produto.estoque === 0 || produto.estoque === undefined) {
            estoqueZerado++;
          }
        });
        
        return {
          totalProdutos: produtos.length,
          valorTotal,
          estoqueBaixo,
          estoqueZerado,
          maioresEstoques
        };
      } catch (error) {
        console.error("Erro ao obter estatísticas:", error);
        return {
          totalProdutos: 0,
          valorTotal: 0,
          estoqueBaixo: 0,
          estoqueZerado: 0,
          maioresEstoques: []
        };
      }
    },
    
    // Obter todas as categorias
    async getAllCategories() {
      try {
        const snapshot = await db.collection('produtos').get();
        const produtos = snapshot.docs.map(doc => doc.data());
        
        // Extrair categorias únicas
        const categoriasSet = new Set();
        produtos.forEach(produto => {
          if (produto.categoria) {
            categoriasSet.add(produto.categoria);
          }
        });
        
        return Array.from(categoriasSet);
      } catch (error) {
        console.error("Erro ao buscar categorias:", error);
        return [];
      }
    },
    
    // Obter todas as tags
    async getAllTags() {
      try {
        const snapshot = await db.collection('produtos').get();
        const produtos = snapshot.docs.map(doc => doc.data());
        
        // Extrair tags únicas
        const tagsSet = new Set();
        produtos.forEach(produto => {
          if (produto.tags && Array.isArray(produto.tags)) {
            produto.tags.forEach(tag => tagsSet.add(tag));
          }
        });
        
        return Array.from(tagsSet);
      } catch (error) {
        console.error("Erro ao buscar tags:", error);
        return [];
      }
    }
  };
}

// API Firebase Auth
const firebaseAuthAPI = {
  // Registrar um novo usuário
  async register(email, password, displayName = null) {
    try {
      if (!firebaseInitialized) {
        throw new Error("Firebase não está inicializado");
      }
      
      // Criar usuário no Firebase Auth
      const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
      
      // Atualizar perfil com o nome
      if (displayName) {
        await userCredential.user.updateProfile({
          displayName: displayName
        });
      }
      
      // Criar documento do usuário no Firestore
      await firebase.firestore().collection('users').doc(userCredential.user.uid).set({
        email: email,
        displayName: displayName || email.split('@')[0],
        role: userCredential.user.uid === ADMIN_UID ? 'admin' : 'user',
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
      if (!firebaseInitialized) {
        throw new Error("Firebase não está inicializado");
      }
      
      // Login no Firebase Auth
      const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
      
      // Verificar se é o admin
      if (userCredential.user.uid === ADMIN_UID) {
        // Atualizar perfil e permissões no Firestore
        await firebase.firestore().collection('users').doc(userCredential.user.uid).set({
          email: email,
          role: 'admin',
          lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } else {
        // Atualizar último login para usuários normais
        await firebase.firestore().collection('users').doc(userCredential.user.uid).set({
          lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }
      
      return userCredential.user;
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      throw error;
    }
  },
  
  // Fazer logout
  async logout() {
    try {
      await firebase.auth().signOut();
      return true;
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      throw error;
    }
  },
  
  // Verificar se um usuário é admin
  async isAdmin(user) {
    if (!user) return false;
    return user.uid === ADMIN_UID;
  },
  
  // Obter usuário atual
  getCurrentUser() {
    return firebase.auth().currentUser;
  }
};

// Verificar se usuário logado é admin
function isAdminUser(user) {
  // Se não tiver usuário, não é admin
  if (!user) return false;
  
  // Verifica o UID do usuário
  return user.uid === ADMIN_UID;
}

// Inicializa o Firebase quando o script é carregado
(function() {
  try {
    // Inicializar Firebase
    initializeFirebase();
    
    console.log("Firebase configurado e APIs inicializadas");
  } catch (error) {
    console.error("Erro ao inicializar Firebase:", error);
  }
})();