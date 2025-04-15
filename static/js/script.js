// Global variables
let produtos = [];
let logs = [];
let autoSaveTimeout;
let currentSortField = 'nome';
let currentSortOrder = 'asc';

// Variables for AJAX
let serverMode = false; // Set to false for localStorage mode, true for server mode
const apiUrl = '/api';

// Variáveis para controle de notificações
let notificacoesExibidas = [];
const ESTOQUE_CRITICO = 0;
const ESTOQUE_BAIXO = 5;

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
  // Check if we're using server or localStorage mode
  fetch('/api/produtos')
    .then(response => {
      serverMode = response.ok;
      console.log(`Using ${serverMode ? 'server' : 'localStorage'} mode`);
      // Load data after determining mode
      carregarProdutos();
      
      // If server mode, also load tags
      if (serverMode) {
        carregarTags();
      }
    })
    .catch(err => {
      console.log('Using localStorage mode due to error:', err);
      carregarProdutos();
    });
  
  // Initialize charts
  initCharts();
  
  // Configurar verificação de estoque baixo a cada 5 minutos
  setTimeout(function checkLowStock() {
    verificarEstoqueBaixo();
    setTimeout(checkLowStock, 300000); // 5 minutos
  }, 3000); // primeira verificação após 3 segundos
  
  // Setup event listeners
  document.getElementById('btnAddProduct').addEventListener('click', function() {
    document.getElementById('modalTitle').textContent = 'Adicionar Produto';
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('imagePreview').classList.add('d-none');
    document.getElementById('tagsContainer').innerHTML = '';
    
    const modal = new bootstrap.Modal(document.getElementById('productModal'));
    modal.show();
  });
  
  document.getElementById('btnViewLogs').addEventListener('click', abrirLogs);
  document.getElementById('btnInsights').addEventListener('click', function() {
    const insightsTab = new bootstrap.Tab(document.getElementById('insights-tab'));
    insightsTab.show();
    
    // Refresh charts when tab is shown
    refreshInsights();
  });
  
  document.getElementById('btnDeleteAll').addEventListener('click', function() {
    document.getElementById('confirmationMessage').textContent = 'Tem certeza que deseja apagar todos os produtos? Esta ação não pode ser desfeita.';
    document.getElementById('confirmAction').textContent = 'Sim, apagar';
    
    document.getElementById('confirmAction').onclick = function() {
      apagarTudo();
      bootstrap.Modal.getInstance(document.getElementById('confirmationModal')).hide();
    };
    
    const modal = new bootstrap.Modal(document.getElementById('confirmationModal'));
    modal.show();
  });
  
  document.getElementById('saveProduct').addEventListener('click', function() {
    const form = document.getElementById('productForm');
    if (form.checkValidity()) {
      const id = document.getElementById('productId').value;
      if (id) {
        salvar(id);
      } else {
        adicionarProduto();
      }
      bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
    } else {
      form.classList.add('was-validated');
      document.getElementById('productForm').classList.add('shake-error');
      setTimeout(() => {
        document.getElementById('productForm').classList.remove('shake-error');
      }, 600);
    }
  });
  
  document.getElementById('searchInput').addEventListener('input', function() {
    renderAdmin(this.value);
  });
  
  document.getElementById('productImage').addEventListener('input', function() {
    const imageUrl = this.value.trim();
    const previewContainer = document.getElementById('imagePreview');
    const previewImg = previewContainer.querySelector('img');
    
    if (imageUrl) {
      previewImg.src = imageUrl;
      previewImg.onload = function() {
        previewContainer.classList.remove('d-none');
      };
      previewImg.onerror = function() {
        previewContainer.classList.add('d-none');
        showModal('URL de imagem inválida. Por favor, verifique o endereço.', 'exclamation-circle', 'text-warning');
      };
    } else {
      previewContainer.classList.add('d-none');
    }
  });
  
  // Tags system
  document.getElementById('productTags').addEventListener('input', function() {
    renderTagsFromInput(this.value);
  });
  
  // Add common tags
  document.querySelectorAll('.cyber-btn-tag').forEach(btn => {
    btn.addEventListener('click', function() {
      const tag = this.dataset.tag;
      addTag(tag);
    });
  });
  
  // Bind filter events
  document.getElementById('applyFilters').addEventListener('click', applyFilters);
  document.getElementById('clearFilters').addEventListener('click', clearFilters);
  
  // Sort buttons
  document.getElementById('sortByName').addEventListener('click', function() {
    toggleSort('nome');
  });
  
  document.getElementById('sortByStock').addEventListener('click', function() {
    toggleSort('estoque');
  });
  
  document.getElementById('sortByPrice').addEventListener('click', function() {
    toggleSort('preco');
  });
  
  // Export buttons
  document.getElementById('btnExportJSON').addEventListener('click', function() {
    exportData('json');
  });
  
  document.getElementById('btnExportCSV').addEventListener('click', function() {
    exportData('csv');
  });
  
  // Import
  document.getElementById('btnImport').addEventListener('click', function() {
    // Reset UI
    document.getElementById('fileInput').value = '';
    document.getElementById('clearBeforeImport').checked = false;
    document.getElementById('confirmImport').disabled = true;
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('importModal'));
    modal.show();
  });
  
  document.getElementById('fileInput').addEventListener('change', function() {
    document.getElementById('confirmImport').disabled = this.files.length === 0;
  });
  
  document.getElementById('confirmImport').addEventListener('click', function() {
    importData();
  });
  
  // Setup autosave
  setupAutoSave();
  
  // Initialize insights tab
  document.getElementById('insights-tab').addEventListener('shown.bs.tab', function () {
    refreshInsights();
  });
});

