// Configuração do Firebase (v8 CDN)
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
    
    // Configurar o listener de autenticação
    firebaseAuth.onAuthStateChanged((user) => {
      console.log("Estado de autenticação alterado:", user ? "Usuário autenticado" : "Usuário não autenticado");
      
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
        
        // Redirecionar baseado no tipo de usuário e localização atual
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
    
    // Criar produto
    async createProduct(produto) {
      try {
        const docRef = await db.collection('produtos').add({
          ...produto,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Registrar log
        await this.registrarLog('criar', docRef.id, produto.nome, produto);
        
        return docRef.id;
      } catch (error) {
        console.error("Erro ao criar produto:", error);
        throw error;
      }
    },
    
    // Atualizar produto
    async updateProduct(id, produto) {
      try {
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
        await db.collection('logs_atividade').add({
          tipo: tipo,
          produto_id: produtoId,
          nome_produto: nomeProduto,
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

// Inicializa o Firebase quando o script é carregado
(function() {
  try {
    // Inicializar Firebase
    initializeFirebase();
    
    // Verificar se estamos na página de admin
    if (window.location.pathname === '/admin') {
      console.log("Verificando autorização para acessar a página de administração...");
      
      // Pequeno atraso para garantir que o Firebase foi inicializado
      setTimeout(async () => {
        if (firebase && firebase.auth) {
          try {
            // Verificar se o usuário atual tem permissão de administrador
            const currentUser = firebase.auth().currentUser;
            
            if (currentUser && currentUser.email) {
              if (currentUser.email === ADMIN_EMAIL) {
                console.log("Acesso permitido para o administrador:", currentUser.email);
              } else {
                console.log("Acesso negado para usuário não-admin:", currentUser.email);
                alert("Você não tem permissão para acessar esta área.");
                window.location.href = '/loja';
              }
            } else {
              console.log("Usuário não autenticado tentando acessar a área restrita");
              alert("Você precisa fazer login como administrador para acessar esta área.");
              window.location.href = '/login';
            }
          } catch (error) {
            console.error("Erro ao verificar permissão:", error);
          }
        }
      }, 1000);
    } else if (window.location.pathname === '/login') {
      // Na página de login, verificamos se já temos um usuário autenticado
      setTimeout(async () => {
        if (firebase && firebase.auth) {
          const currentUser = firebase.auth().currentUser;
          
          if (currentUser) {
            console.log("Usuário já autenticado:", currentUser.email);
            // Redirecionar para a página apropriada
            if (currentUser.email === ADMIN_EMAIL) {
              window.location.href = '/admin';
            } else {
              window.location.href = '/loja';
            }
          } else {
            console.log("Nenhum usuário autenticado, permanecendo na página de login");
          }
        }
      }, 1000);
    }
  } catch (error) {
    console.error("Erro ao inicializar Firebase:", error);
  }
})();

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
        role: email === ADMIN_EMAIL ? 'admin' : 'user',
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
      if (email === ADMIN_EMAIL) {
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
    return user.email === ADMIN_EMAIL;
  },
  
  // Obter usuário atual
  getCurrentUser() {
    return firebase.auth().currentUser;
  }
};