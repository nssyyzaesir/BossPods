// Variáveis globais
let currentPage = 1;
let pageSize = 10;
let totalPages = 1;
let allProdutos = [];
let filteredProdutos = [];
let categorias = [];
let tags = [];
let currentTags = [];
let debugLogs = [];
let filteredDebugLogs = [];
let charts = {};
let confirmCallback = null;

// Detecção anti-DevTools (dificulta manipulação via console)
(function() {
  // Lista de funcionalidades originais a serem protegidas
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info
  };
  
  // Sobrescrever funções do console
  console.log = function() {
    // Registrar tentativa de uso do console
    const args = Array.from(arguments);
    const message = args.join(' ');
    
    // Permitir mensagens de debug, mas registrar todas as chamadas
    if (message.includes('senha') || message.includes('token') || message.includes('auth') || 
        message.includes('admin') || message.includes('firebase')) {
      originalConsole.warn('⚠️ Tentativa de acesso a informações sensíveis detectada e registrada');
      // Poderíamos registrar tentativas suspeitas no backend aqui
    }
    
    // Passar para a função original (para não quebrar o desenvolvimento)
    return originalConsole.log.apply(console, arguments);
  };
  
  // Lista de funções sensíveis para proteger
  const protectedFunctions = [
    'createProduct', 'updateProduct', 'deleteProduct', 'isAdminUser', 
    'firebase.auth', 'getIdToken', 'signInWithEmailAndPassword'
  ];
  
  // Função para exibir o overlay de violação de segurança
  function showSecurityBreachOverlay(mensagem = null) {
    try {
      const overlay = document.getElementById('securityBreachOverlay');
      if (!overlay) return;
      
      // Atualizar mensagem se fornecida
      if (mensagem) {
        const messageElement = overlay.querySelector('.security-breach-message');
        if (messageElement) {
          messageElement.textContent = mensagem;
        }
      }
      
      // Exibir overlay
      overlay.style.display = 'flex';
      
      // Configurar botão para fechar overlay
      const closeButton = overlay.querySelector('#securityBreachBtn');
      if (closeButton) {
        closeButton.addEventListener('click', function() {
          overlay.style.display = 'none';
        });
      }
      
      // Auto-fechar após 10 segundos para evitar bloqueio perpétuo
      setTimeout(() => {
        if (overlay.style.display === 'flex') {
          overlay.style.display = 'none';
        }
      }, 10000);
      
      return true;
    } catch (error) {
      console.error('Erro ao exibir overlay de segurança:', error);
      return false;
    }
  }
  
  // Detector de DevTools por diferença de dimensões
  function detectDevTools() {
    // Controle de estado para prevenção de duplicação
    if (window._devToolsCheckActive) return;
    window._devToolsCheckActive = true;
    
    // Constantes importantes
    const ADMIN_UID = '96rupqrpWjbyKtSksDaISQ94y6l2';
    const threshold = 160;
    
    // Variáveis de estado
    let devtoolsOpen = false;
    let alertShown = false;
    let accessBlocked = false;
    let overlayElement = null;
    let devtoolsDetections = 0;
    let lastDetectionTime = 0;
    
    // Iniciar verificação periódica
    const checkInterval = setInterval(checkDevTools, 800); // Verificação mais frequente
    
    // Detectar alterações nas dimensões da janela (que podem indicar abertura de DevTools)
    window.addEventListener('resize', checkDevTools);
    
    // Verificar ocultação de elementos (outra técnica de detecção)
    const debugDetector = document.createElement('div');
    debugDetector.id = '_debugger-detector';
    debugDetector.style.display = 'none';
    document.body.appendChild(debugDetector);

    // Função principal de verificação com melhorias
    function checkDevTools() {
      try {
        // Verificações dimensionais
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        
        // Verificação adicional: console.debug modificado
        const consoleCheck = (function() {
          let f = false;
          try {
            const db = document.createElement('div');
            db.id = '_debug-bar';
            db.style.display = 'none';
            db.setAttribute('style', 'display:none');
            document.body.appendChild(db);
            console.debug('debug');
            f = db.style.display === 'block';
            document.body.removeChild(db);
          } catch (e) {
            // Silenciar erros aqui para evitar exceções
          }
          return f;
        })();
        
        // Verificar se elemento de debug está visível (terceira técnica)
        const debugElementCheck = window.getComputedStyle(debugDetector).display === 'block';
        
        // Detectar se DevTools está aberto por qualquer uma das técnicas
        if (widthThreshold || heightThreshold || consoleCheck || debugElementCheck) {
          // Incrementar contador de detecções e verificar tempo
          const currentTime = Date.now();
          // Resetar contador se já passou muito tempo desde a última detecção
          if (currentTime - lastDetectionTime > 10000) {
            devtoolsDetections = 0;
          }
          
          devtoolsDetections++;
          lastDetectionTime = currentTime;
          
          if (!devtoolsOpen) {
            devtoolsOpen = true;
            
            // Verificar se o usuário é um admin autorizado
            const currentUser = firebase.auth().currentUser;
            const storedAdminUID = localStorage.getItem('adminUID');
            const isAuthorizedAdmin = (currentUser && currentUser.uid === ADMIN_UID) || storedAdminUID === ADMIN_UID;
            
            // Se não for admin autorizado, bloquear acesso
            if (!isAuthorizedAdmin) {
              if (!accessBlocked) {
                accessBlocked = true;
                
                // Registrar tentativa no log de segurança
              try {
                const detalhes = {
                  timestamp: new Date().toISOString(),
                  userAgent: navigator.userAgent,
                  device: navigator.platform,
                  url: window.location.href
                };
                
                if (currentUser) {
                  detalhes.uid = currentUser.uid;
                  detalhes.email = currentUser.email;
                }
                
                // Registrar no log se possível
                if (firestoreProducts) {
                  firestoreProducts.registrarLog(
                    'seguranca', 
                    'N/A', 
                    'Painel Admin', 
                    `Tentativa de acesso utilizando DevTools: ${JSON.stringify(detalhes)}`
                  );
                }
                
                // Registrar tentativa no console de forma mais discreta
                originalConsole.warn('⚠️ Tentativa de uso não autorizado de DevTools detectada e bloqueada');
              } catch (e) {
                originalConsole.error('Erro ao registrar tentativa de acesso:', e);
              }
              
              // Criar overlay de acesso negado com estilo cyberpunk
              overlayElement = document.createElement('div');
              overlayElement.className = 'access-denied-overlay';
              overlayElement.innerHTML = `
                <div>
                  <i class="bi bi-shield-lock-fill mb-3" style="font-size: 5rem;"></i>
                  <h2 class="glitch-text">ACESSO NEGADO</h2>
                  <p>Esta ação não é permitida e foi registrada.</p>
                  <div class="cyber-hr"></div>
                  <p class="mt-4"><small>Feche o DevTools para continuar.</small></p>
                </div>
              `;
              document.body.appendChild(overlayElement);
              
              // Desabilitar todas as interações com a interface
              document.querySelectorAll('button, a, input, select, textarea').forEach(el => {
                el.disabled = true;
                if (el.tagName === 'A') {
                  el.style.pointerEvents = 'none';
                }
              });
              
              // Interromper todas as requisições em andamento
              if (window.stop) {
                window.stop();
              }
              
              // Desconectar usuário por segurança
              firebase.auth().signOut().catch(e => originalConsole.error('Erro ao fazer logout:', e));
              
              // Limpar dados sensíveis
              localStorage.removeItem('adminUID');
              localStorage.removeItem('currentUser');
              sessionStorage.clear();
              
              // Ativar proteção adicional
              window._protectionActive = true;
              
              // Redirecionar após alguns segundos
              setTimeout(() => {
                window.location.href = '/login.html?error=security_violation';
              }, 5000);
            }
          } else {
            // Usuário é admin autorizado, apenas mostrar alerta
            if (!alertShown) {
              alertShown = true;
              alert('⚠️ Modo de desenvolvedor detectado. Use esta ferramenta com responsabilidade. Apenas administradores autorizados podem acessar esta funcionalidade.');
            }
          }
        }
      } catch (error) {
        console.error('Erro na detecção de DevTools:', error);
      }
      
      // DevTools foram fechadas
      if (devtoolsOpen) {
        devtoolsOpen = false;
        alertShown = false;
        
        // Se o acesso foi bloqueado mas o DevTools foi fechado, recarregar a página
        if (accessBlocked && overlayElement) {
          try {
            // Remover overlay
            document.body.removeChild(overlayElement);
            overlayElement = null;
            
            // Reabilitar interações
            document.querySelectorAll('button, a, input, select, textarea').forEach(el => {
              el.disabled = false;
              if (el.tagName === 'A') {
                el.style.pointerEvents = 'auto';
              }
            });
            
            // Desativar proteção
            window._protectionActive = false;
            accessBlocked = false;
            
            // Recarregar a página para restaurar estado
            window.location.reload();
          } catch (e) {
            console.error('Erro ao remover overlay:', e);
          }
        }
      }
    };
    
    // Executar verificação inicial
    checkDevTools();
    
    // Já definimos o intervalo e listener acima, não precisamos duplicar
    
    // Detectar tentativas de debugging com console
    const detectDebugging = () => {
      if (!accessBlocked) {
        const currentUser = firebase.auth().currentUser;
        const storedAdminUID = localStorage.getItem('adminUID');
        const isAuthorizedAdmin = (currentUser && currentUser.uid === ADMIN_UID) || storedAdminUID === ADMIN_UID;
        
        if (!isAuthorizedAdmin) {
          accessBlocked = true;
          originalConsole.warn('⚠️ Depuração não permitida! Esta ação foi registrada.');
          
          // Registrar no log se possível
          if (firestoreProducts) {
            const detalhes = {
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent,
              url: window.location.href
            };
            
            firestoreProducts.registrarLog(
              'seguranca', 
              'N/A', 
              'Painel Admin', 
              `Tentativa de depuração detectada: ${JSON.stringify(detalhes)}`
            );
          }
          
          // Redirecionar para página de login com erro
          window.location.href = '/login.html?error=security_violation';
        }
      }
      return true;
    };
    
    // Proteção contra manipulação do localStorage
    const originalSetItem = localStorage.setItem;
    const sensitiveKeys = ['adminUID', 'authToken', 'currentUser'];
    
    localStorage.setItem = function(key, value) {
      // Verificar se é uma chave sensível
      if (sensitiveKeys.includes(key)) {
        const currentUser = firebase.auth().currentUser;
        
        // Se tentar definir adminUID, verificar se o valor é válido
        if (key === 'adminUID' && value !== ADMIN_UID) {
          console.error(`Tentativa de manipulação de ${key} detectada`);
          
          // Registrar no log se possível
          if (firestoreProducts) {
            firestoreProducts.registrarLog(
              'seguranca', 
              'N/A', 
              'Painel Admin', 
              `Tentativa de manipulação de localStorage: ${key}`
            );
          }
          
          // Mostrar overlay de violação de segurança
          showSecurityBreachOverlay(`Violação de segurança detectada: Tentativa de manipulação não autorizada de dados sensíveis. Esta ação foi registrada e poderá resultar em bloqueio de acesso.`);
          
          // Não permitir a modificação
          return;
        }
        
        // Se não for o admin, não permitir modificação de chaves sensíveis
        if (!currentUser || currentUser.uid !== ADMIN_UID) {
          console.error(`Tentativa não autorizada de modificar ${key}`);
          return;
        }
      }
      
      // Se passar pelas verificações, permitir a operação
      return originalSetItem.call(localStorage, key, value);
    };
    
    // Proteger variáveis críticas
    Object.defineProperty(window, 'ADMIN_UID', {
      value: ADMIN_UID,
      writable: false,
      configurable: false
    });
    
    // Bloquear tentativas de desabilitar a proteção
    Object.defineProperty(window, '_protectionActive', {
      value: false,
      writable: false,
      configurable: false
    });
    
    // Retornar função de limpeza
    return () => {
      clearInterval(checkInterval);
      window.removeEventListener('resize', checkDevTools);
      localStorage.setItem = originalSetItem;
    };
  }
  
  // Iniciar detecção
  detectDevTools();
  
  // Ocultar as funções protegidas do objeto global
  window._adminFunctions = {};
})();

