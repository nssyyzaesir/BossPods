// Global variables
let produtos = [];
let logs = [];
let autoSaveTimeout;
let currentSortField = 'nome';
let currentSortOrder = 'asc';

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
  // Load products from localStorage
  carregarProdutos();
  
  // Setup event listeners
  document.getElementById('btnAddProduct').addEventListener('click', function() {
    document.getElementById('modalTitle').textContent = 'Adicionar Produto';
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('imagePreview').classList.add('d-none');
    
    const modal = new bootstrap.Modal(document.getElementById('productModal'));
    modal.show();
  });
  
  document.getElementById('btnViewLogs').addEventListener('click', abrirLogs);
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
  
  // Setup autosave
  setupAutoSave();
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

// Load products from localStorage
function carregarProdutos() {
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
  } catch (error) {
    console.error('Erro ao carregar os dados:', error);
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
  
  const novoProduto = {
    id: gerarID(),
    nome,
    preco,
    estoque,
    imagem: imagem || 'https://via.placeholder.com/150?text=Sem+Imagem',
    categoria,
    dataInclusao: new Date().toISOString()
  };
  
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
  
  // Create change log details
  const mudancas = {};
  
  if (produtoAtual.nome !== nome) mudancas.nome = { antes: produtoAtual.nome, depois: nome };
  if (produtoAtual.preco !== preco) mudancas.preco = { antes: produtoAtual.preco, depois: preco };
  if (produtoAtual.estoque !== estoque) mudancas.estoque = { antes: produtoAtual.estoque, depois: estoque };
  if (produtoAtual.imagem !== imagem && imagem !== '') mudancas.imagem = { antes: produtoAtual.imagem, depois: imagem };
  if (produtoAtual.categoria !== categoria) mudancas.categoria = { antes: produtoAtual.categoria, depois: categoria };
  
  // Update product
  produtoAtual.nome = nome;
  produtoAtual.preco = preco;
  produtoAtual.estoque = estoque;
  produtoAtual.categoria = categoria;
  if (imagem) produtoAtual.imagem = imagem;
  produtoAtual.ultimaAtualizacao = new Date().toISOString();
  
  // Add to activity log if there are changes
  if (Object.keys(mudancas).length > 0) {
    registrarLog('editar', produtoAtual.id, produtoAtual.nome, mudancas);
  }
  
  salvarProdutos(produtos);
  renderAdmin();
  updateStats();
  
  showModal('Alterações salvas com sucesso!');
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

// Render products admin panel
function renderAdmin(filtro = "", filtroCategoria = "", filtroEstoque = "", ordenacao = "nome-asc") {
  const container = document.getElementById('productsContainer');
  container.innerHTML = '';
  
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
  
  // Apply stock filter
  if (filtroEstoque === 'baixo') {
    produtosFiltrados = produtosFiltrados.filter(produto => produto.estoque <= 5);
  } else if (filtroEstoque === 'médio') {
    produtosFiltrados = produtosFiltrados.filter(produto => produto.estoque > 5 && produto.estoque <= 20);
  } else if (filtroEstoque === 'alto') {
    produtosFiltrados = produtosFiltrados.filter(produto => produto.estoque > 20);
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
  
  // Display results
  if (produtosFiltrados.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-search text-muted" style="font-size: 3rem;"></i>
        <p class="mt-3 text-muted">Nenhum produto encontrado.</p>
        ${filtro ? `<p class="text-muted">Tente uma busca diferente.</p>` : ''}
      </div>
    `;
  } else {
    produtosFiltrados.forEach(produto => {
      const col = document.createElement('div');
      col.className = 'col-12 col-sm-6 col-md-4 col-lg-3 mb-4 fade-in';
      
      const estoqueClass = getEstoqueClass(produto.estoque);
      
      col.innerHTML = `
        <div class="product-card">
          <div class="product-img-container">
            <img src="${produto.imagem}" class="product-img" alt="${produto.nome}">
          </div>
          <div class="product-content">
            <div class="product-category">${produto.categoria}</div>
            <h3 class="product-title">${produto.nome}</h3>
            <div class="product-price">${formatarPreco(produto.preco)}</div>
            <div class="product-stock ${estoqueClass}">
              <i class="bi bi-box-seam"></i> Estoque: <strong>${produto.estoque}</strong>
            </div>
            <div class="product-actions">
              <button class="btn cyber-btn cyber-btn-primary" onclick="editarProduto('${produto.id}')">
                <i class="bi bi-pencil"></i> Editar
              </button>
              <button class="btn cyber-btn cyber-btn-danger" onclick="excluirProduto('${produto.id}')">
                <i class="bi bi-trash"></i> Excluir
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
  document.getElementById('productImage').value = produto.imagem;
  document.getElementById('productCategory').value = produto.categoria;
  
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