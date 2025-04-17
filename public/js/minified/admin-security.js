/**
 * Módulo de Segurança para Admin
 * Verificação avançada de autenticação, proteção contra manipulação e reforço de autenticação
 * 
 * ATENÇÃO: Este arquivo contém código minificado e ofuscado para proteção adicional
 */

// Constantes de segurança
// Usamos a constante global ADMIN_UID do arquivo constants.js
var SECURITY_ADMIN_UID = ADMIN_UID;
var AUTH_CHECK_INTERVAL = 60000; // 1 minuto
var DEVTOOLS_CHECK_INTERVAL = 5000; // 5 segundos
var TOKEN_REFRESH_INTERVAL = 600000; // 10 minutos

// Variáveis de controle global
let authCheckTimer = null;
let devtoolsCheckTimer = null;
let tokenRefreshTimer = null;
let securityChecksActive = false;
let lastUserState = null;
let lastAuthTime = null;
let lastTokenRefresh = null;
let securityBreachDetected = false;

// Função para mostrar overlay de violação de segurança
function showSecurityBreachOverlay(mensagem = null) {
  try {
    // Verificar se já existe um overlay
    if (document.getElementById('securityBreachOverlay')) {
      return;
    }
    
    // Registrar violação
    console.error('ALERTA DE SEGURANÇA: Violação detectada');
    
    // Registrar no log se possível
    try {
      if (window.firestoreProducts && typeof window.firestoreProducts.registrarLog === 'function') {
        window.firestoreProducts.registrarLog(
          'seguranca',
          'N/A',
          'Painel Admin',
          mensagem || 'Violação de segurança detectada'
        );
      }
    } catch (e) {
      console.error('Erro ao registrar violação:', e);
    }
    
    // Exibir overlay
    const overlay = document.getElementById('securityBreachOverlay');
    if (overlay) {
      overlay.style.display = 'flex';
      
      // Adicionar mensagem se fornecida
      if (mensagem) {
        const messageEl = document.querySelector('#securityBreachOverlay .security-breach-message');
        if (messageEl) {
          messageEl.textContent = mensagem;
        }
      }
      
      // Configurar botão
      const btn = document.getElementById('securityBreachBtn');
      if (btn) {
        btn.addEventListener('click', function() {
          // Redirecionar para página inicial
          window.location.href = '/';
        });
      }
    } else {
      // Criar overlay se não existir
      const newOverlay = document.createElement('div');
      newOverlay.id = 'securityBreachOverlay';
      newOverlay.className = 'security-breach-overlay';
      
      newOverlay.innerHTML = `
        <div class="security-breach-container">
          <div class="security-breach-icon">
            <i class="bi bi-shield-exclamation"></i>
          </div>
          <h2 class="security-breach-title">ALERTA DE SEGURANÇA</h2>
          <p class="security-breach-message">
            ${mensagem || 'O sistema identificou uma possível violação de segurança.'}
          </p>
          <div class="security-breach-action">
            <button id="securityBreachBtn" class="security-breach-btn">Entendi</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(newOverlay);
      
      // Configurar botão
      document.getElementById('securityBreachBtn').addEventListener('click', function() {
        // Redirecionar para página inicial
        window.location.href = '/';
      });
    }
    
    // Definir flag de violação
    securityBreachDetected = true;
    
    // Interromper verificações de segurança
    stopSecurityChecks();
    
    // Limpar dados de sessão por segurança
    try {
      sessionStorage.clear();
      localStorage.removeItem('adminUID');
    } catch (e) {
      console.error('Erro ao limpar dados de sessão:', e);
    }
    
    // Forçar logout após 5 segundos
    setTimeout(() => {
      try {
        if (firebase && firebase.auth) {
          firebase.auth().signOut().catch(e => console.error('Erro ao fazer logout:', e));
        }
      } catch (e) {
        console.error('Erro ao acessar Firebase:', e);
      }
    }, 5000);
  } catch (error) {
    console.error('Erro ao mostrar overlay de segurança:', error);
  }
}

// Função para detectar ferramentas de desenvolvedor
function detectDevTools() {
  try {
    const devtools = {
      isOpen: false,
      orientation: undefined
    };
    
    // Verificação 1: Usando o objeto console
    const checkConsoleOutput = () => {
      const startTime = performance.now();
      console.log('Verificação de segurança');
      console.clear();
      const endTime = performance.now();
      
      // Se o tempo for muito longo, é provável que o console esteja aberto
      return (endTime - startTime) > 100;
    };
    
    // Verificação 2: Usando RegExp para detectar Firebug
    const checkFirebug = () => {
      if (window.console && (window.console.firebug || (console.exception && console.table))) {
        return true;
      }
      return false;
    };
    
    // Verificação 3: Usando dimensões da janela
    const checkDevToolsBySize = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      
      // Determinar orientação
      if (heightThreshold && !widthThreshold) {
        devtools.orientation = 'vertical';
      } else if (widthThreshold && !heightThreshold) {
        devtools.orientation = 'horizontal';
      }
      
      return widthThreshold || heightThreshold;
    };
    
    // Combinar os resultados
    devtools.isOpen = checkConsoleOutput() || checkFirebug() || checkDevToolsBySize();
    
    // Se alguma verificação indicar que ferramentas de desenvolvedor estão abertas
    if (devtools.isOpen && !securityBreachDetected) {
      console.warn('Ferramentas de desenvolvedor detectadas. Notificando sistema de segurança...');
      
      // Registrar no log
      try {
        if (window.firestoreProducts && typeof window.firestoreProducts.registrarLog === 'function') {
          window.firestoreProducts.registrarLog(
            'seguranca',
            'N/A',
            'Painel Admin',
            `Ferramentas de desenvolvedor detectadas (${devtools.orientation || 'método desconhecido'})`
          );
        }
      } catch (e) {
        console.error('Erro ao registrar detecção:', e);
      }
      
      // Verificar se é o primeiro alerta ou alerta repetido
      const lastAlert = sessionStorage.getItem('devToolsAlert');
      const now = Date.now();
      
      if (!lastAlert || (now - parseInt(lastAlert)) > 300000) { // 5 minutos entre alertas
        sessionStorage.setItem('devToolsAlert', now.toString());
        
        // Mostrar alerta ao usuário
        alert("ALERTA DE SEGURANÇA: Ferramentas de desenvolvedor detectadas. O uso de ferramentas de depuração nesta aplicação é proibido e esta atividade foi registrada.");
        
        // Atualizar o número de detecções
        let detections = parseInt(sessionStorage.getItem('devToolsDetections') || '0');
        detections++;
        sessionStorage.setItem('devToolsDetections', detections.toString());
        
        // Se houver múltiplas detecções, mostrar overlay de violação
        if (detections >= 3) {
          showSecurityBreachOverlay('Múltiplas tentativas de usar ferramentas de desenvolvedor foram detectadas. Esta sessão foi encerrada por motivos de segurança.');
          return true;
        }
      }
    }
    
    return devtools.isOpen;
  } catch (error) {
    console.error('Erro ao detectar DevTools:', error);
    return false;
  }
}

// Função para verificar autenticação válida
async function checkValidAuth() {
  try {
    const currentUser = firebase.auth().currentUser;
    
    // Verificar se o usuário está autenticado
    if (!currentUser) {
      console.warn('Usuário não autenticado durante verificação de segurança');
      return false;
    }
    
    // Verificar se o UID corresponde ao admin
    if (currentUser.uid !== SECURITY_ADMIN_UID) {
      console.warn('UID não corresponde ao admin durante verificação de segurança');
      
      // Registrar no log
      try {
        if (window.firestoreProducts && typeof window.firestoreProducts.registrarLog === 'function') {
          window.firestoreProducts.registrarLog(
            'seguranca',
            'N/A',
            'Painel Admin',
            `UID inválido detectado: ${currentUser.uid}`
          );
        }
      } catch (e) {
        console.error('Erro ao registrar UID inválido:', e);
      }
      
      return false;
    }
    
    // Verificar token
    try {
      const tokenResult = await currentUser.getIdTokenResult(false);
      
      // Verificar tempo de emissão
      const issuedAt = new Date(tokenResult.issuedAtTime).getTime();
      const now = Date.now();
      const tokenAge = (now - issuedAt) / (1000 * 60 * 60); // em horas
      
      // Se token tiver mais de 24 horas
      if (tokenAge > 24) {
        console.warn(`Token muito antigo (${tokenAge.toFixed(2)} horas) durante verificação de segurança`);
        return false;
      }
      
      // Verificar tempo de autenticação
      const authTime = new Date(tokenResult.authTime).getTime();
      const authAge = (now - authTime) / (1000 * 60 * 60); // em horas
      
      // Se última autenticação foi há mais de 24 horas
      if (authAge > 24) {
        console.warn(`Autenticação muito antiga (${authAge.toFixed(2)} horas) durante verificação de segurança`);
        return false;
      }
      
      // Atualizar timestamp da última autenticação
      lastAuthTime = authTime;
      
      return true;
    } catch (tokenError) {
      console.error('Erro ao verificar token durante checagem de segurança:', tokenError);
      return false;
    }
  } catch (error) {
    console.error('Erro durante verificação de autenticação:', error);
    return false;
  }
}

// Função para atualizar token periodicamente
async function refreshAuthToken() {
  try {
    const currentUser = firebase.auth().currentUser;
    
    if (currentUser) {
      // Forçar atualização do token
      await currentUser.getIdToken(true);
      console.log('Token de autenticação atualizado');
      
      // Atualizar timestamp
      lastTokenRefresh = Date.now();
    }
  } catch (error) {
    console.error('Erro ao atualizar token de autenticação:', error);
  }
}

// Função para iniciar verificações de segurança
function startSecurityChecks() {
  if (securityChecksActive) return;
  
  console.log('Iniciando verificações de segurança');
  
  // Verificar DevTools periodicamente
  devtoolsCheckTimer = setInterval(() => {
    const devToolsOpen = detectDevTools();
    
    if (devToolsOpen && !securityBreachDetected) {
      console.warn('DevTools detectado durante verificação periódica');
    }
  }, DEVTOOLS_CHECK_INTERVAL);
  
  // Verificar autenticação válida periodicamente
  authCheckTimer = setInterval(async () => {
    const isAuthValid = await checkValidAuth();
    
    if (!isAuthValid && !securityBreachDetected) {
      console.warn('Autenticação inválida detectada durante verificação periódica');
      
      // Verificar se é uma nova mudança de estado
      if (lastUserState !== false) {
        lastUserState = false;
        
        // Mostrar overlay de violação
        showSecurityBreachOverlay('Sua sessão não é mais válida ou foi manipulada. Esta sessão foi encerrada por motivos de segurança.');
      }
    } else {
      lastUserState = true;
    }
  }, AUTH_CHECK_INTERVAL);
  
  // Atualizar token periodicamente
  tokenRefreshTimer = setInterval(() => {
    refreshAuthToken();
  }, TOKEN_REFRESH_INTERVAL);
  
  securityChecksActive = true;
}

// Função para interromper verificações de segurança
function stopSecurityChecks() {
  if (!securityChecksActive) return;
  
  console.log('Interrompendo verificações de segurança');
  
  // Limpar temporizadores
  if (devtoolsCheckTimer) {
    clearInterval(devtoolsCheckTimer);
    devtoolsCheckTimer = null;
  }
  
  if (authCheckTimer) {
    clearInterval(authCheckTimer);
    authCheckTimer = null;
  }
  
  if (tokenRefreshTimer) {
    clearInterval(tokenRefreshTimer);
    tokenRefreshTimer = null;
  }
  
  securityChecksActive = false;
}

// Função para verificar e configurar ambiente
function setupSecurityEnvironment() {
  try {
    // Verificar DevTools inicial
    detectDevTools();
    
    // Verificar autenticação inicial
    checkValidAuth().then(isValid => {
      lastUserState = isValid;
      
      if (isValid) {
        // Iniciar verificações periódicas
        startSecurityChecks();
      } else {
        // Se não estiver logado como admin, não iniciar verificações
        console.warn('Não iniciando verificações de segurança: usuário não autenticado como admin');
      }
    });
    
    // Configurar listener para mudanças de autenticação
    firebase.auth().onAuthStateChanged(async user => {
      if (user && user.uid === SECURITY_ADMIN_UID) {
        console.log('Admin autenticado, configurando ambiente de segurança');
        
        // Atualizar token
        await refreshAuthToken();
        
        // Iniciar verificações se não estiverem ativas
        if (!securityChecksActive) {
          startSecurityChecks();
        }
      } else {
        // Interromper verificações se não for admin
        if (securityChecksActive) {
          stopSecurityChecks();
        }
      }
    });
    
    // Adicionar listener para o evento de visibilidade
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible') {
        console.log('Aba/página voltou a ficar visível, verificando autenticação');
        
        // Verificar autenticação quando a aba voltar a ficar visível
        const isValid = await checkValidAuth();
        
        if (!isValid && !securityBreachDetected) {
          console.warn('Autenticação inválida detectada após mudança de visibilidade');
          showSecurityBreachOverlay('Sua sessão não é mais válida ou foi manipulada enquanto a página estava em segundo plano. Esta sessão foi encerrada por motivos de segurança.');
        }
      }
    });
  } catch (error) {
    console.error('Erro ao configurar ambiente de segurança:', error);
  }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  // Esperar pelo Firebase ser inicializado
  const checkFirebase = setInterval(() => {
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
      clearInterval(checkFirebase);
      setupSecurityEnvironment();
    }
  }, 500);
  
  // Timeout para Firebase
  setTimeout(() => {
    clearInterval(checkFirebase);
  }, 10000);
});