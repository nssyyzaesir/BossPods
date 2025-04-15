// Utility functions
function gerarID() {
  return '_' + Math.random().toString(36).substr(2, 9);
}

function formatarPreco(preco) {
  return parseFloat(preco).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function getEstoqueClass(estoque) {
  if (estoque <= 0) return 'zerado';
  if (estoque <= 5) return 'baixo';
  if (estoque <= 15) return 'medio';
  return 'alto';
}

function showModal(message, icon = 'check-circle', iconClass = '') {
  const modal = document.getElementById("modal");
  const modalMessage = document.getElementById("modal-message");
  const modalIcon = modal.querySelector(".modal-icon");
  
  modalMessage.textContent = message;
  modalIcon.className = `fas fa-${icon} modal-icon ${iconClass}`;
  
  modal.classList.add('active');
  
  setTimeout(() => {
    modal.classList.remove('active');
  }, 2000);
}

function showConfirmationModal(message, callback) {
  const modal = document.getElementById("confirmation-modal");
  const confirmMessage = document.getElementById("confirmation-message");
  const btnYes = document.getElementById("confirm-yes");
  const btnNo = document.getElementById("confirm-no");
  
  confirmMessage.textContent = message;
  modal.classList.add('active');
  
  btnYes.onclick = () => {
    modal.classList.remove('active');
    callback(true);
  };
  
  btnNo.onclick = () => {
    modal.classList.remove('active');
    callback(false);
  };
}

function showAutoSaveNotification() {
  const notification = document.getElementById("autoSaveNotification");
  notification.classList.add('visible');
  
  setTimeout(() => {
    notification.classList.remove('visible');
  }, 3000);
}

// Storage functions
function carregarProdutos() {
  return JSON.parse(localStorage.getItem("produtos")) || [];
}

function salvarProdutos(produtos, showNotification = false) {
  localStorage.setItem("produtos", JSON.stringify(produtos));
  updateStats();
  
  if (showNotification) {
    showAutoSaveNotification();
  }
}

function updateStats() {
  const produtos = carregarProdutos();
  const total = produtos.length;
  const baixoEstoque = produtos.filter(p => p.estoque > 0 && p.estoque <= 5).length;
  
  document.getElementById('total-produtos').textContent = total;
  document.getElementById('estoque-baixo').textContent = baixoEstoque;
}

// Product management functions
function adicionarProduto() {
  const produtos = carregarProdutos();
  produtos.push({
    id: gerarID(),
    nome: "Novo Pod",
    preco: 0,
    estoque: 0,
    categoria: "Pod",
    imagem: "https://via.placeholder.com/300x200?text=Novo+Pod"
  });
  salvarProdutos(produtos);
  renderAdmin();
  
  // Scroll to the newly added product
  setTimeout(() => {
    const container = document.getElementById('admin-container');
    container.lastElementChild.scrollIntoView({ behavior: 'smooth' });
  }, 100);
}

function salvar(id) {
  const produtos = carregarProdutos();
  const index = produtos.findIndex(p => p.id === id);
  
  if (index === -1) {
    const errorBtn = document.querySelector(`button[onclick="salvar('${id}')"]`);
    errorBtn.classList.add('shake');
    setTimeout(() => errorBtn.classList.remove('shake'), 500);
    showModal("Erro: Produto não encontrado!", "exclamation-triangle", "warning");
    return;
  }
  
  const produto = produtos[index];
  
  let alteracoes = [];
  let camposAlterados = [];

  // Get form values
  const nomeEl = document.getElementById(`nome-${id}`);
  const precoEl = document.getElementById(`preco-${id}`);
  const estoqueEl = document.getElementById(`estoque-${id}`);
  const categoriaEl = document.getElementById(`categoria-${id}`);
  const imagemEl = document.getElementById(`imagem-${id}`);
  
  const nomeNovo = nomeEl.value.trim();
  const precoNovo = parseFloat(precoEl.value);
  const estoqueNovo = parseInt(estoqueEl.value);
  const categoriaNova = categoriaEl.value;
  const imagemNova = imagemEl.value.trim();
  
  // Validate form
  if (!nomeNovo) {
    nomeEl.classList.add('shake');
    setTimeout(() => nomeEl.classList.remove('shake'), 500);
    showModal("Erro: Nome do produto é obrigatório!", "exclamation-triangle", "warning");
    return;
  }
  
  if (isNaN(precoNovo) || precoNovo < 0) {
    precoEl.classList.add('shake');
    setTimeout(() => precoEl.classList.remove('shake'), 500);
    showModal("Erro: Preço inválido!", "exclamation-triangle", "warning");
    return;
  }
  
  if (isNaN(estoqueNovo) || estoqueNovo < 0) {
    estoqueEl.classList.add('shake');
    setTimeout(() => estoqueEl.classList.remove('shake'), 500);
    showModal("Erro: Estoque inválido!", "exclamation-triangle", "warning");
    return;
  }
  
  // Track changes
  if (produto.nome !== nomeNovo) {
    alteracoes.push(`Nome: "${produto.nome}" → "${nomeNovo}"`);
    produto.nome = nomeNovo;
    camposAlterados.push('nome');
  }

  if (produto.preco !== precoNovo) {
    alteracoes.push(`Preço: ${formatarPreco(produto.preco)} → ${formatarPreco(precoNovo)}`);
    produto.preco = precoNovo;
    camposAlterados.push('preco');
  }

  if (produto.estoque !== estoqueNovo) {
    alteracoes.push(`Estoque: ${produto.estoque} → ${estoqueNovo}`);
    produto.estoque = estoqueNovo;
    camposAlterados.push('estoque');
  }
  
  if (!produto.categoria || produto.categoria !== categoriaNova) {
    alteracoes.push(`Categoria: "${produto.categoria || 'Não definida'}" → "${categoriaNova}"`);
    produto.categoria = categoriaNova;
    camposAlterados.push('categoria');
  }

  if (produto.imagem !== imagemNova) {
    alteracoes.push(`Imagem URL alterada`);
    produto.imagem = imagemNova;
    camposAlterados.push('imagem');
  }

  salvarProdutos(produtos);

  // Log changes
  if (alteracoes.length > 0) {
    const logs = JSON.parse(localStorage.getItem("logs") || "[]");
    const agora = new Date().toLocaleString("pt-BR");
    logs.unshift({
      id,
      timestamp: agora,
      produto: produto.nome,
      alteracoes: alteracoes
    });
    
    // Limit log size to 100 entries
    if (logs.length > 100) logs.splice(100);
    
    localStorage.setItem("logs", JSON.stringify(logs));
    
    // Highlight changed fields
    camposAlterados.forEach(campo => {
      const el = document.getElementById(`${campo}-${id}`);
      if (el) {
        el.classList.add('highlighted');
        setTimeout(() => el.classList.remove('highlighted'), 2000);
      }
    });
  }

  showModal("Alterações salvas com sucesso!");
}

function excluirProduto(id) {
  const produtos = carregarProdutos();
  const produto = produtos.find(p => p.id === id);
  
  if (!produto) return;
  
  showConfirmationModal(`Tem certeza que deseja excluir o produto "${produto.nome}"?`, (confirmed) => {
    if (confirmed) {
      const produtosAtualizados = produtos.filter(p => p.id !== id);
      
      // Add to logs
      const logs = JSON.parse(localStorage.getItem("logs") || "[]");
      const agora = new Date().toLocaleString("pt-BR");
      logs.unshift({
        id: gerarID(),
        timestamp: agora,
        produto: produto.nome,
        alteracoes: [`Produto excluído`]
      });
      localStorage.setItem("logs", JSON.stringify(logs));
      
      // Fade out animation before removal
      const card = document.querySelector(`.produto[data-id="${id}"]`);
      if (card) {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9)';
        setTimeout(() => {
          salvarProdutos(produtosAtualizados);
          renderAdmin();
        }, 300);
      } else {
        salvarProdutos(produtosAtualizados);
        renderAdmin();
      }
    }
  });
}

