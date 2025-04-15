// Variáveis globais
let carrinhoItems = [];
let cupomAplicado = null;

// Cupons de desconto disponíveis
const cuponsDisponiveis = {
  'BOSSPODS10': { percentual: 10, mensagem: '10% de desconto' },
  'CYBER20': { percentual: 20, mensagem: '20% de desconto' },
  'FRETEGRATIS': { percentual: 0, frete: true, mensagem: 'Frete grátis' },
  'WELCOME25': { percentual: 25, mensagem: '25% de desconto para primeira compra' }
};

// Inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  // Carregar carrinho do localStorage
  carregarCarrinho();
  
  // Configurar manipuladores de eventos
  setupEventHandlers();
});

// Carregar carrinho do localStorage
function carregarCarrinho() {
  const carrinhoSalvo = localStorage.getItem('bosspods_carrinho');
  
  if (carrinhoSalvo) {
    try {
      carrinhoItems = JSON.parse(carrinhoSalvo);
      renderizarCarrinho();
    } catch (e) {
      console.error('Erro ao carregar carrinho:', e);
      carrinhoItems = [];
      localStorage.setItem('bosspods_carrinho', JSON.stringify(carrinhoItems));
      mostrarMensagemCarrinhoVazio();
    }
  } else {
    carrinhoItems = [];
    localStorage.setItem('bosspods_carrinho', JSON.stringify(carrinhoItems));
    mostrarMensagemCarrinhoVazio();
  }
}

// Salvar carrinho no localStorage
function salvarCarrinho() {
  localStorage.setItem('bosspods_carrinho', JSON.stringify(carrinhoItems));
}

// Configurar manipuladores de eventos
function setupEventHandlers() {
  // Botão de limpar carrinho
  document.getElementById('limparCarrinhoBtn').addEventListener('click', () => {
    abrirConfirmacao(
      'Tem certeza que deseja limpar o carrinho?',
      limparCarrinho
    );
  });
  
  // Botão de aplicar cupom
  document.getElementById('aplicarCupomBtn').addEventListener('click', () => {
    const cupom = document.getElementById('cupomInput').value.trim().toUpperCase();
    
    if (!cupom) {
      showToast('Atenção', 'Digite um código de cupom', 'warning');
      return;
    }
    
    if (cupomAplicado) {
      showToast('Atenção', 'Você já aplicou um cupom neste pedido', 'warning');
      return;
    }
    
    if (cuponsDisponiveis[cupom]) {
      cupomAplicado = {
        codigo: cupom,
        ...cuponsDisponiveis[cupom]
      };
      
      // Atualizar resumo do pedido
      atualizarResumoPedido();
      
      showToast('Cupom aplicado', cuponsDisponiveis[cupom].mensagem, 'success');
    } else {
      showToast('Cupom inválido', 'Este código de cupom não existe ou expirou', 'error');
    }
  });
  
  // Botão de enviar pedido por WhatsApp
  document.getElementById('pedidoWhatsAppBtn').addEventListener('click', () => {
    const modal = new bootstrap.Modal(document.getElementById('whatsappModal'));
    modal.show();
  });
  
  // Botão de enviar no modal do WhatsApp
  document.getElementById('enviarWhatsAppBtn').addEventListener('click', () => {
    const form = document.getElementById('whatsappForm');
    
    // Validar formulário
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    
    // Fechar modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('whatsappModal'));
    modal.hide();
    
    // Enviar pedido
    enviarPedidoWhatsApp();
  });
  
  // Botão de confirmação genérico
  document.getElementById('confirmBtn').addEventListener('click', function() {
    // A função de callback é definida dinamicamente em abrirConfirmacao()
    if (this.dataset.callback) {
      const callback = window[this.dataset.callback];
      if (typeof callback === 'function') {
        callback();
      }
      
      // Fechar modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('confirmModal'));
      modal.hide();
    }
  });
}

