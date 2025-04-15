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

// Variáveis de estado do Firebase
let firebaseInitialized = false;
let firestoreDB = null;
let firebaseAuth = null;

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
  }
};

// API para operações na loja
const firestoreAPI = {
  // Obter todos os produtos
  async getAllProducts() {
    try {
      const snapshot = await firebase.firestore().collection('produtos').get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
      return [];
    }
  },
  
  // Registrar um log de atividade
  async registrarLog(tipo, produtoId, nomeProduto, detalhes) {
    try {
      await firebase.firestore().collection('logs_atividade').add({
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
  
  // Escutar mudanças nos produtos
  listenToProducts(callback) {
    try {
      return firebase.firestore().collection('produtos').onSnapshot(snapshot => {
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