// Variáveis globais
let allProdutos = [];
let produtosFiltrados = [];
let produtoAtual = null;
let categorias = [];
let carrinhoItems = [];

// Inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  // Verificar autenticação e configurar acesso de admin
  verificarAutenticacao();
  
  // Configurar escuta em tempo real para produtos
  setupProdutosListener();
  
  // Carregar carrinho do localStorage
  carregarCarrinho();
  
  // Configurar manipuladores de eventos
  setupEventHandlers();
  
  // Inicializar tooltips e popovers do Bootstrap
  initBootstrapComponents();
});

// Verificar autenticação e mostrar botão de admin se aplicável
function verificarAutenticacao() {
  console.log('Verificando autenticação para loja...');
  
  // Verificar se o auth manager está disponível
  if (window.auth) {
    console.log('Auth Manager disponível, usando para verificação de autenticação');
    
    // Usar o auth manager para verificar acesso
    window.auth.checkAuthentication().then(authenticated => {
      if (authenticated) {
        console.log('Usuário autenticado na loja');
        
        // Atualizar contador do carrinho após autenticação
        atualizarContadorCarrinho();
      } else {
        console.log('Usuário não autenticado, redirecionando...');
      }
    });
    
    // Adicionar um listener para atualizações de estado de autenticação
    window.auth.addAuthStateListener(updateStoreUI);
  } else {
    console.log('Auth Manager não disponível, utilizando verificação direta');
    
    // Esperar até que o Firebase Auth esteja inicializado
    const authCheckInterval = setInterval(() => {
      if (typeof firebase !== 'undefined' && firebase.apps.length > 0 && firebase.auth) {
        clearInterval(authCheckInterval);
        
        // Verificar estado de autenticação
        firebase.auth().onAuthStateChanged(updateStoreUI);
      }
    }, 500);
  }
  
  // Função para atualizar a UI da loja com base no estado de autenticação
  function updateStoreUI(user) {
    const adminBtn = document.getElementById('adminBtn');
    const logoutButton = document.getElementById('logoutButton');
    
    if (user) {
      console.log('Usuário autenticado na loja:', user.email);
      
      // Verificar se é admin
      const isAdmin = user.email === 'nsyzaesir@gmail.com';
      
      // Mostrar/ocultar botão de admin
      if (adminBtn) {
        if (isAdmin) {
          adminBtn.classList.remove('d-none');
          console.log('Botão de administração visível');
        } else {
          adminBtn.classList.add('d-none');
        }
      }
      
      // Mostrar botão de logout
      if (logoutButton) {
        logoutButton.classList.remove('d-none');
      }
    } else {
      console.log('Usuário não autenticado na loja');
      
      // Ocultar botão de admin
      if (adminBtn) adminBtn.classList.add('d-none');
      
      // Ocultar botão de logout
      if (logoutButton) logoutButton.classList.add('d-none');
    }
  }
}

// Configurar escuta em tempo real para produtos
function setupProdutosListener() {
  // Mostrar loading
  document.getElementById('loadingSpinner').classList.remove('d-none');
  document.getElementById('produtosContainer').classList.add('d-none');
  document.getElementById('nenhumProdutoMsg').classList.add('d-none');
  
  // Escutar mudanças em tempo real na coleção de produtos
  firestoreProducts.listenToProducts((produtos) => {
    // Atualizar lista global de produtos
    allProdutos = produtos;
    
    // Esconder loading
    document.getElementById('loadingSpinner').classList.add('d-none');
    
    if (produtos.length === 0) {
      // Mostrar mensagem de nenhum produto
      document.getElementById('nenhumProdutoMsg').classList.remove('d-none');
    } else {
      // Mostrar container de produtos
      document.getElementById('produtosContainer').classList.remove('d-none');
      
      // Aplicar filtros iniciais (isso também renderiza os produtos)
      aplicarFiltros();
      
      // Carregar categorias
      carregarCategorias();
      
      // Renderizar seções especiais (promoções e novidades)
      renderizarPromocoesEnovidades();
    }
  });
}

