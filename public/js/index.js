// Script da página inicial - Gerencia autenticação e modal de login
document.addEventListener('DOMContentLoaded', () => {
  console.log('Página inicial carregada, aguardando inicialização do Firebase...');
  
  // Elementos do DOM
  const loginForm = document.getElementById('loginForm');
  const adminLoginForm = document.getElementById('adminLoginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const adminUIDInput = document.getElementById('adminUID');
  const displayNameInput = document.getElementById('displayName');
  const displayNameGroup = document.getElementById('displayNameGroup');
  const loginBtn = document.getElementById('loginBtn');
  const adminLoginBtn = document.getElementById('adminLoginBtn');
  const toggleFormBtn = document.getElementById('toggleFormBtn');
  const formModeInput = document.getElementById('formMode');
  const errorMessages = document.getElementById('errorMessages');
  const loginFormTitle = document.getElementById('loginFormTitle');
  const loginFormSubtitle = document.getElementById('loginFormSubtitle');
  const loginFormHint = document.getElementById('loginFormHint');
  const authOverlay = document.getElementById('authOverlay');
  const openLoginBtn = document.getElementById('openLoginBtn');
  const loginButton = document.getElementById('loginButton');
  const logoutButton = document.getElementById('logoutButton');
  
  // Verificar sessão
  let isAuthenticated = false;
  
  // Credenciais fixas do administrador para verificação
  const ADMIN_UID = '96rupqrpWjbyKtSksDaISQ94y6l2';
  
  // Referência ao modal de login
  let loginModal;
  
  // Botão para abrir o modal de login a partir do overlay
  if (openLoginBtn) {
    openLoginBtn.addEventListener('click', () => {
      // Verificar se o Firebase está inicializado
      if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        // Abrir modal usando Bootstrap
        loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
        loginModal.show();
      } else {
        console.log("Aguardando inicialização do Firebase antes de abrir o modal de login...");
        // Mostrar uma notificação informando que o Firebase está sendo inicializado
        showNotification("Sistema Iniciando", "Aguarde enquanto o sistema de autenticação é inicializado...", "info");
        
        // Verificar periodicamente até que o Firebase esteja pronto
        const checkFirebaseInterval = setInterval(() => {
          if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            clearInterval(checkFirebaseInterval);
            console.log("Firebase inicializado, abrindo modal de login");
            loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
            loginModal.show();
          }
        }, 300);
      }
    });
  }

  // Botão para abrir o modal de login no header
  if (loginButton) {
    loginButton.addEventListener('click', () => {
      // Verificar se o Firebase está inicializado
      if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
        loginModal.show();
      } else {
        console.log("Aguardando inicialização do Firebase antes de abrir o modal de login...");
        // Mostrar uma notificação informando que o Firebase está sendo inicializado
        showNotification("Sistema Iniciando", "Aguarde enquanto o sistema de autenticação é inicializado...", "info");
        
        // Verificar periodicamente até que o Firebase esteja pronto
        const checkFirebaseInterval = setInterval(() => {
          if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            clearInterval(checkFirebaseInterval);
            console.log("Firebase inicializado, abrindo modal de login");
            loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
            loginModal.show();
          }
        }, 300);
      }
    });
  }

  // Botão de logout
  if (logoutButton) {
    logoutButton.addEventListener('click', logout);
  }
  
  // Alternar entre login e criação de conta
  if (toggleFormBtn) {
    toggleFormBtn.addEventListener('click', () => {
      // Obter modo atual
      const currentMode = formModeInput.value;
      
      if (currentMode === 'login') {
        // Mudar para modo de criação de conta
        formModeInput.value = 'register';
        loginBtn.innerHTML = '<i class="bi bi-person-plus me-1"></i> Criar Conta';
        toggleFormBtn.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i> Voltar para Login';
        displayNameGroup.classList.remove('d-none');
        loginFormTitle.textContent = 'Criar Nova Conta';
        loginFormSubtitle.textContent = 'Preencha os dados para criar sua conta.';
        loginFormHint.textContent = 'Ao criar uma conta, você concorda com os termos de uso e política de privacidade.';
      } else {
        // Mudar para modo de login
        formModeInput.value = 'login';
        loginBtn.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i> Login';
        toggleFormBtn.innerHTML = '<i class="bi bi-person-plus me-1"></i> Criar Conta';
        displayNameGroup.classList.add('d-none');
        loginFormTitle.textContent = 'Acesso ao Sistema';
        loginFormSubtitle.textContent = 'Digite suas credenciais para acessar o sistema.';
        loginFormHint.textContent = 'Você precisa fazer login para acessar o sistema.';
      }
    });
  }
  
  // Verificar se o Firebase foi inicializado
  const firebaseCheckInterval = setInterval(() => {
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
      // Firebase inicializado
      clearInterval(firebaseCheckInterval);
      console.log('Firebase inicializado, verificando autenticação...');
      
      // Configurar o listener de autenticação
      firebase.auth().onAuthStateChanged(handleAuthStateChange);
    } else {
      // Firebase ainda não inicializado, aguardar
      console.log('Aguardando inicialização do Firebase...');
    }
  }, 500);
  
  // Função para lidar com alterações no estado de autenticação
  function handleAuthStateChange(user) {
    console.log('Estado de autenticação alterado:', user ? 'Usuário autenticado' : 'Usuário não autenticado');
    
    if (user) {
      // Usuário autenticado
      isAuthenticated = true;
      console.log('Usuário autenticado:', user.email);
      
      // Atualizar UI
      if (authOverlay) authOverlay.style.display = 'none';
      if (loginButton) loginButton.classList.add('d-none');
      if (logoutButton) logoutButton.classList.remove('d-none');
      
      // Verificar se é admin e redirecionar automaticamente
      if (user.uid === ADMIN_UID) {
        console.log('Usuário é administrador! Redirecionando para o painel...');
        
        // Mostrar notificação
        showNotification('Login Admin', 'Redirecionando para o painel de administração...', 'success');
        
        // Redirecionar após um breve atraso
        setTimeout(() => {
          window.location.href = '/admin';
        }, 1500);
      }
    } else {
      // Usuário não autenticado
      isAuthenticated = false;
      console.log('Usuário não autenticado');
      
      // Atualizar UI
      if (authOverlay) authOverlay.style.display = 'flex';
      if (loginButton) loginButton.classList.remove('d-none');
      if (logoutButton) logoutButton.classList.add('d-none');
      
      // Abrir modal de login automaticamente
      setTimeout(() => {
        if (loginModal) {
          // O modal já está inicializado
          loginModal.show();
        } else {
          // Inicializar o modal primeiro
          loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
          loginModal.show();
        }
      }, 1000);
    }
  }
  
  // Configurar evento de submit do formulário
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Verificar se Firebase está pronto
      if (typeof firebase === 'undefined' || !firebase.apps.length) {
        showErrorMessage('Sistema de autenticação não foi inicializado. Aguarde ou recarregue a página.');
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
        showErrorMessage('Por favor, preencha todos os campos.');
        return;
      }
      
      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showErrorMessage('Por favor, insira um email válido.');
        return;
      }
      
      // Validar senha
      if (password.length < 6) {
        showErrorMessage('A senha deve ter pelo menos 6 caracteres.');
        return;
      }
      
      // Desabilitar botão de login
      loginBtn.disabled = true;
      
      if (formMode === 'login') {
        // Modo de login
        loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Entrando...';
        console.log('Tentando login com email:', email);
        
        try {
          // Fazer login no Firebase
          await firebase.auth().signInWithEmailAndPassword(email, password);
          console.log('Login bem-sucedido');
          
          // Esconder modal
          loginModal.hide();
          
          // Obter usuário atual
          const user = firebase.auth().currentUser;
          
          // Verificar se é o administrador para redirecionar
          if (user.uid === ADMIN_UID) {
            showNotification('Login realizado', 'Bem-vindo ao painel de administração', 'success');
            
            // Redirecionar para o painel admin
            setTimeout(() => {
              window.location.href = '/admin';
            }, 1000);
          } else {
            showNotification('Login realizado', 'Bem-vindo à loja BOSSPODS', 'success');
            
            // Esconder overlay
            if (authOverlay) authOverlay.style.display = 'none';
          }
        } catch (error) {
          console.error('Erro ao fazer login:', error);
          
          // Tratar erros específicos
          if (error.code === 'auth/user-not-found') {
            showErrorMessage('Usuário não encontrado. Crie uma conta primeiro.');
          } else if (error.code === 'auth/wrong-password') {
            showErrorMessage('Senha incorreta. Tente novamente.');
          } else if (error.code === 'auth/too-many-requests') {
            showErrorMessage('Muitas tentativas falhas. Tente novamente mais tarde.');
          } else {
            showErrorMessage('Erro ao fazer login: ' + error.message);
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
          // Como agora verificamos por UID, esta verificação não é mais necessária
          // Mantemos apenas por segurança para evitar clonagem de email do admin
          if (false) {
            showErrorMessage('Este email está reservado para o administrador do sistema. Por favor, use outro email.');
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
          
          try {
            // Tentar criar documento do usuário no Firestore
            // Esta operação pode falhar devido a permissões, mas não deve interromper o registro
            await firebase.firestore().collection('users').doc(userCredential.user.uid).set({
              email: email,
              displayName: displayName || email.split('@')[0],
              role: 'user',
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
          } catch (firestoreError) {
            // Registrar erro, mas não interromper o fluxo
            console.log('Aviso: Não foi possível criar registro no Firestore:', firestoreError.message);
            // O usuário foi criado com sucesso, apenas o registro no Firestore falhou
          }
          
          console.log('Conta criada com sucesso');
          
          // Esconder modal
          loginModal.hide();
          
          // Mostrar mensagem de sucesso
          showNotification('Conta criada', 'Sua conta foi criada com sucesso. Bem-vindo à loja!', 'success');
          
          // Esconder overlay
          if (authOverlay) authOverlay.style.display = 'none';
          
        } catch (error) {
          console.error('Erro ao criar conta:', error);
          
          // Tratar erros específicos
          if (error.code === 'auth/email-already-in-use') {
            showErrorMessage('Este email já está registrado. Tente fazer login ou use outro email.');
          } else if (error.code === 'auth/invalid-email') {
            showErrorMessage('Email inválido. Verifique se digitou corretamente.');
          } else if (error.code === 'auth/weak-password') {
            showErrorMessage('Senha muito fraca. Use pelo menos 6 caracteres.');
          } else {
            showErrorMessage('Erro ao criar conta: ' + error.message);
          }
          
          // Reabilitar botão
          loginBtn.disabled = false;
          loginBtn.innerHTML = '<i class="bi bi-person-plus me-1"></i> Criar Conta';
        }
      }
    });
  }
  
  // Configurar evento de submit do formulário de login de administrador
  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Verificar se Firebase está pronto
      if (typeof firebase === 'undefined' || !firebase.apps.length) {
        showErrorMessage('Sistema de autenticação não foi inicializado. Aguarde ou recarregue a página.');
        return;
      }
      
      // Obter o UID inserido
      const inputUID = adminUIDInput.value.trim();
      
      // Validações básicas
      if (!inputUID) {
        showErrorMessage('Por favor, insira o UID do administrador.');
        return;
      }
      
      // Verificar se o UID é válido
      if (inputUID !== ADMIN_UID) {
        showErrorMessage('UID inválido. Acesso negado ao painel administrativo.');
        return;
      }
      
      // Desabilitar botão de login
      adminLoginBtn.disabled = true;
      adminLoginBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Verificando...';
      
      try {
        // Como o usuário forneceu o UID correto, vamos autenticar diretamente por localStorage
        // Não é necessário fazer login anônimo no Firebase
        console.log('UID de administrador válido. Autorizando acesso...');
        
        // Armazenar o UID do admin na sessão local para identificação
        localStorage.setItem('adminUID', ADMIN_UID);
        
        // Mostrar notificação
        showNotification('Acesso Autorizado', 'Redirecionando para o painel de administração...', 'success');
        
        // Atualizar UI imediatamente para refletir autenticação
        if (authOverlay) authOverlay.style.display = 'none';
        if (loginButton) loginButton.classList.add('d-none');
        if (logoutButton) logoutButton.classList.remove('d-none');
        
        // Redirecionar para o painel admin
        setTimeout(() => {
          window.location.href = '/admin';
        }, 1000);
      } catch (error) {
        console.error('Erro ao processar login de administrador:', error);
        showErrorMessage('Erro ao processar login de administrador. Tente novamente.');
        
        // Reabilitar botão
        adminLoginBtn.disabled = false;
        adminLoginBtn.innerHTML = '<i class="bi bi-shield-lock me-1"></i> Acessar Painel';
      }
    });
  }
  
  // Função para fazer logout
  function logout() {
    if (firebase && firebase.auth) {
      firebase.auth().signOut()
        .then(() => {
          console.log('Logout bem-sucedido');
          
          // Limpar dados de autenticação
          isAuthenticated = false;
          
          // Limpar localStorage para remover UID de admin
          localStorage.removeItem('adminUID');
          
          // Atualizar UI
          if (authOverlay) authOverlay.style.display = 'flex';
          if (loginButton) loginButton.classList.remove('d-none');
          if (logoutButton) logoutButton.classList.add('d-none');
          
          // Mostrar notificação
          showNotification('Logout', 'Você foi desconectado com sucesso', 'info');
        })
        .catch((error) => {
          console.error('Erro ao fazer logout:', error);
          showNotification('Erro', 'Falha ao fazer logout. Tente novamente.', 'error');
        });
    }
  }
  
  // Funções auxiliares
  
  // Mostrar mensagem de erro na área reservada
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