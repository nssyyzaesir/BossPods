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
  
  // Verificar se o Firebase foi inicializado antes de prosseguir
  const firebaseCheckInterval = setInterval(() => {
    if (typeof firebaseInitialized !== 'undefined' && firebaseInitialized) {
      // Firebase inicializado, podemos continuar
      clearInterval(firebaseCheckInterval);
      console.log('Firebase inicializado, prosseguindo com a inicialização da página admin...');
      
      // Verificar autenticação
      verificarAutenticacao();
      
      // Configurar navegação entre abas
      setupNavigation();
      
      // Configurar manipuladores de eventos
      setupEventHandlers();
      
      // Carregar dados iniciais
      carregarDados();
      
      // Limpar mensagem de inicialização
      if (errorMessages) {
        errorMessages.innerHTML = '';
      }
    } else {
      // Firebase ainda não inicializado, aguardar
      console.log("Aguardando inicialização do Firebase...");
    }
  }, 500);
});

// Verificar se o usuário está autenticado
async function verificarAutenticacao() {
  try {
    console.log('Iniciando verificação de autenticação para o painel de administração...');
    
    // Constante com o email de administrador autorizado
    const ADMIN_EMAIL = 'nsyzaesir@gmail.com';
    
    // Verificar se o Firebase está disponível
    if (typeof firebase === 'undefined' || !firebase.auth) {
      console.error('Firebase Auth não está disponível');
      showToast('Erro', 'Sistema de autenticação não inicializado. Recarregue a página.', 'error');
      window.location.href = '/login';
      return false;
    }
    
    // Obter usuário atual diretamente do Firebase Auth
    const firebaseUser = firebase.auth().currentUser;
    console.log('Verificando usuário atual do Firebase:', firebaseUser);
    
    if (!firebaseUser) {
      console.log('Usuário não autenticado, redirecionando para página de login');
      showToast('Acesso Negado', 'Você precisa fazer login para acessar esta área', 'error');
      
      // Pequeno atraso para mostrar o toast
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
      
      return false;
    }
    
    // Verificar se o email é o do administrador
    if (firebaseUser.email !== ADMIN_EMAIL) {
      console.log('Usuário não é o administrador autorizado:', firebaseUser.email);
      showToast('Acesso Negado', 'Você não tem permissão para acessar esta área.', 'error');
      
      // Pequeno atraso para mostrar o toast
      setTimeout(() => {
        window.location.href = '/loja';
      }, 1000);
      
      return false;
    }
    
    // Se chegou aqui, o usuário está autenticado e é admin
    console.log('Autenticação bem-sucedida para o painel de administração');
    console.log('Dados do usuário:', firebaseUser.email);
    
    // Atualizar nome do usuário no menu
    const userDisplayElement = document.getElementById('userDisplayName');
    if (userDisplayElement) {
      userDisplayElement.textContent = firebaseUser.displayName || firebaseUser.email;
    }
    
    // Mostrar toast de boas-vindas
    showToast('Bem-vindo', 'Acesso admin confirmado. Painel de controle carregado.', 'success');
    
    return true;
  } catch (error) {
    console.error('Erro ao verificar autenticação:', error);
    console.error('Detalhes do erro:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    showToast('Erro', 'Falha ao verificar autenticação. Tente novamente. Detalhes no console.', 'error');
    window.location.href = '/login';
    return false;
  }
}

// Configurar navegação entre abas
function setupNavigation() {
  const navLinks = document.querySelectorAll('[data-page]');
  
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Obter página de destino
      const targetPage = link.getAttribute('data-page');
      
      // Remover classe ativa de todos os links e conteúdos
      navLinks.forEach(l => l.classList.remove('active'));
      document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
      
      // Adicionar classe ativa ao link clicado
      link.classList.add('active');
      
      // Mostrar conteúdo correspondente
      document.getElementById(`${targetPage}-page`).classList.add('active');
      
      // Atualizar gráficos se for dashboard
      if (targetPage === 'dashboard') {
        updateDashboardCharts();
      }
    });
  });
}

// Configurar manipuladores de eventos
function setupEventHandlers() {
  // Botão de logout
  document.getElementById('logoutBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    
    try {
      // Verificar se Firebase Auth está disponível
      if (typeof firebase === 'undefined' || !firebase.auth) {
        console.error('Firebase Auth não está disponível');
        throw new Error('Sistema de autenticação não disponível');
      }
      
      // Fazer logout no Firebase
      await firebase.auth().signOut();
      
      // Também limpar localStorage por segurança
      localStorage.removeItem('currentUser');
      localStorage.removeItem('authToken');
      localStorage.removeItem('lastLoginTime');
      
      console.log('Logout realizado com sucesso');
      showToast('Logout', 'Você foi desconectado com sucesso', 'info');
      
      // Pequeno atraso para mostrar o toast
      setTimeout(() => {
        // Redirecionar para login
        window.location.href = '/login';
      }, 1000);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      showToast('Erro', 'Falha ao fazer logout. Tente novamente.', 'error');
    }
  });
  
  // Botão de atualizar dashboard
  document.getElementById('refreshDashboard').addEventListener('click', () => {
    carregarDados();
  });
  
  // Botão de novo produto
  document.getElementById('novoProdutoBtn').addEventListener('click', abrirModalNovoProduto);
  
  // Botão de salvar produto
  document.getElementById('salvarProdutoBtn').addEventListener('click', salvarProduto);
  
  // Botão de adicionar tag
  document.getElementById('addTagBtn').addEventListener('click', adicionarTagAoProduto);
  
  // Input de tag (pressionar Enter)
  document.getElementById('tagInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      adicionarTagAoProduto();
    }
  });
  
  // Botão de exportar
  document.getElementById('exportarBtn').addEventListener('click', () => {
    const exportModal = new bootstrap.Modal(document.getElementById('exportModal'));
    exportModal.show();
  });
  
  // Botão de exportar como JSON
  document.getElementById('exportarJSONBtn').addEventListener('click', () => {
    exportarDados('json');
  });
  
  // Botão de exportar como CSV
  document.getElementById('exportarCSVBtn').addEventListener('click', () => {
    exportarDados('csv');
  });
  
  // Botão de importar
  document.getElementById('importarBtn').addEventListener('click', () => {
    const importModal = new bootstrap.Modal(document.getElementById('importModal'));
    document.getElementById('importFile').value = '';
    document.getElementById('limparAntesImportar').checked = false;
    importModal.show();
  });
  
  // Botão de confirmar importação
  document.getElementById('confirmarImportBtn').addEventListener('click', importarDados);
  
  // Botão de confirmar modal genérico
  document.getElementById('confirmBtn').addEventListener('click', () => {
    if (typeof confirmCallback === 'function') {
      confirmCallback();
    }
    const confirmModal = bootstrap.Modal.getInstance(document.getElementById('confirmModal'));
    confirmModal.hide();
  });
  
  // Filtros de produtos
  document.getElementById('searchProduto').addEventListener('input', aplicarFiltros);
  document.getElementById('filtroCategoria').addEventListener('change', aplicarFiltros);
  document.getElementById('filtroEstoque').addEventListener('change', aplicarFiltros);
  document.getElementById('filtroTag').addEventListener('change', aplicarFiltros);
  document.getElementById('ordenacao').addEventListener('change', aplicarFiltros);
  
  // Filtro de logs
  document.getElementById('filtroLog').addEventListener('change', filtrarLogs);
  
  // Exportar logs
  document.getElementById('exportarLogsBtn').addEventListener('click', exportarLogs);
  
  // Botões de logs de debug
  document.getElementById('debugLogsBtn').addEventListener('click', () => {
    carregarDebugLogs();
  });
  
  document.getElementById('addDebugLogBtn').addEventListener('click', abrirModalNovoDebugLog);
  document.getElementById('salvarDebugLogBtn').addEventListener('click', salvarDebugLog);
  document.getElementById('clearDebugLogsBtn').addEventListener('click', confirmarLimparDebugLogs);
  document.getElementById('exportDebugLogsBtn').addEventListener('click', exportarDebugLogs);
  document.getElementById('filtroDebugLog').addEventListener('change', filtrarDebugLogs);
  document.getElementById('searchDebugLog').addEventListener('input', filtrarDebugLogs);
}