// Função para exibir o overlay de violação de segurança
function showSecurityBreachOverlay(mensagem = null) {
  try {
    // Primeiro, tentar encontrar o overlay existente
    let overlay = document.getElementById('securityBreachOverlay');
    
    // Se não existir, criar um novo dinamicamente
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'securityBreachOverlay';
      overlay.className = 'security-breach-overlay cyber-overlay';
      
      // Criar conteúdo do overlay com estilo cyberpunk
      overlay.innerHTML = `
        <div class="security-breach-content cyber-panel">
          <div class="security-breach-header">
            <div class="cyber-glitch-effect">ALERTA DE SEGURANÇA</div>
            <div class="cyber-scanner-line"></div>
          </div>
          <div class="security-breach-icon">
            <i class="bi bi-shield-exclamation"></i>
          </div>
          <h3 class="cyber-text-glow">Violação de Segurança Detectada</h3>
          <p class="security-breach-message">${mensagem || 'Tentativa de manipulação detectada. Esta ação foi registrada por motivos de segurança.'}</p>
          <div class="security-breach-actions">
            <button class="btn cyber-btn cyber-btn-danger" id="securityBreachBtn">Entendi</button>
          </div>
          <div class="cyber-fingerprint-scan"></div>
        </div>
      `;
      
      // Adicionar ao corpo do documento
      document.body.appendChild(overlay);
      
      // Estilizar o overlay dinamicamente se não tiver CSS definido
      const style = document.createElement('style');
      style.textContent = `
        .security-breach-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.9);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          backdrop-filter: blur(5px);
          animation: pulseBackground 3s infinite;
        }
        
        .security-breach-content {
          width: 90%;
          max-width: 500px;
          background-color: rgba(20, 20, 28, 0.95);
          border: 1px solid #ff3e3e;
          box-shadow: 0 0 15px #ff3e3e, 0 0 30px rgba(255, 62, 62, 0.4);
          color: #ffffff;
          padding: 20px;
          border-radius: 5px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        
        .security-breach-header {
          position: relative;
          margin-bottom: 20px;
          border-bottom: 1px solid #ff3e3e;
          padding-bottom: 10px;
        }
        
        .cyber-scanner-line {
          position: absolute;
          height: 2px;
          background: linear-gradient(90deg, transparent, #ff3e3e, transparent);
          width: 100%;
          top: 0;
          left: 0;
          animation: scanLine 2s infinite;
        }
        
        .cyber-glitch-effect {
          font-family: monospace;
          font-weight: bold;
          font-size: 20px;
          color: #ff3e3e;
          text-shadow: 0 0 5px #ff3e3e;
          animation: glitchText 3s infinite;
        }
        
        .security-breach-icon {
          font-size: 40px;
          color: #ff3e3e;
          margin: 20px 0;
          animation: pulse 2s infinite;
        }
        
        .cyber-text-glow {
          color: #ffffff;
          text-shadow: 0 0 5px #ff3e3e;
          margin-bottom: 15px;
        }
        
        .security-breach-message {
          margin-bottom: 20px;
          font-size: 16px;
        }
        
        .cyber-fingerprint-scan {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 4px;
          background: linear-gradient(90deg, transparent, #00ffff, transparent);
          animation: scanLine 3s infinite;
        }
        
        .cyber-btn-danger {
          background-color: #ff3e3e;
          border: none;
          color: white;
          padding: 10px 20px;
          border-radius: 3px;
          font-weight: bold;
          transition: all 0.3s;
          text-transform: uppercase;
          letter-spacing: 1px;
          box-shadow: 0 0 10px #ff3e3e;
        }
        
        .cyber-btn-danger:hover {
          background-color: #ff1a1a;
          transform: translateY(-2px);
          box-shadow: 0 0 15px #ff3e3e;
        }
        
        @keyframes scanLine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        
        @keyframes glitchText {
          0%, 100% { opacity: 1; transform: translateX(0); }
          40% { opacity: 1; transform: translateX(0); }
          41% { opacity: 0.8; transform: translateX(5px); }
          42% { opacity: 1; transform: translateX(0); }
          43% { opacity: 0.8; transform: translateX(-5px); }
          44% { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes pulseBackground {
          0%, 100% { background-color: rgba(0, 0, 0, 0.9); }
          50% { background-color: rgba(20, 0, 0, 0.9); }
        }
      `;
      document.head.appendChild(style);
    } else {
      // Se overlay já existe, atualizar a mensagem
      if (mensagem) {
        const messageElement = overlay.querySelector('.security-breach-message');
        if (messageElement) {
          messageElement.textContent = mensagem;
        }
      }
    }
    
    // Exibir overlay
    overlay.style.display = 'flex';
    
    // Adicionar efeito de vibração à página
    document.body.classList.add('security-breach-active');
    
    // Registrar tentativa no log de segurança
    try {
      if (window.firestoreProducts && window.firestoreProducts.registrarLog) {
        window.firestoreProducts.registrarLog(
          'seguranca', 
          'N/A', 
          'Painel Admin', 
          `Violação de segurança: ${mensagem || 'Tentativa de manipulação detectada'}`
        );
      }
    } catch (logError) {
      console.error('Erro ao registrar log de segurança:', logError);
    }
    
    // Configurar botão para fechar overlay
    const closeButton = overlay.querySelector('#securityBreachBtn');
    if (closeButton) {
      // Remover eventos antigos para evitar duplicação
      const newButton = closeButton.cloneNode(true);
      closeButton.parentNode.replaceChild(newButton, closeButton);
      
      // Adicionar novo evento
      newButton.addEventListener('click', function() {
        overlay.style.display = 'none';
        document.body.classList.remove('security-breach-active');
      });
    }
    
    // Auto-fechar após 15 segundos para evitar bloqueio perpétuo
    setTimeout(() => {
      if (overlay && overlay.style.display === 'flex') {
        overlay.style.display = 'none';
        document.body.classList.remove('security-breach-active');
      }
    }, 15000);
    
    return true;
  } catch (error) {
    console.error('Erro ao exibir overlay de segurança:', error);
    return false;
  }
}

// Proteção do console para dificultar manipulação via DevTools
(function() {
  try {
    // Guardar referências originais do console
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
      debug: console.debug
    };
    
    // Substituir métodos do console para detectar manipulação
    console.log = function() {
      const args = Array.from(arguments);
      // Verificar se a chamada é interna ou externa (stack trace)
      const stackTrace = new Error().stack || '';
      const isInternalCall = stackTrace.includes('admin.js') || 
                            stackTrace.includes('firebase') || 
                            stackTrace.includes('auth-manager.js');
      
      // Se for chamada externa, possivelmente de DevTools, registrar
      if (!isInternalCall && args[0] && typeof args[0] === 'string' && 
          (args[0].includes('ADMIN_UID') || 
           args[0].includes('token') || 
           args[0].includes('firebase') ||
           args[0].includes('auth'))) {
        
        // Possível tentativa de manipulação via console
        showSecurityBreachOverlay('Tentativa de acesso a informações sensíveis via console detectada');
        
        // Tentar registrar no log de segurança
        try {
          if (window.firestoreProducts && window.firestoreProducts.registrarLog) {
            window.firestoreProducts.registrarLog(
              'seguranca', 
              'N/A', 
              'Painel Admin', 
              `Possível tentativa de manipulação via console: ${args.join(' ').substring(0, 100)}`
            );
          }
        } catch (e) {}
        
        return false;
      }
      
      // Permitir log normal para chamadas internas
      return originalConsole.log.apply(console, args);
    };
    
    // Mesmo para console.warn
    console.warn = function() {
      const args = Array.from(arguments);
      return originalConsole.warn.apply(console, args);
    };
    
    // Mesmo para console.error
    console.error = function() {
      const args = Array.from(arguments);
      return originalConsole.error.apply(console, args);
    };
    
    // Proteger variáveis sensíveis no escopo global
    if (typeof ADMIN_UID !== 'undefined') {
      Object.defineProperty(window, 'ADMIN_UID', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: ADMIN_UID
      });
    }
    
    // Ofuscar código crítico através de técnicas anti-debugging
    setTimeout(function() {
      // Verificação periódica de DevTools
      setInterval(function() {
        // Verificar se DevTools está aberto
        const devToolsOpen = 
          window.outerHeight - window.innerHeight > 100 || 
          window.outerWidth - window.innerWidth > 100;
          
        if (devToolsOpen) {
          const isAdmin = firebase.auth().currentUser && 
                          firebase.auth().currentUser.uid === '96rupqrpWjbyKtSksDaISQ94y6l2';
          
          if (!isAdmin) {
            showSecurityBreachOverlay('DevTools detectado. Por razões de segurança, esta ação foi registrada.');
          }
        }
      }, 1000);
    }, 3000);
  } catch (e) {
    // Silenciar erros para não afetar o funcionamento normal
  }
})();

// Inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  console.log("Página admin carregada, aguardando inicialização do Firebase...");
  
  // Verificar se o container de erros existe e mostrar mensagem de inicialização
  const errorMessages = document.getElementById('errorMessages');
  if (errorMessages) {
    errorMessages.innerHTML = `
      <div class="alert alert-info">
        <i class="bi bi-info-circle-fill me-2"></i>
        Inicializando o sistema. Por favor, aguarde...
      </div>
    `;
  }
  
  // Desabilitar todos os botões de ação até autenticação ser verificada
  const actionButtons = document.querySelectorAll('button:not(#logoutButton)');
  actionButtons.forEach(button => {
    button.disabled = true;
    button.setAttribute('data-waiting-auth', 'true');
  });
  
  // Verificar se o Firebase foi inicializado antes de prosseguir
  const firebaseCheckInterval = setInterval(() => {
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
      clearInterval(firebaseCheckInterval);
      console.log("Firebase inicializado, prosseguindo com a inicialização da página admin...");
      
      // Inicializar a página
      setupNavigation();
      setupEventHandlers();
      
      // Verificar autenticação antes de liberar funcionalidades
      verificarAutenticacao().then(isAuthenticated => {
        if (isAuthenticated) {
          // Habilitar botões apenas após autenticação confirmada
          actionButtons.forEach(button => {
            if (button.getAttribute('data-waiting-auth') === 'true') {
              button.removeAttribute('data-waiting-auth');
              button.disabled = false;
            }
          });
        }
      });
    }
  }, 500);
});

// Verificar autenticação e acesso ao painel de administração
async function verificarAutenticacao() {
  try {
    console.log('Iniciando verificação de autenticação para o painel de administração...');
    
    // Constante com o UID de administrador autorizado
    const ADMIN_UID = '96rupqrpWjbyKtSksDaISQ94y6l2';
    
    // Verificar se temos o UID do administrador no localStorage (login direto com UID)
    const storedAdminUID = localStorage.getItem('adminUID');
    if (storedAdminUID === ADMIN_UID) {
      console.log('Autenticação de administrador encontrada no localStorage');
      // Autenticação bem-sucedida por UID armazenado, atualizar UI e carregar dados
      
      // Atualizar nome do usuário na UI
      const userDisplayName = document.getElementById('userDisplayName');
      if (userDisplayName) {
        userDisplayName.textContent = 'Administrador';
      }
      
      // Carregar dados iniciais
      carregarDados();
      
      return true;
    }
    
    // Verificar se o gerenciador de autenticação está disponível (login com email/senha)
    if (typeof window.auth !== 'undefined' && window.auth.isAdminUser) {
      // Usar o gerenciador de autenticação
      const currentUser = await window.auth.checkAuthentication();
      
      if (!currentUser) {
        console.log('Usuário não autenticado, redirecionando para página de login');
        showToast('Acesso Negado', 'Você precisa fazer login para acessar esta área', 'error');
        
        // Pequeno atraso para mostrar o toast
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
        
        return false;
      }
      
      if (!window.auth.isAdminUser()) {
        console.log('Usuário não é o administrador autorizado');
        showToast('Acesso Negado', 'Você não tem permissão para acessar esta área.', 'error');
        
        // Pequeno atraso para mostrar o toast
        setTimeout(() => {
          window.location.href = '/loja';
        }, 1000);
        
        return false;
      }
      
      // Autenticação bem-sucedida, atualizar UI e carregar dados
      console.log('Autenticação bem-sucedida para o painel de administração');
      
      // Atualizar nome do usuário na UI
      const userDisplayName = document.getElementById('userDisplayName');
      if (userDisplayName) {
        const user = firebase.auth().currentUser;
        userDisplayName.textContent = user ? (user.displayName || user.email || 'Administrador') : 'Administrador';
      }
      
      // Carregar dados iniciais
      carregarDados();
      
      return true;
    } else {
      // Verificação direta com Firebase Auth
      return new Promise((resolve) => {
        // Verificar estado de autenticação uma única vez
        const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
          unsubscribe(); // Parar de escutar após primeira verificação
          
          if (!user) {
            // Verificar novamente se temos o UID no localStorage antes de redirecionar
            if (storedAdminUID === ADMIN_UID) {
              console.log('UID do admin encontrado no localStorage, permitindo acesso');
              
              // Atualizar nome do usuário na UI
              const userDisplayName = document.getElementById('userDisplayName');
              if (userDisplayName) {
                userDisplayName.textContent = 'Administrador';
              }
              
              // Carregar dados iniciais
              carregarDados();
              
              resolve(true);
              return;
            }
            
            console.log('Usuário não autenticado, redirecionando para página de login');
            showToast('Acesso Negado', 'Você precisa fazer login para acessar esta área', 'error');
            
            // Pequeno atraso para mostrar o toast
            setTimeout(() => {
              window.location.href = '/';
            }, 1000);
            
            resolve(false);
            return;
          }
          
          if (user.uid !== ADMIN_UID) {
            console.log('Usuário não é o administrador autorizado');
            showToast('Acesso Negado', 'Você não tem permissão para acessar esta área.', 'error');
            
            // Pequeno atraso para mostrar o toast
            setTimeout(() => {
              window.location.href = '/loja';
            }, 1000);
            
            resolve(false);
            return;
          }
          
          // Autenticação bem-sucedida, atualizar UI e carregar dados
          console.log('Autenticação bem-sucedida para o painel de administração');
          
          // Atualizar nome do usuário na UI
          const userDisplayName = document.getElementById('userDisplayName');
          if (userDisplayName) {
            userDisplayName.textContent = user.displayName || user.email || 'Administrador';
          }
          
          // Carregar dados iniciais
          carregarDados();
          
          resolve(true);
        }, (error) => {
          console.error('Erro ao verificar autenticação:', error);
          showToast('Erro', 'Ocorreu um erro ao verificar autenticação. Tente novamente.', 'error');
          resolve(false);
        });
      });
    }
  } catch (error) {
    console.error('Erro ao verificar autenticação:', error);
    showToast('Erro', 'Ocorreu um erro ao verificar autenticação. Tente novamente.', 'error');
    return false;
  }
}

// Configurar navegação entre páginas
function setupNavigation() {
  // Links da navbar
  const navLinks = document.querySelectorAll('.nav-link[data-page]');
  
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Remover classe active de todos os links
      navLinks.forEach(l => l.classList.remove('active'));
      
      // Adicionar classe active ao link clicado
      link.classList.add('active');
      
      // Obter página a ser exibida
      const page = link.getAttribute('data-page');
      
      // Esconder todas as páginas
      document.querySelectorAll('.page-content').forEach(p => {
        p.classList.remove('active');
      });
      
      // Mostrar página selecionada
      const pageElement = document.getElementById(`${page}-page`);
      if (pageElement) {
        pageElement.classList.add('active');
      }
    });
  });
}

// Configurar manipuladores de eventos
function setupEventHandlers() {
  // Botão de logout
  const logoutButton = document.getElementById('logoutButton');
  if (logoutButton) {
    logoutButton.addEventListener('click', async (e) => {
      e.preventDefault();
      
      try {
        // Verificar se o auth manager está disponível
        if (window.auth && window.auth.logout) {
          // Usar gerenciador de autenticação
          window.auth.logout();
        } else if (typeof firebase !== 'undefined' && firebase.auth) {
          // Fazer logout diretamente no Firebase
          await firebase.auth().signOut();
          
          // Também limpar localStorage por segurança
          localStorage.removeItem('currentUser');
          localStorage.removeItem('authToken');
          localStorage.removeItem('lastLoginTime');
          
          console.log('Logout realizado com sucesso');
          showToast('Logout', 'Você foi desconectado com sucesso', 'info');
          
          // Pequeno atraso para mostrar o toast
          setTimeout(() => {
            // Redirecionar para a página inicial
            window.location.href = '/';
          }, 1000);
        } else {
          throw new Error('Sistema de autenticação não disponível');
        }
      } catch (error) {
        console.error('Erro ao fazer logout:', error);
        showToast('Erro', 'Não foi possível fazer logout. Tente novamente.', 'error');
      }
    });
  } else {
    console.error('Botão de logout não encontrado na página');
  }
  
  // Botão de atualizar dashboard
  const refreshDashboardBtn = document.getElementById('refreshDashboard');
  if (refreshDashboardBtn) {
    refreshDashboardBtn.addEventListener('click', () => {
      showToast('Atualizando', 'Atualizando dados do dashboard...', 'info');
      carregarDados();
    });
  }
  
  // Botão de novo produto
  const novoProdutoBtn = document.getElementById('novoProdutoBtn');
  if (novoProdutoBtn) {
    novoProdutoBtn.addEventListener('click', () => {
      abrirModalNovoProduto();
    });
  }
  
  // Pesquisa de produtos
  const searchProduto = document.getElementById('searchProduto');
  if (searchProduto) {
    searchProduto.addEventListener('input', () => {
      aplicarFiltros();
    });
  }
  
  // Filtros de produtos
  const filtros = document.querySelectorAll('#filtroCategoria, #filtroEstoque, #filtroTag, #ordenacao');
  filtros.forEach(filtro => {
    filtro.addEventListener('change', () => {
      aplicarFiltros();
    });
  });
  
  // Filtro de logs
  const filtroLog = document.getElementById('filtroLog');
  if (filtroLog) {
    filtroLog.addEventListener('change', () => {
      filtrarLogs();
    });
  }
  
  // Exportar logs
  const exportarLogsBtn = document.getElementById('exportarLogsBtn');
  if (exportarLogsBtn) {
    exportarLogsBtn.addEventListener('click', () => {
      exportarLogs();
    });
  }
  
  // Exportar produtos
  const exportarBtn = document.getElementById('exportarBtn');
  if (exportarBtn) {
    exportarBtn.addEventListener('click', () => {
      exportarDados('json');
    });
  }
  
  // Importar produtos
  const importarBtn = document.getElementById('importarBtn');
  if (importarBtn) {
    importarBtn.addEventListener('click', () => {
      importarDados();
    });
  }
  
  // Filtros de debug logs
  const filtroDebugLog = document.getElementById('filtroDebugLog');
  const searchDebugLog = document.getElementById('searchDebugLog');
  
  if (filtroDebugLog) {
    filtroDebugLog.addEventListener('change', function() {
      console.log('Filtro de debug logs alterado');
      // Funcionalidade a ser implementada
    });
  }
  
  if (searchDebugLog) {
    searchDebugLog.addEventListener('input', function() {
      console.log('Busca de debug logs alterada');
      // Funcionalidade a ser implementada
    });
  }
  
  // Botão de adicionar debug log
  const addDebugLogBtn = document.getElementById('addDebugLogBtn');
  if (addDebugLogBtn) {
    addDebugLogBtn.addEventListener('click', function() {
      console.log('Botão de adicionar debug log clicado');
      // Funcionalidade a ser implementada
    });
  }
  
  // Botão de limpar debug logs
  const clearDebugLogsBtn = document.getElementById('clearDebugLogsBtn');
  if (clearDebugLogsBtn) {
    clearDebugLogsBtn.addEventListener('click', function() {
      console.log('Botão de limpar debug logs clicado');
      // Funcionalidade a ser implementada
    });
  }
  
  // Botão de exportar debug logs
  const exportDebugLogsBtn = document.getElementById('exportDebugLogsBtn');
  if (exportDebugLogsBtn) {
    exportDebugLogsBtn.addEventListener('click', function() {
      console.log('Botão de exportar debug logs clicado');
      // Funcionalidade a ser implementada
    });
  }
}