// Generate ID
function gerarID() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Format price
function formatarPreco(preco) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(preco);
}

// Get stock class based on quantity
function getEstoqueClass(estoque) {
  if (estoque <= 5) return 'stock-critical';
  if (estoque <= 10) return 'stock-warning';
  return 'stock-good';
}

// Show notification modal
function showModal(message, icon = 'check-circle', iconClass = '') {
  const notificationModal = new bootstrap.Modal(document.getElementById('notificationModal'));
  const notificationIcon = document.getElementById('notificationIcon');
  const notificationMessage = document.getElementById('notificationMessage');
  
  notificationIcon.className = `bi bi-${icon}-fill fs-1 ${iconClass}`;
  notificationMessage.textContent = message;
  
  notificationModal.show();
}

// Show confirmation modal
function showConfirmationModal(message, callback) {
  const confirmationModal = new bootstrap.Modal(document.getElementById('confirmationModal'));
  const confirmationMessage = document.getElementById('confirmationMessage');
  
  confirmationMessage.textContent = message;
  document.getElementById('confirmAction').onclick = function() {
    callback();
    confirmationModal.hide();
  };
  
  confirmationModal.show();
}

// Show auto-save notification
function showAutoSaveNotification() {
  const progressBar = document.createElement('div');
  progressBar.className = 'auto-save-progress';
  document.body.appendChild(progressBar);
  
  // Animate progress bar
  setTimeout(() => progressBar.style.width = '100%', 10);
  
  // Remove progress bar
  setTimeout(() => {
    progressBar.style.opacity = '0';
    setTimeout(() => progressBar.remove(), 300);
  }, 2000);
}

// Load products
function carregarProdutos() {
  if (serverMode) {
    // Carregar do backend
    fetch(`${apiUrl}/produtos`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Erro HTTP: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        produtos = data;
        renderAdmin();
        updateStats();
        refreshInsights();
        
        // Carregar logs
        return fetch(`${apiUrl}/logs`);
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Erro HTTP ao carregar logs: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        logs = data;
      })
      .catch(error => {
        console.error('Erro ao carregar dados do servidor:', error);
        showModal(`Erro ao carregar produtos: ${error.message}`, 'x-circle', 'text-danger');
      });
  } else {
    // Modo localStorage
    try {
      const produtosJSON = localStorage.getItem('produtos');
      const logsJSON = localStorage.getItem('logs');
      
      if (produtosJSON) {
        produtos = JSON.parse(produtosJSON);
      }
      
      if (logsJSON) {
        logs = JSON.parse(logsJSON);
      }
      
      renderAdmin();
      updateStats();
      refreshInsights();
    } catch (error) {
      console.error('Erro ao carregar os dados do localStorage:', error);
    }
  }
}

// Save products to localStorage
function salvarProdutos(produtos, showNotification = false) {
  try {
    localStorage.setItem('produtos', JSON.stringify(produtos));
    localStorage.setItem('logs', JSON.stringify(logs));
    
    if (showNotification) {
      showAutoSaveNotification();
    }
  } catch (error) {
    console.error('Erro ao salvar os dados:', error);
  }
}

// Update statistics
function updateStats() {
  const totalProducts = produtos.length;
  const totalValue = produtos.reduce((total, produto) => total + (produto.preco * produto.estoque), 0);
  const lowStockCount = produtos.filter(produto => produto.estoque <= 5).length;
  
  document.getElementById('totalProducts').textContent = totalProducts;
  document.getElementById('totalValue').textContent = formatarPreco(totalValue);
  document.getElementById('lowStockCount').textContent = lowStockCount;
}