// Carregar todos os dados necessários
async function carregarDados() {
  try {
    showLoading();
    
    // Carregar produtos
    await carregarProdutos();
    
    // Carregar logs
    await carregarLogs();
    
    // Atualizar estatísticas
    await atualizarEstatisticas();
    
    // Carregar tags e categorias
    await carregarCategorias();
    await carregarTags();
    
    // Atualizar gráficos
    updateDashboardCharts();
    
    hideLoading();
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    showToast('Erro', 'Falha ao carregar dados. Tente novamente.', 'error');
    hideLoading();
  }
}

// Carregar produtos
async function carregarProdutos() {
  try {
    console.log('Carregando produtos...');
    
    // Verificar se firestoreProducts está disponível
    if (typeof firestoreProducts === 'undefined' || !firestoreProducts) {
      console.error('Erro: firestoreProducts não está definido');
      showToast('Erro', 'Falha ao acessar o serviço de produtos. Verifique o console.', 'error');
      return [];
    }
    
    allProdutos = await firestoreProducts.getAllProducts();
    console.log('Produtos carregados:', allProdutos.length);
    
    // Ordenar por nome (padrão)
    allProdutos.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    
    // Aplicar filtros (isso também atualiza a exibição)
    aplicarFiltros();
    
  } catch (error) {
    console.error('Erro ao carregar produtos:', error);
    console.error('Detalhes do erro:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    showToast('Erro', 'Falha ao carregar produtos. Detalhes no console.', 'error');
    return [];
  }
}

// Carregar logs
async function carregarLogs() {
  try {
    const logs = await firestoreProducts.getLogs();
    
    // Atualizar lista de logs
    renderizarLogs(logs);
    
    // Atualizar atividade recente (mostrar apenas os 5 mais recentes)
    const recentes = logs.slice(0, 5);
    renderizarAtividadeRecente(recentes);
    
  } catch (error) {
    console.error('Erro ao carregar logs:', error);
    throw error;
  }
}

// Carregar categorias
async function carregarCategorias() {
  try {
    categorias = await firebaseStats.getAllCategories();
    
    // Ordenar alfabeticamente
    categorias.sort();
    
    // Atualizar dropdown de filtro
    const select = document.getElementById('filtroCategoria');
    const datalist = document.getElementById('categoriasDatalist');
    
    // Manter a primeira opção (Todas Categorias)
    select.innerHTML = '<option value="">Todas Categorias</option>';
    // Limpar datalist
    datalist.innerHTML = '';
    
    // Adicionar categorias
    categorias.forEach(categoria => {
      // Para o select de filtro
      const option = document.createElement('option');
      option.value = categoria;
      option.textContent = categoria;
      select.appendChild(option);
      
      // Para o datalist do modal
      const option2 = document.createElement('option');
      option2.value = categoria;
      datalist.appendChild(option2);
    });
    
  } catch (error) {
    console.error('Erro ao carregar categorias:', error);
    throw error;
  }
}

// Carregar tags
async function carregarTags() {
  try {
    tags = await firebaseStats.getAllTags();
    
    // Ordenar alfabeticamente
    tags.sort();
    
    // Atualizar dropdown de filtro
    const select = document.getElementById('filtroTag');
    
    // Manter a primeira opção (Todas Tags)
    select.innerHTML = '<option value="">Todas Tags</option>';
    
    // Adicionar tags
    tags.forEach(tag => {
      const option = document.createElement('option');
      option.value = tag;
      option.textContent = tag;
      select.appendChild(option);
    });
    
  } catch (error) {
    console.error('Erro ao carregar tags:', error);
    throw error;
  }
}

// Atualizar estatísticas
async function atualizarEstatisticas() {
  try {
    const stats = await firebaseStats.getBasicStats();
    
    // Atualizar contadores
    document.getElementById('totalProdutos').textContent = stats.totalProdutos;
    document.getElementById('valorTotal').textContent = formatarPreco(stats.valorTotal);
    document.getElementById('estoqueBaixo').textContent = stats.estoqueBaixo;
    document.getElementById('estoqueZerado').textContent = stats.estoqueZerado;
    
    // Atualizar resumo de estoque
    renderizarResumoEstoque(stats.maioresEstoques);
    
    // Atualizar alertas
    atualizarAlertas(stats);
    
  } catch (error) {
    console.error('Erro ao atualizar estatísticas:', error);
    throw error;
  }
}

// Atualizar alertas
function atualizarAlertas(stats) {
  const alertasList = document.getElementById('alertasList');
  alertasList.innerHTML = '';
  
  const alertas = [];
  
  // Verificar produtos sem estoque
  if (stats.estoqueZerado > 0) {
    alertas.push({
      tipo: 'danger',
      mensagem: `${stats.estoqueZerado} ${stats.estoqueZerado === 1 ? 'produto está' : 'produtos estão'} sem estoque`,
      tempo: 'Agora'
    });
  }
  
  // Verificar produtos com estoque baixo
  if (stats.estoqueBaixo > 0) {
    alertas.push({
      tipo: 'warning',
      mensagem: `${stats.estoqueBaixo} ${stats.estoqueBaixo === 1 ? 'produto está' : 'produtos estão'} com estoque baixo`,
      tempo: 'Agora'
    });
  }
  
  // Se não há produtos cadastrados
  if (stats.totalProdutos === 0) {
    alertas.push({
      tipo: 'danger',
      mensagem: 'Nenhum produto cadastrado',
      tempo: 'Agora'
    });
  }
  
  // Renderizar alertas
  alertas.forEach(alerta => {
    const item = document.createElement('div');
    item.className = 'list-group-item cyber-list-item d-flex justify-content-between align-items-center';
    
    const content = document.createElement('div');
    const badge = document.createElement('span');
    badge.className = `badge bg-${alerta.tipo}`;
    badge.textContent = alerta.tipo === 'danger' ? 'Crítico' : 'Atenção';
    
    const message = document.createElement('span');
    message.textContent = ' ' + alerta.mensagem;
    
    content.appendChild(badge);
    content.appendChild(message);
    
    const time = document.createElement('small');
    time.textContent = alerta.tempo;
    
    item.appendChild(content);
    item.appendChild(time);
    
    alertasList.appendChild(item);
  });
  
  // Se não há alertas
  if (alertas.length === 0) {
    const item = document.createElement('div');
    item.className = 'list-group-item cyber-list-item text-center';
    item.textContent = 'Nenhum alerta no momento';
    alertasList.appendChild(item);
  }
}

// Renderizar resumo de estoque
function renderizarResumoEstoque(produtos) {
  const tbody = document.getElementById('resumoEstoque');
  tbody.innerHTML = '';
  
  produtos.forEach(produto => {
    const tr = document.createElement('tr');
    
    // Nome do produto
    const tdNome = document.createElement('td');
    tdNome.textContent = produto.nome;
    tr.appendChild(tdNome);
    
    // Estoque
    const tdEstoque = document.createElement('td');
    tdEstoque.className = 'text-center';
    tdEstoque.textContent = produto.estoque;
    tr.appendChild(tdEstoque);
    
    // Status
    const tdStatus = document.createElement('td');
    tdStatus.className = 'text-end';
    
    let statusClass = 'success';
    let statusText = 'OK';
    
    if (produto.estoque === 0) {
      statusClass = 'danger';
      statusText = 'Sem Estoque';
    } else if (produto.estoque <= 5) {
      statusClass = 'warning';
      statusText = 'Baixo';
    }
    
    const badge = document.createElement('span');
    badge.className = `status-badge ${statusClass}`;
    badge.textContent = statusText;
    tdStatus.appendChild(badge);
    
    tr.appendChild(tdStatus);
    
    tbody.appendChild(tr);
  });
  
  // Se não há produtos
  if (produtos.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 3;
    td.className = 'text-center';
    td.textContent = 'Nenhum produto cadastrado';
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
}

// Renderizar logs
function renderizarLogs(logs) {
  const tbody = document.getElementById('logsList');
  tbody.innerHTML = '';
  
  logs.forEach(log => {
    const tr = document.createElement('tr');
    
    // Data
    const tdData = document.createElement('td');
    tdData.textContent = formatarData(log.data ? log.data.toDate() : new Date());
    tr.appendChild(tdData);
    
    // Tipo
    const tdTipo = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `log-badge ${log.tipo}`;
    badge.textContent = log.tipo;
    tdTipo.appendChild(badge);
    tr.appendChild(tdTipo);
    
    // Produto
    const tdProduto = document.createElement('td');
    tdProduto.textContent = log.nomeProduto || 'N/A';
    tr.appendChild(tdProduto);
    
    // Detalhes
    const tdDetalhes = document.createElement('td');
    
    // Formatação específica por tipo de log
    let detalhesText = '';
    switch (log.tipo) {
      case 'criar':
        detalhesText = 'Novo produto criado';
        break;
      case 'editar':
        const detalhes = log.detalhes || {};
        const campos = Object.keys(detalhes).length;
        detalhesText = `${campos} ${campos === 1 ? 'campo alterado' : 'campos alterados'}`;
        break;
      case 'excluir':
        detalhesText = 'Produto excluído';
        break;
      case 'importar':
        const count = log.detalhes && log.detalhes.count ? log.detalhes.count : 0;
        detalhesText = `${count} ${count === 1 ? 'produto importado' : 'produtos importados'}`;
        break;
      case 'limpar':
        detalhesText = 'Todos os produtos removidos';
        break;
      default:
        detalhesText = 'Ação realizada';
    }
    
    tdDetalhes.textContent = detalhesText;
    tr.appendChild(tdDetalhes);
    
    // Ações
    const tdAcoes = document.createElement('td');
    const detailsBtn = document.createElement('span');
    detailsBtn.className = 'log-details-btn';
    detailsBtn.innerHTML = '<i class="bi bi-info-circle"></i> Detalhes';
    detailsBtn.addEventListener('click', () => {
      abrirDetalhesLog(log);
    });
    
    tdAcoes.appendChild(detailsBtn);
    tr.appendChild(tdAcoes);
    
    tbody.appendChild(tr);
  });
  
  // Se não há logs
  if (logs.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
    td.className = 'text-center';
    td.textContent = 'Nenhum log de atividade encontrado';
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
}

// Renderizar atividade recente
function renderizarAtividadeRecente(logs) {
  const tbody = document.getElementById('atividadeRecente');
  tbody.innerHTML = '';
  
  logs.forEach(log => {
    const tr = document.createElement('tr');
    
    // Data
    const tdData = document.createElement('td');
    tdData.textContent = formatarData(log.data ? log.data.toDate() : new Date());
    tr.appendChild(tdData);
    
    // Tipo
    const tdTipo = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `log-badge ${log.tipo}`;
    badge.textContent = log.tipo;
    tdTipo.appendChild(badge);
    tr.appendChild(tdTipo);
    
    // Produto
    const tdProduto = document.createElement('td');
    tdProduto.textContent = log.nomeProduto || 'N/A';
    tr.appendChild(tdProduto);
    
    // Detalhes
    const tdDetalhes = document.createElement('td');
    
    // Formatação específica por tipo de log
    let detalhesText = '';
    switch (log.tipo) {
      case 'criar':
        detalhesText = 'Novo produto criado';
        break;
      case 'editar':
        const detalhes = log.detalhes || {};
        const campos = Object.keys(detalhes).length;
        detalhesText = `${campos} ${campos === 1 ? 'campo alterado' : 'campos alterados'}`;
        break;
      case 'excluir':
        detalhesText = 'Produto excluído';
        break;
      case 'importar':
        const count = log.detalhes && log.detalhes.count ? log.detalhes.count : 0;
        detalhesText = `${count} ${count === 1 ? 'produto importado' : 'produtos importados'}`;
        break;
      case 'limpar':
        detalhesText = 'Todos os produtos removidos';
        break;
      default:
        detalhesText = 'Ação realizada';
    }
    
    tdDetalhes.textContent = detalhesText;
    tr.appendChild(tdDetalhes);
    
    tbody.appendChild(tr);
  });
  
  // Se não há logs
  if (logs.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 4;
    td.className = 'text-center';
    td.textContent = 'Nenhuma atividade recente encontrada';
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
}

// Aplicar filtros aos produtos
function aplicarFiltros() {
  // Obter valores dos filtros
  const busca = document.getElementById('searchProduto').value.toLowerCase();
  const categoria = document.getElementById('filtroCategoria').value;
  const estoque = document.getElementById('filtroEstoque').value;
  const tag = document.getElementById('filtroTag').value;
  const ordenacao = document.getElementById('ordenacao').value;
  
  // Filtrar produtos
  filteredProdutos = allProdutos.filter(produto => {
    // Busca por nome
    if (busca && !(produto.nome || '').toLowerCase().includes(busca)) {
      return false;
    }
    
    // Filtro por categoria
    if (categoria && produto.categoria !== categoria) {
      return false;
    }
    
    // Filtro por estoque
    if (estoque === 'estoque_baixo' && (produto.estoque > 5 || produto.estoque === 0)) {
      return false;
    }
    if (estoque === 'estoque_zerado' && produto.estoque !== 0) {
      return false;
    }
    
    // Filtro por tag
    if (tag && (!produto.tags || !Array.isArray(produto.tags) || !produto.tags.includes(tag))) {
      return false;
    }
    
    return true;
  });
  
  // Aplicar ordenação
  const [campo, ordem] = ordenacao.split('-');
  
  filteredProdutos.sort((a, b) => {
    let valorA, valorB;
    
    switch (campo) {
      case 'nome':
        valorA = (a.nome || '').toLowerCase();
        valorB = (b.nome || '').toLowerCase();
        break;
      case 'preco':
        valorA = a.preco || 0;
        valorB = b.preco || 0;
        break;
      case 'estoque':
        valorA = a.estoque || 0;
        valorB = b.estoque || 0;
        break;
      default:
        valorA = (a.nome || '').toLowerCase();
        valorB = (b.nome || '').toLowerCase();
    }
    
    if (ordem === 'asc') {
      return valorA > valorB ? 1 : -1;
    } else {
      return valorA < valorB ? 1 : -1;
    }
  });
  
  // Atualizar total de páginas
  totalPages = Math.ceil(filteredProdutos.length / pageSize);
  
  // Se a página atual for maior que o total de páginas, voltar para a primeira página
  if (currentPage > totalPages) {
    currentPage = 1;
  }
  
  // Renderizar produtos
  renderizarProdutos();
  
  // Renderizar paginação
  renderizarPaginacao();
}

// Filtrar logs
function filtrarLogs() {
  const tipo = document.getElementById('filtroLog').value;
  
  // Recarregar logs com filtro
  firestoreProducts.getLogs()
    .then(logs => {
      if (tipo) {
        logs = logs.filter(log => log.tipo === tipo);
      }
      renderizarLogs(logs);
    })
    .catch(error => {
      console.error('Erro ao filtrar logs:', error);
      showToast('Erro', 'Falha ao filtrar logs. Tente novamente.', 'error');
    });
}

// Renderizar produtos
function renderizarProdutos() {
  const tbody = document.getElementById('produtosList');
  tbody.innerHTML = '';
  
  // Calcular limite para paginação
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  
  // Obter produtos da página atual
  const produtosPaginados = filteredProdutos.slice(start, end);
  
  produtosPaginados.forEach(produto => {
    const tr = document.createElement('tr');
    
    // ID
    const tdId = document.createElement('td');
    tdId.textContent = produto.id && produto.id.substring(0, 8) || '-';
    tr.appendChild(tdId);
    
    // Imagem
    const tdImagem = document.createElement('td');
    const img = document.createElement('img');
    img.className = 'product-img-thumb';
    img.src = produto.imagem || 'https://via.placeholder.com/40?text=BOSSPODS';
    img.alt = produto.nome || 'Produto';
    tdImagem.appendChild(img);
    tr.appendChild(tdImagem);
    
    // Nome
    const tdNome = document.createElement('td');
    tdNome.textContent = produto.nome || 'Sem nome';
    tr.appendChild(tdNome);
    
    // Categoria
    const tdCategoria = document.createElement('td');
    tdCategoria.textContent = produto.categoria || '-';
    tr.appendChild(tdCategoria);
    
    // Preço
    const tdPreco = document.createElement('td');
    tdPreco.textContent = formatarPreco(produto.preco);
    tr.appendChild(tdPreco);
    
    // Estoque
    const tdEstoque = document.createElement('td');
    tdEstoque.textContent = produto.estoque || 0;
    
    // Adicionar classe de destaque conforme o estoque
    if (produto.estoque === 0) {
      tdEstoque.className = 'text-danger';
    } else if (produto.estoque <= 5) {
      tdEstoque.className = 'text-warning';
    }
    
    tr.appendChild(tdEstoque);
    
    // Status
    const tdStatus = document.createElement('td');
    let statusClass = 'success';
    let statusText = 'Ativo';
    
    if (produto.estoque === 0) {
      statusClass = 'danger';
      statusText = 'Sem Estoque';
    } else if (produto.em_promocao) {
      statusClass = 'warning';
      statusText = 'Promoção';
    }
    
    const badge = document.createElement('span');
    badge.className = `status-badge ${statusClass}`;
    badge.textContent = statusText;
    tdStatus.appendChild(badge);
    
    tr.appendChild(tdStatus);
    
    // Ações
    const tdAcoes = document.createElement('td');
    
    // Botão de editar
    const btnEditar = document.createElement('button');
    btnEditar.className = 'btn cyber-btn cyber-btn-sm action-btn';
    btnEditar.innerHTML = '<i class="bi bi-pencil"></i>';
    btnEditar.title = 'Editar';
    btnEditar.addEventListener('click', () => {
      abrirModalEditarProduto(produto);
    });
    
    // Botão de excluir
    const btnExcluir = document.createElement('button');
    btnExcluir.className = 'btn cyber-btn cyber-btn-danger cyber-btn-sm action-btn';
    btnExcluir.innerHTML = '<i class="bi bi-trash"></i>';
    btnExcluir.title = 'Excluir';
    btnExcluir.addEventListener('click', () => {
      confirmarExclusao(produto);
    });
    
    // Botão de detalhes
    const btnDetalhes = document.createElement('button');
    btnDetalhes.className = 'btn cyber-btn cyber-btn-secondary cyber-btn-sm action-btn';
    btnDetalhes.innerHTML = '<i class="bi bi-eye"></i>';
    btnDetalhes.title = 'Detalhes';
    btnDetalhes.addEventListener('click', () => {
      abrirDetalhesModal(produto);
    });
    
    tdAcoes.appendChild(btnEditar);
    tdAcoes.appendChild(btnExcluir);
    tdAcoes.appendChild(btnDetalhes);
    
    tr.appendChild(tdAcoes);
    
    tbody.appendChild(tr);
  });
  
  // Se não há produtos
  if (produtosPaginados.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 8;
    td.className = 'text-center';
    
    if (filteredProdutos.length === 0) {
      if (allProdutos.length === 0) {
        td.textContent = 'Nenhum produto cadastrado';
      } else {
        td.textContent = 'Nenhum produto encontrado para os filtros selecionados';
      }
    } else {
      td.textContent = 'Nenhum produto nesta página';
    }
    
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
}

// Renderizar paginação
function renderizarPaginacao() {
  const paginacao = document.getElementById('produtosPagination');
  paginacao.innerHTML = '';
  
  if (totalPages <= 1) {
    return;
  }
  
  // Botão de página anterior
  const btnAnterior = document.createElement('button');
  btnAnterior.className = 'page-link';
  btnAnterior.innerHTML = '<i class="bi bi-chevron-left"></i>';
  btnAnterior.disabled = currentPage === 1;
  btnAnterior.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderizarProdutos();
      renderizarPaginacao();
    }
  });
  
  paginacao.appendChild(btnAnterior);
  
  // Páginas
  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  
  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    const btnPagina = document.createElement('button');
    btnPagina.className = 'page-link';
    btnPagina.textContent = i;
    
    if (i === currentPage) {
      btnPagina.classList.add('active');
    }
    
    btnPagina.addEventListener('click', () => {
      currentPage = i;
      renderizarProdutos();
      renderizarPaginacao();
    });
    
    paginacao.appendChild(btnPagina);
  }
  
  // Botão de próxima página
  const btnProximo = document.createElement('button');
  btnProximo.className = 'page-link';
  btnProximo.innerHTML = '<i class="bi bi-chevron-right"></i>';
  btnProximo.disabled = currentPage === totalPages;
  btnProximo.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderizarProdutos();
      renderizarPaginacao();
    }
  });
  
  paginacao.appendChild(btnProximo);
}