// Carregar categorias para filtros e menu
function carregarCategorias() {
  // Obter categorias únicas dos produtos
  const categoriasSet = new Set();
  
  allProdutos.forEach(produto => {
    if (produto.categoria) {
      categoriasSet.add(produto.categoria);
    }
  });
  
  // Converter para array e ordenar
  categorias = Array.from(categoriasSet).sort();
  
  // Preencher dropdown de categorias na navbar
  const categoriasMenu = document.getElementById('categoriasMenu');
  categoriasMenu.innerHTML = '';
  
  if (categorias.length > 0) {
    categorias.forEach(categoria => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.className = 'dropdown-item';
      a.href = '#';
      a.textContent = categoria;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('categoriaFilter').value = categoria;
        aplicarFiltros();
        document.getElementById('produtos').scrollIntoView();
      });
      
      li.appendChild(a);
      categoriasMenu.appendChild(li);
    });
  } else {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.className = 'dropdown-item disabled';
    a.href = '#';
    a.textContent = 'Nenhuma categoria disponível';
    
    li.appendChild(a);
    categoriasMenu.appendChild(li);
  }
  
  // Preencher select de categorias no filtro
  const categoriaFilter = document.getElementById('categoriaFilter');
  
  // Manter a primeira opção (Todas Categorias)
  categoriaFilter.innerHTML = '<option value="">Todas Categorias</option>';
  
  categorias.forEach(categoria => {
    const option = document.createElement('option');
    option.value = categoria;
    option.textContent = categoria;
    categoriaFilter.appendChild(option);
  });
  
  // Preencher categorias no rodapé
  const footerCategorias = document.getElementById('footerCategorias');
  footerCategorias.innerHTML = '';
  
  if (categorias.length > 0) {
    categorias.forEach(categoria => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.className = 'footer-link';
      a.href = '#';
      a.textContent = categoria;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('categoriaFilter').value = categoria;
        aplicarFiltros();
        document.getElementById('produtos').scrollIntoView();
      });
      
      li.appendChild(a);
      footerCategorias.appendChild(li);
    });
  } else {
    const li = document.createElement('li');
    li.textContent = 'Nenhuma categoria disponível';
    footerCategorias.appendChild(li);
  }
}