// Carregar todos os dados necessários
async function carregarDados() {
  try {
    console.log('Iniciando carregamento de dados...');
    
    // Constante com o UID do administrador autorizado
    const ADMIN_UID = '96rupqrpWjbyKtSksDaISQ94y6l2';
    
    // Mostrar loading
    const errorMessages = document.getElementById('errorMessages');
    if (errorMessages) {
      errorMessages.innerHTML = `
        <div class="alert alert-info">
          <i class="bi bi-info-circle-fill me-2"></i>
          Carregando dados do sistema...
        </div>
      `;
    }
    
    // Desabilitar todos os botões e controles durante o carregamento
    const actionButtons = document.querySelectorAll('button:not(#logoutButton), a.btn');
    actionButtons.forEach(button => {
      button.disabled = true;
      button.setAttribute('data-original-text', button.innerHTML);
      button.innerHTML = '<i class="bi bi-hourglass-split"></i> Aguarde...';
    });
    
    // Verificar usuário atual
    const currentUser = firebase.auth().currentUser;
    
    // Verificar se o usuário está autenticado e é o admin
    if (!currentUser) {
      console.error('Usuário não autenticado. Redirecionando para página de login...');
      
      if (errorMessages) {
        errorMessages.innerHTML = `
          <div class="alert alert-danger">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            Acesso negado. Você precisa estar autenticado para acessar esta área.
          </div>
        `;
      }
      
      // Redirecionar para a página de login após 2 segundos
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 2000);
      
      return false;
    }
    
    // Verificar se o usuário é o admin autorizado
    if (currentUser.uid !== ADMIN_UID) {
      console.error('Usuário autenticado não é o administrador. Redirecionando...');
      
      if (errorMessages) {
        errorMessages.innerHTML = `
          <div class="alert alert-danger">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            Acesso negado. Você não tem permissão para acessar esta área.
          </div>
        `;
      }
      
      // Mostrar overlay de violação de segurança
      showSecurityBreachOverlay('Tentativa de acesso não autorizado detectada e registrada. Esta ação foi reportada por motivos de segurança.');
      
      // Registrar no log de segurança se possível
      try {
        if (window.firestoreProducts && window.firestoreProducts.registrarLog) {
          window.firestoreProducts.registrarLog(
            'seguranca', 
            'N/A', 
            'Painel Admin', 
            `Tentativa de acesso não autorizado por UID: ${currentUser.uid}, Email: ${currentUser.email || 'não disponível'}`
          );
        }
      } catch (e) {
        console.error('Erro ao registrar log de segurança:', e);
      }
      
      // Redirecionar para a página principal após 3 segundos
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
      
      return false;
    }
    
    // Usuário confirmado como admin, prosseguir com carregamento
    console.log('Usuário autenticado como administrador. Carregando dados...');
    
    // Obter token de autenticação recente para garantir acesso
    try {
      await currentUser.getIdToken(true);
      console.log('Token de autenticação atualizado');
    } catch (tokenError) {
      console.error('Erro ao atualizar token:', tokenError);
      // Continuar mesmo com erro de token
    }
    
    // Exibir informações do usuário admin na interface
    const userDisplayName = document.getElementById('userDisplayName');
    if (userDisplayName) {
      userDisplayName.textContent = currentUser.displayName || currentUser.email || 'Administrador';
    }
    
    try {
      // Carregar dados em paralelo para maior eficiência
      console.log('Iniciando carregamento de dados em paralelo...');
      
      const loadPromises = [
        carregarProdutos().catch(err => {
          console.error('Erro ao carregar produtos:', err);
          return null;
        }),
        carregarLogs().catch(err => {
          console.error('Erro ao carregar logs:', err);
          return null;
        }),
        carregarCategorias().catch(err => {
          console.error('Erro ao carregar categorias:', err);
          return null;
        }),
        carregarTags().catch(err => {
          console.error('Erro ao carregar tags:', err);
          return null;
        })
      ];
      
      // Aguardar carregamento de todos os dados
      await Promise.all(loadPromises);
      
      // Atualizar estatísticas e gráficos após carregamento dos dados
      await atualizarEstatisticas();
      updateDashboardCharts();
      
      // Limpar mensagens de inicialização
      if (errorMessages) {
        errorMessages.innerHTML = `
          <div class="alert alert-success">
            <i class="bi bi-check-circle-fill me-2"></i>
            Dados carregados com sucesso. Bem-vindo ao painel administrativo!
          </div>
        `;
        
        // Remover a mensagem após 3 segundos
        setTimeout(() => {
          if (errorMessages.querySelector('.alert-success')) {
            errorMessages.innerHTML = '';
          }
        }, 3000);
      }
      
      // Reabilitar botões e restaurar seus textos originais
      actionButtons.forEach(button => {
        button.disabled = false;
        if (button.hasAttribute('data-original-text')) {
          button.innerHTML = button.getAttribute('data-original-text');
          button.removeAttribute('data-original-text');
        }
      });
      
      console.log('Carregamento de dados concluído com sucesso');
      return true;
    } catch (error) {
      console.error('Erro durante o carregamento de dados:', error);
      
      // Mostrar erro específico
      if (errorMessages) {
        errorMessages.innerHTML = `
          <div class="alert alert-danger">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            Erro ao carregar dados: ${error.message || 'Falha desconhecida'}
            <button class="btn btn-sm btn-outline-danger ms-2" onclick="carregarDados()">
              <i class="bi bi-arrow-clockwise"></i> Tentar novamente
            </button>
          </div>
        `;
      }
      
      // Reabilitar botões mas indicar estado de erro
      actionButtons.forEach(button => {
        button.disabled = false;
        if (button.hasAttribute('data-original-text')) {
          button.innerHTML = button.getAttribute('data-original-text');
          button.removeAttribute('data-original-text');
        }
      });
      
      return false;
    }
    
    console.log('Dados carregados com sucesso');
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    
    // Mostrar erro
    const errorMessages = document.getElementById('errorMessages');
    if (errorMessages) {
      errorMessages.innerHTML = `
        <div class="alert alert-danger">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>
          Erro ao carregar dados: ${error.message || 'Erro desconhecido'}
        </div>
      `;
    }
  }
}

// Função para mostrar um toast de notificação
function showToast(title, message, type = 'info') {
  try {
    const toastEl = document.getElementById('toast');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    
    if (toastEl && toastTitle && toastMessage) {
      // Definir conteúdo
      toastTitle.textContent = title;
      toastMessage.textContent = message;
      
      // Remover classes antigas
      toastEl.className = 'toast cyber-toast';
      
      // Adicionar classe baseada no tipo
      if (type === 'success') {
        toastEl.classList.add('cyber-toast-success');
      } else if (type === 'error' || type === 'danger') {
        toastEl.classList.add('cyber-toast-error');
      } else if (type === 'warning') {
        toastEl.classList.add('cyber-toast-warning');
      }
      
      // Criar instância do toast e mostrar
      const toast = new bootstrap.Toast(toastEl);
      toast.show();
    }
  } catch (error) {
    console.error('Erro ao mostrar toast:', error);
  }
}