// Abrir modal para novo produto
function abrirModalNovoProduto() {
  // Resetar formulário
  document.getElementById('produtoForm').reset();
  document.getElementById('produtoId').value = '';
  document.getElementById('tagsContainer').innerHTML = '';
  document.getElementById('tagsHidden').value = '[]';
  
  // Atualizar título do modal
  document.getElementById('produtoModalTitle').textContent = 'Novo Produto';
  
  // Resetar lista de tags atual
  currentTags = [];
  
  // Mostrar modal
  const modal = new bootstrap.Modal(document.getElementById('produtoModal'));
  modal.show();
}

// Abrir modal para editar produto
function abrirModalEditarProduto(produto) {
  // Preencher formulário
  document.getElementById('produtoId').value = produto.id;
  document.getElementById('nome').value = produto.nome || '';
  document.getElementById('categoria').value = produto.categoria || '';
  document.getElementById('preco').value = produto.preco || 0;
  document.getElementById('estoque').value = produto.estoque || 0;
  document.getElementById('promocao').checked = produto.em_promocao || false;
  document.getElementById('descricao').value = produto.descricao || '';
  document.getElementById('imagem').value = produto.imagem || '';
  
  // Preencher tags
  currentTags = Array.isArray(produto.tags) ? [...produto.tags] : [];
  document.getElementById('tagsHidden').value = JSON.stringify(currentTags);
  
  // Renderizar tags
  const tagsContainer = document.getElementById('tagsContainer');
  tagsContainer.innerHTML = '';
  
  currentTags.forEach(tag => {
    adicionarTagAoContainer(tag);
  });
  
  // Atualizar título do modal
  document.getElementById('produtoModalTitle').textContent = 'Editar Produto';
  
  // Mostrar modal
  const modal = new bootstrap.Modal(document.getElementById('produtoModal'));
  modal.show();
}