// Add a new product
function adicionarProduto() {
  const nome = document.getElementById('productName').value.trim();
  const preco = parseFloat(document.getElementById('productPrice').value);
  const estoque = parseInt(document.getElementById('productStock').value);
  const imagem = document.getElementById('productImage').value.trim();
  const categoria = document.getElementById('productCategory').value;
  const tagsInput = document.getElementById('productTags').value.trim();
  const em_promocao = document.getElementById('productPromotion').checked;
  
  // Process tags
  let tags = [];
  if (tagsInput) {
    tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
  }
  
  const novoProduto = {
    id: gerarID(),
    nome,
    preco,
    estoque,
    imagem: imagem || 'https://via.placeholder.com/150?text=Sem+Imagem',
    categoria,
    tags,
    em_promocao,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  if (serverMode) {
    // Enviar para o servidor via API
    fetch(`${apiUrl}/produtos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(novoProduto)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      // Atualizar a lista e interface
      carregarProdutos();
      showModal('Produto adicionado com sucesso!');
    })
    .catch(error => {
      console.error('Erro ao adicionar produto:', error);
      showModal(`Erro ao adicionar produto: ${error.message}`, 'x-circle', 'text-danger');
    });
  } else {
    // Modo localStorage
    produtos.push(novoProduto);
    
    // Add to activity log
    registrarLog('criar', novoProduto.id, novoProduto.nome, {
      produto: novoProduto
    });
    
    salvarProdutos(produtos);
    renderAdmin();
    updateStats();
    
    showModal('Produto adicionado com sucesso!');
  }
}

// Save product (update)
function salvar(id) {
  const produtoAtual = produtos.find(p => p.id === id);
  
  if (!produtoAtual) {
    showModal('Erro ao salvar: produto não encontrado.', 'x-circle', 'text-danger');
    return;
  }
  
  const nome = document.getElementById('productName').value.trim();
  const preco = parseFloat(document.getElementById('productPrice').value);
  const estoque = parseInt(document.getElementById('productStock').value);
  const imagem = document.getElementById('productImage').value.trim();
  const categoria = document.getElementById('productCategory').value;
  const tagsInput = document.getElementById('productTags').value.trim();
  const em_promocao = document.getElementById('productPromotion').checked;
  
  // Process tags
  let tags = [];
  if (tagsInput) {
    tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
  }
  
  // Create change log details
  const mudancas = {};
  
  if (produtoAtual.nome !== nome) mudancas.nome = { antes: produtoAtual.nome, depois: nome };
  if (produtoAtual.preco !== preco) mudancas.preco = { antes: produtoAtual.preco, depois: preco };
  if (produtoAtual.estoque !== estoque) mudancas.estoque = { antes: produtoAtual.estoque, depois: estoque };
  if (produtoAtual.imagem !== imagem && imagem !== '') mudancas.imagem = { antes: produtoAtual.imagem, depois: imagem };
  if (produtoAtual.categoria !== categoria) mudancas.categoria = { antes: produtoAtual.categoria, depois: categoria };
  
  // Compare tags
  const currentTags = produtoAtual.tags || [];
  const currentTagsArray = typeof currentTags === 'string' ? JSON.parse(currentTags) : currentTags;
  
  if (JSON.stringify(currentTagsArray.sort()) !== JSON.stringify(tags.sort())) {
    mudancas.tags = { antes: currentTagsArray, depois: tags };
  }
  
  // Compare promotion status
  if (produtoAtual.em_promocao !== em_promocao) {
    mudancas.em_promocao = { antes: produtoAtual.em_promocao, depois: em_promocao };
  }
  
  if (serverMode) {
    // Prepare updated product data
    const produtoAtualizado = {
      nome: nome,
      preco: preco,
      estoque: estoque,
      categoria: categoria,
      tags: tags,
      em_promocao: em_promocao,
      updated_at: new Date().toISOString()
    };
    
    if (imagem) {
      produtoAtualizado.imagem = imagem;
    }
    
    // Send to server via API
    fetch(`${apiUrl}/produtos/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(produtoAtualizado)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      // Reload products and interface
      carregarProdutos();
      showModal('Alterações salvas com sucesso!');
    })
    .catch(error => {
      console.error('Erro ao salvar produto:', error);
      showModal(`Erro ao salvar produto: ${error.message}`, 'x-circle', 'text-danger');
    });
  } else {
    // Local storage mode
    // Update product
    produtoAtual.nome = nome;
    produtoAtual.preco = preco;
    produtoAtual.estoque = estoque;
    produtoAtual.categoria = categoria;
    produtoAtual.tags = tags;
    produtoAtual.em_promocao = em_promocao;
    if (imagem) produtoAtual.imagem = imagem;
    produtoAtual.updated_at = new Date().toISOString();
    
    // Add to activity log if there are changes
    if (Object.keys(mudancas).length > 0) {
      registrarLog('editar', produtoAtual.id, produtoAtual.nome, mudancas);
    }
    
    salvarProdutos(produtos);
    renderAdmin();
    updateStats();
    
    showModal('Alterações salvas com sucesso!');
  }
}

// Delete product
function excluirProduto(id) {
  const produtoIndex = produtos.findIndex(p => p.id === id);
  
  if (produtoIndex === -1) {
    showModal('Erro ao excluir: produto não encontrado.', 'x-circle', 'text-danger');
    return;
  }
  
  const produtoExcluido = produtos[produtoIndex];
  
  showConfirmationModal(`Tem certeza que deseja excluir o produto "${produtoExcluido.nome}"?`, function() {
    if (serverMode) {
      // Enviar para o servidor via API
      fetch(`${apiUrl}/produtos/${id}`, {
        method: 'DELETE'
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Erro HTTP: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        // Recarregar produtos e interface
        carregarProdutos();
        showModal('Produto excluído com sucesso!');
      })
      .catch(error => {
        console.error('Erro ao excluir produto:', error);
        showModal(`Erro ao excluir produto: ${error.message}`, 'x-circle', 'text-danger');
      });
    } else {
      // Add to activity log
      registrarLog('excluir', produtoExcluido.id, produtoExcluido.nome, {
        produto: produtoExcluido
      });
      
      // Remove product
      produtos.splice(produtoIndex, 1);
      
      salvarProdutos(produtos);
      renderAdmin();
      updateStats();
      
      showModal('Produto excluído com sucesso!');
    }
  });
}

// Delete all products
function apagarTudo() {
  registrarLog('limpar', 'todos', 'Todos os Produtos', {
    quantidade: produtos.length
  });
  
  produtos = [];
  
  salvarProdutos(produtos);
  renderAdmin();
  updateStats();
  
  showModal('Todos os produtos foram excluídos.', 'trash', 'text-danger');
}

