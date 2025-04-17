// Constantes
const ADMIN_UID = '96rupqrpWjbyKtSksDaISQ94y6l2'; // UID fixo do admin
let currentUser = null;
let produtos = [];

// Funções para controle de autenticação
document.addEventListener('DOMContentLoaded', function() {
  initializeFirebase();
  setupAuthListener();
  setupEventHandlers();
});

// Inicializa Firebase (caso não tenha sido inicializado no HTML)
function initializeFirebase() {
  if (typeof firebase === 'undefined') {
    console.error('Firebase não está definido. Verifique a inclusão dos scripts.');
    document.getElementById('errorMessages').innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle-fill me-2"></i>
        Erro: Firebase não está carregado. Verifique a conexão com a internet ou recarregue a página.
      </div>
    `;
    return;
  }
}

// Monitora estado de autenticação
function setupAuthListener() {
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      // Usuário autenticado
      console.log('Usuário autenticado:', user.uid);
      currentUser = user;
      
      // Verifica se é admin
      if (user.uid === ADMIN_UID) {
        console.log('Usuário é ADMIN!');
        document.getElementById('userDisplayName').textContent = 'Admin';
        hideAuthOverlay();
        carregarDados();
      } else {
        console.warn('Usuário não é admin:', user.uid);
        document.getElementById('errorMessages').innerHTML = `
          <div class="alert alert-danger">
            <i class="bi bi-shield-exclamation me-2"></i>
            Acesso negado. Você não possui privilégios de administrador.
          </div>
        `;
        showAuthOverlay('Acesso negado. Você não possui privilégios de administrador.');
      }
    } else {
      // Usuário não autenticado
      console.log('Usuário não autenticado');
      currentUser = null;
      showAuthOverlay();
    }
  });
}

// Configura manipuladores de eventos
function setupEventHandlers() {
  // Manipulador para botão de logout
  const logoutButton = document.getElementById('logoutButton');
  if (logoutButton) {
    logoutButton.addEventListener('click', function() {
      firebase.auth().signOut()
        .then(() => {
          console.log('Logout realizado com sucesso');
          showAuthOverlay();
        })
        .catch(error => {
          console.error('Erro ao fazer logout:', error);
        });
    });
  }

  // Outros manipuladores podem ser adicionados aqui
}

// Exibe overlay de autenticação
function showAuthOverlay(message) {
  const authOverlay = document.getElementById('authOverlay');
  if (authOverlay) {
    if (message) {
      const messageElement = authOverlay.querySelector('p');
      if (messageElement) messageElement.textContent = message;
    }
    authOverlay.style.display = 'flex';
  } else {
    console.error('Elemento authOverlay não encontrado');
  }
}

// Oculta overlay de autenticação
function hideAuthOverlay() {
  const authOverlay = document.getElementById('authOverlay');
  if (authOverlay) {
    authOverlay.style.display = 'none';
  }
}

// Carregar dados da API
async function carregarDados() {
  try {
    await carregarProdutos();
    // Outros carregamentos podem ser adicionados aqui
    
    document.getElementById('productList').textContent = `${produtos.length} produtos carregados com sucesso!`;
    setTimeout(() => {
      document.getElementById('productList').style.display = 'none';
    }, 3000);
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    document.getElementById('errorMessages').innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle-fill me-2"></i>
        Erro ao carregar dados: ${error.message}
      </div>
    `;
  }
}

// Carregar produtos da API
async function carregarProdutos() {
  if (!currentUser) {
    throw new Error('Usuário não autenticado');
  }

  try {
    // Obter token do usuário atual
    const token = await currentUser.getIdToken();
    
    // Fazer requisição para a API com o token no cabeçalho
    const response = await fetch('/produtos', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-admin-uid': ADMIN_UID
      }
    });

    if (!response.ok) {
      throw new Error(`Erro ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    produtos = data;
    console.log('Produtos carregados:', produtos.length);
    
    // Atualizar interface com os produtos
    atualizarInterfaceProdutos();
    
    return produtos;
  } catch (error) {
    console.error('Erro ao carregar produtos:', error);
    throw error;
  }
}

// Atualizar interface com os produtos carregados
function atualizarInterfaceProdutos() {
  // Atualizar contadores
  document.getElementById('totalProdutos').textContent = produtos.length;
  
  // Calcular valor total em estoque
  const valorTotal = produtos.reduce((total, produto) => {
    return total + (produto.preco * produto.estoque);
  }, 0);
  document.getElementById('valorTotal').textContent = formatarPreco(valorTotal);
  
  // Contar produtos com estoque baixo
  const estoqueBaixo = produtos.filter(produto => produto.estoque > 0 && produto.estoque <= 5).length;
  document.getElementById('estoqueBaixo').textContent = estoqueBaixo;
  
  // Contar produtos sem estoque
  const estoqueZerado = produtos.filter(produto => produto.estoque === 0).length;
  document.getElementById('estoqueZerado').textContent = estoqueZerado;
  
  // Renderizar lista de produtos
  renderizarProdutos();
}

// Renderizar produtos na tabela
function renderizarProdutos() {
  const tbody = document.getElementById('produtosList');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (produtos.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="8" class="text-center">Nenhum produto encontrado</td>`;
    tbody.appendChild(tr);
    return;
  }
  
  produtos.forEach(produto => {
    const tr = document.createElement('tr');
    
    const estoqueClass = getEstoqueClass(produto.estoque);
    const estoqueStatusBadge = getEstoqueStatusBadge(produto.estoque);
    
    tr.innerHTML = `
      <td><small class="text-muted">${produto.id.substring(0, 8)}...</small></td>
      <td>
        <img src="${produto.imagem || 'https://via.placeholder.com/50'}" 
             alt="${produto.nome}" 
             class="img-thumbnail cyber-thumbnail" 
             style="max-width: 50px; max-height: 50px;">
      </td>
      <td>${produto.nome}</td>
      <td><span class="badge bg-dark">${produto.categoria}</span></td>
      <td>${formatarPreco(produto.preco)}</td>
      <td class="${estoqueClass}">${produto.estoque}</td>
      <td>${estoqueStatusBadge}</td>
      <td>
        <button class="btn btn-sm cyber-btn-outline" onclick="editarProduto('${produto.id}')">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm cyber-btn-danger" onclick="excluirProduto('${produto.id}')">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    
    tbody.appendChild(tr);
  });
  
  // Atualizar contador de produtos
  document.getElementById('produtosCount').textContent = produtos.length;
}

// Obter classe CSS baseada no estoque
function getEstoqueClass(estoque) {
  if (estoque === 0) return 'stock-critical';
  if (estoque <= 5) return 'stock-warning';
  return 'stock-good';
}

// Obter badge de status baseado no estoque
function getEstoqueStatusBadge(estoque) {
  if (estoque === 0) {
    return '<span class="badge bg-danger">Esgotado</span>';
  } else if (estoque <= 5) {
    return '<span class="badge bg-warning text-dark">Baixo</span>';
  } else if (estoque <= 20) {
    return '<span class="badge bg-info">Médio</span>';
  } else {
    return '<span class="badge bg-success">Normal</span>';
  }
}

// Formatar preço para exibição
function formatarPreco(preco) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(preco);
}