// Adicionar tag ao produto
function adicionarTagAoProduto() {
  const tagInput = document.getElementById('tagInput');
  const tag = tagInput.value.trim();
  
  if (!tag) {
    return;
  }
  
  // Verificar se a tag já existe
  if (currentTags.includes(tag)) {
    showToast('Atenção', 'Esta tag já foi adicionada', 'warning');
    tagInput.value = '';
    return;
  }
  
  // Adicionar tag à lista
  currentTags.push(tag);
  document.getElementById('tagsHidden').value = JSON.stringify(currentTags);
  
  // Adicionar tag ao container
  adicionarTagAoContainer(tag);
  
  // Limpar input
  tagInput.value = '';
}

// Adicionar tag ao container
function adicionarTagAoContainer(tag) {
  const tagsContainer = document.getElementById('tagsContainer');
  
  const tagElement = document.createElement('span');
  tagElement.className = 'cyber-tag';
  tagElement.textContent = tag;
  
  const closeBtn = document.createElement('span');
  closeBtn.className = 'close';
  closeBtn.innerHTML = '<i class="bi bi-x"></i>';
  closeBtn.addEventListener('click', () => {
    // Remover tag da lista
    const index = currentTags.indexOf(tag);
    if (index !== -1) {
      currentTags.splice(index, 1);
      document.getElementById('tagsHidden').value = JSON.stringify(currentTags);
    }
    
    // Remover tag do container
    tagElement.remove();
  });
  
  tagElement.appendChild(closeBtn);
  tagsContainer.appendChild(tagElement);
}

