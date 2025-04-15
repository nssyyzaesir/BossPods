// Script da página de login - Versão refatorada
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Página de login carregada, aguardando inicialização...');
  
  // Elementos do DOM para Login
  const loginForm = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const displayNameInput = document.getElementById('displayName');
  const displayNameGroup = document.getElementById('displayNameGroup');
  const loginBtn = document.getElementById('loginBtn');
  const errorMessages = document.getElementById('errorMessages');
  
  // Adicionar botão de criar conta
  const createAccountBtn = document.createElement('button');
  createAccountBtn.type = 'button';
  createAccountBtn.className = 'btn btn-outline-secondary w-100 mt-2';
  createAccountBtn.id = 'createAccountBtn';
  createAccountBtn.innerHTML = '<i class="bi bi-person-plus me-1"></i> Criar Conta';
  
  // Adicionar botão ao DOM
  loginBtn.parentNode.appendChild(createAccountBtn);
  
  // Modo do formulário
  const formModeInput = document.getElementById('formMode');
  
  // Credenciais fixas do administrador
  const ADMIN_EMAIL = 'nsyzaesir@gmail.com';
  const ADMIN_PASSWORD = 'nsyz123';
  
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
      document.querySelector('.login-header h4').textContent = 'Acesso ao Sistema';
      document.querySelector('.login-header p').textContent = 'Digite suas credenciais para acessar o sistema.';
    }
  });
  
  // Verificar se o Firebase foi inicializado
  const firebaseCheckInterval = setInterval(() => {
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
      // Firebase inicializado
      clearInterval(firebaseCheckInterval);
      console.log('Firebase inicializado, verificando autenticação...');
      
      // Verificar se há usuário autenticado
      const currentUser = firebase.auth().currentUser;
      console.log('Verificação inicial de usuário:', currentUser);
      
      if (currentUser) {
        // Se for admin, redirecionar para o painel admin
        if (currentUser.email === ADMIN_EMAIL) {
          console.log('Usuário administrador já autenticado:', currentUser.email);
          window.location.href = '/admin';
          return;
        } else {
          // Se for usuário normal, redirecionar para a loja
          console.log('Usuário normal já autenticado:', currentUser.email);
          window.location.href = '/loja';
          return;
        }
      }
      
      // Verificar se há uma mensagem de erro de autenticação salva
      const authError = localStorage.getItem('auth_error');
      if (authError) {
        showErrorMessage(authError, 'danger');
        localStorage.removeItem('auth_error');
      } else {
        // Mostrar mensagem pronto para login
        showErrorMessage('Pronto para login ou criação de conta.', 'info');
      }
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
      if (typeof firebase === 'undefined' || !firebase.apps.length) {
        showLoginError('Sistema de autenticação não foi inicializado. Aguarde ou recarregue a página.');
        return;
      }
      
      // Obter o modo atual do formulário
      const formMode = formModeInput.value;
      console.log(`Formulário enviado no modo: ${formMode}`);
      
      // Obter valores do formulário
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      
      // Validações básicas
      if (!email || !password) {
        showLoginError('Por favor, preencha todos os campos.');
        return;
      }
      
      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showLoginError('Por favor, insira um email válido.');
        return;
      }
      
      // Validar senha
      if (password.length < 6) {
        showLoginError('A senha deve ter pelo menos 6 caracteres.');
        return;
      }
      
      // Desabilitar botão de login
      loginBtn.disabled = true;
      
      if (formMode === 'login') {
        // Modo de login
        loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Entrando...';
        console.log('Tentando login com email:', email);
        
        try {
          // Verificação especial para o administrador (email e senha fixos)
          if (email === ADMIN_EMAIL) {
            // Verificar a senha do administrador
            if (password !== ADMIN_PASSWORD) {
              showLoginError('Senha incorreta para o administrador');
              loginBtn.disabled = false;
              loginBtn.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i> Login';
              return;
            }
          }
          
          // Fazer login no Firebase
          await firebase.auth().signInWithEmailAndPassword(email, password);
          console.log('Login bem-sucedido');
          
          // Obter usuário atual
          const user = firebase.auth().currentUser;
          
          // Verificar se é o administrador para redirecionar
          if (user.email === ADMIN_EMAIL) {
            showNotification('Login realizado', 'Bem-vindo ao painel de administração', 'success');
            
            // Redirecionar para o painel admin
            setTimeout(() => {
              window.location.href = '/admin';
            }, 1000);
          } else {
            showNotification('Login realizado', 'Bem-vindo à loja BOSSPODS', 'success');
            
            // Redirecionar para a loja
            setTimeout(() => {
              window.location.href = '/loja';
            }, 1000);
          }
        } catch (error) {
          console.error('Erro ao fazer login:', error);
          
          // Tratar erros específicos
          if (error.code === 'auth/user-not-found') {
            showLoginError('Usuário não encontrado. Crie uma conta primeiro.');
          } else if (error.code === 'auth/wrong-password') {
            showLoginError('Senha incorreta. Tente novamente.');
          } else if (error.code === 'auth/too-many-requests') {
            showLoginError('Muitas tentativas falhas. Tente novamente mais tarde.');
          } else {
            showLoginError('Erro ao fazer login: ' + error.message);
          }
          
          // Reabilitar botão
          loginBtn.disabled = false;
          loginBtn.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i> Login';
        }
      } else {
        // Modo de registro
        loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Criando conta...';
        
        const displayName = displayNameInput.value.trim();
        console.log('Tentando criar conta com email:', email);
        
        try {
          // Verificar se é uma tentativa de criar conta com o email do admin (não permitido)
          if (email === ADMIN_EMAIL) {
            showLoginError('Este email está reservado para o administrador do sistema. Por favor, use outro email.');
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="bi bi-person-plus me-1"></i> Criar Conta';
            return;
          }
          
          // Validação adicional para o nome
          if (displayName && displayName.length < 3) {
            showLoginError('O nome deve ter pelo menos 3 caracteres.');
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="bi bi-person-plus me-1"></i> Criar Conta';
            return;
          }
          
          // Criar usuário no Firebase
          const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
          
          // Atualizar perfil com o nome
          if (displayName) {
            await userCredential.user.updateProfile({
              displayName: displayName
            });
          }
          
          // Criar documento do usuário no Firestore
          await firebase.firestore().collection('users').doc(userCredential.user.uid).set({
            email: email,
            displayName: displayName || email.split('@')[0],
            role: 'user',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          
          console.log('Conta criada com sucesso');
          
          // Mostrar mensagem de sucesso
          showNotification('Conta criada', 'Sua conta foi criada com sucesso. Você será redirecionado para a loja.', 'success');
          
          // Redirecionar para a loja após alguns segundos
          setTimeout(() => {
            window.location.href = '/loja';
          }, 1500);
        } catch (error) {
          console.error('Erro ao criar conta:', error);
          
          // Tratar erros específicos
          if (error.code === 'auth/email-already-in-use') {
            showLoginError('Este email já está registrado. Tente fazer login ou use outro email.');
          } else if (error.code === 'auth/invalid-email') {
            showLoginError('Email inválido. Verifique se digitou corretamente.');
          } else if (error.code === 'auth/weak-password') {
            showLoginError('Senha muito fraca. Use pelo menos 6 caracteres.');
          } else {
            showLoginError('Erro ao criar conta: ' + error.message);
          }
          
          // Reabilitar botão
          loginBtn.disabled = false;
          loginBtn.innerHTML = '<i class="bi bi-person-plus me-1"></i> Criar Conta';
        }
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
      } else if (type === 'success') {
        icon = 'check-circle-fill';
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
    showNotification('Erro', message, 'error');
    
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
});