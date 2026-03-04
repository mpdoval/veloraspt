/* =========================================
   VELORA SPORTS - GLOBAL UTILITIES
   Funções Centralizadas v1.0
   ========================================= */

/* =========================================
   1. AUTENTICAÇÃO E SEGURANÇA
========================================= */

/**
 * Verifica se o usuário está logado no painel administrativo
 * @returns {boolean} true se logado, false caso contrário
 */
function isAdminLogged() {
    return localStorage.getItem('velora_admin_logged') === 'true';
}

/**
 * Verifica se o usuário cliente está logado
 * @returns {boolean} true se logado, false caso contrário
 */
function isClientLogged() {
    return localStorage.getItem('velora_client_logged') === 'true';
}

/**
 * Faz login do usuário cliente
 * @param {string} email - Email ou CPF do usuário
 * @param {string} password - Senha do usuário
 * @returns {boolean} true se sucesso, false se falha
 */
function loginClient(email, password) {
    if (!email || !password) return false;
    
    // TODO: Integrar com API de autenticação
    localStorage.setItem('velora_client_logged', 'true');
    localStorage.setItem('velora_client_email', email);
    localStorage.setItem('velora_client_name', 'Usuário');
    
    return true;
}

/**
 * Faz logout do usuário cliente
 */
function logoutClient() {
    localStorage.removeItem('velora_client_logged');
    localStorage.removeItem('velora_client_email');
    localStorage.removeItem('velora_client_name');
    localStorage.removeItem('velora_wallet_balance');
    window.location.href = 'velora_sports.html';
}

/**
 * Faz logout do administrador
 */
function logoutAdmin() {
    localStorage.removeItem('velora_admin_logged');
    window.location.reload();
}

/**
 * Redireciona para login se não estiver autenticado
 * @param {string} redirectTo - URL para redirecionar após login (opcional)
 */
function requireAdminAuth(redirectTo = null) {
    if (!isAdminLogged()) {
        if (redirectTo) {
            localStorage.setItem('velora_redirect_after_login', redirectTo);
        }
        window.location.href = 'admin.html';
    }
}

/**
 * Redireciona para login se não estiver autenticado
 * @param {string} redirectTo - URL para redirecionar após login (opcional)
 */
function requireClientAuth(redirectTo = null) {
    if (!isClientLogged()) {
        if (redirectTo) {
            localStorage.setItem('velora_redirect_after_login', redirectTo);
        }
        window.location.href = 'login_cliente_pf.html';
    }
}

/* =========================================
   2. GESTÃO DO CARRINHO
========================================= */

/**
 * Obtém o carrinho do localStorage
 * @returns {Array} Array de itens do carrinho
 */
function getCart() {
    return JSON.parse(localStorage.getItem('velora_carrinho')) || [];
}

/**
 * Adiciona item ao carrinho
 * @param {Object} item - Objeto com dados do item
 * @param {string} item.id - ID único do item
 * @param {string} item.nome - Nome do item
 * @param {number} item.preco - Preço do item em R$
 * @param {string} item.foto - URL da foto
 * @param {number} item.qtd - Quantidade (padrão: 1)
 * @returns {boolean} true se sucesso
 */
function addToCart(item) {
    if (!item.id || !item.nome || !item.preco) {
        console.error('Item inválido:', item);
        return false;
    }
    
    const cart = getCart();
    const existingItem = cart.find(i => i.id === item.id);
    
    if (existingItem) {
        existingItem.qtd = (existingItem.qtd || 1) + (item.qtd || 1);
    } else {
        item.qtd = item.qtd || 1;
        cart.push(item);
    }
    
    localStorage.setItem('velora_carrinho', JSON.stringify(cart));
    updateCartBadge();
    
    return true;
}

/**
 * Remove item do carrinho
 * @param {string} itemId - ID do item a remover
 * @returns {boolean} true se sucesso
 */
function removeFromCart(itemId) {
    const cart = getCart();
    const index = cart.findIndex(i => i.id === itemId);
    
    if (index > -1) {
        cart.splice(index, 1);
        localStorage.setItem('velora_carrinho', JSON.stringify(cart));
        updateCartBadge();
        return true;
    }
    
    return false;
}

/**
 * Limpa o carrinho completamente
 */
function clearCart() {
    localStorage.removeItem('velora_carrinho');
    updateCartBadge();
}

/**
 * Calcula o total do carrinho
 * @returns {number} Total em R$
 */
function getCartTotal() {
    const cart = getCart();
    return cart.reduce((total, item) => {
        const price = item.preco || item.precoFinal || item.precoComDesconto || 0;
        return total + (price * (item.qtd || 1));
    }, 0);
}

