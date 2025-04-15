// Global variables
let produtos = [];
let carrinho = [];
let serverMode = true;
const apiUrl = '/api';

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
  // Carregar produtos da API
  carregarProdutos();
  carregarCategorias();
  
  // Carregar carrinho do localStorage
  carregarCarrinho();
  
  // Eventos
  document.getElementById('searchInput').addEventListener('input', filtrarProdutos);
  document.getElementById('sortSelect').addEventListener('change', ordenarProdutos);
  
  // Admin link
  document.getElementById('adminLink').addEventListener('click', function(e) {
    e.preventDefault();
    window.location.href = '/admin';
  });
  
  // Eventos do modal de detalhes do produto
  document.getElementById('decreaseQty').addEventListener('click', function() {
    const qtyInput = document.getElementById('productQuantity');
    if (parseInt(qtyInput.value) > 1) {
      qtyInput.value = parseInt(qtyInput.value) - 1;
    }
  });
  
  document.getElementById('increaseQty').addEventListener('click', function() {
    const qtyInput = document.getElementById('productQuantity');
    qtyInput.value = parseInt(qtyInput.value) + 1;
  });
  
  document.getElementById('addToCartBtn').addEventListener('click', function() {
    const produtoId = this.getAttribute('data-id');
    const produto = produtos.find(p => p.id == produtoId);
    const quantidade = parseInt(document.getElementById('productQuantity').value);
    
    adicionarAoCarrinho(produto, quantidade);
    
    // Fechar modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('productDetailModal'));
    modal.hide();
    
    // Mostrar notificação
    mostrarNotificacao('Produto adicionado!', `${produto.nome} foi adicionado ao carrinho.`);
  });
});