// Open logs modal
function abrirLogs() {
  const logsTableBody = document.getElementById('logsTableBody');
  logsTableBody.innerHTML = '';
  
  // Sort logs - newest first
  const logsSorted = [...logs].sort((a, b) => new Date(b.data) - new Date(a.data));
  
  if (logsSorted.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="4" class="text-center">Nenhum registro de atividade encontrado.</td>`;
    logsTableBody.appendChild(row);
  } else {
    logsSorted.forEach(log => {
      const row = document.createElement('tr');
      
      const data = new Date(log.data);
      const dataFormatada = data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR');
      
      let detalhesHTML = '';
      
      if (log.tipo === 'criar') {
        detalhesHTML = 'Produto criado';
      } else if (log.tipo === 'excluir') {
        detalhesHTML = 'Produto excluído';
      } else if (log.tipo === 'limpar') {
        detalhesHTML = `${log.detalhes.quantidade} produtos excluídos`;
      } else if (log.tipo === 'editar') {
        const mudancas = [];
        
        if (log.detalhes.nome) {
          mudancas.push(`Nome: "${log.detalhes.nome.antes}" → "${log.detalhes.nome.depois}"`);
        }
        
        if (log.detalhes.preco) {
          mudancas.push(`Preço: ${formatarPreco(log.detalhes.preco.antes)} → ${formatarPreco(log.detalhes.preco.depois)}`);
        }
        
        if (log.detalhes.estoque) {
          mudancas.push(`Estoque: ${log.detalhes.estoque.antes} → ${log.detalhes.estoque.depois}`);
        }
        
        if (log.detalhes.categoria) {
          mudancas.push(`Categoria: ${log.detalhes.categoria.antes} → ${log.detalhes.categoria.depois}`);
        }
        
        if (log.detalhes.imagem) {
          mudancas.push(`Imagem atualizada`);
        }
        
        detalhesHTML = mudancas.join('<br>');
      }
      
      row.innerHTML = `
        <td>${dataFormatada}</td>
        <td>${log.nomeProduto}</td>
        <td>${getTipoLog(log.tipo)}</td>
        <td>${detalhesHTML}</td>
      `;
      
      logsTableBody.appendChild(row);
    });
  }
  
  const modal = new bootstrap.Modal(document.getElementById('logsModal'));
  modal.show();
}

// Close logs modal
function fecharLogs() {
  bootstrap.Modal.getInstance(document.getElementById('logsModal')).hide();
}

// Log type formatter
function getTipoLog(tipo) {
  switch (tipo) {
    case 'criar': return '<span class="badge bg-success">Criação</span>';
    case 'editar': return '<span class="badge bg-primary">Edição</span>';
    case 'excluir': return '<span class="badge bg-danger">Exclusão</span>';
    case 'limpar': return '<span class="badge bg-warning text-dark">Limpeza</span>';
    default: return tipo;
  }
}

// Add to activity log
function registrarLog(tipo, produtoId, nomeProduto, detalhes) {
  const log = {
    id: gerarID(),
    data: new Date().toISOString(),
    tipo,
    produtoId,
    nomeProduto,
    detalhes
  };
  
  logs.push(log);
  
  // Keep only last 100 logs
  if (logs.length > 100) {
    logs = logs.slice(-100);
  }
}

// Toggle sort order
function toggleSort(campo) {
  if (currentSortField === campo) {
    currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
  } else {
    currentSortField = campo;
    currentSortOrder = 'asc';
  }
  
  renderAdmin(document.getElementById('searchInput').value);
  
  // Update sort icons
  document.querySelectorAll('.cyber-btn-sm i').forEach(icon => {
    icon.className = icon.className.replace('-down', '-down').replace('-up', '-down');
  });
  
  const currentIcon = document.querySelector(`#sortBy${campo.charAt(0).toUpperCase() + campo.slice(1)} i`);
  if (currentIcon) {
    if (currentSortOrder === 'desc') {
      currentIcon.className = currentIcon.className.replace('-down', '-up');
    }
  }
}

// Tags management
function renderTagsFromInput(input) {
  const tagsContainer = document.getElementById('tagsContainer');
  tagsContainer.innerHTML = '';
  
  if (!input.trim()) return;
  
  const tags = input.split(',').map(t => t.trim()).filter(t => t);
  
  tags.forEach(tag => {
    const tagSpan = document.createElement('span');
    const tagClass = getTagClass(tag);
    tagSpan.className = `cyber-btn-tag ${tagClass} me-1 mb-1 active`;
    tagSpan.textContent = `#${tag}`;
    tagsContainer.appendChild(tagSpan);
  });
}

function getTagClass(tag) {
  const tagMap = {
    'ice': 'tag-ice',
    'frutado': 'tag-frutado',
    'forte': 'tag-forte',
    'tabaco': 'tag-tabaco',
    'mentolado': 'tag-mentolado'
  };
  
  return tagMap[tag.toLowerCase()] || 'tag-default';
}

function addTag(tag) {
  const tagsInput = document.getElementById('productTags');
  const currentTags = tagsInput.value.split(',').map(t => t.trim()).filter(t => t);
  
  if (!currentTags.includes(tag)) {
    currentTags.push(tag);
    tagsInput.value = currentTags.join(', ');
    renderTagsFromInput(tagsInput.value);
  }
}

// Apply filters
function applyFilters() {
  let searchTerm = document.getElementById('searchInput').value;
  let categoria = document.getElementById('filterCategory').value;
  let tagFilter = document.getElementById('filterTag').value;
  let precoMin = document.getElementById('filterPriceMin').value ? parseFloat(document.getElementById('filterPriceMin').value) : null;
  let precoMax = document.getElementById('filterPriceMax').value ? parseFloat(document.getElementById('filterPriceMax').value) : null;
  let estoqueBaixo = document.getElementById('filterLowStock').checked;
  let estoqueZero = document.getElementById('filterZeroStock').checked;
  let emPromocao = document.getElementById('filterPromotion').checked;
  
  renderAdmin(searchTerm, categoria, estoqueBaixo ? 'baixo' : '', estoqueZero ? 'zerado' : '', precoMin, precoMax, tagFilter, emPromocao);
}

function clearFilters() {
  document.getElementById('filterCategory').value = '';
  document.getElementById('filterTag').value = '';
  document.getElementById('filterPriceMin').value = '';
  document.getElementById('filterPriceMax').value = '';
  document.getElementById('filterLowStock').checked = false;
  document.getElementById('filterZeroStock').checked = false;
  document.getElementById('filterPromotion').checked = false;
  
  renderAdmin(document.getElementById('searchInput').value);
}

// Load tags
function carregarTags() {
  if (serverMode) {
    fetch(`${apiUrl}/tags`)
      .then(response => response.json())
      .then(tags => {
        populateTagsDropdown(tags);
      })
      .catch(error => {
        console.error('Erro ao carregar tags:', error);
      });
  } else {
    // Get unique tags from products in localStorage
    const allTags = [];
    produtos.forEach(produto => {
      if (produto.tags) {
        const produtoTags = typeof produto.tags === 'string' ? JSON.parse(produto.tags) : produto.tags;
        allTags.push(...produtoTags);
      }
    });
    
    // Remove duplicates
    const uniqueTags = [...new Set(allTags)];
    populateTagsDropdown(uniqueTags);
  }
}

function populateTagsDropdown(tags) {
  const tagSelect = document.getElementById('filterTag');
  
  // Clear existing options except the first one
  while (tagSelect.options.length > 1) {
    tagSelect.options.remove(1);
  }
  
  // Add tags
  tags.forEach(tag => {
    const option = document.createElement('option');
    option.value = tag;
    option.textContent = `#${tag}`;
    tagSelect.appendChild(option);
  });
}

// Insights and Charts
function initCharts() {
  // Initialize with empty data, will be populated later
  const categoriesCtx = document.getElementById('categoriesChart');
  const topStockCtx = document.getElementById('topStockChart');
  
  if (categoriesCtx) {
    window.categoriesChart = new Chart(categoriesCtx, {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [
            '#b833ff', '#00b8ff', '#33ff99', '#ff9933', '#ff3366', 
            '#8080a0', '#33ccff', '#cc0033', '#7a00cc', '#0080b3'
          ],
          borderColor: '#16213e',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#e0e0ff'
            }
          }
        }
      }
    });
  }
  
  if (topStockCtx) {
    window.topStockChart = new Chart(topStockCtx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'Quantidade em Estoque',
          data: [],
          backgroundColor: 'rgba(184, 51, 255, 0.6)',
          borderColor: '#b833ff',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: {
              color: '#8080a0'
            },
            grid: {
              color: 'rgba(128, 128, 160, 0.1)'
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: '#8080a0'
            },
            grid: {
              color: 'rgba(128, 128, 160, 0.1)'
            }
          }
        },
        plugins: {
          legend: {
            labels: {
              color: '#e0e0ff'
            }
          }
        }
      }
    });
  }
}