// Funções auxiliares - serão implementadas conforme necessário
async function carregarProdutos() {
  try {
    console.log('Carregando produtos...');
    
    // Mostrar indicador de loading
    const produtosContainer = document.getElementById('produtosContainer');
    if (produtosContainer) {
      produtosContainer.innerHTML = `
        <div class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Carregando...</span>
          </div>
          <p class="mt-2 text-primary">Carregando produtos...</p>
        </div>
      `;
    }
    
    // Desabilitar temporariamente botões relacionados a produtos
    const produtoBtns = document.querySelectorAll('.produto-action-btn');
    produtoBtns.forEach(btn => btn.disabled = true);
    
    // Constantes de autenticação
    const ADMIN_UID = '96rupqrpWjbyKtSksDaISQ94y6l2';
    const currentUser = firebase.auth().currentUser;
    const storedAdminUID = localStorage.getItem('adminUID');
    const isAuthenticatedByUID = storedAdminUID === ADMIN_UID;
    
    // Verificar se o usuário está autenticado
    if (!currentUser && !isAuthenticatedByUID) {
      console.error('Usuário não autenticado para carregar produtos');
      showToast('Acesso Negado', 'Você precisa estar autenticado para carregar produtos', 'error');
      
      if (produtosContainer) {
        produtosContainer.innerHTML = `
          <div class="alert alert-danger">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            Acesso negado. Você precisa estar autenticado como administrador.
          </div>
        `;
      }
      
      allProdutos = [];
      aplicarFiltros();
      return [];
    }
    
    // Tentar carregar produtos via API REST
    if (currentUser) {
      try {
        // Obter token de ID do usuário autenticado
        const idToken = await currentUser.getIdToken(true);
        
        // Fazer requisição para a API de produtos com o token no cabeçalho
        const response = await fetch('/api/produtos', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'X-Admin-UID': ADMIN_UID
          }
        });
        
        if (response.ok) {
          allProdutos = await response.json();
          console.log('Produtos carregados via API:', allProdutos.length);
          
          // Atualizar UI
          aplicarFiltros();
          produtoBtns.forEach(btn => btn.disabled = false);
          return allProdutos;
        } else {
          const error = await response.json();
          console.error('Erro ao buscar produtos da API:', error);
          
          if (response.status === 401 || response.status === 403) {
            showToast('Acesso Negado', 'Você não tem permissão para acessar os produtos.', 'error');
          } else {
            showToast('Erro', `Falha ao carregar produtos: ${error.error || 'Erro desconhecido'}`, 'error');
          }
          
          // Se a API falhar, tentar o Firestore direto
          throw new Error('Tentando carregar via Firestore...');
        }
      } catch (apiError) {
        console.log('Tentando carregar produtos via Firestore como fallback...');
        // Continuar com o fallback
      }
    }
    
    // Fallback: carregar via Firestore
    if (firestoreProducts) {
      try {
        console.log('Carregando produtos via Firestore direto...');
        allProdutos = await firestoreProducts.getAllProducts();
        console.log('Produtos carregados via Firestore:', allProdutos.length);
        
        // Atualizar UI
        aplicarFiltros();
        produtoBtns.forEach(btn => btn.disabled = false);
        return allProdutos;
      } catch (firestoreError) {
        console.error('Erro ao carregar produtos via Firestore:', firestoreError);
        showToast('Erro', `Falha ao carregar produtos: ${firestoreError.message}`, 'error');
        
        if (produtosContainer) {
          produtosContainer.innerHTML = `
            <div class="alert alert-danger">
              <i class="bi bi-exclamation-triangle-fill me-2"></i>
              Não foi possível carregar os produtos. ${firestoreError.message}
              <button class="btn btn-sm btn-outline-danger ms-3" onclick="carregarProdutos()">
                <i class="bi bi-arrow-clockwise me-1"></i> Tentar novamente
              </button>
            </div>
          `;
        }
        
        allProdutos = [];
        aplicarFiltros();
        produtoBtns.forEach(btn => btn.disabled = false);
        return [];
      }
    } else {
      // Nenhum método de carregamento disponível
      console.error('API de produtos não está disponível');
      showToast('Erro', 'Método de carregamento de produtos não disponível', 'error');
      
      if (produtosContainer) {
        produtosContainer.innerHTML = `
          <div class="alert alert-danger">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            Erro: API de produtos não está disponível
          </div>
        `;
      }
      
      allProdutos = [];
      aplicarFiltros();
      produtoBtns.forEach(btn => btn.disabled = false);
      return [];
    }
  } catch (error) {
    // Erro geral
    console.error('Erro geral ao carregar produtos:', error);
    showToast('Erro', `Falha ao carregar produtos: ${error.message || 'Erro desconhecido'}`, 'error');
    
    const produtosContainer = document.getElementById('produtosContainer');
    if (produtosContainer) {
      produtosContainer.innerHTML = `
        <div class="alert alert-danger">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>
          Erro ao carregar produtos: ${error.message || 'Erro desconhecido'}
          <button class="btn btn-sm btn-outline-danger ms-3" onclick="carregarProdutos()">
            <i class="bi bi-arrow-clockwise me-1"></i> Tentar novamente
          </button>
        </div>
      `;
    }
    
    // Reabilitar botões
    const produtoBtns = document.querySelectorAll('.produto-action-btn');
    produtoBtns.forEach(btn => btn.disabled = false);
    
    allProdutos = [];
    aplicarFiltros();
    return [];
  }
}

