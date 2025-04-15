// Gerenciador de autenticação para diferentes páginas

// Configurações
const AUTH_CONFIG = {
  // E-mail do administrador autorizado
  ADMIN_EMAIL: 'admin@bosspods.com',
  
  // Rotas que exigem autenticação
  PROTECTED_ROUTES: ['/admin'],
  
  // Tempo de expiração da sessão (em milissegundos) - 1 hora
  SESSION_EXPIRATION: 3600000
};

// Verificar se a página atual exige autenticação
function isCurrentRouteProtected() {
  // Obter caminho atual
  const currentPath = window.location.pathname;
  
  // Verificar se está em uma rota protegida
  return AUTH_CONFIG.PROTECTED_ROUTES.includes(currentPath);
}

// Verificar autenticação (apenas para páginas protegidas)
async function checkAuthentication() {
  // Se a página atual não exige autenticação, não verificar
  if (!isCurrentRouteProtected()) {
    console.log('Página atual não exige autenticação');
    return true; // Permitir acesso
  }
  
  try {
    console.log('Verificando autenticação para rota protegida...');
    
    // Verificar se o token de sessão ainda é válido (expiração)
    const lastLogin = localStorage.getItem('lastLoginTime');
    if (!lastLogin) {
      console.log('Nenhum timestamp de login encontrado, redirecionando para login');
      window.location.href = '/login';
      return false;
    }
    
    // Verificar se o login expirou
    const loginTime = parseInt(lastLogin, 10);
    const currentTime = new Date().getTime();
    if (currentTime - loginTime > AUTH_CONFIG.SESSION_EXPIRATION) {
      console.log('Sessão expirada, redirecionando para login');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('lastLoginTime');
      window.location.href = '/login';
      return false;
    }
    
    // Verificar se há um usuário autenticado
    const user = await firebaseAuthAPI.getCurrentUser();
    console.log('Resultado getCurrentUser:', user);
    
    if (!user) {
      // Usuário não está autenticado, redirecionar para login
      console.log('Usuário não autenticado, redirecionando para login');
      window.location.href = '/login';
      return false;
    }
    
    // Verificar se é o e-mail autorizado
    if (user.email !== AUTH_CONFIG.ADMIN_EMAIL) {
      console.log('Tentativa de acesso não autorizada:', user.email);
      alert('Acesso negado. Apenas o administrador autorizado pode acessar o painel.');
      // Fazer logout
      await firebaseAuthAPI.logout();
      window.location.href = '/login';
      return false;
    }
    
    // Verificar se o usuário é admin (verificação secundária)
    console.log('Verificando se usuário é admin...');
    const isAdmin = await firebaseAuthAPI.isAdmin(user);
    console.log('Resultado isAdmin:', isAdmin);
    
    if (!isAdmin) {
      // Usuário não é admin, mostrar mensagem e redirecionar
      console.log('Usuário não é admin, redirecionando');
      alert('Você não tem permissão para acessar esta página');
      await firebaseAuthAPI.logout();
      window.location.href = '/';
      return false;
    }
    
    console.log('Autenticação bem-sucedida, usuário é autorizado e admin');
    return true;
    
  } catch (error) {
    console.error('Erro ao verificar autenticação:', error);
    console.error('Detalhes do erro:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    alert('Erro ao verificar autenticação. Tente novamente.');
    return false;
  }
}

// Inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  // Verificar se o Firebase foi inicializado
  const firebaseCheckInterval = setInterval(() => {
    if (typeof firebaseInitialized !== 'undefined' && firebaseInitialized) {
      // Firebase inicializado
      clearInterval(firebaseCheckInterval);
      console.log('Firebase inicializado para gerenciamento de autenticação');
      
      // Verificar autenticação apenas para rotas protegidas
      if (isCurrentRouteProtected()) {
        checkAuthentication();
      } else {
        console.log('Página atual não requer autenticação');
      }
    } else {
      // Firebase ainda não inicializado, aguardar
      console.log('Aguardando inicialização do Firebase para verificação de autenticação...');
    }
  }, 500);
});