function refreshInsights() {
  if (window.categoriesChart && window.topStockChart) {
    // Get categories data
    const categoryCounts = {};
    produtos.forEach(produto => {
      if (!categoryCounts[produto.categoria]) {
        categoryCounts[produto.categoria] = 0;
      }
      categoryCounts[produto.categoria]++;
    });
    
    // Update categories chart
    window.categoriesChart.data.labels = Object.keys(categoryCounts);
    window.categoriesChart.data.datasets[0].data = Object.values(categoryCounts);
    window.categoriesChart.update();
    
    // Get top stock products
    const topStock = [...produtos]
      .sort((a, b) => b.estoque - a.estoque)
      .slice(0, 5);
    
    // Update top stock chart
    window.topStockChart.data.labels = topStock.map(p => p.nome);
    window.topStockChart.data.datasets[0].data = topStock.map(p => p.estoque);
    window.topStockChart.update();
    
    // Update low stock and zero stock tables
    updateStockTables();
  }
}

function updateStockTables() {
  // Zero stock table
  const zeroStockTable = document.getElementById('zeroStockTable');
  const lowStockTable = document.getElementById('lowStockTable');
  
  // Reset tables
  zeroStockTable.innerHTML = '';
  lowStockTable.innerHTML = '';
  
  // Get zero stock products
  const zeroStockProducts = produtos.filter(p => p.estoque === 0);
  
  if (zeroStockProducts.length === 0) {
    zeroStockTable.innerHTML = '<tr><td colspan="4" class="text-center">Nenhum produto com estoque zerado.</td></tr>';
  } else {
    zeroStockProducts.forEach(produto => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${produto.nome}</td>
        <td>${produto.categoria}</td>
        <td>${formatarPreco(produto.preco)}</td>
        <td>
          <button class="btn cyber-btn-sm cyber-btn-primary" onclick="editarProduto('${produto.id}')">
            <i class="bi bi-pencil"></i>
          </button>
        </td>
      `;
      zeroStockTable.appendChild(row);
    });
  }
  
  // Get low stock products (1-5)
  const lowStockProducts = produtos.filter(p => p.estoque > 0 && p.estoque <= 5);
  
  if (lowStockProducts.length === 0) {
    lowStockTable.innerHTML = '<tr><td colspan="4" class="text-center">Nenhum produto com estoque baixo.</td></tr>';
  } else {
    lowStockProducts.forEach(produto => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${produto.nome}</td>
        <td>${produto.categoria}</td>
        <td class="stock-critical">${produto.estoque}</td>
        <td>
          <button class="btn cyber-btn-sm cyber-btn-primary" onclick="editarProduto('${produto.id}')">
            <i class="bi bi-pencil"></i>
          </button>
        </td>
      `;
      lowStockTable.appendChild(row);
    });
  }
  
  // Update stats
  document.getElementById('zeroStockCount').textContent = zeroStockProducts.length;
}

// Export and Import
function exportData(format) {
  if (serverMode) {
    // Download directly from server endpoint
    window.location.href = `${apiUrl}/export?format=${format}`;
  } else {
    // Export from localStorage
    if (format === 'json') {
      downloadJSON(produtos, 'produtos.json');
    } else if (format === 'csv') {
      downloadCSV(produtos, 'produtos.csv');
    }
  }
}

