/**
 * Constantes globais do sistema BossPods
 */

// Configuração do Firebase
var firebaseConfig = {
  apiKey: "AIzaSyA4pW2OUCNAu2pu4OPgLWyqLlEQUJcRJ7k",
  authDomain: "bosspods-inventory.firebaseapp.com",
  projectId: "bosspods-inventory",
  storageBucket: "bosspods-inventory.appspot.com",
  messagingSenderId: "567580551170",
  appId: "1:567580551170:web:07df9048ed596330c10a86"
};

// UID do Administrador
var ADMIN_UID = '96rupqrpWjbyKtSksDaISQ94y6l2';

// Função para criar configurações de autenticação quando o Firebase estiver disponível
function getAuthConfig() {
  return {
    signInFlow: 'redirect',
    signInOptions: [
      firebase.auth.EmailAuthProvider.PROVIDER_ID
    ],
    callbacks: {
      signInSuccessWithAuthResult: (authResult) => {
        return false;
      }
    }
  };
}

// Verificar se o Firebase está carregado e inicializado
function waitForFirebase(callback) {
  const checkInterval = setInterval(() => {
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
      clearInterval(checkInterval);
      clearTimeout(timeoutId);
      callback();
    }
  }, 100);
  
  // Timeout após 10 segundos
  const timeoutId = setTimeout(() => {
    clearInterval(checkInterval);
    console.error('Timeout ao esperar pelo Firebase');
  }, 10000);
}