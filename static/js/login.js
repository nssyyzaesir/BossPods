// Inicialização ocorre quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  console.log('Página de login carregada, aguardando inicialização...');
  
  // Elementos do DOM para Login
  const loginForm = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('loginBtn');
  const errorMessages = document.getElementById('errorMessages');
  
  // E-mail autorizado (único com permissão de acesso)
  const AUTHORIZED_EMAIL = 'admin@bosspods.com';
  
  // Inicialmente mostrar mensagem de carregamento
  showErrorMessage('Conectando ao serviço de autenticação...', 'info');
  
  // Verificar se o Firebase foi inicializado
  const firebaseCheckInterval = setInterval(() => {
    if (typeof firebaseInitialized !== 'undefined' && firebaseInitialized) {
      // Firebase inicializado
      clearInterval(firebaseCheckInterval);
      console.log('Firebase inicializado, verificando autenticação...');
      
      // Verificar se há usuário autenticado
      firebaseAuthAPI.getCurrentUser()
        .then(user => {
          console.log('Verificação inicial de usuário:', user);
          
          if (user && user.email === AUTHORIZED_EMAIL) {
            console.log('Usuário administrador já autenticado:', user.email);
            // Se já estiver logado com o admin, perguntar se deseja ir para o painel
            if (confirm('Você já está autenticado como administrador. Deseja ir para o painel de administração?')) {
              window.location.href = '/admin';
              return;
            }
          }
          
          // Mostrar mensagem pronto para login
          showErrorMessage('Pronto para login. Digite suas credenciais de administrador.', 'info');
        })
        .catch(error => {
          console.error('Erro ao verificar autenticação inicial:', error);
          showLoginError('Erro ao verificar autenticação: ' + error.message);
        });
    } else {
      // Firebase ainda não inicializado, aguardar
      console.log("Aguardando inicialização do Firebase...");
    }
  }, 500);
  
  // Configurar evento de submit do formulário
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log('Formulário de login enviado');
      
      // Verificar se Firebase está pronto
      if (typeof firebaseInitialized === 'undefined' || !firebaseInitialized) {
        showLoginError('Firebase ainda não foi inicializado. Aguarde ou recarregue a página.');
        return;
      }
      
      // Desabilitar botão de login
      loginBtn.disabled = true;
      loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Entrando...';
      
      // Obter valores do formulário
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      console.log('Tentando login com email:', email);
      
      // Verificar se o e-mail é o autorizado
      if (email !== AUTHORIZED_EMAIL) {
        console.log('Tentativa de acesso com e-mail não autorizado:', email);
        showLoginError('Acesso negado. Apenas o administrador autorizado pode acessar o painel.');
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i> Entrar';
        return;
      }
      
      try {
        // Tentar fazer login
        console.log('Chamando API de login');
        const user = await firebaseAuthAPI.login(email, password);
        console.log('Login bem-sucedido:', user);
        
        // Verificar se o e-mail do usuário é o autorizado
        if (user.email === AUTHORIZED_EMAIL) {
          // Mostrar mensagem de sucesso
          console.log('Usuário autorizado, redirecionando para dashboard');
          showNotification('Login realizado', 'Bem-vindo ao painel de administração', 'success');
          
          // Verificar novamente se o usuário está salvo corretamente
          const currentUser = await firebaseAuthAPI.getCurrentUser();
          console.log('Verificação pós-login:', currentUser);
          
          // Redirecionar para o dashboard após um pequeno delay
          setTimeout(redirectToDashboard, 500);
        } else {
          // Logout (usuário não autorizado)
          console.log('Usuário não autorizado, realizando logout');
          await firebaseAuthAPI.logout();
          
          // Mostrar erro
          showLoginError('Acesso negado. Apenas o administrador autorizado pode acessar o painel.');
        }
      } catch (error) {
        console.error('Erro de login:', error);
        
        // Mostrar mensagem de erro
        showLoginError('Email ou senha incorretos');
      } finally {
        // Reabilitar botão de login
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i> Entrar';
      }
    });
  } else {
    console.error('Formulário de login não encontrado!');
  }
  
  // Funções auxiliares
  
  // Mostrar mensagem de erro/info na área de mensagens
  function showErrorMessage(message, type = 'danger') {
    if (errorMessages) {
      let icon = 'exclamation-triangle-fill';
      if (type === 'info') {
        icon = 'info-circle-fill';
      }
      
      errorMessages.innerHTML = `
        <div class="alert alert-${type}">
          <i class="bi bi-${icon} me-2"></i>
          ${message}
        </div>
      `;
    }
  }
  
  // Mostrar erro de login
  function showLoginError(message = 'Ocorreu um erro ao fazer login') {
    // Mostrar toast de notificação
    showNotification('Erro de login', message, 'error');
    
    // Exibir mensagem de erro
    showErrorMessage(message, 'danger');
    
    // Limpar senha
    if (passwordInput) {
      passwordInput.value = '';
    }
  }
  
  // Mostrar notificação toast
  function showNotification(title, message, type = 'info') {
    const toastEl = document.getElementById('toast');
    const titleEl = document.getElementById('toastTitle');
    const messageEl = document.getElementById('toastMessage');
    
    if (!toastEl || !titleEl || !messageEl) {
      console.error('Elementos toast não encontrados');
      return;
    }
    
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
  
  // Redirecionar para o dashboard
  function redirectToDashboard() {
    window.location.href = '/admin';
  }
});