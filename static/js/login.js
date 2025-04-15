// Variáveis globais
let loginForm = document.getElementById('loginForm');
let emailInput = document.getElementById('email');
let passwordInput = document.getElementById('password');
let loginBtn = document.getElementById('loginBtn');

// Inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  // Verificar se já está logado
  firebaseAuthAPI.getCurrentUser().then(user => {
    if (user) {
      // Verificar se o usuário é admin
      firebaseAuthAPI.isAdmin(user).then(isAdmin => {
        if (isAdmin) {
          // Redirecionar para dashboard
          redirectToDashboard();
        } else {
          // Logout (usuário não é admin)
          firebaseAuthAPI.logout().then(() => {
            showLoginError('Você não tem permissão para acessar o painel de administração');
          });
        }
      });
    }
  });
  
  // Configurar evento de submit do formulário
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Desabilitar botão de login
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Entrando...';
    
    // Obter valores do formulário
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    try {
      // Tentar fazer login
      const user = await firebaseAuthAPI.login(email, password);
      
      // Verificar se o usuário é admin
      const isAdmin = await firebaseAuthAPI.isAdmin(user);
      
      if (isAdmin) {
        // Mostrar mensagem de sucesso
        showNotification('Login realizado', 'Bem-vindo ao painel de administração', 'success');
        
        // Redirecionar para o dashboard após um pequeno delay
        setTimeout(redirectToDashboard, 500);
      } else {
        // Logout (usuário não é admin)
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