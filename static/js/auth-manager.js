// Gerenciador de autenticação para diferentes páginas

// Configurações
const AUTH_CONFIG = {
  // E-mail do administrador autorizado
  ADMIN_EMAIL: 'nsyzadmin@gmail.com',
  
  // Rotas que exigem autenticação de administrador
  ADMIN_ROUTES: ['/admin']
};

// Verificar se a página atual exige autenticação
function isCurrentRouteProtected() {
  // Obter caminho atual
  const currentPath = window.location.pathname;
  
  // Verificar se está em uma rota protegida de admin
  return AUTH_CONFIG.ADMIN_ROUTES.includes(currentPath);
}

// Verificar autenticação usando Firebase Auth
async function checkAuthentication() {
  // Se a página atual não exige autenticação, não verificar
  if (!isCurrentRouteProtected()) {
    console.log('Página atual não requer autenticação');
    return true; // Permitir acesso
  }
  
  try {
    console.log('Verificando autenticação para rota protegida de admin...');
    
    // Obter usuário atual do Firebase Auth
    const user = await firebaseAuthAPI.getCurrentUser();
    
    if (!user) {
      console.log('Usuário não autenticado, redirecionando para login');
      alert('Você precisa fazer login para acessar esta área');
      window.location.href = '/login';
      return false;
    }
    
    console.log('Usuário autenticado:', user.email);
    
    // Verificar se o email é o do administrador
    if (user.email !== AUTH_CONFIG.ADMIN_EMAIL) {
      console.log('Usuário não é o administrador autorizado');
      alert('Você não tem permissão para acessar esta área.');
      window.location.href = '/loja';
      return false;
    }
    
    console.log('Autenticação bem-sucedida, usuário é o administrador autorizado');
    return true;
    
  } catch (error) {
    console.error('Erro ao verificar autenticação:', error);
    alert('Erro ao verificar autenticação. Tente novamente.');
    window.location.href = '/login';
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