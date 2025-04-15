// Variáveis globais
let loginForm = document.getElementById('loginForm');
let emailInput = document.getElementById('email');
let passwordInput = document.getElementById('password');
let loginBtn = document.getElementById('loginBtn');

// Inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  console.log('Página de login carregada, verificando autenticação...');
  
  // Verificar se já está logado
  firebaseAuthAPI.getCurrentUser().then(user => {
    console.log('Verificação inicial de usuário:', user);
    if (user) {
      console.log('Usuário já autenticado:', user.email);
      // Verificar se o usuário é admin
      firebaseAuthAPI.isAdmin(user).then(isAdmin => {
        console.log('Verificação se usuário é admin:', isAdmin);
        if (isAdmin) {
          // Redirecionar para dashboard
          console.log('Usuário é admin, redirecionando para dashboard');
          redirectToDashboard();
        } else {
          // Logout (usuário não é admin)
          console.log('Usuário não é admin, realizando logout');
          firebaseAuthAPI.logout().then(() => {
            showLoginError('Você não tem permissão para acessar o painel de administração');
          });
        }
      });
    } else {
      console.log('Nenhum usuário autenticado, aguardando login');
    }
  }).catch(error => {
    console.error('Erro ao verificar autenticação inicial:', error);
  });
  
  // Configurar evento de submit do formulário
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Formulário de login enviado');
    
    // Desabilitar botão de login
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Entrando...';
    
    // Obter valores do formulário
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    console.log('Tentando login com email:', email);
    
    try {
      // Tentar fazer login
      console.log('Chamando API de login');
      const user = await firebaseAuthAPI.login(email, password);
      console.log('Login bem-sucedido:', user);
      
      // Verificar se o usuário é admin
      console.log('Verificando se usuário é admin');
      const isAdmin = await firebaseAuthAPI.isAdmin(user);
      console.log('Resultado da verificação admin:', isAdmin);
      
      if (isAdmin) {
        // Mostrar mensagem de sucesso
        console.log('Usuário é admin, redirecionando para dashboard');
        showNotification('Login realizado', 'Bem-vindo ao painel de administração', 'success');
        
        // Verificar novamente se o usuário está salvo corretamente
        const currentUser = await firebaseAuthAPI.getCurrentUser();
        console.log('Verificação pós-login:', currentUser);
        
        // Redirecionar para o dashboard após um pequeno delay
        setTimeout(redirectToDashboard, 500);
      } else {
        // Logout (usuário não é admin)
        console.log('Usuário não é admin, realizando logout');
        await firebaseAuthAPI.logout();
        
        // Mostrar erro
        showLoginError('Você não tem permissão para acessar o painel de administração');
      }
    } catch (error) {
      console.error('Erro de login:', error);
      
      // Mostrar mensagem de erro
      showLoginError('Email ou senha incorretos');
    }
    
    // Reabilitar botão de login
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i> Entrar';
  });
});

// Redirecionar para o dashboard
function redirectToDashboard() {
  window.location.href = '/admin';
}

// Mostrar erro de login
function showLoginError(message = 'Ocorreu um erro ao fazer login') {
  showNotification('Erro de login', message, 'error');
  passwordInput.value = '';
}

// Mostrar notificação
function showNotification(title, message, type = 'info') {
  const toastEl = document.getElementById('toast');
  const titleEl = document.getElementById('toastTitle');
  const messageEl = document.getElementById('toastMessage');
  
  titleEl.textContent = title;
  messageEl.textContent = message;
  
  // Remover classes anteriores
  toastEl.className = 'toast cyber-toast';
  
  // Adicionar classe de acordo com o tipo
  if (type === 'success') {
    toastEl.classList.add('cyber-toast-success');
  } else if (type === 'error') {
    toastEl.classList.add('cyber-toast-error');
  }
  
  // Mostrar toast
  const toast = new bootstrap.Toast(toastEl);
  toast.show();
}