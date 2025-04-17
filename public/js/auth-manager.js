// Gerenciador de autenticação para diferentes páginas
// Verificação de autenticação com Firebase Auth v8

// Configurações de autenticação
const AUTH_CONFIG = {
  // UID do administrador autorizado
  ADMIN_UID: '96rupqrpWjbyKtSksDaISQ94y6l2',
  
  // Rotas que exigem autenticação de administrador
  ADMIN_ROUTES: ['/admin'],
  
  // Rotas que exigem apenas login (qualquer usuário)
  AUTH_ROUTES: ['/admin', '/carrinho', '/loja']
};

// Estado global de autenticação
let currentUser = null;
let authCheckComplete = false;
let authStateListeners = [];

// Verificar se a página atual exige autenticação de administrador
function isAdminRoute() {
  const currentPath = window.location.pathname;
  return AUTH_CONFIG.ADMIN_ROUTES.includes(currentPath);
}

// Verificar se a página atual exige algum tipo de autenticação
function isProtectedRoute() {
  const currentPath = window.location.pathname;
  return AUTH_CONFIG.AUTH_ROUTES.includes(currentPath);
}

// Verificar se o usuário está autenticado como admin
// Primeiro verifica o localStorage para login via UID
// Depois verifica o Firebase Auth para login normal
function checkAdminAuth() {
  // Verificar autenticação via localStorage (login direto por UID)
  const storedAdminUID = localStorage.getItem('adminUID');
  if (storedAdminUID === AUTH_CONFIG.ADMIN_UID) {
    console.log('Usuário autenticado como admin via localStorage UID');
    return true;
  }
  
  // Verificar autenticação via Firebase Auth
  const user = firebase.auth().currentUser;
  if (user && user.uid === AUTH_CONFIG.ADMIN_UID) {
    console.log('Usuário autenticado como admin via Firebase Auth');
    return true;
  }
  
  return false;
}