// Renderizar carrinho
function renderizarCarrinho() {
  // Verificar se o carrinho está vazio
  if (carrinhoItems.length === 0) {
    mostrarMensagemCarrinhoVazio();
    return;
  }
  
  // Mostrar conteúdo do carrinho
  document.getElementById('carrinhoVazio').classList.add('d-none');
  document.getElementById('carrinhoContent').classList.remove('d-none');
  
  // Limpar tabela
  const tbody = document.getElementById('carrinhoItems');
  tbody.innerHTML = '';
  
  // Adicionar itens
  carrinhoItems.forEach((item, index) => {
    const tr = document.createElement('tr');
    
    // Imagem
    const tdImg = document.createElement('td');
    const img = document.createElement('img');
    img.className = 'cart-product-img';
    img.src = item.imagem || 'https://via.placeholder.com/50?text=BOSSPODS';
    img.alt = item.nome || 'Produto';
    tdImg.appendChild(img);
    tr.appendChild(tdImg);
    
    // Nome e categoria
    const tdNome = document.createElement('td');
    const nome = document.createElement('div');
    nome.className = 'product-title';
    nome.textContent = item.nome || 'Produto sem nome';
    
    const categoria = document.createElement('div');
    categoria.className = 'product-category';
    categoria.textContent = item.categoria || 'Sem categoria';
    
    tdNome.appendChild(nome);
    tdNome.appendChild(categoria);
    tr.appendChild(tdNome);
    
    // Preço
    const tdPreco = document.createElement('td');
    tdPreco.className = 'product-price';
    tdPreco.textContent = `R$ ${(item.preco || 0).toFixed(2).replace('.', ',')}`;
    tr.appendChild(tdPreco);
    
    // Quantidade
    const tdQtd = document.createElement('td');
    const quantityControl = document.createElement('div');
    quantityControl.className = 'quantity-control';
    
    const btnMinus = document.createElement('button');
    btnMinus.className = 'quantity-btn';
    btnMinus.innerHTML = '<i class="bi bi-dash"></i>';
    btnMinus.disabled = item.quantidade <= 1;
    btnMinus.addEventListener('click', () => diminuirQuantidade(index));
    quantityControl.appendChild(btnMinus);
    
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'quantity-input';
    input.value = item.quantidade;
    input.min = 1;
    input.addEventListener('change', (e) => atualizarQuantidade(index, parseInt(e.target.value)));
    quantityControl.appendChild(input);
    
    const btnPlus = document.createElement('button');
    btnPlus.className = 'quantity-btn';
    btnPlus.innerHTML = '<i class="bi bi-plus"></i>';
    btnPlus.addEventListener('click', () => aumentarQuantidade(index));
    quantityControl.appendChild(btnPlus);
    
    tdQtd.appendChild(quantityControl);
    tr.appendChild(tdQtd);
    
    // Subtotal
    const tdSubtotal = document.createElement('td');
    tdSubtotal.className = 'product-subtotal';
    const subtotal = (item.preco || 0) * (item.quantidade || 0);
    tdSubtotal.textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    tr.appendChild(tdSubtotal);
    
    // Remover
    const tdRemover = document.createElement('td');
    const btnRemover = document.createElement('button');
    btnRemover.className = 'remove-btn';
    btnRemover.innerHTML = '<i class="bi bi-x-lg"></i>';
    btnRemover.setAttribute('title', 'Remover item');
    btnRemover.addEventListener('click', () => removerItem(index));
    tdRemover.appendChild(btnRemover);
    tr.appendChild(tdRemover);
    
    tbody.appendChild(tr);
  });
  
  // Atualizar resumo do pedido
  atualizarResumoPedido();
}