/**
 * Atualiza o badge do carrinho na página
 */
function updateCartBadge() {
    const badge = document.getElementById('badgeCarrinho');
    if (badge) {
        const cart = getCart();
        const total = cart.reduce((sum, item) => sum + (item.qtd || 1), 0);
        badge.innerText = total;
    }
}

/* =========================================
   3. GESTÃO DA CARTEIRA V$ (MOEDA INTERNA)
========================================= */

// Taxa de conversão: 1 V$ = R$ 0,33
const VELORA_CONVERSION_RATE = 0.33;

/**
 * Obtém o saldo da carteira V$ do usuário
 * @returns {number} Saldo em V$
 */
function getWalletBalance() {
    return parseFloat(localStorage.getItem('velora_wallet_balance')) || 0;
}

/**
 * Define o saldo da carteira V$
 * @param {number} balance - Novo saldo em V$
 */
function setWalletBalance(balance) {
    localStorage.setItem('velora_wallet_balance', balance.toFixed(2));
    updateWalletDisplay();
}

/**
 * Adiciona V$ à carteira
 * @param {number} amount - Quantidade de V$ a adicionar
 * @param {string} reason - Motivo da adição
 * @returns {boolean} true se sucesso
 */
function addVeloras(amount, reason = 'Crédito') {
    if (amount <= 0) return false;
    
    const current = getWalletBalance();
    const newBalance = current + amount;
    
    // Registra no histórico
    recordVeloraTransaction('entrada', amount, reason);
    
    // Atualiza saldo
    setWalletBalance(newBalance);
    
    return true;
}

/**
 * Remove V$ da carteira
 * @param {number} amount - Quantidade de V$ a remover
 * @param {string} reason - Motivo da remoção
 * @returns {boolean} true se sucesso, false se saldo insuficiente
 */
function removeVeloras(amount, reason = 'Débito') {
    if (amount <= 0) return false;
    
    const current = getWalletBalance();
    
    if (current < amount) {
        console.warn('Saldo insuficiente de V$');
        return false;
    }
    
    const newBalance = current - amount;
    
    // Registra no histórico
    recordVeloraTransaction('saida', amount, reason);
    
    // Atualiza saldo
    setWalletBalance(newBalance);
    
    return true;
}

/**
 * Converte V$ para R$
 * @param {number} veloras - Quantidade de V$
 * @returns {number} Valor em R$
 */
function velorasToReais(veloras) {
    return parseFloat((veloras * VELORA_CONVERSION_RATE).toFixed(2));
}

/**
 * Converte R$ para V$
 * @param {number} reais - Valor em R$
 * @returns {number} Quantidade de V$
 */
function reaisToVeloras(reais) {
    return parseFloat((reais / VELORA_CONVERSION_RATE).toFixed(2));
}

/**
 * Registra uma transação de V$ no histórico
 * @param {string} type - 'entrada' ou 'saida'
 * @param {number} amount - Valor em V$
 * @param {string} reason - Motivo da transação
 */
function recordVeloraTransaction(type, amount, reason) {
    const history = JSON.parse(localStorage.getItem('velora_transaction_history')) || [];
    
    const transaction = {
        date: new Date().toISOString(),
        type: type,
        amount: amount,
        reason: reason,
        balance: getWalletBalance()
    };
    
    history.push(transaction);
    
    // Mantém apenas os últimos 100 registros
    if (history.length > 100) {
        history.shift();
    }
    
    localStorage.setItem('velora_transaction_history', JSON.stringify(history));
}

/**
 * Obtém o histórico de transações de V$
 * @returns {Array} Array de transações
 */
function getVeloraHistory() {
    return JSON.parse(localStorage.getItem('velora_transaction_history')) || [];
}

/**
 * Atualiza a exibição do saldo V$ na página
 */
function updateWalletDisplay() {
    const walletElements = document.querySelectorAll('[data-velora-balance]');
    const balance = getWalletBalance();
    
    walletElements.forEach(el => {
        el.innerText = `V$ ${balance.toFixed(2)}`;
    });
}

/* =========================================
   4. GESTÃO DE CUPONS
========================================= */

/**
 * Obtém a lista de cupons cadastrados
 * @returns {Array} Array de cupons
 */
function getCoupons() {
    return JSON.parse(localStorage.getItem('velora_coupons')) || [];
}

