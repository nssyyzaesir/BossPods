// Inicialização ocorre quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  console.log('Página de login carregada, aguardando inicialização...');
  
  // Elementos do DOM para Login
  const loginForm = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('loginBtn');
  const errorMessages = document.getElementById('errorMessages');
  
  // Elementos do DOM para Registro
  const registerForm = document.getElementById('registerForm');
  const registerNameInput = document.getElementById('registerName');
  const registerEmailInput = document.getElementById('registerEmail');
  const registerPasswordInput = document.getElementById('registerPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const registerBtn = document.getElementById('registerBtn');
  
  // Inicialmente mostrar mensagem de carregamento
  showErrorMessage('Conectando ao serviço de autenticação...', 'info');
  
  // Limpar qualquer sessão existente no localStorage
  localStorage.removeItem('currentUser');
  localStorage.removeItem('lastLoginTime');
  console.log('Sessão existente removida para garantir novo login');
  
  // Verificar se o Firebase foi inicializado
  const firebaseCheckInterval = setInterval(() => {
    if (typeof firebaseInitialized !== 'undefined' && firebaseInitialized) {
      // Firebase inicializado
      clearInterval(firebaseCheckInterval);
      console.log('Firebase inicializado, verificando autenticação...');
      
      // Verificar se já está logado
      firebaseAuthAPI.getCurrentUser()
        .then(user => {
          console.log('Verificação inicial de usuário:', user);
          
          if (user) {
            console.log('Usuário já autenticado:', user.email);
            
            // Verificar se o usuário é admin
            firebaseAuthAPI.isAdmin(user)
              .then(isAdmin => {
                console.log('Verificação se usuário é admin:', isAdmin);
                
                if (isAdmin) {
                  // Redirecionar para dashboard
                  console.log('Usuário é admin, redirecionando para dashboard');
                  redirectToDashboard();
                } else {
                  // Logout (usuário não é admin)
                  console.log('Usuário não é admin, realizando logout');
                  firebaseAuthAPI.logout()
                    .then(() => {
                      showLoginError('Você não tem permissão para acessar o painel de administração');
                    });
                }
              });
          } else {
            console.log('Nenhum usuário autenticado, aguardando login');
            
            // Mostrar mensagem pronto para login
            showErrorMessage('Pronto para login. Digite suas credenciais de administrador.', 'info');
          }
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
      } finally {
        // Reabilitar botão de login
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i> Entrar';
      }
    });
  } else {
    console.error('Formulário de login não encontrado!');
  }
  
  // Configurar evento de submit do formulário de registro
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log('Formulário de registro enviado');
      
      // Verificar se Firebase está pronto
      if (typeof firebaseInitialized === 'undefined' || !firebaseInitialized) {
        showErrorMessage('Firebase ainda não foi inicializado. Aguarde ou recarregue a página.', 'danger');
        return;
      }
      
      // Desabilitar botão de registro
      registerBtn.disabled = true;
      registerBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Registrando...';
      
      // Obter valores do formulário
      const name = registerNameInput.value.trim();
      const email = registerEmailInput.value.trim();
      const password = registerPasswordInput.value;
      const confirmPassword = confirmPasswordInput.value;
      
      // Validar senhas
      if (password !== confirmPassword) {
        showErrorMessage('As senhas não conferem', 'danger');
        registerBtn.disabled = false;
        registerBtn.innerHTML = '<i class="bi bi-person-plus me-1"></i> Criar Conta';
        return;
      }
      
      try {
        // Registrar usuário
        console.log('Chamando API de registro');
        const user = await firebaseAuthAPI.register(email, password, name);
        console.log('Registro bem-sucedido:', user);
        
        // Mostrar mensagem de sucesso
        showNotification('Conta criada', 'Sua conta foi criada com sucesso! Faça login para continuar.', 'success');
        
        // Limpar formulário
        registerForm.reset();
        
        // Trocar para a aba de login
        document.getElementById('login-tab').click();
        
      } catch (error) {
        console.error('Erro de registro:', error);
        
        // Tratar erros específicos
        let errorMessage = 'Erro ao criar conta. Tente novamente.';
        
        if (error.code === 'auth/email-already-in-use') {
          errorMessage = 'Este email já está em uso.';
        } else if (error.code === 'auth/invalid-email') {
          errorMessage = 'Email inválido.';
        } else if (error.code === 'auth/weak-password') {
          errorMessage = 'Senha muito fraca. Use pelo menos 6 caracteres.';
        }
        
        showErrorMessage(errorMessage, 'danger');
      } finally {
        // Reabilitar botão de registro
        registerBtn.disabled = false;
        registerBtn.innerHTML = '<i class="bi bi-person-plus me-1"></i> Criar Conta';
      }
    });
  } else {
    console.error('Formulário de registro não encontrado!');
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