// Atualizar UI com base no estado de autenticação
function updateAuthUI(user) {
  try {
    // Botão de login/logout em todas as páginas (se existir)
    const loginButton = document.getElementById('loginButton');
    const logoutButton = document.getElementById('logoutButton');
    const authOverlay = document.getElementById('authOverlay');
    
    // Verificar se temos autenticação por UID (admin via UID)
    const storedAdminUID = localStorage.getItem('adminUID');
    const isAuthenticatedByUID = storedAdminUID === AUTH_CONFIG.ADMIN_UID;
    
    // Usuário está autenticado se tiver objeto user OU autenticação por UID
    const isAuthenticated = user || isAuthenticatedByUID;
    
    if (isAuthenticated) {
      // Usuário autenticado (via Firebase ou localStorage)
      if (loginButton) loginButton.classList.add('d-none');
      if (logoutButton) logoutButton.classList.remove('d-none');
      if (authOverlay) authOverlay.style.display = 'none';
    } else {
      // Usuário não autenticado
      if (loginButton) loginButton.classList.remove('d-none');
      if (logoutButton) logoutButton.classList.add('d-none');
      
      // Só mostrar overlay se for uma rota protegida
      if (authOverlay && isProtectedRoute()) {
        authOverlay.style.display = 'flex';
      }
    }
    
    // Botão de admin na loja
    const adminBtn = document.getElementById('adminBtn');
    if (adminBtn) {
      if (isAuthenticatedByUID || (user && user.uid === AUTH_CONFIG.ADMIN_UID)) {
        adminBtn.classList.remove('d-none');
      } else {
        adminBtn.classList.add('d-none');
      }
    }
    
    // Nome do usuário no painel de admin
    const userDisplayName = document.getElementById('userDisplayName');
    if (userDisplayName) {
      if (user) {
        // Usuário autenticado via Firebase
        userDisplayName.textContent = user.displayName || user.email;
      } else if (isAuthenticatedByUID) {
        // Admin autenticado via UID
        userDisplayName.textContent = 'Administrador';
      }
    }
    
    // Chamar listeners adicionais
    authStateListeners.forEach(listener => {
      try {
        listener(user);
      } catch (err) {
        console.error('Erro ao executar listener de autenticação:', err);
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar UI de autenticação:', error);
  }
}

// Verificar autenticação usando Firebase Auth ou localStorage
async function checkAuthentication() {
  // Se a verificação já foi completada, retornar usuário atual
  if (authCheckComplete) {
    return currentUser;
  }
  
  // Se a página não exige autenticação, permitir acesso
  if (!isProtectedRoute()) {
    console.log('Página atual não requer autenticação');
    authCheckComplete = true;
    return true;
  }
  
  // Verificar se temos autenticação por UID de admin no localStorage
  // Isso permite login como admin sem estar autenticado no Firebase
  const storedAdminUID = localStorage.getItem('adminUID');
  if (storedAdminUID === AUTH_CONFIG.ADMIN_UID) {
    console.log('Autenticação admin via localStorage UID encontrada');
    authCheckComplete = true;
    // Permitir acesso a qualquer área protegida para admin (incluindo loja)
    updateAuthUI(null); // Atualizar UI mesmo sem user object
    return true;
  }
  
  try {
    console.log('Verificando autenticação para página protegida...');
    
    // Verificar se o Firebase Auth está disponível
    if (!firebase || !firebase.auth) {
      console.error('Firebase Auth não está disponível');
      redirectToLogin('Erro no sistema de autenticação. Tente novamente mais tarde.');
      return false;
    }
    
    // Esperar pelo estado de autenticação
    return new Promise((resolve) => {
      const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
        unsubscribe(); // Parar de escutar após a primeira verificação
        
        // Salvar usuário atual
        currentUser = user;
        authCheckComplete = true;
        
        // Verificar se há usuário autenticado
        if (!user) {
          console.log('Usuário não autenticado no Firebase, redirecionando para login');
          redirectToLogin('Você precisa fazer login para acessar esta área');
          resolve(false);
          return;
        }
        
        console.log('Usuário autenticado:', user.email, 'UID:', user.uid);
        
        // Se for rota de admin, verificar se o UID é o do administrador
        if (isAdminRoute() && user.uid !== AUTH_CONFIG.ADMIN_UID) {
          console.log('Usuário não é o administrador autorizado');
          showErrorAndRedirect('Você não tem permissão para acessar esta área.', '/loja');
          resolve(false);
          return;
        }
        
        // Atualizar UI
        updateAuthUI(user);
        
        console.log('Autenticação bem-sucedida');
        resolve(true);
      }, (error) => {
        console.error('Erro no listener de autenticação:', error);
        redirectToLogin('Erro ao verificar autenticação. Tente novamente.');
        resolve(false);
      });
    });
    
  } catch (error) {
    console.error('Erro ao verificar autenticação:', error);
    redirectToLogin('Erro ao verificar autenticação. Tente novamente.');
    return false;
  }
}

// Verificar se o usuário é administrador com validação avançada
function isAdminUser(user = currentUser) {
  try {
    // Constantes importantes
    const ADMIN_UID = AUTH_CONFIG.ADMIN_UID;
    
    // Verificar manipulação da constante AUTH_CONFIG
    if (!ADMIN_UID || ADMIN_UID !== '96rupqrpWjbyKtSksDaISQ94y6l2') {
      console.error('Violação de segurança: Tentativa de manipulação da constante AUTH_CONFIG');
      // Registrar tentativa de manipulação (se possível)
      if (window.firestoreProducts && window.firestoreProducts.registrarLog) {
        window.firestoreProducts.registrarLog(
          'seguranca', 
          'N/A', 
          'Verificação de Admin', 
          'Tentativa de manipulação da constante AUTH_CONFIG'
        );
      }
      return false;
    }
    
    // Verificar se temos autenticação por localStorage UID com validação dupla
    const storedAdminUID = localStorage.getItem('adminUID');
    const storedAuthToken = localStorage.getItem('authToken');
    const authTimestamp = localStorage.getItem('lastLoginTime');
    
    if (storedAdminUID === ADMIN_UID) {
      // Verificação adicional: token deve existir e timestamp não pode ser muito antigo
      if (!storedAuthToken) {
        console.warn('Token de autenticação ausente para admin UID');
        return false;
      }
      
      // Verificar se o timestamp existe e não está expirado (24h)
      if (authTimestamp) {
        const lastLoginTime = parseInt(authTimestamp, 10);
        const currentTime = Date.now();
        const MAX_SESSION_TIME = 24 * 60 * 60 * 1000; // 24 horas em milissegundos
        
        if (isNaN(lastLoginTime) || (currentTime - lastLoginTime) > MAX_SESSION_TIME) {
          console.warn('Sessão de admin expirada - necessário novo login');
          // Limpar dados expirados
          localStorage.removeItem('adminUID');
          localStorage.removeItem('authToken');
          localStorage.removeItem('lastLoginTime');
          return false;
        }
      } else {
        // Se não houver timestamp, considerar inválido
        localStorage.removeItem('adminUID');
        localStorage.removeItem('authToken');
        return false;
      }
      
      return true;
    }
    
    // Verificar pelo usuário atual (login normal)
    if (!user) return false;
    
    // Verificação básica de UID
    if (user.uid !== ADMIN_UID) return false;
    
    // Verificação adicional de email verificado (opcional, mas recomendado)
    if (user.emailVerified === false) {
      console.warn('Conta de administrador com email não verificado');
      // Você pode decidir se isso deve impedir o acesso ou apenas registrar
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao verificar admin:', error);
    // Em caso de erro, considerar que não é admin por segurança
    return false;
  }
}

// Adicionar listener para mudanças de autenticação
function addAuthStateListener(listener) {
  if (typeof listener === 'function') {
    authStateListeners.push(listener);
  }
}

// Redirecionar para a página de login com mensagem
function redirectToLogin(message) {
  // Salvar mensagem para ser exibida na página de login
  if (message) {
    localStorage.setItem('auth_error', message);
  }
  
  // Não redirecionar se já estiver na página de login
  if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
    window.location.href = '/';
  } else {
    // Abrir modal de login na página inicial
    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    loginModal.show();
  }
}

// Mostrar mensagem de erro e redirecionar
function showErrorAndRedirect(message, redirectUrl) {
  alert(message);
  window.location.href = redirectUrl;
}

// Função para fazer logout
function logout() {
  if (firebase && firebase.auth) {
    firebase.auth().signOut()
      .then(() => {
        console.log('Logout bem-sucedido');
        // Limpar dados de autenticação local
        localStorage.removeItem('currentUser');
        localStorage.removeItem('lastLoginTime');
        localStorage.removeItem('adminUID'); // Remover identificação de admin
        
        // Redirecionar para a página inicial
        window.location.href = '/';
      })
      .catch((error) => {
        console.error('Erro ao fazer logout:', error);
        alert('Ocorreu um erro ao fazer logout. Tente novamente.');
      });
  } else {
    console.error('Firebase Auth não está disponível para logout');
    alert('Erro no sistema de autenticação. Tente novamente mais tarde.');
  }
}

// Função para verificar se uma função protegida pode ser executada
// Útil para proteger funções admin como criar produto, editar estoque, etc.
// Inclui registro de tentativas e verificações de segurança avançadas
function canExecuteAdminFunction(operation = 'operação administrativa') {
  try {
    // Verificar manipulação da constante AUTH_CONFIG
    if (AUTH_CONFIG.ADMIN_UID !== '96rupqrpWjbyKtSksDaISQ94y6l2') {
      console.error('Violação de segurança: Tentativa de manipulação da constante AUTH_CONFIG');
      
      // Registrar tentativa de manipulação (se possível)
      if (window.firestoreProducts && window.firestoreProducts.registrarLog) {
        window.firestoreProducts.registrarLog(
          'seguranca', 
          'N/A', 
          'Verificação de Permissão', 
          `Tentativa de manipulação da constante AUTH_CONFIG durante ${operation}`
        );
      }
      
      // Alertar sobre a tentativa
      alert('Erro de segurança detectado. Esta ação foi registrada.');
      return false;
    }
    
    // Verificar se temos autenticação via UID no localStorage com validações extras
    const storedAdminUID = localStorage.getItem('adminUID');
    const storedAuthToken = localStorage.getItem('authToken');
    const authTimestamp = localStorage.getItem('lastLoginTime');
    
    if (storedAdminUID === AUTH_CONFIG.ADMIN_UID) {
      // Verificar token e timestamp
      if (!storedAuthToken || !authTimestamp) {
        console.warn('Token ou timestamp ausente para execução de função admin');
        alert('Sua sessão está incompleta. Faça login novamente.');
        
        // Limpar dados de autenticação incompletos
        localStorage.removeItem('adminUID');
        localStorage.removeItem('authToken');
        localStorage.removeItem('lastLoginTime');
        
        return false;
      }
      
      // Verificar expiração do timestamp (24h)
      const lastLoginTime = parseInt(authTimestamp, 10);
      const currentTime = Date.now();
      const MAX_SESSION_TIME = 24 * 60 * 60 * 1000; // 24 horas em milissegundos
      
      if (isNaN(lastLoginTime) || (currentTime - lastLoginTime) > MAX_SESSION_TIME) {
        console.warn('Sessão de admin expirada ao tentar executar operação');
        alert('Sua sessão expirou. Faça login novamente para continuar.');
        
        // Limpar dados expirados
        localStorage.removeItem('adminUID');
        localStorage.removeItem('authToken');
        localStorage.removeItem('lastLoginTime');
        
        return false;
      }
      
      // Registrar operação (opcional)
      if (window.firestoreProducts && window.firestoreProducts.registrarLog) {
        window.firestoreProducts.registrarLog(
          'admin', 
          'N/A', 
          'Operação Admin', 
          `Operação administrativa "${operation}" executada via UID`
        );
      }
      
      console.log(`Permissão concedida para operação administrativa "${operation}" via localStorage UID`);
      return true;
    }
    
    // Verificar se tem um usuário logado via Firebase Auth
    if (!currentUser) {
      console.warn(`Tentativa de executar "${operation}" sem estar logado`);
      alert(`Você precisa estar logado para realizar esta ${operation}.`);
      return false;
    }
    
    // Verificar se é admin
    if (!isAdminUser()) {
      console.warn(`Usuário ${currentUser.email} (${currentUser.uid}) tentou executar operação "${operation}" sem permissão`);
      
      // Registrar tentativa de acesso não autorizado
      if (window.firestoreProducts && window.firestoreProducts.registrarLog) {
        window.firestoreProducts.registrarLog(
          'seguranca', 
          'N/A', 
          'Tentativa de Acesso', 
          `Usuário ${currentUser.email} (${currentUser.uid}) tentou executar operação "${operation}" sem permissão`
        );
      }
      
      alert(`Apenas administradores podem realizar esta ${operation}.`);
      return false;
    }
    
    // Verificar integridade do token de autenticação
    return firebase.auth().currentUser.getIdToken()
      .then(token => {
        if (!token) {
          console.error('Token inválido para operação admin');
          alert('Erro de autenticação. Faça login novamente.');
          return false;
        }
        
        // Registrar operação (opcional)
        if (window.firestoreProducts && window.firestoreProducts.registrarLog) {
          window.firestoreProducts.registrarLog(
            'admin', 
            'N/A', 
            'Operação Admin', 
            `Operação administrativa "${operation}" executada por ${currentUser.email}`
          );
        }
        
        console.log(`Permissão concedida para operação administrativa "${operation}" para ${currentUser.email}`);
        return true;
      })
      .catch(error => {
        console.error('Erro ao verificar token para operação admin:', error);
        alert('Erro de autenticação. Faça login novamente.');
        return false;
      });
  } catch (error) {
    console.error(`Erro ao verificar permissão para ${operation}:`, error);
    alert('Ocorreu um erro ao verificar suas permissões. Tente novamente.');
    return false;
  }
}

// Inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  console.log('Auth Manager iniciando...');
  
  // Verificar se o Firebase foi inicializado
  const firebaseCheckInterval = setInterval(() => {
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
      // Firebase inicializado
      clearInterval(firebaseCheckInterval);
      console.log('Firebase inicializado, verificando autenticação...');
      
      // Configurar o listener de autenticação
      firebase.auth().onAuthStateChanged((user) => {
        console.log('Estado de autenticação alterado:', user ? 'Autenticado' : 'Não autenticado');
        
        // Atualizar usuário atual
        currentUser = user;
        authCheckComplete = true;
        
        // Atualizar UI baseada no estado de autenticação
        updateAuthUI(user);
        
        // Verificar restrições de acesso para a página atual
        const path = window.location.pathname;
        
        // Se for rota administrativa
        if (isAdminRoute()) {
          // Verificar se temos a autenticação no localStorage (admin com UID)
          const storedAdminUID = localStorage.getItem('adminUID');
          if (storedAdminUID === AUTH_CONFIG.ADMIN_UID) {
            console.log('Acesso admin permitido via localStorage UID');
            // Não redirecionar - permissão concedida via UID
          } else if (!user) {
            redirectToLogin('Você precisa fazer login para acessar esta área');
          } else if (!isAdminUser(user)) {
            showErrorAndRedirect('Você não tem permissão para acessar esta área.', '/loja');
          }
        } 
        // Se for rota que requer login
        else if (isProtectedRoute() && !user) {
          // Verificar se temos autenticação por UID (para admin)
          const storedAdminUID = localStorage.getItem('adminUID');
          if (storedAdminUID === AUTH_CONFIG.ADMIN_UID) {
            console.log('Acesso à loja permitido via localStorage UID');
            // Não redirecionar - permissão concedida via UID
          }
          // Se estiver na página inicial, apenas mostrar overlay
          else if (path === '/' || path === '/index.html') {
            const authOverlay = document.getElementById('authOverlay');
            if (authOverlay) authOverlay.style.display = 'flex';
          } else {
            redirectToLogin('Você precisa fazer login para acessar esta área');
          }
        }
      });
      
      // Configurar botão de logout global (se existir)
      const logoutButton = document.getElementById('logoutButton');
      if (logoutButton) {
        logoutButton.addEventListener('click', logout);
      }
    }
  }, 500);
});

// Exportar funções para uso global
window.auth = {
  checkAuthentication,
  isAdminRoute,
  isProtectedRoute,
  isAdminUser,
  checkAdminAuth,
  logout,
  canExecuteAdminFunction,
  getCurrentUser: () => currentUser,
  addAuthStateListener
};