// Configurar manipuladores de eventos
function setupEventHandlers() {
  // Configurar botão de logout
  const logoutButton = document.getElementById('logoutButton');
  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      if (window.auth) {
        window.auth.logout();
      } else if (firebase && firebase.auth) {
        firebase.auth().signOut().then(() => {
          console.log('Logout realizado');
          window.location.href = '/';
        }).catch(error => {
          console.error('Erro no logout:', error);
          showToast('Erro', 'Ocorreu um erro ao fazer logout. Tente novamente.', 'error');
        });
      }
    });
  }
  
  // Eventos de filtro
  document.getElementById('categoriaFilter').addEventListener('change', aplicarFiltros);
  document.getElementById('precoFilter').addEventListener('change', aplicarFiltros);
  document.getElementById('disponibilidadeFilter').addEventListener('change', aplicarFiltros);
  document.getElementById('ordenacao').addEventListener('change', aplicarFiltros);
  
  // Busca
  document.getElementById('searchButton').addEventListener('click', () => {
    const searchTerm = document.getElementById('searchInput').value.trim();
    if (searchTerm) {
      aplicarFiltros(searchTerm);
    }
  });
  
  document.getElementById('searchInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const searchTerm = document.getElementById('searchInput').value.trim();
      aplicarFiltros(searchTerm);
    }
  });
  
  // Botão para limpar filtros
  document.getElementById('limparFiltrosBtn').addEventListener('click', () => {
    document.getElementById('categoriaFilter').value = '';
    document.getElementById('precoFilter').value = '';
    document.getElementById('disponibilidadeFilter').value = '';
    document.getElementById('ordenacao').value = 'menor-preco';
    document.getElementById('searchInput').value = '';
    aplicarFiltros();
  });
  
  // Modal de produto
  const produtoModal = document.getElementById('produtoModal');
  
  produtoModal.addEventListener('show.bs.modal', (e) => {
    const button = e.relatedTarget;
    const produtoId = button.getAttribute('data-produto-id');
    
    if (produtoId) {
      carregarProdutoNoModal(produtoId);
    }
  });
  
  // Botões de quantidade no modal
  document.getElementById('diminuirQuantidade').addEventListener('click', () => {
    const quantidadeInput = document.getElementById('produtoQuantidade');
    let quantidade = parseInt(quantidadeInput.value);
    if (quantidade > 1) {
      quantidadeInput.value = quantidade - 1;
    }
  });
  
  document.getElementById('aumentarQuantidade').addEventListener('click', () => {
    const quantidadeInput = document.getElementById('produtoQuantidade');
    let quantidade = parseInt(quantidadeInput.value);
    quantidadeInput.value = quantidade + 1;
  });
  
  // Validar entrada de quantidade
  document.getElementById('produtoQuantidade').addEventListener('change', () => {
    const quantidadeInput = document.getElementById('produtoQuantidade');
    let quantidade = parseInt(quantidadeInput.value);
    
    if (isNaN(quantidade) || quantidade < 1) {
      quantidadeInput.value = 1;
    }
  });
  
  // Botão de adicionar ao carrinho no modal
  document.getElementById('addToCartBtn').addEventListener('click', () => {
    if (produtoAtual) {
      const quantidade = parseInt(document.getElementById('produtoQuantidade').value);
      adicionarAoCarrinho(produtoAtual, quantidade);
      
      // Fechar modal
      const modal = bootstrap.Modal.getInstance(produtoModal);
      modal.hide();
    }
  });
  
  // Adicionar promoção fixa ao carrinho
  document.querySelector('.promocoes-card button').addEventListener('click', () => {
    // Produto de promoção fixa
    const produtoPromo = {
      id: 'promo-especial',
      nome: 'BOSSPODS AIR',
      preco: 399.90,
      imagem: 'https://i.imgur.com/0VqQhQX.png',
      categoria: 'Fones',
      estoque: 10,
      em_promocao: true
    };
    
    adicionarAoCarrinho(produtoPromo, 1);
  });
}

// Inicializar componentes do Bootstrap
function initBootstrapComponents() {
  // Nada a fazer por enquanto
}