function apagarTudo() {
  const produtos = carregarProdutos();
  if (produtos.length === 0) {
    showModal("Não há produtos para apagar!", "info-circle");
    return;
  }
  
  showConfirmationModal("Tem certeza que quer apagar todos os produtos? Essa ação não pode ser desfeita!", (confirmed) => {
    if (confirmed) {
      // Add to logs
      const logs = JSON.parse(localStorage.getItem("logs") || "[]");
      const agora = new Date().toLocaleString("pt-BR");
      logs.unshift({
        id: gerarID(),
        timestamp: agora,
        produto: "SISTEMA",
        alteracoes: [`Todos os produtos foram removidos (${produtos.length} produtos apagados)`]
      });
      localStorage.setItem("logs", JSON.stringify(logs));
      
      localStorage.removeItem("produtos");
      renderAdmin();
      showModal("Todos os produtos foram apagados!");
    }
  });
}

// Log functions
function abrirLogs() {
  const logs = JSON.parse(localStorage.getItem("logs") || "[]");
  const container = document.getElementById("logList");
  
  if (logs.length === 0) {
    container.innerHTML = "<p>Nenhum log encontrado.</p>";
  } else {
    container.innerHTML = logs.map(log => `
      <div class="log-item">
        <span class="log-timestamp">${log.timestamp}</span>
        <span class="log-product">${log.produto}</span>
        <ul class="log-changes">
          ${log.alteracoes.map(alt => `<li>${alt}</li>`).join('')}
        </ul>
      </div>
    `).join('');
  }
  
  document.getElementById("logModal").classList.add('active');
}

