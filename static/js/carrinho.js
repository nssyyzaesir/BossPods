// Global variables
let carrinho = [];
let serverMode = true;
const WhatsAppPhone = "5511999999999"; // Número do WhatsApp para envio do pedido
const apiUrl = '/api';

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
  // Carregar carrinho do localStorage
  carregarCarrinho();
  
  // Configurar eventos
  document.getElementById('clearCartBtn').addEventListener('click', function() {
    abrirConfirmacao('Tem certeza que deseja limpar o carrinho?', limparCarrinho);
  });
  
  document.getElementById('sendOrderBtn').addEventListener('click', enviarPedidoWhatsApp);
  
  // Admin link
  document.getElementById('adminLink').addEventListener('click', function(e) {
    e.preventDefault();
    window.location.href = '/admin';
  });
});

// Funções
function carregarCarrinho() {
  const carrinhoSalvo = localStorage.getItem('carrinho');
  
  if (carrinhoSalvo) {
    carrinho = JSON.parse(carrinhoSalvo);
    renderizarCarrinho();
  } else {
    mostrarMensagemCarrinhoVazio();
  }
}

function salvarCarrinho() {
  localStorage.setItem('carrinho', JSON.stringify(carrinho));
}

function renderizarCarrinho() {
  const container = document.getElementById('cartItems');
  
  if (carrinho.length === 0) {
    mostrarMensagemCarrinhoVazio();
    return;
  }
  
  let html = '';
  let subtotal = 0;
  let totalItens = 0;
  
  carrinho.forEach((item, index) => {
    const produto = item.produto;
    const valorTotal = produto.preco * item.quantidade;
    subtotal += valorTotal;
    totalItens += item.quantidade;
    
    html += `
      <div class="cyber-card mb-3">
        <div class="cyber-card-body">
          <div class="row align-items-center">
            <div class="col-md-2 col-sm-3 mb-3 mb-md-0">
              <img src="${produto.imagem || '/static/img/no-image.png'}" alt="${produto.nome}" class="img-fluid rounded">
            </div>
            <div class="col-md-4 col-sm-9 mb-3 mb-md-0">
              <h5>${produto.nome}</h5>
              <p class="mb-0 text-muted">
                <small>
                  ${produto.categoria ? `Categoria: ${produto.categoria}` : ''}
                  ${produto.em_promocao ? '<span class="cyber-badge cyber-badge-discount ms-2">PROMOÇÃO</span>' : ''}
                </small>
              </p>
            </div>
            <div class="col-6 col-md-2 text-md-center">
              <p class="mb-1">Preço:</p>
              <h6>R$ ${produto.preco.toFixed(2)}</h6>
            </div>
            <div class="col-6 col-md-2 text-md-center">
              <p class="mb-1">Quantidade:</p>
              <div class="input-group cart-quantity">
                <button class="btn cyber-btn-sm cyber-btn-outline btn-decrease" data-index="${index}">-</button>
                <input type="number" class="form-control cyber-input text-center quantity-input" value="${item.quantidade}" min="1" data-index="${index}">
                <button class="btn cyber-btn-sm cyber-btn-outline btn-increase" data-index="${index}">+</button>
              </div>
            </div>
            <div class="col-md-2 text-md-end mt-3 mt-md-0">
              <button class="btn cyber-btn-sm cyber-btn-danger btn-remove" data-index="${index}">
                <i class="bi bi-trash"></i> Remover
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
  
  // Mostrar painel de checkout
  document.getElementById('checkoutPanel').style.display = 'block';
  document.getElementById('clearCartContainer').style.display = 'block';
  document.getElementById('emptyCartMessage').style.display = 'none';
  
  // Atualizar valores
  document.getElementById('subtotalValue').textContent = `R$ ${subtotal.toFixed(2)}`;
  document.getElementById('totalValue').textContent = `R$ ${subtotal.toFixed(2)}`;
  document.getElementById('itemCount').textContent = totalItens;
  
  // Adicionar eventos aos botões
  document.querySelectorAll('.btn-decrease').forEach(btn => {
    btn.addEventListener('click', function() {
      const index = parseInt(this.getAttribute('data-index'));
      diminuirQuantidade(index);
    });
  });
  
  document.querySelectorAll('.btn-increase').forEach(btn => {
    btn.addEventListener('click', function() {
      const index = parseInt(this.getAttribute('data-index'));
      aumentarQuantidade(index);
    });
  });
  
  document.querySelectorAll('.quantity-input').forEach(input => {
    input.addEventListener('change', function() {
      const index = parseInt(this.getAttribute('data-index'));
      atualizarQuantidade(index, parseInt(this.value));
    });
  });
  
  document.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', function() {
      const index = parseInt(this.getAttribute('data-index'));
      abrirConfirmacao('Tem certeza que deseja remover este item?', () => removerItem(index));
    });
  });
}

function mostrarMensagemCarrinhoVazio() {
  document.getElementById('cartItems').innerHTML = `
    <div class="text-center py-5" id="emptyCartMessage">
      <i class="bi bi-cart-x" style="font-size: 4rem; color: var(--primary-glow);"></i>
      <p class="mt-3 mb-4">Seu carrinho está vazio</p>
      <a href="/" class="btn cyber-btn cyber-btn-primary">Ver Produtos</a>
    </div>
  `;
  
  document.getElementById('checkoutPanel').style.display = 'none';
  document.getElementById('clearCartContainer').style.display = 'none';
}

function aumentarQuantidade(index) {
  if (index >= 0 && index < carrinho.length) {
    carrinho[index].quantidade += 1;
    salvarCarrinho();
    renderizarCarrinho();
  }
}

function diminuirQuantidade(index) {
  if (index >= 0 && index < carrinho.length) {
    if (carrinho[index].quantidade > 1) {
      carrinho[index].quantidade -= 1;
      salvarCarrinho();
      renderizarCarrinho();
    } else {
      abrirConfirmacao('Deseja remover este item do carrinho?', () => removerItem(index));
    }
  }
}

function atualizarQuantidade(index, quantidade) {
  if (index >= 0 && index < carrinho.length) {
    if (quantidade > 0) {
      carrinho[index].quantidade = quantidade;
      salvarCarrinho();
      renderizarCarrinho();
    } else {
      abrirConfirmacao('Deseja remover este item do carrinho?', () => removerItem(index));
    }
  }
}

function removerItem(index) {
  if (index >= 0 && index < carrinho.length) {
    carrinho.splice(index, 1);
    salvarCarrinho();
    renderizarCarrinho();
    
    if (carrinho.length === 0) {
      mostrarMensagemCarrinhoVazio();
    }
    
    mostrarNotificacao('Item removido', 'O item foi removido do carrinho.');
  }
}

function limparCarrinho() {
  carrinho = [];
  salvarCarrinho();
  mostrarMensagemCarrinhoVazio();
  mostrarNotificacao('Carrinho limpo', 'Todos os itens foram removidos do carrinho.');
}

function enviarPedidoWhatsApp() {
  if (carrinho.length === 0) return;
  
  let mensagem = "*Novo Pedido BOSSPODS*\n\n";
  
  // Adicionar itens
  mensagem += "*Produtos:*\n";
  carrinho.forEach((item, index) => {
    mensagem += `${index + 1}. *${item.produto.nome}*\n`;
    mensagem += `   - Quantidade: ${item.quantidade}\n`;
    mensagem += `   - Preço unitário: R$ ${item.produto.preco.toFixed(2)}\n`;
    mensagem += `   - Subtotal: R$ ${(item.produto.preco * item.quantidade).toFixed(2)}\n\n`;
  });
  
  // Adicionar total
  const valorTotal = carrinho.reduce((total, item) => total + (item.produto.preco * item.quantidade), 0);
  mensagem += "*Valor Total:* R$ " + valorTotal.toFixed(2);
  
  // Adicionar mensagem para cliente preencher os dados
  mensagem += "\n\n*Dados para Entrega:*\n";
  mensagem += "Nome: \n";
  mensagem += "Endereço: \n";
  mensagem += "Telefone: \n";
  mensagem += "Método de Pagamento: ";
  
  // Encodar mensagem para URL
  const mensagemCodificada = encodeURIComponent(mensagem);
  
  // Gerar link do WhatsApp
  const linkWhatsApp = `https://wa.me/${WhatsAppPhone}?text=${mensagemCodificada}`;
  
  // Abrir link
  window.open(linkWhatsApp, '_blank');
}

function abrirConfirmacao(mensagem, callback) {
  document.getElementById('confirmationMessage').textContent = mensagem;
  
  // Limpar eventos anteriores para evitar duplicação
  const btnConfirm = document.getElementById('confirmButton');
  const novoBtn = btnConfirm.cloneNode(true);
  btnConfirm.parentNode.replaceChild(novoBtn, btnConfirm);
  
  // Adicionar novo evento
  document.getElementById('confirmButton').addEventListener('click', function() {
    callback();
    const modal = bootstrap.Modal.getInstance(document.getElementById('confirmationModal'));
    modal.hide();
  });
  
  // Abrir modal
  const modal = new bootstrap.Modal(document.getElementById('confirmationModal'));
  modal.show();
}

function mostrarNotificacao(titulo, mensagem) {
  document.getElementById('toastTitle').textContent = titulo;
  document.getElementById('toastMessage').textContent = mensagem;
  
  const toast = new bootstrap.Toast(document.getElementById('notificationToast'));
  toast.show();
}