// Atualizar resumo do pedido
function atualizarResumoPedido() {
  // Calcular subtotal
  const subtotal = carrinhoItems.reduce((total, item) => {
    return total + (item.preco || 0) * (item.quantidade || 0);
  }, 0);
  
  // Atualizar subtotal
  document.getElementById('subtotalResumo').textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
  
  // Calcular desconto
  let desconto = 0;
  if (cupomAplicado && cupomAplicado.percentual > 0) {
    desconto = (subtotal * cupomAplicado.percentual) / 100;
    
    // Mostrar linha de desconto
    document.getElementById('descontoRow').classList.remove('d-none');
    document.getElementById('descontoResumo').textContent = `- R$ ${desconto.toFixed(2).replace('.', ',')}`;
  } else {
    // Esconder linha de desconto
    document.getElementById('descontoRow').classList.add('d-none');
  }
  
  // Calcular total
  const total = subtotal - desconto;
  
  // Atualizar total
  document.getElementById('totalResumo').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

// Mostrar mensagem de carrinho vazio
function mostrarMensagemCarrinhoVazio() {
  document.getElementById('carrinhoVazio').classList.remove('d-none');
  document.getElementById('carrinhoContent').classList.add('d-none');
}

// Aumentar quantidade
function aumentarQuantidade(index) {
  if (index >= 0 && index < carrinhoItems.length) {
    carrinhoItems[index].quantidade++;
    salvarCarrinho();
    renderizarCarrinho();
  }
}

// Diminuir quantidade
function diminuirQuantidade(index) {
  if (index >= 0 && index < carrinhoItems.length && carrinhoItems[index].quantidade > 1) {
    carrinhoItems[index].quantidade--;
    salvarCarrinho();
    renderizarCarrinho();
  }
}

// Atualizar quantidade
function atualizarQuantidade(index, quantidade) {
  if (index >= 0 && index < carrinhoItems.length) {
    // Verificar se a quantidade é válida
    if (isNaN(quantidade) || quantidade < 1) {
      quantidade = 1;
    }
    
    carrinhoItems[index].quantidade = quantidade;
    salvarCarrinho();
    renderizarCarrinho();
  }
}

// Remover item
function removerItem(index) {
  if (index >= 0 && index < carrinhoItems.length) {
    const itemRemovido = carrinhoItems[index];
    
    carrinhoItems.splice(index, 1);
    salvarCarrinho();
    renderizarCarrinho();
    
    showToast('Item removido', `${itemRemovido.nome} foi removido do carrinho`, 'success');
  }
}

// Limpar carrinho
function limparCarrinho() {
  carrinhoItems = [];
  cupomAplicado = null;
  salvarCarrinho();
  renderizarCarrinho();
  
  showToast('Carrinho limpo', 'Todos os itens foram removidos do carrinho', 'success');
}

// Enviar pedido via WhatsApp
function enviarPedidoWhatsApp() {
  // Obter informações do cliente
  const nome = document.getElementById('nomeCliente').value;
  const telefone = document.getElementById('telefoneCliente').value;
  const email = document.getElementById('emailCliente').value;
  const endereco = document.getElementById('enderecoCliente').value;
  const observacoes = document.getElementById('obsCliente').value;
  
  // Calcular valores
  const subtotal = carrinhoItems.reduce((total, item) => {
    return total + (item.preco || 0) * (item.quantidade || 0);
  }, 0);
  
  let desconto = 0;
  if (cupomAplicado && cupomAplicado.percentual > 0) {
    desconto = (subtotal * cupomAplicado.percentual) / 100;
  }
  
  const total = subtotal - desconto;
  
  // Criar mensagem
  let mensagem = `*Novo Pedido BOSSPODS*\n\n`;
  mensagem += `*Dados do Cliente:*\n`;
  mensagem += `Nome: ${nome}\n`;
  mensagem += `Telefone: ${telefone}\n`;
  
  if (email) {
    mensagem += `Email: ${email}\n`;
  }
  
  mensagem += `Endereço: ${endereco}\n\n`;
  
  mensagem += `*Itens do Pedido:*\n`;
  
  carrinhoItems.forEach((item, index) => {
    const subtotalItem = (item.preco || 0) * (item.quantidade || 0);
    mensagem += `${index + 1}. ${item.nome} x${item.quantidade} - R$ ${subtotalItem.toFixed(2).replace('.', ',')}\n`;
  });
  
  mensagem += `\n*Resumo:*\n`;
  mensagem += `Subtotal: R$ ${subtotal.toFixed(2).replace('.', ',')}\n`;
  
  if (desconto > 0) {
    mensagem += `Desconto: R$ ${desconto.toFixed(2).replace('.', ',')} (${cupomAplicado.codigo})\n`;
  }
  
  mensagem += `*Total: R$ ${total.toFixed(2).replace('.', ',')}*\n\n`;
  
  if (observacoes) {
    mensagem += `*Observações:*\n${observacoes}\n\n`;
  }
  
  mensagem += `Obrigado por comprar na BOSSPODS!`;
  
  // Codificar mensagem para URL
  const mensagemCodificada = encodeURIComponent(mensagem);
  
  // Número de telefone da loja (substitua pelo número real)
  const numeroLoja = '5511999999999';
  
  // Criar URL do WhatsApp
  const whatsappUrl = `https://wa.me/${numeroLoja}?text=${mensagemCodificada}`;
  
  // Abrir WhatsApp em nova janela
  window.open(whatsappUrl, '_blank');
  
  // Mostrar mensagem de sucesso
  showToast('Pedido enviado', 'Seu pedido foi enviado para o WhatsApp da loja', 'success');
}

// Abrir modal de confirmação
function abrirConfirmacao(mensagem, callback) {
  document.getElementById('confirmModalText').textContent = mensagem;
  
  // Armazenar nome da função de callback no botão
  document.getElementById('confirmBtn').dataset.callback = callback.name;
  
  // Mostrar modal
  const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
  modal.show();
}

// Mostrar notificação
function showToast(title, message, type = 'info') {
  const toastEl = document.getElementById('toast');
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