function fecharLogs() {
  document.getElementById("logModal").classList.remove('active');
}

// Render functions
function renderAdmin(filtro = "", filtroCategoria = "", filtroEstoque = "", ordenacao = "nome-asc") {
  const produtos = carregarProdutos();
  const container = document.getElementById("admin-container");
  container.innerHTML = "";
  
  // Apply filters
  let produtosFiltrados = produtos.filter(prod => {
    // Text search filter
    const matchesText = prod.nome.toLowerCase().includes(filtro.toLowerCase());
    
    // Category filter
    const matchesCategoria = !filtroCategoria || prod.categoria === filtroCategoria;
    
    // Stock filter
    let matchesEstoque = true;
    if (filtroEstoque === "baixo") {
      matchesEstoque = prod.estoque > 0 && prod.estoque <= 5;
    } else if (filtroEstoque === "medio") {
      matchesEstoque = prod.estoque > 5 && prod.estoque <= 15;
    } else if (filtroEstoque === "alto") {
      matchesEstoque = prod.estoque > 15;
    } else if (filtroEstoque === "zerado") {
      matchesEstoque = prod.estoque <= 0;
    }
    
    return matchesText && matchesCategoria && matchesEstoque;
  });
  
  // Apply sorting
  produtosFiltrados.sort((a, b) => {
    switch (ordenacao) {
      case "nome-asc":
        return a.nome.localeCompare(b.nome);
      case "nome-desc":
        return b.nome.localeCompare(a.nome);
      case "preco-asc":
        return a.preco - b.preco;
      case "preco-desc":
        return b.preco - a.preco;
      case "estoque-asc":
        return a.estoque - b.estoque;
      case "estoque-desc":
        return b.estoque - a.estoque;
      default:
        return 0;
    }
  });
  
  // Render products with staggered animation
  produtosFiltrados.forEach((prod, index) => {
    const id = prod.id;
    const estoqueClass = getEstoqueClass(prod.estoque);
    
    const div = document.createElement("div");
    div.className = `produto estoque-${estoqueClass}`;
    div.dataset.id = id;
    div.style.animationDelay = `${index * 0.05}s`;
    
    // Badge text based on stock level
    let badgeText = "";
    if (estoqueClass === "zerado") badgeText = "Sem estoque";
    else if (estoqueClass === "baixo") badgeText = "Estoque baixo";
    else if (estoqueClass === "medio") badgeText = "Estoque médio";
    else badgeText = "Estoque alto";
    
    div.innerHTML = `
      <span class="estoque-badge badge-${estoqueClass}">${badgeText}</span>
      <label for="nome-${id}">Nome:</label>
      <input type="text" id="nome-${id}" value="${prod.nome}">
      
      <label for="categoria-${id}">Categoria:</label>
      <select id="categoria-${id}">
        <option value="Pod" ${prod.categoria === "Pod" ? "selected" : ""}>Pod</option>
        <option value="Acessório" ${prod.categoria === "Acessório" ? "selected" : ""}>Acessório</option>
        <option value="Essência" ${prod.categoria === "Essência" ? "selected" : ""}>Essência</option>
        <option value="Outro" ${prod.categoria === "Outro" ? "selected" : ""}>Outro</option>
      </select>
      
      <label for="preco-${id}">Preço:</label>
      <input type="number" id="preco-${id}" value="${prod.preco}" step="0.01" min="0">
      
      <label for="estoque-${id}">Estoque:</label>
      <input type="number" id="estoque-${id}" value="${prod.estoque}" min="0">
      
      <label for="imagem-${id}">Imagem (URL):</label>
      <input type="text" id="imagem-${id}" value="${prod.imagem}" oninput="document.getElementById('preview-${id}').src = this.value">
      
      <img id="preview-${id}" src="${prod.imagem}" alt="${prod.nome}">
      
      <div class="produto-buttons">
        <button class="btn-salvar" onclick="salvar('${id}')"><i class="fas fa-save"></i> Salvar Alterações</button>
        <button class="btn-remover" onclick="excluirProduto('${id}')"><i class="fas fa-trash-alt"></i> Excluir Produto</button>
      </div>
    `;
    
    container.appendChild(div);
  });
  
  // Show message if no products found
  if (produtosFiltrados.length === 0) {
    const emptyMessage = document.createElement("div");
    emptyMessage.style.gridColumn = "1 / -1";
    emptyMessage.style.textAlign = "center";
    emptyMessage.style.padding = "50px 20px";
    emptyMessage.style.color = "#aaa";
    
    if (produtos.length === 0) {
      emptyMessage.innerHTML = `
        <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 15px; color: #555;"></i>
        <h3>Nenhum produto cadastrado</h3>
        <p>Clique em "+ Novo Produto" para começar a adicionar produtos.</p>
      `;
    } else {
      emptyMessage.innerHTML = `
        <i class="fas fa-filter" style="font-size: 3rem; margin-bottom: 15px; color: #555;"></i>
        <h3>Nenhum produto encontrado</h3>
        <p>Tente ajustar seus filtros de busca.</p>
      `;
    }
    
    container.appendChild(emptyMessage);
  }
  
  updateStats();
}

