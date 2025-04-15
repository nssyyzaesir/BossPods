// Gerenciador de autenticação para diferentes páginas
// Versão refatorada para Firebase v8 CDN

// Configurações de autenticação
const AUTH_CONFIG = {
  // E-mail do administrador autorizado
  ADMIN_EMAIL: 'nsyzaesir@gmail.com',
  
  // Rotas que exigem autenticação de administrador
  ADMIN_ROUTES: ['/admin'],
  
  // Rotas que exigem apenas login (qualquer usuário)
  AUTH_ROUTES: ['/admin', '/carrinho', '/perfil']
};

// Estado global de autenticação
let currentUser = null;
let authCheckComplete = false;

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

// Atualizar UI com base no estado de autenticação
function updateAuthUI(user) {
  try {
    // Botão de admin na loja
    const adminBtn = document.getElementById('adminBtn');
    if (adminBtn) {
      if (user && user.email === AUTH_CONFIG.ADMIN_EMAIL) {
        adminBtn.classList.remove('d-none');
      } else {
        adminBtn.classList.add('d-none');
      }
    }
    
    // Nome do usuário no painel de admin
    const userDisplayName = document.getElementById('userDisplayName');
    if (userDisplayName && user) {
      userDisplayName.textContent = user.displayName || user.email;
    }
    
    // Botões de login/logout no header, se existirem
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userMenu = document.getElementById('userMenu');
    
    if (loginBtn && logoutBtn) {
      if (user) {
        loginBtn.classList.add('d-none');
        logoutBtn.classList.remove('d-none');
        if (userMenu) {
          userMenu.classList.remove('d-none');
          const userNameEl = document.getElementById('userName');
          if (userNameEl) {
            userNameEl.textContent = user.displayName || user.email;
          }
        }
      } else {
        loginBtn.classList.remove('d-none');
        logoutBtn.classList.add('d-none');
        if (userMenu) {
          userMenu.classList.add('d-none');
        }
      }
    }
  } catch (error) {
    console.error('Erro ao atualizar UI de autenticação:', error);
  }
}

// Verificar autenticação usando Firebase Auth
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
          console.log('Usuário não autenticado, redirecionando para login');
          redirectToLogin('Você precisa fazer login para acessar esta área');
          resolve(false);
          return;
        }
        
        console.log('Usuário autenticado:', user.email);
        
        // Se for rota de admin, verificar se o email é o do administrador
        if (isAdminRoute() && user.email !== AUTH_CONFIG.ADMIN_EMAIL) {
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

// Verificar se o usuário é admin
function isAdminUser(user = currentUser) {
  if (!user) return false;
  return user.email === AUTH_CONFIG.ADMIN_EMAIL;
}

// Redirecionar para a página de login com mensagem
function redirectToLogin(message) {
  // Salvar mensagem para ser exibida na página de login
  if (message) {
    localStorage.setItem('auth_error', message);
  }
  
  // Não redirecionar se já estiver na página de login
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

// Mostrar mensagem de erro e redirecionar
function showErrorAndRedirect(message, redirectUrl) {
  alert(message);
  window.location.href = redirectUrl;
}

// Inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  // Verificar se o Firebase foi inicializado
  const firebaseCheckInterval = setInterval(() => {
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
      // Firebase inicializado
      clearInterval(firebaseCheckInterval);
      console.log('Firebase inicializado para gerenciamento de autenticação');
      
      // Configurar listener de autenticação para atualizar a UI
      firebase.auth().onAuthStateChanged((user) => {
        // Atualizar variável global
        currentUser = user;
        
        // Atualizar UI baseada no estado de autenticação
        updateAuthUI(user);
        
        // Verificar restrições de acesso
        const isAdmin = isAdminUser(user);
        const path = window.location.pathname;
        
        // Verificações de permissão
        if (path === '/admin') {
          if (!user) {
            redirectToLogin('Você precisa fazer login para acessar esta área');
          } else if (!isAdmin) {
            showErrorAndRedirect('Você não tem permissão para acessar esta área.', '/loja');
          }
        } else if (path === '/login' && user) {
          // Se já estiver logado, redirecionar para a página apropriada
          if (isAdmin) {
            window.location.href = '/admin';
          } else {
            window.location.href = '/loja';
          }
        }
      });
    } else {
      // Firebase ainda não inicializado, aguardar
      console.log('Aguardando inicialização do Firebase para verificação de autenticação...');
    }
  }, 500);
  
  // Se estiver na página de login, verificar se há erro de autenticação salvo
  if (window.location.pathname === '/login') {
    const authError = localStorage.getItem('auth_error');
    if (authError) {
      // Exibir erro (o código na página de login deve lidar com isso)
      // Será resolvido quando o DOM estiver pronto
      console.log('Mensagem de erro de autenticação encontrada:', authError);
      
      // Limpar mensagem
      localStorage.removeItem('auth_error');
    }
  }
  
  // Adicionar listener para logout se o botão existir
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
});

// Função para fazer logout
function logout() {
  if (firebase && firebase.auth) {
    firebase.auth().signOut()
      .then(() => {
        console.log('Logout bem-sucedido');
        // Limpar dados do localStorage
        localStorage.removeItem('currentUser');
        localStorage.removeItem('lastLoginTime');
        
        // Redirecionar para a página inicial/login
        window.location.href = '/login';
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
function canExecuteAdminFunction(operation = 'operação administrativa') {
  // Verificar se tem um usuário logado
  if (!currentUser) {
    alert(`Você precisa estar logado para realizar esta ${operation}.`);
    return false;
  }
  
  // Verificar se é admin
  if (!isAdminUser()) {
    alert(`Apenas administradores podem realizar esta ${operation}.`);
    return false;
  }
  
  return true;
}

// Exportar funções para uso global
window.auth = {
  checkAuthentication,
  isAdminRoute,
  isProtectedRoute,
  isAdminUser,
  logout,
  canExecuteAdminFunction,
  getCurrentUser: () => currentUser
};