// Aplicar filtros aos produtos
function aplicarFiltros(searchTerm) {
  // Obter valores dos filtros
  const categoria = document.getElementById('categoriaFilter').value;
  const preco = document.getElementById('precoFilter').value;
  const disponibilidade = document.getElementById('disponibilidadeFilter').value;
  const ordenacao = document.getElementById('ordenacao').value;
  const busca = searchTerm || document.getElementById('searchInput').value.trim().toLowerCase();
  
  // Filtrar produtos
  produtosFiltrados = allProdutos.filter(produto => {
    // Filtro por categoria
    if (categoria && produto.categoria !== categoria) {
      return false;
    }
    
    // Filtro por preço
    if (preco) {
      const [min, max] = preco.split('-').map(v => v ? parseFloat(v) : null);
      
      if (min !== null && max !== null) {
        // Intervalo específico
        if (produto.preco < min || produto.preco > max) {
          return false;
        }
      } else if (min !== null) {
        // Acima de um valor
        if (produto.preco < min) {
          return false;
        }
      } else if (max !== null) {
        // Abaixo de um valor
        if (produto.preco > max) {
          return false;
        }
      }
    }
    
    // Filtro por disponibilidade
    if (disponibilidade === 'disponivel' && (!produto.estoque || produto.estoque <= 0)) {
      return false;
    } else if (disponibilidade === 'promocao' && !produto.em_promocao) {
      return false;
    }
    
    // Filtro por busca
    if (busca) {
      const nomeLower = (produto.nome || '').toLowerCase();
      const categoriaLower = (produto.categoria || '').toLowerCase();
      const descricaoLower = (produto.descricao || '').toLowerCase();
      
      const tagsMatch = produto.tags && Array.isArray(produto.tags) && 
                       produto.tags.some(tag => tag.toLowerCase().includes(busca));
      
      if (!nomeLower.includes(busca) && 
          !categoriaLower.includes(busca) && 
          !descricaoLower.includes(busca) &&
          !tagsMatch) {
        return false;
      }
    }
    
    return true;
  });
  
  // Ordenar produtos
  if (ordenacao === 'menor-preco') {
    produtosFiltrados.sort((a, b) => (a.preco || 0) - (b.preco || 0));
  } else if (ordenacao === 'maior-preco') {
    produtosFiltrados.sort((a, b) => (b.preco || 0) - (a.preco || 0));
  } else if (ordenacao === 'nome-asc') {
    produtosFiltrados.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  } else if (ordenacao === 'nome-desc') {
    produtosFiltrados.sort((a, b) => (b.nome || '').localeCompare(a.nome || ''));
  } else if (ordenacao === 'mais-recentes') {
    produtosFiltrados.sort((a, b) => {
      // Ordenar por data de criação, se disponível
      const dataA = a.createdAt ? new Date(a.createdAt.seconds * 1000) : new Date(0);
      const dataB = b.createdAt ? new Date(b.createdAt.seconds * 1000) : new Date(0);
      return dataB - dataA;
    });
  }
  
  // Renderizar produtos filtrados
  renderizarProdutos();
}

// Renderizar produtos com base nos filtros aplicados
function renderizarProdutos() {
  const container = document.getElementById('produtosContainer');
  container.innerHTML = '';
  
  // Verificar se há produtos após filtros
  if (produtosFiltrados.length === 0) {
    document.getElementById('nenhumProdutoMsg').classList.remove('d-none');
    return;
  }
  
  document.getElementById('nenhumProdutoMsg').classList.add('d-none');
  
  // Renderizar cada produto
  produtosFiltrados.forEach(produto => {
    const col = document.createElement('div');
    col.className = 'col-md-4 col-lg-3';
    
    const card = criarCardProduto(produto);
    col.appendChild(card);
    
    container.appendChild(col);
  });
}

// Renderizar seções de promoções e novidades
function renderizarPromocoesEnovidades() {
  // Produtos em promoção
  const promocoesContainer = document.getElementById('promocoesContainer');
  promocoesContainer.innerHTML = '';
  
  const produtosPromocao = allProdutos.filter(p => p.em_promocao && p.estoque > 0);
  
  if (produtosPromocao.length > 0) {
    produtosPromocao.slice(0, 4).forEach(produto => {
      const col = document.createElement('div');
      col.className = 'col-md-3 col-sm-6';
      
      const card = criarCardProduto(produto);
      col.appendChild(card);
      
      promocoesContainer.appendChild(col);
    });
  } else {
    promocoesContainer.innerHTML = '<div class="col-12 text-center py-4"><p class="text-muted">Nenhum produto em promoção no momento.</p></div>';
  }
  
  // Produtos novos (últimos adicionados)
  const novidadesContainer = document.getElementById('novidadesContainer');
  novidadesContainer.innerHTML = '';
  
  // Ordenar por data de criação e pegar os 4 mais recentes
  const produtosNovos = [...allProdutos]
    .sort((a, b) => {
      const dataA = a.createdAt ? new Date(a.createdAt.seconds * 1000) : new Date(0);
      const dataB = b.createdAt ? new Date(b.createdAt.seconds * 1000) : new Date(0);
      return dataB - dataA;
    })
    .slice(0, 4);
  
  if (produtosNovos.length > 0) {
    produtosNovos.forEach(produto => {
      const col = document.createElement('div');
      col.className = 'col-md-3 col-sm-6';
      
      const card = criarCardProduto(produto, true);
      col.appendChild(card);
      
      novidadesContainer.appendChild(col);
    });
  } else {
    novidadesContainer.innerHTML = '<div class="col-12 text-center py-4"><p class="text-muted">Nenhuma novidade no momento.</p></div>';
  }
}