// Auto-save functionality
let autoSaveTimer;
function setupAutoSave() {
  const inputs = document.querySelectorAll('input, select');
  
  inputs.forEach(input => {
    input.addEventListener('change', () => {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(() => {
        const produtos = carregarProdutos();
        const updatedProdutos = [];
        
        produtos.forEach(prod => {
          const id = prod.id;
          const nomeEl = document.getElementById(`nome-${id}`);
          const precoEl = document.getElementById(`preco-${id}`);
          const estoqueEl = document.getElementById(`estoque-${id}`);
          const categoriaEl = document.getElementById(`categoria-${id}`);
          const imagemEl = document.getElementById(`imagem-${id}`);
          
          if (nomeEl && precoEl && estoqueEl && categoriaEl && imagemEl) {
            updatedProdutos.push({
              ...prod,
              nome: nomeEl.value.trim(),
              preco: parseFloat(precoEl.value) || 0,
              estoque: parseInt(estoqueEl.value) || 0,
              categoria: categoriaEl.value,
              imagem: imagemEl.value.trim()
            });
          } else {
            updatedProdutos.push(prod);
          }
        });
        
        salvarProdutos(updatedProdutos, true);
      }, 120000); // 2 minutes
    });
  });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Initialize default products if none exist
  if (!localStorage.getItem("produtos")) {
    const produtosDefault = [
      { 
        id: gerarID(), 
        nome: "Pod Uva", 
        preco: 55.9, 
        estoque: 5, 
        categoria: "Pod",
        imagem: "https://via.placeholder.com/300x200?text=Uva" 
      },
      { 
        id: gerarID(), 
        nome: "Pod Menta", 
        preco: 59.9, 
        estoque: 12, 
        categoria: "Pod",
        imagem: "https://via.placeholder.com/300x200?text=Menta" 
      },
      { 
        id: gerarID(), 
        nome: "Carregador USB", 
        preco: 29.9, 
        estoque: 20, 
        categoria: "Acessório",
        imagem: "https://via.placeholder.com/300x200?text=Carregador" 
      }
    ];
    salvarProdutos(produtosDefault);
  }
  
  // Render initial state
  renderAdmin();
  
  // Setup search filters
  document.getElementById("pesquisaNome").addEventListener("input", (e) => {
    applyFilters();
  });
  
  document.getElementById("filtroCategoria").addEventListener("change", (e) => {
    applyFilters();
  });
  
  document.getElementById("filtroEstoque").addEventListener("change", (e) => {
    applyFilters();
  });
  
  document.getElementById("ordenacao").addEventListener("change", (e) => {
    applyFilters();
  });
  
  // Setup auto-save
  setupAutoSave();
  
  // Close modals when clicking outside
  window.addEventListener('click', (e) => {
    const modal = document.getElementById('modal');
    const logModal = document.getElementById('logModal');
    const confirmationModal = document.getElementById('confirmation-modal');
    
    if (e.target === modal) {
      modal.classList.remove('active');
    }
    
    if (e.target === logModal) {
      logModal.classList.remove('active');
    }
    
    if (e.target === confirmationModal) {
      confirmationModal.classList.remove('active');
    }
  });
});

function applyFilters() {
  const textFilter = document.getElementById("pesquisaNome").value;
  const categoryFilter = document.getElementById("filtroCategoria").value;
  const stockFilter = document.getElementById("filtroEstoque").value;
  const sortOrder = document.getElementById("ordenacao").value;
  
  renderAdmin(textFilter, categoryFilter, stockFilter, sortOrder);
}