// Funções
function carregarProdutos() {
  fetch(`${apiUrl}/produtos`)
    .then(response => response.json())
    .then(data => {
      produtos = data;
      renderizarProdutos(produtos);
    })
    .catch(error => {
      console.error('Erro ao carregar produtos:', error);
      document.getElementById('productsContainer').innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="bi bi-exclamation-triangle" style="font-size: 3rem; color: var(--accent-color);"></i>
          <p class="mt-3">Erro ao carregar produtos. Tente novamente mais tarde.</p>
        </div>
      `;
    });
}

function carregarCategorias() {
  fetch(`${apiUrl}/categorias`)
    .then(response => response.json())
    .then(data => {
      const dropdown = document.getElementById('categoriesDropdown');
      
      data.forEach(categoria => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.classList.add('dropdown-item');
        a.href = '#';
        a.setAttribute('data-category', categoria);
        a.textContent = categoria.charAt(0).toUpperCase() + categoria.slice(1);
        a.addEventListener('click', function(e) {
          e.preventDefault();
          filtrarPorCategoria(categoria);
        });
        
        li.appendChild(a);
        dropdown.appendChild(li);
      });
    })
    .catch(error => {
      console.error('Erro ao carregar categorias:', error);
    });
}

function renderizarProdutos(produtosFiltrados) {
  const container = document.getElementById('productsContainer');
  
  if (produtosFiltrados.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-search" style="font-size: 3rem; color: var(--accent-color);"></i>
        <p class="mt-3">Nenhum produto encontrado.</p>
      </div>
    `;
    return;
  }
  
  let html = '';
  
  produtosFiltrados.forEach(produto => {
    // Verificar se o produto tem estoque
    const temEstoque = produto.estoque > 0;
    const estoqueClass = temEstoque ? '' : 'sem-estoque';
    const estoqueLabel = temEstoque ? `Estoque: ${produto.estoque}` : 'Sem estoque';
    const botaoClass = temEstoque ? 'cyber-btn-primary' : 'cyber-btn-outline disabled';
    
    html += `
      <div class="col-md-4 col-sm-6 mb-4">
        <div class="cyber-card produto-card ${estoqueClass}">
          <div class="cyber-card-body">
            <div class="produto-imagem">
              <img src="${produto.imagem || '/static/img/no-image.png'}" alt="${produto.nome}" class="img-fluid rounded">
              ${produto.em_promocao ? '<span class="cyber-badge cyber-badge-discount">PROMOÇÃO</span>' : ''}
            </div>
            <h5 class="mt-3 mb-2">${produto.nome}</h5>
            <p class="preco neon-text-small">R$ ${produto.preco.toFixed(2)}</p>
            <p class="estoque ${produto.estoque <= 5 && produto.estoque > 0 ? 'estoque-baixo' : ''}">${estoqueLabel}</p>
            <div class="d-grid gap-2">
              <button class="btn ${botaoClass} btn-ver-detalhes" data-id="${produto.id}">
                <i class="bi bi-eye"></i> Ver Detalhes
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
  
  // Adicionar eventos aos botões
  document.querySelectorAll('.btn-ver-detalhes').forEach(btn => {
    btn.addEventListener('click', function() {
      const produtoId = this.getAttribute('data-id');
      abrirDetalhes(produtoId);
    });
  });
}

function abrirDetalhes(id) {
  const produto = produtos.find(p => p.id == id);
  if (!produto) return;
  
  // Preencher modal com dados do produto
  document.getElementById('productDetailTitle').textContent = 'Detalhes do Produto';
  document.getElementById('productDetailName').textContent = produto.nome;
  document.getElementById('productDetailPrice').textContent = `R$ ${produto.preco.toFixed(2)}`;
  document.getElementById('productDetailStock').textContent = produto.estoque > 0 ? 
    `Estoque: ${produto.estoque} unidades` : 'Sem estoque';
  document.getElementById('productDetailImage').src = produto.imagem || '/static/img/no-image.png';
  document.getElementById('productDetailCategory').textContent = produto.categoria || 'Sem categoria';
  
  // Exibir ou esconder badge de promoção
  if (produto.em_promocao) {
    document.getElementById('productDetailPromo').classList.remove('d-none');
  } else {
    document.getElementById('productDetailPromo').classList.add('d-none');
  }
  
  // Renderizar tags
  const tagsContainer = document.getElementById('productDetailTags');
  tagsContainer.innerHTML = '';
  
  if (produto.tags && produto.tags.length > 0) {
    produto.tags.forEach(tag => {
      const tagSpan = document.createElement('span');
      tagSpan.classList.add('badge', 'rounded-pill', 'cyber-badge', 'me-1', 'mb-1');
      tagSpan.textContent = tag;
      tagsContainer.appendChild(tagSpan);
    });
  } else {
    tagsContainer.innerHTML = '<small class="text-muted">Sem tags</small>';
  }
  
  // Resetar quantidade
  document.getElementById('productQuantity').value = 1;
  
  // Configurar botão de adicionar ao carrinho
  const addToCartBtn = document.getElementById('addToCartBtn');
  addToCartBtn.setAttribute('data-id', produto.id);
  
  // Desabilitar botão se não tiver estoque
  if (produto.estoque <= 0) {
    addToCartBtn.classList.add('disabled');
    addToCartBtn.textContent = 'Sem estoque';
  } else {
    addToCartBtn.classList.remove('disabled');
    addToCartBtn.innerHTML = '<i class="bi bi-cart-plus"></i> Adicionar';
  }
  
  // Abrir modal
  const modal = new bootstrap.Modal(document.getElementById('productDetailModal'));
  modal.show();
}

function filtrarProdutos() {
  const termoBusca = document.getElementById('searchInput').value.toLowerCase();
  const produtosFiltrados = produtos.filter(produto => 
    produto.nome.toLowerCase().includes(termoBusca) ||
    (produto.categoria && produto.categoria.toLowerCase().includes(termoBusca)) ||
    (produto.tags && produto.tags.some(tag => tag.toLowerCase().includes(termoBusca)))
  );
  
  renderizarProdutos(produtosFiltrados);
}

function filtrarPorCategoria(categoria) {
  if (!categoria) {
    renderizarProdutos(produtos);
    return;
  }
  
  const produtosFiltrados = produtos.filter(produto => produto.categoria === categoria);
  renderizarProdutos(produtosFiltrados);
  
  // Atualizar texto do botão dropdown
  document.getElementById('categoryDropdown').textContent = 
    categoria.charAt(0).toUpperCase() + categoria.slice(1);
}

function ordenarProdutos() {
  const opcao = document.getElementById('sortSelect').value;
  const [campo, ordem] = opcao.split('-');
  
  const produtosOrdenados = [...produtos];
  
  if (campo === 'nome') {
    produtosOrdenados.sort((a, b) => {
      const resultado = a.nome.localeCompare(b.nome);
      return ordem === 'asc' ? resultado : -resultado;
    });
  } else if (campo === 'preco') {
    produtosOrdenados.sort((a, b) => {
      const resultado = a.preco - b.preco;
      return ordem === 'asc' ? resultado : -resultado;
    });
  }
  
  renderizarProdutos(produtosOrdenados);
}

// Funções do Carrinho
function carregarCarrinho() {
  const carrinhoSalvo = localStorage.getItem('carrinho');
  if (carrinhoSalvo) {
    carrinho = JSON.parse(carrinhoSalvo);
    atualizarBadgeCarrinho();
  }
}

function salvarCarrinho() {
  localStorage.setItem('carrinho', JSON.stringify(carrinho));
  atualizarBadgeCarrinho();
}

function atualizarBadgeCarrinho() {
  const badge = document.getElementById('cartBadge');
  const quantidade = carrinho.reduce((total, item) => total + item.quantidade, 0);
  
  badge.textContent = quantidade;
  
  if (quantidade > 0) {
    badge.classList.remove('d-none');
  } else {
    badge.classList.add('d-none');
  }
}

function adicionarAoCarrinho(produto, quantidade) {
  // Verificar se já existe no carrinho
  const index = carrinho.findIndex(item => item.produto.id === produto.id);
  
  if (index !== -1) {
    // Atualizar quantidade se já existir
    carrinho[index].quantidade += quantidade;
  } else {
    // Adicionar novo item
    carrinho.push({
      produto: produto,
      quantidade: quantidade
    });
  }
  
  salvarCarrinho();
}

function mostrarNotificacao(titulo, mensagem) {
  document.getElementById('toastTitle').textContent = titulo;
  document.getElementById('toastMessage').textContent = mensagem;
  
  const toast = new bootstrap.Toast(document.getElementById('notificationToast'));
  toast.show();
}