// Criar card de produto
function criarCardProduto(produto, isNovidade = false) {
  const card = document.createElement('div');
  card.className = 'produto-card';
  
  // Container da imagem
  const imageContainer = document.createElement('div');
  imageContainer.className = 'produto-image-container';
  
  const image = document.createElement('img');
  image.className = 'produto-image';
  image.src = produto.imagem || 'https://via.placeholder.com/200?text=BOSSPODS';
  image.alt = produto.nome || 'Produto';
  imageContainer.appendChild(image);
  
  // Tag de promoção ou novidade
  if (produto.em_promocao) {
    const tag = document.createElement('div');
    tag.className = 'produto-tag-promocao';
    tag.textContent = 'PROMOÇÃO';
    imageContainer.appendChild(tag);
  } else if (isNovidade) {
    const tag = document.createElement('div');
    tag.className = 'produto-tag-novidade';
    tag.textContent = 'NOVIDADE';
    imageContainer.appendChild(tag);
  }
  
  card.appendChild(imageContainer);
  
  // Body do card
  const body = document.createElement('div');
  body.className = 'produto-body';
  
  // Título
  const title = document.createElement('h5');
  title.className = 'produto-title';
  title.textContent = produto.nome || 'Produto sem nome';
  body.appendChild(title);
  
  // Categoria
  const category = document.createElement('div');
  category.className = 'produto-category';
  category.textContent = produto.categoria || 'Sem categoria';
  body.appendChild(category);
  
  // Preço
  const priceContainer = document.createElement('div');
  
  if (produto.em_promocao) {
    const oldPrice = document.createElement('span');
    oldPrice.className = 'produto-preco-antigo';
    
    // Simular preço antigo (20% maior)
    const precoAntigo = (produto.preco * 1.2).toFixed(2);
    oldPrice.textContent = `R$ ${precoAntigo.replace('.', ',')}`;
    priceContainer.appendChild(oldPrice);
  }
  
  const price = document.createElement('div');
  price.className = 'produto-preco';
  price.textContent = `R$ ${(produto.preco || 0).toFixed(2).replace('.', ',')}`;
  priceContainer.appendChild(price);
  
  // Parcelas
  const installments = document.createElement('div');
  installments.className = 'produto-preco-parcelado';
  
  // Simular parcelas (em até 12x)
  const valorProduto = produto.preco || 0;
  let numParcelas = 1;
  
  if (valorProduto > 100) {
    numParcelas = 12;
  } else if (valorProduto > 50) {
    numParcelas = 6;
  } else if (valorProduto > 20) {
    numParcelas = 3;
  }
  
  if (numParcelas > 1) {
    const valorParcela = (valorProduto / numParcelas).toFixed(2).replace('.', ',');
    installments.textContent = `ou ${numParcelas}x de R$ ${valorParcela} sem juros`;
  }
  
  priceContainer.appendChild(installments);
  body.appendChild(priceContainer);
  
  // Tags (se houver)
  if (produto.tags && Array.isArray(produto.tags) && produto.tags.length > 0) {
    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'produto-tags';
    
    produto.tags.slice(0, 3).forEach(tag => {
      const tagEl = document.createElement('span');
      tagEl.className = 'produto-tag';
      tagEl.textContent = tag;
      tagsContainer.appendChild(tagEl);
    });
    
    body.appendChild(tagsContainer);
  }
  
  card.appendChild(body);
  
  // Footer do card
  const footer = document.createElement('div');
  footer.className = 'produto-footer';
  
  // Estoque
  const stock = document.createElement('div');
  stock.className = 'produto-stock';
  
  let stockClass = 'stock-ok';
  let stockText = 'Em estoque';
  
  if (!produto.estoque || produto.estoque === 0) {
    stockClass = 'stock-out';
    stockText = 'Esgotado';
  } else if (produto.estoque <= 5) {
    stockClass = 'stock-low';
    stockText = 'Últimas unidades';
  }
  
  stock.classList.add(stockClass);
  stock.textContent = stockText;
  footer.appendChild(stock);
  
  // Botões
  const btnGroup = document.createElement('div');
  btnGroup.className = 'produto-btn-group';
  
  // Botão de detalhes
  const detailsBtn = document.createElement('button');
  detailsBtn.className = 'btn cyber-btn produto-btn';
  detailsBtn.innerHTML = '<i class="bi bi-eye"></i>';
  detailsBtn.title = 'Ver detalhes';
  detailsBtn.setAttribute('data-bs-toggle', 'modal');
  detailsBtn.setAttribute('data-bs-target', '#produtoModal');
  detailsBtn.setAttribute('data-produto-id', produto.id);
  btnGroup.appendChild(detailsBtn);
  
  // Botão de adicionar ao carrinho
  const cartBtn = document.createElement('button');
  cartBtn.className = 'btn cyber-btn cyber-btn-primary produto-btn';
  cartBtn.innerHTML = '<i class="bi bi-cart-plus"></i>';
  cartBtn.title = 'Adicionar ao carrinho';
  
  // Desabilitar se estiver sem estoque
  if (!produto.estoque || produto.estoque === 0) {
    cartBtn.disabled = true;
    cartBtn.title = 'Produto sem estoque';
  } else {
    cartBtn.addEventListener('click', () => {
      adicionarAoCarrinho(produto, 1);
    });
  }
  
  btnGroup.appendChild(cartBtn);
  footer.appendChild(btnGroup);
  
  card.appendChild(footer);
  
  return card;
}