function downloadJSON(data, filename) {
  const jsonString = JSON.stringify(data, null, 2);
  downloadFile(jsonString, 'application/json', filename);
}

function downloadCSV(data, filename) {
  // Create CSV header
  let csvContent = 'ID,Nome,Preço,Estoque,Categoria,Tags,Em Promoção,Imagem,Data de Criação,Última Atualização\n';
  
  // Add data rows
  data.forEach(item => {
    const tags = item.tags ? (typeof item.tags === 'string' ? item.tags : JSON.stringify(item.tags)) : '';
    
    const row = [
      item.id,
      `"${item.nome.replace(/"/g, '""')}"`,
      item.preco,
      item.estoque,
      item.categoria,
      `"${tags.replace(/"/g, '""')}"`,
      item.em_promocao ? 'Sim' : 'Não',
      `"${item.imagem || ''}"`,
      item.dataInclusao || '',
      item.ultimaAtualizacao || ''
    ];
    
    csvContent += row.join(',') + '\n';
  });
  
  downloadFile(csvContent, 'text/csv', filename);
}

function downloadFile(content, type, filename) {
  const blob = new Blob([content], { type });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function importData() {
  const fileInput = document.getElementById('fileInput');
  const clearBeforeImport = document.getElementById('clearBeforeImport').checked;
  
  if (fileInput.files.length === 0) {
    showModal('Nenhum arquivo selecionado.', 'exclamation-circle', 'text-warning');
    return;
  }
  
  const file = fileInput.files[0];
  
  if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
    showModal('Formato de arquivo inválido. Por favor, selecione um arquivo JSON.', 'x-circle', 'text-danger');
    return;
  }
  
  const reader = new FileReader();
  
  reader.onload = function(e) {
    try {
      const importedData = JSON.parse(e.target.result);
      
      if (!Array.isArray(importedData)) {
        throw new Error('O arquivo não contém um array de produtos válido.');
      }
      
      // Clear existing products if requested
      if (clearBeforeImport) {
        produtos = [];
        registrarLog('limpar', 'todos', 'Todos os Produtos', { 
          message: 'Limpeza antes da importação'
        });
      }
      
      // Check if each item has at least nome, preco and estoque
      const validItems = importedData.filter(item => 
        item.nome && (item.preco !== undefined) && (item.estoque !== undefined)
      );
      
      // Ensure each item has an ID
      validItems.forEach(item => {
        if (!item.id) {
          item.id = gerarID();
        }
        
        // Add to produtos
        const existingIndex = produtos.findIndex(p => p.id === item.id);
        
        if (existingIndex >= 0) {
          // Update existing
          produtos[existingIndex] = { ...item };
        } else {
          // Add new
          produtos.push(item);
        }
      });
      
      // Log the import
      registrarLog('importar', 'batch', 'Importação em Lote', {
        count: validItems.length
      });
      
      // Save, render and show confirmation
      salvarProdutos(produtos);
      renderAdmin();
      updateStats();
      refreshInsights();
      
      // Close the modal and show success message
      bootstrap.Modal.getInstance(document.getElementById('importModal')).hide();
      showModal(`Importados ${validItems.length} produtos com sucesso!`);
      
    } catch (error) {
      showModal(`Erro ao processar o arquivo: ${error.message}`, 'x-circle', 'text-danger');
    }
  };
  
  reader.onerror = function() {
    showModal('Erro ao ler o arquivo.', 'x-circle', 'text-danger');
  };
  
  reader.readAsText(file);
}