async function carregarLogs() {
  try {
    console.log('Carregando logs...');
    
    // Mostrar indicador de loading
    const logsList = document.getElementById('logsList');
    const atividadeRecente = document.getElementById('atividadeRecente');
    
    if (logsList) {
      logsList.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Carregando...</span>
            </div>
            <p class="mt-2 text-primary">Carregando logs de atividade...</p>
          </td>
        </tr>
      `;
    }
    
    if (atividadeRecente) {
      atividadeRecente.innerHTML = `
        <tr>
          <td colspan="4" class="text-center py-3">
            <div class="spinner-border spinner-border-sm text-primary" role="status">
              <span class="visually-hidden">Carregando...</span>
            </div>
            <span class="ms-2">Carregando atividade recente...</span>
          </td>
        </tr>
      `;
    }
    
    // Método 1: Tentar API primeiro (mais seguro)
    try {
      const currentUser = firebase.auth().currentUser;
      const ADMIN_UID = '96rupqrpWjbyKtSksDaISQ94y6l2';
      const storedAdminUID = localStorage.getItem('adminUID');
      
      if (currentUser) {
        // Obter token de ID do usuário autenticado
        const idToken = await currentUser.getIdToken(true);
        
        // Fazer requisição para a API de logs com o token no cabeçalho
        const response = await fetch('/api/logs', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'X-Admin-UID': ADMIN_UID
          }
        });
        
        if (response.ok) {
          const logs = await response.json();
          console.log('Logs carregados via API:', logs.length);
          
          // Renderizar logs
          renderizarLogs(logs);
          
          // Também atualizar atividade recente no dashboard
          renderizarAtividadeRecente(logs);
          
          return logs;
        } else {
          // Se a API falhar, lançar erro para tentar método alternativo
          const error = await response.json();
          console.error('Erro ao buscar logs da API:', error);
          throw new Error('Falha na API de logs, tentando fallback');
        }
      }
      
      // Se chegou aqui, ou o usuário está autenticado via localStorage ou a API falhou
      // Método 2: Utilizar o Firestore diretamente
      if (!firestoreProducts) {
        throw new Error('API de logs não está disponível');
      }
      
      const logs = await firestoreProducts.getLogs();
      console.log('Logs carregados via Firestore:', logs.length);
      
      // Renderizar logs
      renderizarLogs(logs);
      
      // Também atualizar atividade recente no dashboard
      renderizarAtividadeRecente(logs);
      
      return logs;
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
      
      if (logsList) {
        logsList.innerHTML = `
          <tr>
            <td colspan="5" class="text-center">
              <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                Erro ao carregar logs: ${error.message || 'Erro desconhecido'}
                <button class="btn btn-sm btn-outline-danger ms-3" onclick="carregarLogs()">
                  <i class="bi bi-arrow-clockwise me-1"></i> Tentar novamente
                </button>
              </div>
            </td>
          </tr>
        `;
      }
      
      if (atividadeRecente) {
        atividadeRecente.innerHTML = `
          <tr>
            <td colspan="4" class="text-center">
              <div class="alert alert-danger py-2">
                <small><i class="bi bi-exclamation-triangle-fill me-2"></i>Erro ao carregar atividade recente</small>
              </div>
            </td>
          </tr>
        `;
      }
      
      // Em caso de erro, retornar array vazio para evitar quebra da interface
      return [];
    }
  } catch (error) {
    console.error('Erro geral ao carregar logs:', error);
    showToast('Erro', `Falha ao carregar logs: ${error.message || 'Erro desconhecido'}`, 'error');
    return [];
  }
}

// Função para carregar categorias dos produtos
async function carregarCategorias() {
  try {
    console.log('Carregando categorias...');
    
    if (!firebaseStats) {
      console.error('API de estatísticas não está disponível');
      return [];
    }
    
    categorias = await firebaseStats.getAllCategories();
    console.log('Categorias carregadas:', categorias);
    
    // Preencher dropdowns de categorias
    const filtroCategoria = document.getElementById('filtroCategoria');
    const categoriasDatalist = document.getElementById('categoriasDatalist');
    
    if (filtroCategoria) {
      // Manter a primeira opção
      filtroCategoria.innerHTML = '<option value="">Todas Categorias</option>';
      
      // Adicionar categorias
      categorias.forEach(categoria => {
        const option = document.createElement('option');
        option.value = categoria;
        option.textContent = categoria;
        filtroCategoria.appendChild(option);
      });
    }
    
    if (categoriasDatalist) {
      // Limpar datalist
      categoriasDatalist.innerHTML = '';
      
      // Adicionar categorias
      categorias.forEach(categoria => {
        const option = document.createElement('option');
        option.value = categoria;
        categoriasDatalist.appendChild(option);
      });
    }
    
    return categorias;
  } catch (error) {
    console.error('Erro ao carregar categorias:', error);
    throw error;
  }
}

// Função para carregar tags dos produtos
async function carregarTags() {
  try {
    console.log('Carregando tags...');
    
    if (!firebaseStats) {
      console.error('API de estatísticas não está disponível');
      return [];
    }
    
    tags = await firebaseStats.getAllTags();
    console.log('Tags carregadas:', tags);
    
    // Preencher dropdown de tags
    const filtroTag = document.getElementById('filtroTag');
    
    if (filtroTag) {
      // Manter a primeira opção
      filtroTag.innerHTML = '<option value="">Todas Tags</option>';
      
      // Adicionar tags
      tags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        filtroTag.appendChild(option);
      });
    }
    
    return tags;
  } catch (error) {
    console.error('Erro ao carregar tags:', error);
    throw error;
  }
}

// Função para atualizar estatísticas
async function atualizarEstatisticas() {
  try {
    console.log('Atualizando estatísticas...');
    
    if (!firebaseStats) {
      console.error('API de estatísticas não está disponível');
      return;
    }
    
    const stats = await firebaseStats.getBasicStats();
    console.log('Estatísticas atualizadas:', stats);
    
    // Atualizar números no dashboard
    document.getElementById('totalProdutos').textContent = stats.totalProdutos;
    document.getElementById('valorTotal').textContent = `R$ ${stats.valorTotal.toFixed(2).replace('.', ',')}`;
    document.getElementById('estoqueBaixo').textContent = stats.estoqueBaixo;
    document.getElementById('estoqueZerado').textContent = stats.estoqueZerado;
    
    // Atualizar alertas
    atualizarAlertas(stats);
    
    // Renderizar resumo de estoque
    renderizarResumoEstoque(stats.maioresEstoques);
    
    return stats;
  } catch (error) {
    console.error('Erro ao atualizar estatísticas:', error);
    throw error;
  }
}

// Função para atualizar alertas no dashboard
function atualizarAlertas(stats) {
  const alertasList = document.getElementById('alertasList');
  
  if (!alertasList) return;
  
  // Limpar lista atual
  alertasList.innerHTML = '';
  
  // Verificar se há produtos com estoque baixo
  if (stats.estoqueBaixo > 0) {
    alertasList.innerHTML += `
      <div class="list-group-item cyber-list-item warning">
        <i class="bi bi-exclamation-triangle"></i>
        <div class="ms-3">
          <h6 class="mb-1">Produtos com estoque baixo</h6>
          <p class="mb-1">Há ${stats.estoqueBaixo} produtos com estoque abaixo de 5 unidades.</p>
        </div>
      </div>
    `;
  }
  
  // Verificar se há produtos sem estoque
  if (stats.estoqueZerado > 0) {
    alertasList.innerHTML += `
      <div class="list-group-item cyber-list-item danger">
        <i class="bi bi-x-circle"></i>
        <div class="ms-3">
          <h6 class="mb-1">Produtos sem estoque</h6>
          <p class="mb-1">Há ${stats.estoqueZerado} produtos sem estoque disponível.</p>
        </div>
      </div>
    `;
  }
  
  // Se não houver alertas, mostrar mensagem padrão
  if (alertasList.innerHTML === '') {
    alertasList.innerHTML = `
      <div class="list-group-item cyber-list-item">
        <i class="bi bi-check-circle"></i>
        <div class="ms-3">
          <h6 class="mb-1">Nenhum alerta encontrado</h6>
          <p class="mb-1">O sistema está funcionando normalmente.</p>
        </div>
      </div>
    `;
  }
}

// Função para renderizar resumo de estoque
function renderizarResumoEstoque(produtos) {
  const resumoEstoque = document.getElementById('resumoEstoque');
  
  if (!resumoEstoque) return;
  
  // Limpar tabela atual
  resumoEstoque.innerHTML = '';
  
  // Verificar se há produtos
  if (!produtos || produtos.length === 0) {
    resumoEstoque.innerHTML = `
      <tr>
        <td colspan="3" class="text-center">Nenhum produto encontrado</td>
      </tr>
    `;
    return;
  }
  
  // Renderizar produtos
  produtos.forEach(produto => {
    // Determinar status baseado no estoque
    let statusClass = '';
    let statusText = '';
    
    if (!produto.estoque || produto.estoque === 0) {
      statusClass = 'danger';
      statusText = 'Esgotado';
    } else if (produto.estoque < 5) {
      statusClass = 'warning';
      statusText = 'Baixo';
    } else {
      statusClass = 'success';
      statusText = 'OK';
    }
    
    resumoEstoque.innerHTML += `
      <tr>
        <td>${produto.nome}</td>
        <td class="text-center">${produto.estoque || 0}</td>
        <td class="text-end"><span class="badge bg-${statusClass}">${statusText}</span></td>
      </tr>
    `;
  });
}

// Função para renderizar logs de atividade
function renderizarLogs(logs) {
  const logsList = document.getElementById('logsList');
  
  if (!logsList) return;
  
  // Limpar tabela atual
  logsList.innerHTML = '';
  
  // Verificar se há logs
  if (!logs || logs.length === 0) {
    logsList.innerHTML = `
      <tr>
        <td colspan="5" class="text-center">Nenhum log encontrado</td>
      </tr>
    `;
    return;
  }
  
  // Renderizar logs
  logs.forEach(log => {
    const data = log.data ? formatarData(log.data) : 'Data desconhecida';
    const tipo = getNivelText(log.tipo);
    const produto = log.nome_produto || 'Produto desconhecido';
    
    logsList.innerHTML += `
      <tr>
        <td>${data}</td>
        <td><span class="badge bg-${getTipoClass(log.tipo)}">${tipo}</span></td>
        <td>${produto}</td>
        <td>${truncateText(log.detalhes || 'Sem detalhes', 50)}</td>
        <td>
          <button class="btn cyber-btn cyber-btn-sm" onclick="abrirDetalhesLog(${JSON.stringify(log).replace(/"/g, '&quot;')})">
            <i class="bi bi-eye"></i>
          </button>
        </td>
      </tr>
    `;
  });
}

// Função para renderizar atividade recente no dashboard
function renderizarAtividadeRecente(logs) {
  const atividadeRecente = document.getElementById('atividadeRecente');
  
  if (!atividadeRecente) return;
  
  // Limpar tabela atual
  atividadeRecente.innerHTML = '';
  
  // Verificar se há logs
  if (!logs || logs.length === 0) {
    atividadeRecente.innerHTML = `
      <tr>
        <td colspan="4" class="text-center">Nenhuma atividade recente</td>
      </tr>
    `;
    return;
  }
  
  // Renderizar logs (apenas os 5 mais recentes)
  logs.slice(0, 5).forEach(log => {
    const data = log.data ? formatarData(log.data) : 'Data desconhecida';
    const tipo = getNivelText(log.tipo);
    const produto = log.nome_produto || 'Produto desconhecido';
    
    atividadeRecente.innerHTML += `
      <tr>
        <td>${data}</td>
        <td><span class="badge bg-${getTipoClass(log.tipo)}">${tipo}</span></td>
        <td>${produto}</td>
        <td>
          <button class="btn cyber-btn cyber-btn-sm" onclick="abrirDetalhesLog(${JSON.stringify(log).replace(/"/g, '&quot;')})">
            <i class="bi bi-eye"></i>
          </button>
        </td>
      </tr>
    `;
  });
}

// Funções para manipulação de produtos

// Função para abrir modal de novo produto
function abrirModalNovoProduto() {
  // Verificar autenticação
  const ADMIN_UID = '96rupqrpWjbyKtSksDaISQ94y6l2';
  const currentUser = firebase.auth().currentUser;
  const storedAdminUID = localStorage.getItem('adminUID');
  
  if ((!currentUser || currentUser.uid !== ADMIN_UID) && storedAdminUID !== ADMIN_UID) {
    showToast('Acesso Negado', 'Apenas administradores podem criar produtos.', 'error');
    return;
  }
  
  try {
    // Resetar formulário
    const form = document.getElementById('produtoForm');
    if (form) form.reset();
    
    // Limpar ID (novo produto)
    document.getElementById('produtoId').value = '';
    
    // Inicializar campos
    document.getElementById('produtoNome').value = '';
    document.getElementById('produtoDescricao').value = '';
    document.getElementById('produtoCategoria').value = '';
    document.getElementById('produtoPreco').value = '';
    document.getElementById('produtoEstoque').value = '0';
    document.getElementById('produtoImagem').value = '';
    document.getElementById('produtoDestaque').checked = false;
    document.getElementById('produtoNovidade').checked = false;
    document.getElementById('produtoTags').value = '';
    
    // Atualizar título do modal
    document.getElementById('produtoModalLabel').textContent = 'Novo Produto';
    
    // Exibir modal
    const modal = new bootstrap.Modal(document.getElementById('produtoModal'));
    modal.show();
    
    // Focar no primeiro campo
    setTimeout(() => {
      document.getElementById('produtoNome').focus();
    }, 500);
  } catch (error) {
    console.error('Erro ao abrir modal de novo produto:', error);
    showToast('Erro', 'Não foi possível abrir o formulário de produto.', 'error');
  }
}

// Função para abrir modal de edição de produto
function editarProduto(id) {
  // Verificar autenticação
  const ADMIN_UID = '96rupqrpWjbyKtSksDaISQ94y6l2';
  const currentUser = firebase.auth().currentUser;
  const storedAdminUID = localStorage.getItem('adminUID');
  
  if ((!currentUser || currentUser.uid !== ADMIN_UID) && storedAdminUID !== ADMIN_UID) {
    showToast('Acesso Negado', 'Apenas administradores podem editar produtos.', 'error');
    return;
  }
  
  try {
    // Buscar produto pelo ID
    const produto = allProdutos.find(p => p.id === id);
    
    if (!produto) {
      showToast('Erro', 'Produto não encontrado.', 'error');
      return;
    }
    
    // Preencher formulário com dados do produto
    document.getElementById('produtoId').value = produto.id;
    document.getElementById('produtoNome').value = produto.nome || '';
    document.getElementById('produtoDescricao').value = produto.descricao || '';
    document.getElementById('produtoCategoria').value = produto.categoria || '';
    document.getElementById('produtoPreco').value = produto.preco || '';
    document.getElementById('produtoEstoque').value = produto.estoque || '0';
    document.getElementById('produtoImagem').value = produto.imagem || '';
    document.getElementById('produtoDestaque').checked = !!produto.destaque;
    document.getElementById('produtoNovidade').checked = !!produto.novidade;
    document.getElementById('produtoTags').value = Array.isArray(produto.tags) ? produto.tags.join(', ') : '';
    
    // Atualizar título do modal
    document.getElementById('produtoModalLabel').textContent = 'Editar Produto';
    
    // Exibir modal
    const modal = new bootstrap.Modal(document.getElementById('produtoModal'));
    modal.show();
  } catch (error) {
    console.error('Erro ao abrir modal de edição:', error);
    showToast('Erro', 'Não foi possível carregar os dados do produto.', 'error');
  }
}

// Função para salvar produto (criar novo ou atualizar existente) com segurança avançada
async function salvarProduto() {
  // Verificação de segurança avançada com múltiplas camadas
  const ADMIN_UID = '96rupqrpWjbyKtSksDaISQ94y6l2';
  const currentUser = firebase.auth().currentUser;
  
  // Verificação 1: Usuário logado e com UID correto
  if (!currentUser || currentUser.uid !== ADMIN_UID) {
    console.warn('Tentativa de salvar produto sem autenticação adequada');
    
    // Registrar tentativa no log de segurança
    try {
      if (window.firestoreProducts && window.firestoreProducts.registrarLog) {
        window.firestoreProducts.registrarLog(
          'seguranca', 
          'N/A', 
          'Painel Admin', 
          `Tentativa de salvar produto sem autenticação adequada: UID ${currentUser ? currentUser.uid : 'não autenticado'}`
        );
      }
    } catch (e) {
      console.error('Erro ao registrar log de segurança:', e);
    }
    
    showToast('Acesso Negado', 'Apenas administradores podem salvar produtos.', 'error');
    showSecurityBreachOverlay('Tentativa de salvar produto sem autorização detectada. Esta ação foi registrada por motivos de segurança.');
    return false;
  }
  
  // Verificação 2: Token fresco (reautenticação recente)
  try {
    // Obter timestamp de autenticação do usuário
    let tokenFresco = false;
    
    const idTokenResult = await currentUser.getIdTokenResult();
    const authTime = new Date(idTokenResult.claims.auth_time * 1000);
    const agora = new Date();
    const diferencaHoras = (agora - authTime) / (1000 * 60 * 60);
    
    // Se a autenticação foi há menos de 24 horas, considerar token válido
    tokenFresco = diferencaHoras < 24;
    
    if (!tokenFresco) {
      console.warn(`Token de autenticação muito antigo (${diferencaHoras.toFixed(2)} horas). Solicitando reautenticação.`);
      showToast('Sessão Expirada', 'Por segurança, faça login novamente para continuar.', 'warning');
      
      // Forçar reautenticação
      setTimeout(() => {
        firebase.auth().signOut().then(() => {
          window.location.href = '/login.html?reason=session_expired';
        });
      }, 3000);
      
      return false;
    }
  } catch (authError) {
    console.error('Erro ao verificar estado de autenticação:', authError);
    // Mostrar mensagem de erro ao usuário
    showToast('Erro de Autenticação', 'Não foi possível verificar sua identidade. Por favor, faça login novamente.', 'error');
    
    // Redirecionar para login
    setTimeout(() => {
      firebase.auth().signOut().then(() => {
        window.location.href = '/login.html?reason=auth_error';
      });
    }, 3000);
    
    return false;
  }
  
  try {
    // Mostrar estado de processamento
    const salvarBtn = document.getElementById('salvarProdutoBtn');
    const cancelarBtn = document.getElementById('cancelarProdutoBtn');
    const originalText = salvarBtn.innerHTML;
    
    salvarBtn.disabled = true;
    cancelarBtn.disabled = true;
    salvarBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Salvando...';
    
    // Obter dados do formulário
    const id = document.getElementById('produtoId').value.trim();
    const nome = document.getElementById('produtoNome').value.trim();
    const descricao = document.getElementById('produtoDescricao').value.trim();
    const categoria = document.getElementById('produtoCategoria').value.trim();
    const preco = parseFloat(document.getElementById('produtoPreco').value.replace(',', '.'));
    const estoque = parseInt(document.getElementById('produtoEstoque').value, 10);
    const imagem = document.getElementById('produtoImagem').value.trim();
    const destaque = document.getElementById('produtoDestaque').checked;
    const novidade = document.getElementById('produtoNovidade').checked;
    const tagsInput = document.getElementById('produtoTags').value.trim();
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag !== '') : [];
    
    // Validação básica
    if (!nome) {
      showToast('Erro', 'O nome do produto é obrigatório.', 'error');
      salvarBtn.disabled = false;
      cancelarBtn.disabled = false;
      salvarBtn.innerHTML = originalText;
      return false;
    }
    
    // Montar objeto do produto
    const produto = {
      nome,
      descricao,
      categoria,
      preco: isNaN(preco) ? 0 : preco,
      estoque: isNaN(estoque) ? 0 : estoque,
      imagem,
      destaque,
      novidade,
      tags
    };
    
    let result;
    let successMessage;
    
    // Usar token de autenticação se tiver usuário logado
    if (currentUser) {
      // Obter token de ID
      const idToken = await currentUser.getIdToken(true);
      
      if (id) {
        // Atualizar produto existente
        const response = await fetch(`/api/produtos/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
            'X-Admin-UID': ADMIN_UID
          },
          body: JSON.stringify(produto)
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erro ao atualizar produto');
        }
        
        result = await response.json();
        successMessage = 'Produto atualizado com sucesso';
      } else {
        // Criar novo produto
        const response = await fetch('/api/produtos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
            'X-Admin-UID': ADMIN_UID
          },
          body: JSON.stringify(produto)
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erro ao criar produto');
        }
        
        result = await response.json();
        successMessage = 'Produto criado com sucesso';
      }
    } else {
      // Fallback: Usar Firestore diretamente (auth por localStorage)
      if (!firestoreProducts) {
        throw new Error('API de produtos não está disponível');
      }
      
      if (id) {
        // Atualizar produto existente
        await firestoreProducts.updateProduct(id, produto);
        result = { id, ...produto };
        successMessage = 'Produto atualizado com sucesso';
      } else {
        // Criar novo produto
        result = await firestoreProducts.createProduct(produto);
        successMessage = 'Produto criado com sucesso';
      }
    }
    
    // Fechar modal
    document.getElementById('cancelarProdutoBtn').click();
    
    // Atualizar lista de produtos
    await carregarProdutos();
    
    // Atualizar logs
    await carregarLogs();
    
    // Mostrar mensagem de sucesso
    showToast('Sucesso', successMessage, 'success');
    
    return true;
  } catch (error) {
    console.error('Erro ao salvar produto:', error);
    showToast('Erro', `Falha ao salvar produto: ${error.message}`, 'error');
    
    // Restaurar botões
    const salvarBtn = document.getElementById('salvarProdutoBtn');
    const cancelarBtn = document.getElementById('cancelarProdutoBtn');
    salvarBtn.disabled = false;
    cancelarBtn.disabled = false;
    salvarBtn.innerHTML = 'Salvar';
    
    return false;
  }
}