// Carregar produto no modal
function carregarProdutoNoModal(produtoId) {
  // Encontrar produto pelo ID
  const produto = allProdutos.find(p => p.id === produtoId);
  
  if (!produto) {
    console.error(`Produto com ID ${produtoId} não encontrado`);
    return;
  }
  
  // Armazenar produto atual para uso no botão de adicionar ao carrinho
  produtoAtual = produto;
  
  // Preencher dados do modal
  document.getElementById('produtoModalNome').textContent = produto.nome || 'Produto sem nome';
  document.getElementById('produtoModalImagem').src = produto.imagem || 'https://via.placeholder.com/300?text=BOSSPODS';
  document.getElementById('produtoModalPreco').textContent = `R$ ${(produto.preco || 0).toFixed(2).replace('.', ',')}`;
  
  // Parcelas
  const valorProduto = produto.preco || 0;
  let numParcelas = 1;
  
  if (valorProduto > 100) {
    numParcelas = 12;
  } else if (valorProduto > 50) {
    numParcelas = 6;
  } else if (valorProduto > 20) {
    numParcelas = 3;
  }
  
  if (numParcelas > 1) {
    const valorParcela = (valorProduto / numParcelas).toFixed(2).replace('.', ',');
    document.getElementById('produtoModalParcelas').textContent = `ou ${numParcelas}x de R$ ${valorParcela} sem juros`;
  } else {
    document.getElementById('produtoModalParcelas').textContent = '';
  }
  
  // Descrição
  document.getElementById('produtoModalDescricao').textContent = produto.descricao || 'Sem descrição disponível para este produto.';
  
  // Tag de promoção
  const tagPromocao = document.getElementById('produtoModalTagPromocao');
  if (produto.em_promocao) {
    tagPromocao.classList.remove('d-none');
  } else {
    tagPromocao.classList.add('d-none');
  }
  
  // Status de estoque
  const estoqueEl = document.getElementById('produtoModalEstoque');
  
  if (!produto.estoque || produto.estoque === 0) {
    estoqueEl.textContent = 'Esgotado';
    estoqueEl.className = 'cyber-badge bg-danger';
    document.getElementById('addToCartBtn').disabled = true;
  } else if (produto.estoque <= 5) {
    estoqueEl.textContent = `Últimas ${produto.estoque} unidades`;
    estoqueEl.className = 'cyber-badge bg-warning';
    document.getElementById('addToCartBtn').disabled = false;
  } else {
    estoqueEl.textContent = 'Em estoque';
    estoqueEl.className = 'cyber-badge bg-success';
    document.getElementById('addToCartBtn').disabled = false;
  }
  
  // Tags
  const tagsContainer = document.getElementById('produtoModalTags');
  tagsContainer.innerHTML = '';
  
  if (produto.tags && Array.isArray(produto.tags) && produto.tags.length > 0) {
    produto.tags.forEach(tag => {
      const tagEl = document.createElement('span');
      tagEl.className = 'produto-tag';
      tagEl.textContent = tag;
      tagsContainer.appendChild(tagEl);
    });
  }
  
  // Resetar quantidade para 1
  document.getElementById('produtoQuantidade').value = 1;
}