// Render products admin panel
function renderAdmin(filtro = "", filtroCategoria = "", filtroEstoque = "", filtroEstoqueZerado = "", 
                    precoMin = null, precoMax = null, tagFilter = "", emPromocao = false) {
  const container = document.getElementById('productsContainer');
  container.innerHTML = '';
  
  // Se não estamos no modo de servidor, carregar dos dados em memória
  if (!serverMode) {
    let produtosFiltrados = [...produtos];
    
    // Apply search filter
    if (filtro) {
      const termoBusca = filtro.toLowerCase();
      produtosFiltrados = produtosFiltrados.filter(produto => 
        produto.nome.toLowerCase().includes(termoBusca) || 
        produto.categoria.toLowerCase().includes(termoBusca)
      );
    }
    
    // Apply category filter
    if (filtroCategoria) {
      produtosFiltrados = produtosFiltrados.filter(produto => 
        produto.categoria === filtroCategoria
      );
    }
    
    // Apply stock level filters
    if (filtroEstoque === 'baixo') {
      produtosFiltrados = produtosFiltrados.filter(produto => produto.estoque > 0 && produto.estoque <= 5);
    }
    
    if (filtroEstoqueZerado === 'zerado') {
      produtosFiltrados = produtosFiltrados.filter(produto => produto.estoque === 0);
    }
    
    // Apply price range filter
    if (precoMin !== null) {
      produtosFiltrados = produtosFiltrados.filter(produto => produto.preco >= precoMin);
    }
    
    if (precoMax !== null) {
      produtosFiltrados = produtosFiltrados.filter(produto => produto.preco <= precoMax);
    }
    
    // Apply tag filter
    if (tagFilter) {
      produtosFiltrados = produtosFiltrados.filter(produto => {
        if (!produto.tags) return false;
        const tags = typeof produto.tags === 'string' ? JSON.parse(produto.tags) : produto.tags;
        return tags.includes(tagFilter);
      });
    }
    
    // Apply promotion filter
    if (emPromocao) {
      produtosFiltrados = produtosFiltrados.filter(produto => produto.em_promocao === true);
    }
    
    // Sort products
    produtosFiltrados.sort((a, b) => {
      let valorA, valorB;
      
      if (currentSortField === 'nome') {
        valorA = a.nome.toLowerCase();
        valorB = b.nome.toLowerCase();
      } else if (currentSortField === 'preco') {
        valorA = a.preco;
        valorB = b.preco;
      } else if (currentSortField === 'estoque') {
        valorA = a.estoque;
        valorB = b.estoque;
      } else {
        valorA = a[currentSortField];
        valorB = b[currentSortField];
      }
      
      if (currentSortOrder === 'asc') {
        return valorA > valorB ? 1 : -1;
      } else {
        return valorA < valorB ? 1 : -1;
      }
    });
  
    renderProdutos(produtosFiltrados, container);
  } else {
    // Modo Servidor - carregar da API com filtros
    // Construir URL com os filtros
    const params = new URLSearchParams();
    
    if (filtro) params.set('search', filtro);
    if (filtroCategoria) params.set('categoria', filtroCategoria);
    if (filtroEstoque === 'baixo') params.set('estoque_baixo', 'true');
    if (filtroEstoqueZerado === 'zerado') params.set('estoque_zerado', 'true');
    if (precoMin !== null) params.set('preco_min', precoMin);
    if (precoMax !== null) params.set('preco_max', precoMax);
    if (tagFilter) params.set('tag', tagFilter);
    if (emPromocao) params.set('em_promocao', 'true');
    
    params.set('sort_field', currentSortField);
    params.set('sort_order', currentSortOrder);
    
    // Mostrar indicador de carregamento
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Carregando...</span>
        </div>
        <p class="mt-2 text-muted">Carregando produtos...</p>
      </div>
    `;
    
    // Buscar dados da API
    fetch(`${apiUrl}/produtos?${params.toString()}`)
      .then(response => response.json())
      .then(data => {
        // Atualizar variável local de produtos
        produtos = data;
        // Atualizar estatísticas
        updateStats();
        // Renderizar os produtos
        renderProdutos(data, container);
      })
      .catch(error => {
        console.error('Erro ao carregar produtos:', error);
        container.innerHTML = `
          <div class="col-12 text-center py-5">
            <i class="bi bi-exclamation-triangle text-danger" style="font-size: 3rem;"></i>
            <p class="mt-3 text-danger">Erro ao carregar produtos.</p>
            <p class="text-muted">Detalhes: ${error.message}</p>
          </div>
        `;
      });
  }
}

// Função auxiliar para renderizar produtos no contêiner
function renderProdutos(produtosFiltrados, container) {
  // Display results
  if (produtosFiltrados.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-search text-muted" style="font-size: 3rem;"></i>
        <p class="mt-3 text-muted">Nenhum produto encontrado.</p>
        <p class="text-muted">Tente uma busca diferente ou limpe os filtros.</p>
      </div>
    `;
  } else {
    container.innerHTML = ''; // Limpar o container
    
    produtosFiltrados.forEach(produto => {
      const col = document.createElement('div');
      col.className = 'col-12 col-sm-6 col-md-4 col-lg-3 mb-4 fade-in';
      
      const estoqueClass = getEstoqueClass(produto.estoque);
      
      // Preparar tags para exibição
      let tagsHTML = '';
      if (produto.tags) {
        try {
          // Garantir que as tags sejam array
          const tagsArray = typeof produto.tags === 'string' ? JSON.parse(produto.tags) : produto.tags;
          
          if (Array.isArray(tagsArray) && tagsArray.length > 0) {
            tagsHTML = '<div class="product-tags mt-2">';
            tagsArray.forEach(tag => {
              const tagClass = getTagClass(tag);
              tagsHTML += `<span class="product-tag ${tagClass}">#${tag}</span>`;
            });
            tagsHTML += '</div>';
          }
        } catch (e) {
          console.error('Erro ao processar tags:', e);
        }
      }
      
      // Adicionar badge de promoção se aplicável
      const promocaoBadge = produto.em_promocao ? 
        '<div class="product-promotion-badge"><i class="bi bi-tag-fill"></i> Promoção</div>' : '';
      
      col.innerHTML = `
        <div class="product-card">
          ${promocaoBadge}
          <div class="product-img-container">
            <img src="${produto.imagem || 'https://via.placeholder.com/150?text=Sem+Imagem'}" class="product-img" alt="${produto.nome}">
          </div>
          <div class="product-content">
            <div class="product-category">${produto.categoria}</div>
            <h5 class="product-title">${produto.nome}</h5>
            <div class="product-price">${formatarPreco(produto.preco)}</div>
            <div class="product-stock ${estoqueClass}">
              <i class="bi bi-box"></i> Estoque: ${produto.estoque}
            </div>
            ${tagsHTML}
            <div class="product-actions">
              <button class="btn cyber-btn-sm cyber-btn-primary me-2" onclick="editarProduto('${produto.id}')">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn cyber-btn-sm cyber-btn-danger" onclick="excluirProduto('${produto.id}')">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>
      `;
      
      container.appendChild(col);
    });
  }
}

