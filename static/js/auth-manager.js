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

// Verificar autenticação usando Firebase Auth
async function checkAuthentication() {
  // Se a página não exige autenticação, permitir acesso
  if (!isProtectedRoute()) {
    console.log('Página atual não requer autenticação');
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
    
    // Obter usuário atual
    const user = firebase.auth().currentUser;
    
    // Verificar se há usuário autenticado
    if (!user) {
      console.log('Usuário não autenticado, redirecionando para login');
      redirectToLogin('Você precisa fazer login para acessar esta área');
      return false;
    }
    
    console.log('Usuário autenticado:', user.email);
    
    // Se for rota de admin, verificar se o email é o do administrador
    if (isAdminRoute() && user.email !== AUTH_CONFIG.ADMIN_EMAIL) {
      console.log('Usuário não é o administrador autorizado');
      showErrorAndRedirect('Você não tem permissão para acessar esta área.', '/loja');
      return false;
    }
    
    console.log('Autenticação bem-sucedida');
    return true;
    
  } catch (error) {
    console.error('Erro ao verificar autenticação:', error);
    redirectToLogin('Erro ao verificar autenticação. Tente novamente.');
    return false;
  }
}

// Redirecionar para a página de login com mensagem
function redirectToLogin(message) {
  // Salvar mensagem para ser exibida na página de login
  if (message) {
    localStorage.setItem('auth_error', message);
  }
  window.location.href = '/login';
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
      
      // Verificar autenticação apenas para rotas protegidas
      if (isProtectedRoute()) {
        checkAuthentication();
      } else {
        console.log('Página atual não requer autenticação');
      }
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

// Exportar funções para uso global
window.auth = {
  checkAuthentication,
  isAdminRoute,
  isProtectedRoute,
  logout
};