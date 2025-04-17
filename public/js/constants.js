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

// Configurações de autenticação
var AUTH_CONFIG = {
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