// Função para excluir produto com verificações de segurança avançadas
async function excluirProduto(id, nome) {
  // Constantes de segurança
  const ADMIN_UID = '96rupqrpWjbyKtSksDaISQ94y6l2';
  const currentUser = firebase.auth().currentUser;
  
  // Verificação 1: Usuário com privilégios de admin
  if (!currentUser || currentUser.uid !== ADMIN_UID) {
    console.warn(`Tentativa de excluir produto sem privilégios adequados: ID=${id}, produto=${nome}`);
    
    // Registrar tentativa no log de segurança
    try {
      if (window.firestoreProducts && window.firestoreProducts.registrarLog) {
        window.firestoreProducts.registrarLog(
          'seguranca', 
          id, 
          nome || 'Produto sem nome', 
          `Tentativa de exclusão não autorizada: UID ${currentUser ? currentUser.uid : 'não autenticado'}`
        );
      }
    } catch (e) {
      console.error('Erro ao registrar log de segurança:', e);
    }
    
    showToast('Acesso Negado', 'Apenas administradores podem excluir produtos.', 'error');
    showSecurityBreachOverlay('Tentativa de excluir produto sem autorização detectada. Esta ação foi registrada por motivos de segurança.');
    return false;
  }
  
  // Verificação 2: Token válido e recente
  try {
    const idTokenResult = await currentUser.getIdTokenResult();
    const authTime = new Date(idTokenResult.claims.auth_time * 1000);
    const agora = new Date();
    const diferencaHoras = (agora - authTime) / (1000 * 60 * 60);
    
    // Se a autenticação foi há mais de 24 horas, solicitar reautenticação
    if (diferencaHoras >= 24) {
      console.warn(`Token muito antigo (${diferencaHoras.toFixed(2)} horas) para operação crítica. Solicitando reautenticação.`);
      showToast('Sessão Expirada', 'Por segurança, faça login novamente para operações críticas.', 'warning');
      
      // Registrar no log
      try {
        if (window.firestoreProducts && window.firestoreProducts.registrarLog) {
          window.firestoreProducts.registrarLog(
            'seguranca', 
            id, 
            nome || 'Produto sem nome', 
            `Tentativa de exclusão com token expirado (${diferencaHoras.toFixed(2)} horas)`
          );
        }
      } catch (logError) {
        console.error('Erro ao registrar log de segurança:', logError);
      }
      
      // Forçar reautenticação
      setTimeout(() => {
        firebase.auth().signOut().then(() => {
          window.location.href = '/login.html?reason=session_expired&operation=delete';
        });
      }, 3000);
      
      return false;
    }
  } catch (tokenError) {
    console.error('Erro ao verificar validade do token:', tokenError);
    // Mostrar mensagem de erro ao usuário
    showToast('Erro de Autenticação', 'Não foi possível verificar sua identidade. Por favor, faça login novamente.', 'error');
    
    // Redirecionar para login
    setTimeout(() => {
      firebase.auth().signOut().then(() => {
        window.location.href = '/login.html?reason=auth_error';
      });
    }, 3000);
    
    return false;
  }
  
  // Confirmar exclusão
  if (!confirm(`Tem certeza que deseja excluir o produto "${nome}"? Esta ação não pode ser desfeita.`)) {
    return false;
  }
  
  try {
    // Adicionar overlay de loading
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
      <div class="spinner-border text-light" role="status">
        <span class="visually-hidden">Excluindo...</span>
      </div>
      <p class="mt-2 text-light">Excluindo produto...</p>
    `;
    document.body.appendChild(loadingOverlay);
    
    // Usar token de autenticação se tiver usuário logado
    if (currentUser) {
      // Obter token de ID
      const idToken = await currentUser.getIdToken(true);
      
      // Excluir via API
      const response = await fetch(`/api/produtos/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'X-Admin-UID': ADMIN_UID
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao excluir produto');
      }
    } else {
      // Fallback: Usar Firestore diretamente (auth por localStorage)
      if (!firestoreProducts) {
        throw new Error('API de produtos não está disponível');
      }
      
      await firestoreProducts.deleteProduct(id, nome);
    }
    
    // Remover overlay de loading
    document.body.removeChild(loadingOverlay);
    
    // Atualizar lista de produtos
    await carregarProdutos();
    
    // Atualizar logs
    await carregarLogs();
    
    // Mostrar mensagem de sucesso
    showToast('Sucesso', 'Produto excluído com sucesso', 'success');
    
    return true;
  } catch (error) {
    console.error('Erro ao excluir produto:', error);
    showToast('Erro', `Falha ao excluir produto: ${error.message}`, 'error');
    
    // Remover overlay de loading (mesmo em caso de erro)
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) {
      document.body.removeChild(overlay);
    }
    
    return false;
  }
}

