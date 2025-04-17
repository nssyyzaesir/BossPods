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
  
  // Detector de DevTools por diferença de dimensões
  function detectDevTools() {
    const threshold = 160;
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;
    
    if (widthThreshold || heightThreshold) {
      // Adicionar aviso no DOM
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.backgroundColor = 'rgba(0,0,0,0.9)';
      overlay.style.color = 'red';
      overlay.style.fontSize = '24px';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.zIndex = '9999';
      overlay.style.textAlign = 'center';
      overlay.style.padding = '20px';
      overlay.innerHTML = '<div>ACESSO BLOQUEADO<br>O uso de ferramentas de desenvolvedor não é permitido neste painel.</div>';
      
      document.body.appendChild(overlay);
      
      // Registrar tentativa no console
      originalConsole.warn('⚠️ Tentativa de uso de DevTools detectada e bloqueada');
      
      // Ativar proteção adicional
      window._protectionActive = true;
      
      // Redirecionar após 3 segundos
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
      
      return true;
    }
    
    return false;
  }
  
  // Verificar periodicamente
  setInterval(detectDevTools, 1000);
  
  // Bloquear tentativas de desabilitar a proteção
  Object.defineProperty(window, '_protectionActive', {
    value: false,
    writable: false,
    configurable: false
  });
  
  // Ocultar as funções protegidas do objeto global
  window._adminFunctions = {};
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
    console.log('Carregando dados...');
    
    // Mostrar loading
    const errorMessages = document.getElementById('errorMessages');
    if (errorMessages) {
      errorMessages.innerHTML = `
        <div class="alert alert-info">
          <i class="bi bi-info-circle-fill me-2"></i>
          Carregando dados...
        </div>
      `;
    }
    
    // Aguardar até que o Firebase Auth confirme o estado de autenticação
    console.log('Aguardando inicialização completa do Firebase Auth...');
    await new Promise((resolve) => {
      const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
        unsubscribe(); // Parar de escutar após a primeira verificação
        console.log('Estado de autenticação do Firebase confirmado, prosseguindo com carregamento de dados');
        resolve(user); // Resolver a promise com o usuário (ou null)
      });
    });
    
    // Carregar produtos
    await carregarProdutos();
    
    // Carregar logs
    await carregarLogs();
    
    // Carregar categorias
    await carregarCategorias();
    
    // Carregar tags
    await carregarTags();
    
    // Atualizar estatísticas
    await atualizarEstatisticas();
    
    // Atualizar gráficos do dashboard
    updateDashboardCharts();
    
    // Debug logs já carregados
    console.log('Debug logs não são carregados nesta versão');
    
    // Limpar mensagens de inicialização
    if (errorMessages) {
      errorMessages.innerHTML = '';
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

// Função para salvar produto (criar novo ou atualizar existente)
async function salvarProduto() {
  // Verificar autenticação
  const ADMIN_UID = '96rupqrpWjbyKtSksDaISQ94y6l2';
  const currentUser = firebase.auth().currentUser;
  const storedAdminUID = localStorage.getItem('adminUID');
  
  if ((!currentUser || currentUser.uid !== ADMIN_UID) && storedAdminUID !== ADMIN_UID) {
    showToast('Acesso Negado', 'Apenas administradores podem salvar produtos.', 'error');
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

// Função para excluir produto
async function excluirProduto(id, nome) {
  // Verificar autenticação
  const ADMIN_UID = '96rupqrpWjbyKtSksDaISQ94y6l2';
  const currentUser = firebase.auth().currentUser;
  const storedAdminUID = localStorage.getItem('adminUID');
  
  if ((!currentUser || currentUser.uid !== ADMIN_UID) && storedAdminUID !== ADMIN_UID) {
    showToast('Acesso Negado', 'Apenas administradores podem excluir produtos.', 'error');
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