// Módulo de autenticação moderna para o painel administrativo
// Utilizando Firebase Auth v9 com módulos ES

import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

// Constante com o UID do administrador
const ADMIN_UID = '96rupqrpWjbyKtSksDaISQ94y6l2';

// Iniciar verificação de autenticação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  console.log('Iniciando verificação de autenticação moderna (v9) para o painel administrativo...');
  
  const auth = getAuth();
  
  // Verificar estado de autenticação
  onAuthStateChanged(auth, (user) => {
    if (!user || user.uid !== ADMIN_UID) {
      // Se não está logado ou não é o admin: redirecionar para login
      console.log('Acesso negado! Usuário não autenticado ou não é administrador.');
      window.location.href = "/login.html";
    } else {
      console.log("Admin confirmado, carregando o painel administrativo...");
      // Aqui você inicia as funções do painel admin
      iniciarPainelAdmin();
    }
  });
});

// Função para iniciar o painel administrativo
function iniciarPainelAdmin() {
  console.log('Painel administrativo inicializado com sucesso!');
  
  // Mostrar mensagem de boas vindas
  const errorMessages = document.getElementById('errorMessages');
  if (errorMessages) {
    errorMessages.innerHTML = `
      <div class="alert alert-success">
        <i class="bi bi-check-circle-fill me-2"></i>
        Bem-vindo ao painel administrativo!
      </div>
    `;
  }
  
  // Verificar se a função de carregamento de dados existe e chamá-la
  if (typeof carregarDados === 'function') {
    carregarDados();
  } else {
    console.warn('Função carregarDados não encontrada');
  }
  
  // Atualizar nome do usuário na UI
  const userDisplayName = document.getElementById('userDisplayName');
  if (userDisplayName) {
    userDisplayName.textContent = 'Administrador';
  }
}