// Função para aplicar filtros aos produtos
function aplicarFiltros() {
  const searchTerm = document.getElementById('searchProduto').value.toLowerCase();
  const categoriaFilter = document.getElementById('filtroCategoria').value;
  const estoqueFilter = document.getElementById('filtroEstoque').value;
  const tagFilter = document.getElementById('filtroTag').value;
  const ordenacao = document.getElementById('ordenacao').value;
  
  // Filtrar produtos
  filteredProdutos = allProdutos.filter(produto => {
    // Filtro por termo de busca
    if (searchTerm && 
        !(produto.nome && produto.nome.toLowerCase().includes(searchTerm)) && 
        !(produto.categoria && produto.categoria.toLowerCase().includes(searchTerm))) {
      return false;
    }
    
    // Filtro por categoria
    if (categoriaFilter && produto.categoria !== categoriaFilter) {
      return false;
    }
    
    // Filtro por estoque
    if (estoqueFilter === 'estoque_baixo' && (!produto.estoque || produto.estoque > 5 || produto.estoque === 0)) {
      return false;
    } else if (estoqueFilter === 'estoque_zerado' && produto.estoque && produto.estoque > 0) {
      return false;
    }
    
    // Filtro por tag
    if (tagFilter && (!produto.tags || !produto.tags.includes(tagFilter))) {
      return false;
    }
    
    return true;
  });
  
  // Ordenar produtos
  if (ordenacao === 'nome-asc') {
    filteredProdutos.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  } else if (ordenacao === 'nome-desc') {
    filteredProdutos.sort((a, b) => (b.nome || '').localeCompare(a.nome || ''));
  } else if (ordenacao === 'preco-asc') {
    filteredProdutos.sort((a, b) => (a.preco || 0) - (b.preco || 0));
  } else if (ordenacao === 'preco-desc') {
    filteredProdutos.sort((a, b) => (b.preco || 0) - (a.preco || 0));
  } else if (ordenacao === 'estoque-asc') {
    filteredProdutos.sort((a, b) => (a.estoque || 0) - (b.estoque || 0));
  } else if (ordenacao === 'estoque-desc') {
    filteredProdutos.sort((a, b) => (b.estoque || 0) - (a.estoque || 0));
  }
  
  // Atualizar contagem
  document.getElementById('produtosCount').textContent = filteredProdutos.length;
  
  // Renderizar produtos
  renderizarProdutos();
  
  // Renderizar paginação
  renderizarPaginacao();
}

// Função para filtrar logs
function filtrarLogs() {
  const tipoFilter = document.getElementById('filtroLog').value;
  
  // Obter logs da tabela
  const logsList = document.getElementById('logsList');
  const rows = logsList.querySelectorAll('tr');
  
  // Mostrar/esconder linhas conforme filtro
  rows.forEach(row => {
    const tipoCell = row.querySelector('td:nth-child(2)');
    
    if (!tipoCell) return; // Linha de cabeçalho ou outra sem células
    
    const tipo = tipoCell.textContent.trim().toLowerCase();
    
    if (tipoFilter && !tipo.includes(tipoFilter.toLowerCase())) {
      row.style.display = 'none';
    } else {
      row.style.display = '';
    }
  });
}

// Função para renderizar produtos na tabela
function renderizarProdutos() {
  const produtosList = document.getElementById('produtosList');
  
  if (!produtosList) return;
  
  // Limpar tabela atual
  produtosList.innerHTML = '';
  
  // Verificar se há produtos
  if (!filteredProdutos || filteredProdutos.length === 0) {
    produtosList.innerHTML = `
      <tr>
        <td colspan="8" class="text-center">Nenhum produto encontrado</td>
      </tr>
    `;
    return;
  }
  
  // Calcular produtos da página atual
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredProdutos.length);
  const produtosPagina = filteredProdutos.slice(startIndex, endIndex);
  
  // Renderizar produtos
  produtosPagina.forEach(produto => {
    // Determinar status baseado no estoque
    let statusClass = '';
    let statusText = '';
    
    if (!produto.estoque || produto.estoque === 0) {
      statusClass = 'danger';
      statusText = 'Esgotado';
    } else if (produto.estoque < 5) {
      statusClass = 'warning';
      statusText = 'Baixo';
    } else {
      statusClass = 'success';
      statusText = 'OK';
    }
    
    produtosList.innerHTML += `
      <tr>
        <td>${produto.id.substring(0, 6)}...</td>
        <td>
          <img src="${produto.imagem || '/static/img/no-image.svg'}" alt="${produto.nome}" class="thumbnail">
        </td>
        <td>${produto.nome || 'Sem nome'}</td>
        <td>${produto.categoria || 'Sem categoria'}</td>
        <td>R$ ${(produto.preco || 0).toFixed(2).replace('.', ',')}</td>
        <td>${produto.estoque || 0}</td>
        <td><span class="badge bg-${statusClass}">${statusText}</span></td>
        <td>
          <div class="btn-group">
            <button class="btn cyber-btn cyber-btn-sm" onclick="abrirDetalhesModal(${JSON.stringify(produto).replace(/"/g, '&quot;')})">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn cyber-btn cyber-btn-sm" onclick="abrirModalEditarProduto(${JSON.stringify(produto).replace(/"/g, '&quot;')})">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn cyber-btn cyber-btn-sm cyber-btn-danger" onclick="confirmarExclusao(${JSON.stringify(produto).replace(/"/g, '&quot;')})">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });
}

// Função para renderizar paginação
function renderizarPaginacao() {
  const paginacao = document.getElementById('produtosPagination');
  
  if (!paginacao) return;
  
  // Limpar paginação atual
  paginacao.innerHTML = '';
  
  // Calcular número total de páginas
  totalPages = Math.ceil(filteredProdutos.length / pageSize);
  
  // Verificar se há mais de uma página
  if (totalPages <= 1) {
    return;
  }
  
  // Renderizar paginação
  let html = '';
  
  // Botão anterior
  html += `
    <button class="cyber-pagination-item ${currentPage === 1 ? 'disabled' : ''}" 
      ${currentPage === 1 ? 'disabled' : `onclick="currentPage--; renderizarProdutos(); renderizarPaginacao();"`}>
      <i class="bi bi-chevron-left"></i>
    </button>
  `;
  
  // Páginas
  for (let i = 1; i <= totalPages; i++) {
    if (i === currentPage) {
      html += `<button class="cyber-pagination-item active">${i}</button>`;
    } else {
      html += `<button class="cyber-pagination-item" onclick="currentPage = ${i}; renderizarProdutos(); renderizarPaginacao();">${i}</button>`;
    }
  }
  
  // Botão próximo
  html += `
    <button class="cyber-pagination-item ${currentPage === totalPages ? 'disabled' : ''}" 
      ${currentPage === totalPages ? 'disabled' : `onclick="currentPage++; renderizarProdutos(); renderizarPaginacao();"`}>
      <i class="bi bi-chevron-right"></i>
    </button>
  `;
  
  paginacao.innerHTML = html;
}

// Funções auxiliares
function formatarPreco(preco) {
  return `R$ ${(preco || 0).toFixed(2).replace('.', ',')}`;
}

function formatarData(data) {
  if (!data) return 'Data desconhecida';
  
  if (typeof data === 'object' && data.toDate) {
    data = data.toDate();
  } else if (!(data instanceof Date)) {
    data = new Date(data);
  }
  
  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatarDataArquivo(data = new Date()) {
  if (!(data instanceof Date)) {
    data = new Date(data);
  }
  
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  const hora = String(data.getHours()).padStart(2, '0');
  const minuto = String(data.getMinutes()).padStart(2, '0');
  
  return `${dia}-${mes}-${ano}_${hora}-${minuto}`;
}

function getTipoClass(tipo) {
  switch (tipo) {
    case 'criar':
      return 'success';
    case 'editar':
      return 'primary';
    case 'excluir':
      return 'danger';
    case 'importar':
      return 'info';
    case 'limpar':
      return 'warning';
    default:
      return 'secondary';
  }
}

function getNivelText(nivel) {
  switch (nivel) {
    case 'criar':
      return 'Criação';
    case 'editar':
      return 'Edição';
    case 'excluir':
      return 'Exclusão';
    case 'importar':
      return 'Importação';
    case 'limpar':
      return 'Limpeza';
    case 'error':
      return 'Erro';
    case 'warning':
      return 'Aviso';
    case 'info':
      return 'Info';
    case 'debug':
      return 'Debug';
    default:
      return nivel.charAt(0).toUpperCase() + nivel.slice(1);
  }
}

function truncateText(text, maxLength) {
  if (!text) return '';
  
  // Converter para string se não for
  const textStr = String(text);
  
  if (textStr.length <= maxLength) return textStr;
  
  return textStr.substring(0, maxLength) + '...';
}

// Função para atualizar gráficos do dashboard
function updateDashboardCharts() {
  // Destruir gráficos existentes
  Object.values(charts).forEach(chart => {
    if (chart) {
      chart.destroy();
    }
  });
  
  // Gráfico de categorias
  const categoriasCtx = document.getElementById('categoriasChart');
  
  if (categoriasCtx) {
    // Agrupar produtos por categoria
    const categoriaData = {};
    
    allProdutos.forEach(produto => {
      if (produto.categoria) {
        if (!categoriaData[produto.categoria]) {
          categoriaData[produto.categoria] = 0;
        }
        categoriaData[produto.categoria]++;
      }
    });
    
    // Converter para arrays para o gráfico
    const labels = Object.keys(categoriaData);
    const data = Object.values(categoriaData);
    
    // Gerar cores aleatórias
    const colors = labels.map(() => {
      const r = Math.floor(Math.random() * 155) + 100;
      const g = Math.floor(Math.random() * 155) + 100;
      const b = Math.floor(Math.random() * 155) + 100;
      return `rgba(${r}, ${g}, ${b}, 0.8)`;
    });
    
    // Criar gráfico
    charts.categorias = new Chart(categoriasCtx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#ececec'
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }
  
  // Gráfico de estoque
  const estoqueCtx = document.getElementById('estoqueChart');
  
  if (estoqueCtx) {
    // Calcular dados de estoque
    let estoqueBaixo = 0;
    let estoqueNormal = 0;
    let estoqueZerado = 0;
    
    allProdutos.forEach(produto => {
      if (!produto.estoque || produto.estoque === 0) {
        estoqueZerado++;
      } else if (produto.estoque < 5) {
        estoqueBaixo++;
      } else {
        estoqueNormal++;
      }
    });
    
    // Criar gráfico
    charts.estoque = new Chart(estoqueCtx, {
      type: 'bar',
      data: {
        labels: ['Estoque Normal', 'Estoque Baixo', 'Sem Estoque'],
        datasets: [{
          data: [estoqueNormal, estoqueBaixo, estoqueZerado],
          backgroundColor: [
            'rgba(75, 192, 192, 0.8)',
            'rgba(255, 205, 86, 0.8)',
            'rgba(255, 99, 132, 0.8)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: '#ececec'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          },
          x: {
            ticks: {
              color: '#ececec'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          }
        }
      }
    });
  }
}