// Carregar carrinho do localStorage
function carregarCarrinho() {
  const carrinhoSalvo = localStorage.getItem('bosspods_carrinho');
  
  if (carrinhoSalvo) {
    try {
      carrinhoItems = JSON.parse(carrinhoSalvo);
      atualizarContadorCarrinho();
    } catch (e) {
      console.error('Erro ao carregar carrinho:', e);
      carrinhoItems = [];
      localStorage.setItem('bosspods_carrinho', JSON.stringify(carrinhoItems));
    }
  } else {
    carrinhoItems = [];
    localStorage.setItem('bosspods_carrinho', JSON.stringify(carrinhoItems));
  }
}

// Salvar carrinho no localStorage
function salvarCarrinho() {
  localStorage.setItem('bosspods_carrinho', JSON.stringify(carrinhoItems));
  atualizarContadorCarrinho();
}

// Atualizar contador de itens no carrinho
function atualizarContadorCarrinho() {
  const total = carrinhoItems.reduce((sum, item) => sum + (item.quantidade || 0), 0);
  document.getElementById('carrinhoCount').textContent = total;
}

// Adicionar produto ao carrinho
function adicionarAoCarrinho(produto, quantidade) {
  // Verificar se já existe no carrinho
  const index = carrinhoItems.findIndex(item => item.id === produto.id);
  
  if (index !== -1) {
    // Produto já existe, incrementar quantidade
    carrinhoItems[index].quantidade += quantidade;
  } else {
    // Adicionar novo item
    carrinhoItems.push({
      id: produto.id,
      nome: produto.nome,
      preco: produto.preco,
      imagem: produto.imagem,
      quantidade: quantidade,
      categoria: produto.categoria,
      em_promocao: produto.em_promocao
    });
  }
  
  // Salvar carrinho
  salvarCarrinho();
  
  // Mostrar notificação
  showToast('Produto adicionado', `${produto.nome} foi adicionado ao seu carrinho`, 'success');
}

// Mostrar toast de notificação
function showToast(title, message, type = 'info') {
  const toastEl = document.getElementById('notificationToast');
  const titleEl = document.getElementById('toastTitle');
  const messageEl = document.getElementById('toastMessage');
  
  titleEl.textContent = title;
  messageEl.textContent = message;
  
  // Remover classes anteriores
  toastEl.className = 'toast cyber-toast';
  
  // Adicionar classe de acordo com o tipo
  if (type === 'success') {
    toastEl.classList.add('cyber-toast-success');
  } else if (type === 'error') {
    toastEl.classList.add('cyber-toast-error');
  }
  
  // Mostrar toast
  const toast = new bootstrap.Toast(toastEl);
  toast.show();
}