// Edit product - open modal with product data
window.editarProduto = function(id) {
  const produto = produtos.find(p => p.id === id);
  
  if (!produto) {
    showModal('Erro ao editar: produto não encontrado.', 'x-circle', 'text-danger');
    return;
  }
  
  document.getElementById('modalTitle').textContent = 'Editar Produto';
  document.getElementById('productId').value = produto.id;
  document.getElementById('productName').value = produto.nome;
  document.getElementById('productPrice').value = produto.preco;
  document.getElementById('productStock').value = produto.estoque;
  document.getElementById('productImage').value = produto.imagem || '';
  document.getElementById('productCategory').value = produto.categoria;
  
  // Handle tags
  const tagsInput = document.getElementById('productTags');
  const tagsContainer = document.getElementById('tagsContainer');
  tagsContainer.innerHTML = '';
  
  if (produto.tags) {
    let tags = produto.tags;
    // Convert to array if stored as string
    if (typeof tags === 'string') {
      try {
        tags = JSON.parse(tags);
      } catch (e) {
        console.error('Erro ao processar tags:', e);
        tags = [];
      }
    }
    
    if (Array.isArray(tags)) {
      tagsInput.value = tags.join(', ');
      renderTagsFromInput(tagsInput.value);
    } else {
      tagsInput.value = '';
    }
  } else {
    tagsInput.value = '';
  }
  
  // Handle promotion flag
  document.getElementById('productPromotion').checked = produto.em_promocao || false;
  
  // Image preview
  const previewContainer = document.getElementById('imagePreview');
  const previewImg = previewContainer.querySelector('img');
  
  if (produto.imagem) {
    previewImg.src = produto.imagem;
    previewContainer.classList.remove('d-none');
  } else {
    previewContainer.classList.add('d-none');
  }
  
  const modal = new bootstrap.Modal(document.getElementById('productModal'));
  modal.show();
};

// Setup auto save
function setupAutoSave() {
  window.addEventListener('beforeunload', function() {
    salvarProdutos(produtos);
  });
  
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
  }
  
  autoSaveTimeout = setTimeout(function autoSave() {
    salvarProdutos(produtos, true);
    autoSaveTimeout = setTimeout(autoSave, 60000); // Auto save every minute
  }, 60000);
}

// Apply filters from UI
function applyFilters() {
  const searchTerm = document.getElementById('searchInput').value;
  const categoryFilter = document.querySelector('input[name="categoryFilter"]:checked')?.value || '';
  const stockFilter = document.querySelector('input[name="stockFilter"]:checked')?.value || '';
  
  renderAdmin(searchTerm, categoryFilter, stockFilter);
}

// Funções para notificações de estoque baixo
function verificarEstoqueBaixo() {
  // Limpar notificações antigas da memória (mais de 1 hora)
  const umaHoraAtras = new Date();
  umaHoraAtras.setHours(umaHoraAtras.getHours() - 1);
  
  notificacoesExibidas = notificacoesExibidas.filter(n => 
    new Date(n.data) > umaHoraAtras
  );
  
  // Obter produtos com estoque baixo ou crítico
  const produtosEstoqueCritico = produtos.filter(p => 
    p.estoque === ESTOQUE_CRITICO && 
    !notificacoesExibidas.some(n => n.id === p.id && n.tipo === 'critico')
  );
  
  const produtosEstoqueBaixo = produtos.filter(p => 
    p.estoque > ESTOQUE_CRITICO && 
    p.estoque <= ESTOQUE_BAIXO && 
    !notificacoesExibidas.some(n => n.id === p.id && n.tipo === 'baixo')
  );
  
  // Exibir notificações críticas primeiro
  produtosEstoqueCritico.forEach(produto => {
    exibirNotificacaoEstoque(produto, 'critico');
  });
  
  // Depois exibir outras notificações de estoque baixo
  setTimeout(() => {
    produtosEstoqueBaixo.forEach((produto, index) => {
      setTimeout(() => {
        exibirNotificacaoEstoque(produto, 'baixo');
      }, index * 800); // Exibir com atraso entre cada notificação
    });
  }, produtosEstoqueCritico.length ? 800 : 0);
}

function exibirNotificacaoEstoque(produto, tipo) {
  const container = document.getElementById('notificationContainer');
  const notification = document.createElement('div');
  notification.className = `stock-notification ${tipo === 'critico' ? 'critical' : 'warning'}`;
  
  let mensagem = '';
  let titulo = '';
  
  if (tipo === 'critico') {
    titulo = 'Estoque Zero!';
    mensagem = `O produto "${produto.nome}" está com estoque zerado. É necessário fazer um pedido imediatamente.`;
  } else {
    titulo = 'Estoque Baixo';
    mensagem = `O produto "${produto.nome}" está com apenas ${produto.estoque} unidades em estoque.`;
  }
  
  notification.innerHTML = `
    <div class="stock-notification-header">
      <h5 class="stock-notification-title">${titulo}</h5>
      <button type="button" class="stock-notification-close" aria-label="Fechar">
        <i class="bi bi-x"></i>
      </button>
    </div>
    <div class="stock-notification-content">${mensagem}</div>
    <div class="stock-notification-action">
      <button class="stock-notification-btn view-product" data-id="${produto.id}">
        Ver Produto
      </button>
    </div>
  `;
  
  // Registrar na lista de notificações exibidas
  notificacoesExibidas.push({
    id: produto.id,
    tipo: tipo,
    data: new Date().toISOString()
  });
  
  // Adicionar ao contêiner de notificações
  container.appendChild(notification);
  
  // Mostrar com um pequeno atraso para animar
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  // Configurar botão de fechar
  notification.querySelector('.stock-notification-close').addEventListener('click', () => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  });
  
  // Configurar botão de ver produto
  notification.querySelector('.view-product').addEventListener('click', () => {
    // Fechar notificação
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
    
    // Abrir modal de edição do produto
    editarProduto(produto.id);
  });
  
  // Auto-remover após 10 segundos para notificações não críticas
  if (tipo !== 'critico') {
    setTimeout(() => {
      if (notification.parentNode) {
        notification.classList.remove('show');
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 300);
      }
    }, 10000);
  }
}