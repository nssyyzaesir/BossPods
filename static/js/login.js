// Inicialização ocorre quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  console.log('Página de login carregada, aguardando inicialização...');
  
  // Elementos do DOM para Login
  const loginForm = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const displayNameInput = document.getElementById('displayName');
  const displayNameGroup = document.getElementById('displayNameGroup');
  const loginBtn = document.getElementById('loginBtn');
  const createAccountBtn = document.getElementById('createAccountBtn');
  const formModeInput = document.getElementById('formMode');
  const errorMessages = document.getElementById('errorMessages');
  
  // E-mails autorizados com permissão de acesso
  const AUTHORIZED_EMAILS = ['admin1@gmail.com', 'admin2@gmail.com'];
  
  // Inicialmente mostrar mensagem de carregamento
  showErrorMessage('Conectando ao serviço de autenticação...', 'info');
  
  // Alternar entre login e criação de conta
  createAccountBtn.addEventListener('click', (e) => {
    e.preventDefault();
    
    // Obter modo atual
    const currentMode = formModeInput.value;
    
    if (currentMode === 'login') {
      // Mudar para modo de criação de conta
      formModeInput.value = 'register';
      loginBtn.innerHTML = '<i class="bi bi-person-plus me-1"></i> Criar Conta';
      createAccountBtn.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i> Voltar para Login';
      displayNameGroup.classList.remove('d-none');
      document.querySelector('.login-header h4').textContent = 'Criar Nova Conta';
      document.querySelector('.login-header p').textContent = 'Preencha os dados para criar sua conta.';
    } else {
      // Mudar para modo de login
      formModeInput.value = 'login';
      loginBtn.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i> Login';
      createAccountBtn.innerHTML = '<i class="bi bi-person-plus me-1"></i> Criar Conta';
      displayNameGroup.classList.add('d-none');
      document.querySelector('.login-header h4').textContent = 'Acesso Administrativo';
      document.querySelector('.login-header p').textContent = 'Digite suas credenciais para acessar o painel.';
    }
  });
  
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
          
          if (user && AUTHORIZED_EMAILS.includes(user.email)) {
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
      
      // Verificar se Firebase está pronto
      if (typeof firebaseInitialized === 'undefined' || !firebaseInitialized) {
        showLoginError('Firebase ainda não foi inicializado. Aguarde ou recarregue a página.');
        return;
      }
      
      // Obter o modo atual do formulário
      const formMode = formModeInput.value;
      console.log(`Formulário enviado no modo: ${formMode}`);
      
      // Obter valores do formulário
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      
      // Desabilitar botão de login
      loginBtn.disabled = true;
      
      if (formMode === 'login') {
        // Modo de login
        loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Entrando...';
        console.log('Tentando login com email:', email);
        
        try {
          // Verificar se o e-mail é autorizado para acessar o painel de admin
          if (AUTHORIZED_EMAILS.includes(email)) {
            // Tentar fazer login com a API do backend
            console.log('Chamando API de login para admin');
            const response = await fetch('/auth/api/login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ email, password }),
            });
            
            const data = await response.json();
            console.log('Resposta da API:', data);
            
            if (!data.success) {
              console.error('Erro ao fazer login:', data.error);
              showLoginError(data.error || 'Email ou senha incorretos');
              return;
            }
            
            // Salvar o token no localStorage
            if (data.token) {
              localStorage.setItem('authToken', data.token);
              console.log('Token de autenticação salvo');
            }
            
            // Criar objeto de usuário com os dados da resposta
            const user = {
              email: email,
              role: data.role || 'user'
            };
            
            // Salvar dados do usuário no localStorage
            localStorage.setItem('currentUser', JSON.stringify(user));
            
            // Registrar o timestamp de login
            localStorage.setItem('lastLoginTime', new Date().getTime().toString());
            console.log('Timestamp de login registrado:', new Date().getTime());
            
            // Verificar se o papel do usuário é administrador
            if (data.role === 'admin') {
              // Mostrar mensagem de sucesso
              console.log('Usuário autorizado, redirecionando para dashboard');
              showNotification('Login realizado', 'Bem-vindo ao painel de administração', 'success');
              
              // Redirecionar para o dashboard após um pequeno delay
              setTimeout(redirectToDashboard, 500);
            } else {
              // Mostrar erro para papel não autorizado
              console.log('Usuário não tem papel de administrador:', data.role);
              showLoginError('Este usuário não tem permissão de administrador.');
            }
          } else {
            // Usuário não é admin, fazer login normal no Firebase
            console.log('Tentativa de login para usuário não-admin');
            
            try {
              // Fazer login com Firebase
              const userCredential = await firebaseAuthAPI.login(email, password);
              console.log('Login bem-sucedido:', userCredential);
              
              // Mostrar mensagem de sucesso para usuário normal
              showNotification('Login realizado', 'Bem-vindo à sua conta BOSSPODS', 'success');
              
              // Redirecionar para a loja
              setTimeout(() => {
                window.location.href = '/';
              }, 500);
              
            } catch (error) {
              console.error('Erro ao fazer login no Firebase:', error);
              showLoginError('Email ou senha incorretos');
            }
          }
        } catch (error) {
          console.error('Erro de login:', error);
          showLoginError('Email ou senha incorretos');
        }
      } else {
        // Modo de registro
        loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Criando conta...';
        
        const displayName = displayNameInput.value.trim();
        console.log('Tentando criar conta com email:', email);
        
        try {
          // Verificar se é uma tentativa de criar conta de admin (não permitido)
          if (AUTHORIZED_EMAILS.includes(email)) {
            showLoginError('Este email já está registrado como administrador. Faça login ou use outro email.');
            return;
          }
          
          // Criar usuário no Firebase
          const user = await firebaseAuthAPI.register(email, password, displayName);
          console.log('Conta criada com sucesso:', user);
          
          // Mostrar mensagem de sucesso
          showNotification('Conta criada', 'Sua conta foi criada com sucesso. Você já está logado.', 'success');
          
          // Redirecionar para a loja
          setTimeout(() => {
            window.location.href = '/';
          }, 1000);
          
        } catch (error) {
          console.error('Erro ao criar conta:', error);
          
          // Verificar o tipo de erro
          if (error.message && error.message.includes('email já está em uso')) {
            showLoginError('Este email já está registrado. Tente fazer login ou use outro email.');
          } else {
            showLoginError('Erro ao criar conta: ' + error.message);
          }
        }
      }
    }).finally(() => {
      // Reabilitar botão de login
      loginBtn.disabled = false;
      
      if (formModeInput.value === 'login') {
        loginBtn.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i> Login';
      } else {
        loginBtn.innerHTML = '<i class="bi bi-person-plus me-1"></i> Criar Conta';
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