/**
 * Valida se um cupom pode ser aplicado
 * @param {string} code - Código do cupom
 * @param {string} target - Alvo do cupom ('all', 'store', 'event', 'product')
 * @param {string} targetId - ID do alvo (evento ou produto)
 * @returns {Object|null} Objeto do cupom se válido, null caso contrário
 */
function validateCoupon(code, target = 'all', targetId = null) {
    const coupons = getCoupons();
    const coupon = coupons.find(c => c.code.toUpperCase() === code.toUpperCase());
    
    if (!coupon) {
        console.warn('Cupom não encontrado:', code);
        return null;
    }
    
    // Verifica se o cupom é válido para o alvo
    if (coupon.target !== 'all') {
        if (coupon.target !== target) {
            console.warn('Cupom inválido para este alvo');
            return null;
        }
        
        if ((coupon.target === 'event' || coupon.target === 'product') && coupon.targetId !== targetId) {
            console.warn('Cupom inválido para este item específico');
            return null;
        }
    }
    
    // Verifica limite de uso
    if (coupon.limit && coupon.used >= coupon.limit) {
        console.warn('Cupom esgotado');
        return null;
    }
    
    return coupon;
}

/**
 * Aplica desconto de um cupom
 * @param {number} price - Preço original
 * @param {Object} coupon - Objeto do cupom
 * @returns {Object} { originalPrice, discount, finalPrice }
 */
function applyCouponDiscount(price, coupon) {
    let discount = 0;
    
    if (coupon.type === 'p') {
        // Desconto percentual
        discount = (price * coupon.value) / 100;
    } else if (coupon.type === 'f') {
        // Desconto fixo
        discount = coupon.value;
    }
    
    const finalPrice = Math.max(0, price - discount);
    
    return {
        originalPrice: price,
        discount: parseFloat(discount.toFixed(2)),
        finalPrice: parseFloat(finalPrice.toFixed(2))
    };
}

/**
 * Marca um cupom como usado
 * @param {string} code - Código do cupom
 */
function markCouponAsUsed(code) {
    const coupons = getCoupons();
    const coupon = coupons.find(c => c.code.toUpperCase() === code.toUpperCase());
    
    if (coupon) {
        coupon.used = (coupon.used || 0) + 1;
        localStorage.setItem('velora_coupons', JSON.stringify(coupons));
    }
}

/* =========================================
   5. UTILITÁRIOS DE FORMATAÇÃO
========================================= */

/**
 * Formata número como moeda em R$
 * @param {number} value - Valor a formatar
 * @returns {string} Valor formatado
 */
function formatCurrency(value) {
    return parseFloat(value).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

/**
 * Formata data para formato brasileiro
 * @param {string|Date} date - Data a formatar
 * @returns {string} Data formatada (DD/MM/YYYY)
 */
function formatDate(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Formata data e hora para formato brasileiro
 * @param {string|Date} date - Data a formatar
 * @returns {string} Data e hora formatadas (DD/MM/YYYY HH:MM)
 */
function formatDateTime(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/* =========================================
   6. INICIALIZAÇÃO GLOBAL
========================================= */

/**
 * Inicializa os componentes globais ao carregar a página
 */
document.addEventListener('DOMContentLoaded', function() {
    // Atualiza badge do carrinho
    updateCartBadge();
    
    // Atualiza exibição da carteira V$
    updateWalletDisplay();
    
    // Verifica se precisa redirecionar após login
    const redirectUrl = localStorage.getItem('velora_redirect_after_login');
    if (redirectUrl && isClientLogged()) {
        localStorage.removeItem('velora_redirect_after_login');
        window.location.href = redirectUrl;
    }
});

/* =========================================
   7. EXPORTAÇÕES (para uso em módulos)
========================================= */

// Torna as funções globais acessíveis
window.VeloraUtils = {
    // Autenticação
    isAdminLogged,
    isClientLogged,
    loginClient,
    logoutClient,
    logoutAdmin,
    requireAdminAuth,
    requireClientAuth,
    
    // Carrinho
    getCart,
    addToCart,
    removeFromCart,
    clearCart,
    getCartTotal,
    updateCartBadge,
    
    // Carteira V$
    getWalletBalance,
    setWalletBalance,
    addVeloras,
    removeVeloras,
    velorasToReais,
    reaisToVeloras,
    recordVeloraTransaction,
    getVeloraHistory,
    updateWalletDisplay,
    VELORA_CONVERSION_RATE,
    
    // Cupons
    getCoupons,
    validateCoupon,
    applyCouponDiscount,
    markCouponAsUsed,
    
    // Formatação
    formatCurrency,
    formatDate,
    formatDateTime
};
