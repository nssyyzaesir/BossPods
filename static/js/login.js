// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCl_NEvqOLaHjbhx3pDfnZrhBR4iqav9h8",
  authDomain: "bosspods.firebaseapp.com",
  projectId: "bosspods",
  storageBucket: "bosspods.firebasestorage.app",
  messagingSenderId: "319819159324",
  appId: "1:319819159324:web:953f64130fe51842600cd9"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
  // Verificar se o usuário já está logado
  auth.onAuthStateChanged(function(user) {
    if (user) {
      // Usuário já está logado, redirecionar para o dashboard
      redirectToDashboard();
    }
  });
  
  // Configurar eventos do formulário de login
  document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // Definir persistência com base na opção "Lembrar-me"
    const persistence = rememberMe ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION;
    
    auth.setPersistence(persistence)
      .then(() => {
        // Fazer login
        return auth.signInWithEmailAndPassword(email, password);
      })
      .then((userCredential) => {
        // Login bem-sucedido
        const user = userCredential.user;
        
        // Obter o token ID para uso no backend
        return user.getIdToken();
      })
      .then((token) => {
        // Salvar token em cookie seguro via backend
        return fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ token })
        });
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // Redirecionar para o dashboard
          redirectToDashboard();
        } else {
          throw new Error(data.error || 'Erro ao processar login');
        }
      })
      .catch((error) => {
        console.error('Erro no login:', error);
        showLoginError();
      });
  });
  
  // Mostrar/ocultar formulário de recuperação de senha
  document.getElementById('forgotPassword').addEventListener('click', function(e) {
    e.preventDefault();
    document.querySelector('.login-card').classList.add('d-none');
    document.querySelector('.recovery-card').classList.remove('d-none');
  });
  
  // Voltar para o login
  document.getElementById('backToLogin').addEventListener('click', function() {
    document.querySelector('.recovery-card').classList.add('d-none');
    document.querySelector('.login-card').classList.remove('d-none');
  });
  
  // Mostrar/ocultar formulário de registro
  document.getElementById('registerLink').addEventListener('click', function(e) {
    e.preventDefault();
    document.querySelector('.login-card').classList.add('d-none');
    document.querySelector('.register-card').classList.remove('d-none');
  });
  
  // Voltar para o login do registro
  document.getElementById('backToLogin2').addEventListener('click', function() {
    document.querySelector('.register-card').classList.add('d-none');
    document.querySelector('.login-card').classList.remove('d-none');
  });
  
  // Envio do formulário de recuperação de senha
  document.getElementById('recoveryForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const email = document.getElementById('recoveryEmail').value;
    
    auth.sendPasswordResetEmail(email)
      .then(() => {
        showNotification('Email enviado', 'Verifique sua caixa de entrada para redefinir sua senha.', 'success');
        document.querySelector('.recovery-card').classList.add('d-none');
        document.querySelector('.login-card').classList.remove('d-none');
      })
      .catch((error) => {
        console.error('Erro ao recuperar senha:', error);
        showNotification('Erro', 'Não foi possível enviar o email de recuperação. Verifique o endereço.', 'error');
      });
  });
  
  // Envio do formulário de registro
  document.getElementById('registerForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Verificar se as senhas coincidem
    if (password !== confirmPassword) {
      showNotification('Erro', 'As senhas não coincidem.', 'error');
      return;
    }
    
    // Criar usuário no Firebase
    auth.createUserWithEmailAndPassword(email, password)
      .then((userCredential) => {
        // Registro bem-sucedido
        const user = userCredential.user;
        
        // Definir o nome de exibição
        return user.updateProfile({
          displayName: name
        });
      })
      .then(() => {
        // Enviar email de verificação
        return auth.currentUser.sendEmailVerification();
      })
      .then(() => {
        // Adicionar informações adicionais do usuário no backend
        const user = auth.currentUser;
        return fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            uid: user.uid,
            name: name,
            email: email,
            role: 'user'
          })
        });
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          showNotification('Conta criada', 'Sua conta foi criada com sucesso. Verifique seu email.', 'success');
          
          // Voltar para a tela de login
          document.querySelector('.register-card').classList.add('d-none');
          document.querySelector('.login-card').classList.remove('d-none');
          
          // Limpar formulário
          document.getElementById('registerForm').reset();
        } else {
          throw new Error(data.error || 'Erro ao finalizar registro');
        }
      })
      .catch((error) => {
        console.error('Erro no registro:', error);
        showNotification('Erro', 'Não foi possível criar a conta. ' + error.message, 'error');
      });
  });
  
  // Alternar visibilidade da senha
  document.querySelector('.toggle-password').addEventListener('click', function() {
    const passwordInput = document.getElementById('password');
    const icon = this.querySelector('i');
    
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      icon.classList.remove('bi-eye-slash-fill');
      icon.classList.add('bi-eye-fill');
    } else {
      passwordInput.type = 'password';
      icon.classList.remove('bi-eye-fill');
      icon.classList.add('bi-eye-slash-fill');
    }
  });
});

// Funções auxiliares
function redirectToDashboard() {
  window.location.href = '/admin';
}

function showLoginError() {
  const loginAlert = document.getElementById('login-alert');
  loginAlert.classList.remove('d-none');
  
  // Adicionar animação de shake
  const loginForm = document.getElementById('loginForm');
  loginForm.classList.add('shake-error');
  
  // Remover classe de animação após a animação terminar
  setTimeout(() => {
    loginForm.classList.remove('shake-error');
  }, 600);
}

function showNotification(title, message, type = 'info') {
  const toastTitle = document.getElementById('toastTitle');
  const toastMessage = document.getElementById('toastMessage');
  const toastElement = document.getElementById('notificationToast');
  
  // Definir conteúdo
  toastTitle.textContent = title;
  toastMessage.textContent = message;
  
  // Definir classe baseada no tipo (info, success, error)
  toastElement.className = 'toast cyber-toast';
  if (type === 'success') {
    toastElement.classList.add('cyber-toast-success');
  } else if (type === 'error') {
    toastElement.classList.add('cyber-toast-error');
  }
  
  // Mostrar toast
  const toast = new bootstrap.Toast(toastElement);
  toast.show();
}