// Salvar produto
async function salvarProduto() {
  try {
    console.log('===== INICIANDO SALVAMENTO DE PRODUTO =====');
    
    // Verificar se Firebase está inicializado
    if (!firebaseInitialized) {
      console.error('ERRO CRÍTICO: Firebase não está inicializado');
      showToast('Erro', 'Serviço do Firebase não está inicializado. Aguarde ou recarregue a página.', 'error');
      // Adicionar visualização do erro no HTML para depuração
      document.getElementById('errorMessages').innerHTML = 
        '<div class="alert alert-danger">Firebase não está inicializado. Verifique a conexão com a internet ou recarregue a página.</div>';
      return;
    }
    
    // Verificar se o usuário está autenticado (usando localStorage)
    const userString = localStorage.getItem('currentUser');
    const authToken = localStorage.getItem('authToken');
    
    if (!userString || !authToken) {
      console.error('ERRO: Usuário não está autenticado');
      showToast('Erro', 'Você precisa estar autenticado para salvar produtos.', 'error');
      // Redirecionar para login
      window.location.href = '/login';
      return;
    }
    
    const currentUser = JSON.parse(userString);
    
    // Verificar se o usuário é administrador
    if (currentUser.role !== 'admin') {
      console.error('ERRO: Usuário não tem permissão de administrador');
      showToast('Erro', 'Você não tem permissão para salvar produtos.', 'error');
      // Redirecionar para login
      window.location.href = '/login';
      return;
    }
    
    // Validar formulário
    const form = document.getElementById('produtoForm');
    if (!form.checkValidity()) {
      console.log('Formulário inválido, exibindo mensagens de validação...');
      form.reportValidity();
      return;
    }
    
    // Verificar se firestoreProducts está disponível
    if (typeof firestoreProducts === 'undefined' || !firestoreProducts) {
      console.error('ERRO CRÍTICO: firestoreProducts não está definido');
      showToast('Erro', 'Serviço de produtos não disponível. Verifique o console.', 'error');
      // Mostrar erro no HTML para depuração
      document.getElementById('errorMessages').innerHTML = 
        '<div class="alert alert-danger">Serviço de produtos não disponível. Tente recarregar a página.</div>';
      return;
    }
    
    // Verificar se a API de produtos tem o método addProduct
    if (typeof firestoreProducts.addProduct !== 'function') {
      console.error('ERRO CRÍTICO: firestoreProducts.addProduct não é uma função');
      showToast('Erro', 'API de produtos está configurada incorretamente. Contate o suporte.', 'error');
      // Mostrar erro no HTML para depuração
      document.getElementById('errorMessages').innerHTML = 
        '<div class="alert alert-danger">API de produtos está configurada incorretamente. Método addProduct não encontrado.</div>';
      return;
    }
    
    // Obter dados do formulário
    const id = document.getElementById('produtoId').value;
    const nome = document.getElementById('nome').value.trim();
    const categoria = document.getElementById('categoria').value.trim();
    const preco = parseFloat(document.getElementById('preco').value);
    const estoque = parseInt(document.getElementById('estoque').value);
    const em_promocao = document.getElementById('promocao').checked;
    const descricao = document.getElementById('descricao').value.trim();
    const imagem = document.getElementById('imagem').value.trim();
    const tags = currentTags;
    
    // Validação extra dos dados essenciais
    if (!nome) {
      console.error('ERRO: Nome do produto é obrigatório');
      showToast('Erro', 'Nome do produto é obrigatório', 'error');
      document.getElementById('nome').focus();
      return;
    }
    
    if (isNaN(preco) || preco < 0) {
      console.error('ERRO: Preço inválido');
      showToast('Erro', 'Preço deve ser um número positivo', 'error');
      document.getElementById('preco').focus();
      return;
    }
    
    if (isNaN(estoque) || estoque < 0) {
      console.error('ERRO: Estoque inválido');
      showToast('Erro', 'Estoque deve ser um número positivo', 'error');
      document.getElementById('estoque').focus();
      return;
    }
    
    console.log('Dados do formulário (validado):', {
      id: id || 'novo produto',
      nome,
      categoria,
      preco,
      estoque,
      em_promocao,
      descricao: descricao ? `${descricao.substring(0, 20)}...` : '',
      imagem: imagem || 'não informada',
      tags
    });
    
    // Preparar dados do produto
    const produtoData = {
      nome,
      categoria,
      preco,
      estoque,
      em_promocao,
      descricao,
      tags
    };
    
    // Adicionar imagem se foi fornecida
    if (imagem) {
      produtoData.imagem = imagem;
    }
    
    // Mostrar loading
    showLoading();
    console.log('Enviando dados para o servidor...');
    
    try {
      // Salvar no Firestore
      if (id) {
        // Atualizar produto existente
        console.log('Atualizando produto existente com ID:', id);
        await firestoreProducts.updateProduct(id, produtoData);
        console.log('Produto atualizado com sucesso!');
        showToast('Sucesso', 'Produto atualizado com sucesso', 'success');
      } else {
        // Adicionar novo produto
        console.log('Iniciando criação de novo produto');
        console.log('Dados a serem enviados:', produtoData);
        
        const novoProduto = await firestoreProducts.addProduct(produtoData);
        
        if (!novoProduto || !novoProduto.id) {
          throw new Error('Resposta inválida da API, produto não foi criado corretamente');
        }
        
        console.log('Produto criado com sucesso! Detalhes:', novoProduto);
        showToast('Sucesso', 'Produto adicionado com sucesso', 'success');
      }
      
      // Fechar modal
      console.log('Fechando modal...');
      const modal = bootstrap.Modal.getInstance(document.getElementById('produtoModal'));
      modal.hide();
      
      // Recarregar dados
      console.log('Recarregando dados...');
      await carregarDados();
      
      console.log('===== PRODUTO SALVO COM SUCESSO =====');
    } catch (saveError) {
      console.error('ERRO durante operação de salvar:', saveError);
      console.error('Detalhes do erro:', JSON.stringify(saveError, Object.getOwnPropertyNames(saveError)));
      
      let mensagemErro = 'Falha ao salvar produto';
      if (saveError.message) {
        mensagemErro += ': ' + saveError.message;
      } else {
        mensagemErro += '. Verifique o console para mais detalhes.';
      }
      
      showToast('Erro', mensagemErro, 'error');
    } finally {
      // Sempre esconder loading, mesmo em caso de erro
      hideLoading();
    }
    
  } catch (error) {
    console.error('ERRO CRÍTICO ao processar salvamento de produto:', error);
    console.error('Detalhes do erro:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    showToast('Erro', 'Falha ao processar dados do produto. Detalhes no console.', 'error');
    hideLoading();
  }
}

// Abrir modal de confirmação de exclusão
function confirmarExclusao(produto) {
  document.getElementById('confirmModalTitle').textContent = 'Confirmar Exclusão';
  document.getElementById('confirmModalText').textContent = `Tem certeza que deseja excluir o produto "${produto.nome}"?`;
  document.getElementById('confirmBtn').className = 'btn cyber-btn cyber-btn-danger';
  document.getElementById('confirmBtn').textContent = 'Excluir';
  
  // Definir callback
  confirmCallback = () => excluirProduto(produto.id);
  
  // Mostrar modal
  const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
  modal.show();
}

// Excluir produto
async function excluirProduto(id) {
  try {
    showLoading();
    
    await firestoreProducts.deleteProduct(id);
    
    showToast('Sucesso', 'Produto excluído com sucesso', 'success');
    
    // Recarregar dados
    await carregarDados();
    
    hideLoading();
  } catch (error) {
    console.error('Erro ao excluir produto:', error);
    showToast('Erro', 'Falha ao excluir produto. Tente novamente.', 'error');
    hideLoading();
  }
}

// Abrir modal de detalhes do produto
function abrirDetalhesModal(produto) {
  // TODO: Implementar modal de detalhes do produto
  
  // Por enquanto, apenas mostrar um toast
  showToast('Detalhes', `ID: ${produto.id} - ${produto.nome}`, 'info');
}

// Abrir modal de detalhes do log
function abrirDetalhesLog(log) {
  // Preencher dados do modal
  document.getElementById('logDetailsData').textContent = formatarData(log.data ? log.data.toDate() : new Date());
  document.getElementById('logDetailsTipo').textContent = log.tipo;
  document.getElementById('logDetailsProduto').textContent = log.nomeProduto || 'N/A';
  document.getElementById('logDetailsProdutoId').textContent = log.produtoId || 'N/A';
  
  // Formatar JSON de detalhes
  const detalhesJson = document.getElementById('logDetailsJson');
  
  if (log.detalhes) {
    if (typeof log.detalhes === 'object') {
      detalhesJson.textContent = JSON.stringify(log.detalhes, null, 2);
    } else {
      try {
        const detalhes = JSON.parse(log.detalhes);
        detalhesJson.textContent = JSON.stringify(detalhes, null, 2);
      } catch {
        detalhesJson.textContent = log.detalhes;
      }
    }
  } else {
    detalhesJson.textContent = 'Nenhum detalhe disponível';
  }
  
  // Mostrar modal
  const modal = new bootstrap.Modal(document.getElementById('logDetailsModal'));
  modal.show();
}

// Exportar dados
function exportarDados(formato) {
  try {
    // Fechar modal de exportação
    const exportModal = bootstrap.Modal.getInstance(document.getElementById('exportModal'));
    exportModal.hide();
    
    if (formato === 'json') {
      // Exportar como JSON
      const jsonData = JSON.stringify(allProdutos, null, 2);
      
      // Criar blob e link de download
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Criar link e simular clique
      const a = document.createElement('a');
      a.href = url;
      a.download = `produtos_${formatarDataArquivo(new Date())}.json`;
      a.click();
      
      // Liberar URL
      URL.revokeObjectURL(url);
      
    } else if (formato === 'csv') {
      // Exportar como CSV
      const headers = ['id', 'nome', 'categoria', 'preco', 'estoque', 'em_promocao', 'descricao', 'imagem', 'tags'];
      
      // Criar conteúdo CSV
      let csvContent = headers.join(',') + '\n';
      
      allProdutos.forEach(produto => {
        const row = [
          produto.id,
          `"${(produto.nome || '').replace(/"/g, '""')}"`,
          `"${(produto.categoria || '').replace(/"/g, '""')}"`,
          produto.preco || 0,
          produto.estoque || 0,
          produto.em_promocao ? 'true' : 'false',
          `"${(produto.descricao || '').replace(/"/g, '""')}"`,
          `"${(produto.imagem || '').replace(/"/g, '""')}"`,
          `"${JSON.stringify(produto.tags || []).replace(/"/g, '""')}"`
        ];
        
        csvContent += row.join(',') + '\n';
      });
      
      // Criar blob e link de download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      // Criar link e simular clique
      const a = document.createElement('a');
      a.href = url;
      a.download = `produtos_${formatarDataArquivo(new Date())}.csv`;
      a.click();
      
      // Liberar URL
      URL.revokeObjectURL(url);
    }
    
    showToast('Sucesso', `Dados exportados com sucesso no formato ${formato.toUpperCase()}`, 'success');
    
  } catch (error) {
    console.error('Erro ao exportar dados:', error);
    showToast('Erro', 'Falha ao exportar dados. Tente novamente.', 'error');
  }
}

// Exportar logs
function exportarLogs() {
  try {
    firestoreProducts.getLogs()
      .then(logs => {
        // Exportar como JSON
        const jsonData = JSON.stringify(logs.map(log => {
          // Converter timestamps para string
          if (log.data && typeof log.data.toDate === 'function') {
            return {
              ...log,
              data: log.data.toDate().toISOString()
            };
          }
          return log;
        }), null, 2);
        
        // Criar blob e link de download
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Criar link e simular clique
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs_${formatarDataArquivo(new Date())}.json`;
        a.click();
        
        // Liberar URL
        URL.revokeObjectURL(url);
        
        showToast('Sucesso', 'Logs exportados com sucesso', 'success');
      })
      .catch(error => {
        console.error('Erro ao exportar logs:', error);
        showToast('Erro', 'Falha ao exportar logs. Tente novamente.', 'error');
      });
    
  } catch (error) {
    console.error('Erro ao exportar logs:', error);
    showToast('Erro', 'Falha ao exportar logs. Tente novamente.', 'error');
  }
}

// Importar dados
async function importarDados() {
  try {
    const fileInput = document.getElementById('importFile');
    const limparAntes = document.getElementById('limparAntesImportar').checked;
    
    // Verificar se um arquivo foi selecionado
    if (!fileInput.files || fileInput.files.length === 0) {
      showToast('Atenção', 'Selecione um arquivo para importar', 'warning');
      return;
    }
    
    const file = fileInput.files[0];
    
    // Verificar se o arquivo é JSON
    if (!file.name.endsWith('.json')) {
      showToast('Erro', 'O arquivo deve ser no formato JSON', 'error');
      return;
    }
    
    // Ler o arquivo
    const reader = new FileReader();
    
    reader.onload = async function(event) {
      try {
        // Converter conteúdo para JSON
        const produtos = JSON.parse(event.target.result);
        
        // Verificar se é um array
        if (!Array.isArray(produtos)) {
          showToast('Erro', 'O arquivo deve conter um array de produtos', 'error');
          return;
        }
        
        // Fechar modal de importação
        const importModal = bootstrap.Modal.getInstance(document.getElementById('importModal'));
        importModal.hide();
        
        // Mostrar loading
        showLoading();
        
        // Limpar produtos existentes se solicitado
        if (limparAntes) {
          // TODO: Implementar limpeza de produtos
          // Por enquanto, mostrar mensagem de não suportado
          showToast('Atenção', 'A limpeza de produtos antes da importação ainda não está disponível', 'warning');
        }
        
        // Importar produtos
        for (const produto of produtos) {
          // Remover campos que não devem ser importados
          const { id, createdAt, updatedAt, ...produtoData } = produto;
          
          // Se o produto tem um ID, atualizar; caso contrário, adicionar
          if (id) {
            await firestoreProducts.updateProduct(id, produtoData);
          } else {
            await firestoreProducts.addProduct(produtoData);
          }
        }
        
        // Recarregar dados
        await carregarDados();
        
        showToast('Sucesso', `${produtos.length} produtos importados com sucesso`, 'success');
        
        // Esconder loading
        hideLoading();
        
      } catch (error) {
        console.error('Erro ao processar arquivo:', error);
        showToast('Erro', 'Falha ao processar arquivo. Verifique se o formato é válido.', 'error');
        hideLoading();
      }
    };
    
    reader.onerror = function() {
      console.error('Erro ao ler arquivo:', reader.error);
      showToast('Erro', 'Falha ao ler arquivo. Tente novamente.', 'error');
    };
    
    reader.readAsText(file);
    
  } catch (error) {
    console.error('Erro ao importar dados:', error);
    showToast('Erro', 'Falha ao importar dados. Tente novamente.', 'error');
  }
}

// Atualizar gráficos do dashboard
function updateDashboardCharts() {
  // Destruir gráficos existentes
  if (charts.categoriasChart) {
    charts.categoriasChart.destroy();
  }
  
  if (charts.estoqueChart) {
    charts.estoqueChart.destroy();
  }
  
  // Obter estatísticas
  firebaseStats.getBasicStats()
    .then(stats => {
      // Gráfico de categorias
      const categoriasCtx = document.getElementById('categoriasChart').getContext('2d');
      
      const categoriasData = {
        labels: stats.distribuicaoCategorias.map(item => item.categoria),
        datasets: [{
          data: stats.distribuicaoCategorias.map(item => item.count),
          backgroundColor: [
            'rgba(184, 51, 255, 0.7)',
            'rgba(0, 184, 255, 0.7)',
            'rgba(255, 45, 108, 0.7)',
            'rgba(255, 184, 46, 0.7)',
            'rgba(51, 255, 192, 0.7)'
          ],
          borderColor: [
            'rgba(184, 51, 255, 1)',
            'rgba(0, 184, 255, 1)',
            'rgba(255, 45, 108, 1)',
            'rgba(255, 184, 46, 1)',
            'rgba(51, 255, 192, 1)'
          ],
          borderWidth: 1
        }]
      };
      
      charts.categoriasChart = new Chart(categoriasCtx, {
        type: 'doughnut',
        data: categoriasData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                color: '#f1f1f1',
                font: {
                  size: 11
                },
                padding: 10
              }
            }
          },
          cutout: '70%'
        }
      });
      
      // Gráfico de estoque
      const estoqueCtx = document.getElementById('estoqueChart').getContext('2d');
      
      // Obter os 5 produtos com maior estoque
      const maioresEstoques = stats.maioresEstoques.slice(0, 5);
      
      const estoqueData = {
        labels: maioresEstoques.map(produto => produto.nome),
        datasets: [{
          label: 'Estoque',
          data: maioresEstoques.map(produto => produto.estoque),
          backgroundColor: 'rgba(184, 51, 255, 0.2)',
          borderColor: 'rgba(184, 51, 255, 1)',
          borderWidth: 1
        }]
      };
      
      charts.estoqueChart = new Chart(estoqueCtx, {
        type: 'bar',
        data: estoqueData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              },
              ticks: {
                color: '#a2a2c2'
              }
            },
            x: {
              grid: {
                display: false
              },
              ticks: {
                color: '#a2a2c2',
                maxRotation: 45,
                minRotation: 45
              }
            }
          },
          plugins: {
            legend: {
              display: false
            }
          }
        }
      });
    })
    .catch(error => {
      console.error('Erro ao atualizar gráficos:', error);
    });
}

// ===== Funções utilitárias =====

// Mostrar toast
function showToast(title, message, type = 'info') {
  const toastElement = document.getElementById('toast');
  const titleElement = document.getElementById('toastTitle');
  const messageElement = document.getElementById('toastMessage');
  
  // Remover classes existentes
  toastElement.className = 'toast cyber-toast';
  
  // Adicionar classe de acordo com o tipo
  if (type === 'success') {
    toastElement.classList.add('cyber-toast-success');
  } else if (type === 'error') {
    toastElement.classList.add('cyber-toast-error');
  }
  
  // Definir conteúdo
  titleElement.textContent = title;
  messageElement.textContent = message;
  
  // Mostrar toast
  const toast = new bootstrap.Toast(toastElement);
  toast.show();
}

// Mostrar loading
function showLoading() {
  // TODO: Implementar indicador de loading
  document.body.style.cursor = 'wait';
}

// Esconder loading
function hideLoading() {
  document.body.style.cursor = 'default';
}

// Formatar preço
function formatarPreco(preco) {
  return `R$ ${(preco || 0).toFixed(2).replace('.', ',')}`;
}

// Formatar data
function formatarData(data) {
  if (!data) return '-';
  
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(data);
}

// Formatar data para nome de arquivo
function formatarDataArquivo(data) {
  if (!data) return 'export';
  
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  const hora = String(data.getHours()).padStart(2, '0');
  const minuto = String(data.getMinutes()).padStart(2, '0');
  
  return `${ano}${mes}${dia}_${hora}${minuto}`;
}

// ===== Funções para Debug Logs =====

// Carregar logs de debug
function carregarDebugLogs() {
  try {
    console.log('Carregando logs de debug...');
    
    // Verificar se já temos os logs no localStorage
    const logsString = localStorage.getItem('debugLogs');
    
    if (logsString) {
      try {
        debugLogs = JSON.parse(logsString);
        console.log('Logs de debug carregados do localStorage:', debugLogs.length);
      } catch (e) {
        console.error('Erro ao parsear logs do localStorage:', e);
        debugLogs = [];
      }
    } else {
      console.log('Nenhum log de debug encontrado no localStorage');
      debugLogs = [];
    }
    
    // Ordenar por data (mais recentes primeiro)
    debugLogs.sort((a, b) => new Date(b.data) - new Date(a.data));
    
    // Aplicar filtros (isso também atualiza a exibição)
    filtrarDebugLogs();
    
  } catch (error) {
    console.error('Erro ao carregar logs de debug:', error);
    showToast('Erro', 'Falha ao carregar logs de debug. Detalhes no console.', 'error');
  }
}

// Filtrar logs de debug
function filtrarDebugLogs() {
  // Obter valores dos filtros
  const busca = document.getElementById('searchDebugLog').value.toLowerCase();
  const nivel = document.getElementById('filtroDebugLog').value;
  
  // Filtrar logs
  filteredDebugLogs = debugLogs.filter(log => {
    // Filtro por nível
    if (nivel && log.nivel !== nivel) {
      return false;
    }
    
    // Busca em campos de texto
    if (busca) {
      const mensagemMatch = (log.mensagem || '').toLowerCase().includes(busca);
      const origemMatch = (log.origem || '').toLowerCase().includes(busca);
      const detalhesMatch = (log.detalhes || '').toLowerCase().includes(busca);
      
      if (!mensagemMatch && !origemMatch && !detalhesMatch) {
        return false;
      }
    }
    
    return true;
  });
  
  // Renderizar logs filtrados
  renderizarDebugLogs(filteredDebugLogs);
}

// Renderizar logs de debug
function renderizarDebugLogs(logs) {
  const tbody = document.getElementById('debugLogsList');
  tbody.innerHTML = '';
  
  logs.forEach(log => {
    const tr = document.createElement('tr');
    
    // Data
    const tdData = document.createElement('td');
    tdData.textContent = formatarData(new Date(log.data));
    tr.appendChild(tdData);
    
    // Nível
    const tdNivel = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `log-badge ${log.nivel}`;
    badge.textContent = getNivelText(log.nivel);
    tdNivel.appendChild(badge);
    tr.appendChild(tdNivel);
    
    // Origem
    const tdOrigem = document.createElement('td');
    tdOrigem.textContent = log.origem || 'N/A';
    tr.appendChild(tdOrigem);
    
    // Mensagem
    const tdMensagem = document.createElement('td');
    tdMensagem.textContent = log.mensagem || '';
    tr.appendChild(tdMensagem);
    
    // Ações
    const tdAcoes = document.createElement('td');
    const detailsBtn = document.createElement('span');
    detailsBtn.className = 'log-details-btn';
    detailsBtn.innerHTML = '<i class="bi bi-info-circle"></i> Detalhes';
    detailsBtn.addEventListener('click', () => {
      abrirDetalhesDebugLog(log);
    });
    
    tdAcoes.appendChild(detailsBtn);
    tr.appendChild(tdAcoes);
    
    tbody.appendChild(tr);
  });
  
  // Se não há logs
  if (logs.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
    td.className = 'text-center';
    td.textContent = 'Nenhum log de debug encontrado';
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
}

// Obter texto do nível
function getNivelText(nivel) {
  switch (nivel) {
    case 'error':
      return 'Erro';
    case 'warning':
      return 'Aviso';
    case 'info':
      return 'Info';
    case 'debug':
      return 'Debug';
    default:
      return nivel;
  }
}

// Abrir modal para novo log de debug
function abrirModalNovoDebugLog() {
  // Limpar formulário
  document.getElementById('debugLogForm').reset();
  document.getElementById('debugLogNivel').value = 'error';
  document.getElementById('debugLogOrigem').value = '';
  document.getElementById('debugLogMensagem').value = '';
  document.getElementById('debugLogDetalhes').value = '';
  
  // Mostrar modal
  const modal = new bootstrap.Modal(document.getElementById('debugLogModal'));
  modal.show();
}

// Salvar log de debug
function salvarDebugLog() {
  try {
    // Validar formulário
    const form = document.getElementById('debugLogForm');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    
    // Obter dados do formulário
    const nivel = document.getElementById('debugLogNivel').value;
    const origem = document.getElementById('debugLogOrigem').value;
    const mensagem = document.getElementById('debugLogMensagem').value;
    const detalhes = document.getElementById('debugLogDetalhes').value;
    
    // Criar objeto de log
    const log = {
      id: Date.now().toString(),
      data: new Date().toISOString(),
      nivel,
      origem,
      mensagem,
      detalhes
    };
    
    console.log('Registrando novo log de debug:', log);
    
    // Adicionar ao array
    debugLogs.unshift(log);
    
    // Salvar no localStorage
    localStorage.setItem('debugLogs', JSON.stringify(debugLogs));
    
    // Fechar modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('debugLogModal'));
    modal.hide();
    
    // Atualizar lista
    filtrarDebugLogs();
    
    showToast('Sucesso', 'Log registrado com sucesso', 'success');
    
  } catch (error) {
    console.error('Erro ao salvar log de debug:', error);
    showToast('Erro', 'Falha ao registrar log. Tente novamente.', 'error');
  }
}

// Abrir detalhes de log de debug
function abrirDetalhesDebugLog(log) {
  // Preencher dados do modal
  document.getElementById('debugLogDetailsData').textContent = formatarData(new Date(log.data));
  document.getElementById('debugLogDetailsNivel').textContent = getNivelText(log.nivel);
  document.getElementById('debugLogDetailsOrigem').textContent = log.origem || 'N/A';
  document.getElementById('debugLogDetailsMensagem').textContent = log.mensagem || '';
  
  // Mostrar detalhes
  const detalhesJson = document.getElementById('debugLogDetailsJson');
  if (log.detalhes) {
    detalhesJson.textContent = log.detalhes;
  } else {
    detalhesJson.textContent = 'Nenhum detalhe disponível';
  }
  
  // Mostrar modal
  const modal = new bootstrap.Modal(document.getElementById('debugLogDetailsModal'));
  modal.show();
}

// Confirmar limpeza de logs de debug
function confirmarLimparDebugLogs() {
  document.getElementById('confirmModalTitle').textContent = 'Confirmar Ação';
  document.getElementById('confirmModalText').textContent = 'Tem certeza que deseja limpar todos os logs de debug? Esta ação não pode ser desfeita.';
  document.getElementById('confirmBtn').className = 'btn cyber-btn cyber-btn-danger';
  document.getElementById('confirmBtn').textContent = 'Limpar';
  
  // Definir callback
  confirmCallback = limparDebugLogs;
  
  // Mostrar modal
  const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
  modal.show();
}

// Limpar logs de debug
function limparDebugLogs() {
  try {
    // Limpar array
    debugLogs = [];
    
    // Limpar localStorage
    localStorage.removeItem('debugLogs');
    
    // Atualizar interface
    filtrarDebugLogs();
    
    showToast('Sucesso', 'Logs de debug limpos com sucesso', 'success');
    
  } catch (error) {
    console.error('Erro ao limpar logs de debug:', error);
    showToast('Erro', 'Falha ao limpar logs. Tente novamente.', 'error');
  }
}

// Exportar logs de debug
function exportarDebugLogs() {
  try {
    // Exportar como JSON
    const jsonData = JSON.stringify(debugLogs, null, 2);
    
    // Criar blob e link de download
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Criar link e simular clique
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug_logs_${formatarDataArquivo(new Date())}.json`;
    a.click();
    
    // Liberar URL
    URL.revokeObjectURL(url);
    
    showToast('Sucesso', 'Logs de debug exportados com sucesso', 'success');
    
  } catch (error) {
    console.error('Erro ao exportar logs de debug:', error);
    showToast('Erro', 'Falha ao exportar logs. Tente novamente.', 'error');
  }
}