// assets/js/app.js
// Millat shared site logic — product listing, cart, WhatsApp order
// WhatsApp number: +91 7439117965 (set as whatsappNumber below)

(function () {
  // ====== CONFIG ======
  // Use country code + number, but WITHOUT any '+' or spaces for wa.me (e.g. '919123456789')
  const whatsappNumber = "917439117965";

  // Path to placeholder image used when product image fails
  const placeholderImage = "assets/images/placeholder.png";

  // ====== Utility helpers ======
  function imgPath(path) {
    // Encode URI but preserve slashes
    try {
      return encodeURI(path);
    } catch (e) {
      return path;
    }
  }

  function escapeHtml(str) {
    return String(str || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  // ====== Fetch products ======
  async function fetchProducts() {
    const res = await fetch('data/products.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Could not load products.json');
    return res.json();
  }

  // ====== CART storage helpers ======
  const STORAGE_KEY = 'millat_cart';

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    updateCartCount();
  }

  function updateCartCount() {
    const el = document.getElementById('cart-count');
    if (!el) return;
    const cart = getCart();
    const count = cart.reduce((s, it) => s + Number(it.qty || 0), 0);
    el.textContent = count;
  }

  // ====== TOAST ======
  function toast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    Object.assign(t.style, {
      position: 'fixed',
      right: '16px',
      bottom: '16px',
      background: '#0b1220',
      color: '#fff',
      padding: '10px 14px',
      borderRadius: '10px',
      zIndex: 9999,
      boxShadow: '0 8px 20px rgba(2,6,23,0.2)',
      opacity: '0',
      transition: 'opacity 180ms ease'
    });
    document.body.appendChild(t);
    requestAnimationFrame(() => (t.style.opacity = '0.98'));
    setTimeout(() => (t.style.opacity = '0'), 1800);
    setTimeout(() => t.remove(), 2100);
  }

  // ====== ADD TO CART ======
  function addToCart(product, qty) {
    qty = Number(qty) || 1;
    const cart = getCart();
    const idx = cart.findIndex(it => it.id === product.id);
    if (idx >= 0) {
      cart[idx].qty = Number(cart[idx].qty || 0) + qty;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: Number(product.price) || 0,
        image: product.image,
        qty: qty
      });
    }
    saveCart(cart);
    toast(`${product.name} added (×${qty})`);
  }

  // ====== PRODUCT RENDER ======
  async function renderProducts(products, highlightNew = false) {
    const container = document.getElementById('products');
    if (!container) return;
    container.innerHTML = '';

    if (!products || products.length === 0) {
      container.innerHTML = '<div class="card product-card"><div class="product-body center"><p class="cart-empty">No products found.</p></div></div>';
      return;
    }

    products.forEach(p => {
      const card = document.createElement('article');
      card.className = 'card product-card';

      card.innerHTML = `
        <div class="product-media">
          <img alt="${escapeHtml(p.name)}" src="${imgPath(p.image)}" loading="lazy" onerror="this.onerror=null;this.src='${placeholderImage}'">
        </div>
        <div class="product-body">
          <div class="product-title">
            <h3>${escapeHtml(p.name)}</h3>
            ${p.featured ? '<span class="new-badge">Featured</span>' : ''}
          </div>
          <div class="product-desc">${escapeHtml(p.desc || '')}</div>
          <div class="price-row">
            <div class="price">₹${Number(p.price).toFixed(0)}</div>
            <div class="controls">
              <div class="qty-wrap" data-id="${p.id}">
                <button class="qty-btn minus" aria-label="Decrease">−</button>
                <div class="qty-num">1</div>
                <button class="qty-btn plus" aria-label="Increase">+</button>
              </div>
              <button class="btn add-btn small" data-id="${p.id}">Add</button>
            </div>
          </div>
        </div>
      `;

      container.appendChild(card);

      // qty logic
      const qtyWrap = card.querySelector('.qty-wrap');
      const minus = qtyWrap.querySelector('.minus');
      const plus = qtyWrap.querySelector('.plus');
      const num = qtyWrap.querySelector('.qty-num');
      let qty = 1;

      minus.addEventListener('click', () => {
        qty = Math.max(1, qty - 1);
        num.textContent = qty;
      });
      plus.addEventListener('click', () => {
        qty = qty + 1;
        num.textContent = qty;
      });

      const addBtn = card.querySelector('.add-btn');
      addBtn.addEventListener('click', () => addToCart(p, qty));
    });
  }

  // ====== CART RENDER ======
  function renderCart() {
    const area = document.getElementById('cart-area');
    const summary = document.getElementById('order-summary');
    if (!area || !summary) return;

    const cart = getCart();
    area.innerHTML = '';
    summary.innerHTML = '';

    if (!cart.length) {
      area.innerHTML = '<div class="card"><div class="product-body cart-empty"><p>Your cart is empty.</p><p class="text-muted">Browse products and add items to your cart.</p></div></div>';
      summary.innerHTML = '';
      updateCartCount();
      return;
    }

    // build table
    const table = document.createElement('table');
    table.className = 'cart-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Product</th><th>Qty</th><th>Price</th><th>Subtotal</th><th></th></tr>';
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    let total = 0;

    cart.forEach((it, index) => {
      const subtotal = Number(it.price) * Number(it.qty || 0);
      total += subtotal;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="max-width:320px">
          <div style="display:flex;gap:10px;align-items:center">
            <img src="${imgPath(it.image)}" alt="${escapeHtml(it.name)}" style="width:64px;height:64px;object-fit:cover;border-radius:8px" onerror="this.onerror=null;this.src='${placeholderImage}'"/>
            <div style="min-width:0">
              <div style="font-weight:700">${escapeHtml(it.name)}</div>
            </div>
          </div>
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:6px">
            <button class="qty-btn" data-action="dec" data-index="${index}">−</button>
            <div>${it.qty}</div>
            <button class="qty-btn" data-action="inc" data-index="${index}">+</button>
          </div>
        </td>
        <td>₹${Number(it.price).toFixed(0)}</td>
        <td>₹${subtotal.toFixed(0)}</td>
        <td><button data-action="remove" data-index="${index}" class="qty-btn">❌</button></td>
      `;
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    area.appendChild(table);

    // summary area
    const summaryInner = document.createElement('div');
summaryInner.innerHTML = `
  <div style="font-weight:700;font-size:1.05rem">Order Summary</div>
  <div class="summary-row"><div class="text-muted">Items</div><div>${cart.length}</div></div>
  <div class="summary-row"><div class="text-muted">Total</div><div>₹${total.toFixed(0)}</div></div>
  <div style="margin-top:12px">
    <a id="wa-order-btn" class="btn" target="_blank" rel="noopener">Send Order via WhatsApp</a>
    <button id="clear-cart" class="btn ghost small" style="margin-left:8px">Clear Cart</button>
  </div>
  <div class="text-muted" style="margin-top:6px;font-size:0.32rem;opacity:0.50;line-height:0.9">
    After you send the message, we will confirm availability and prepare the order for pickup.
  </div>
  <div class="text-muted" style="margin-top:3px;font-size:0.32rem;opacity:0.50;line-height:0.9">
    The billed amount shown is not the actual amount to be paid; other charges may apply.
  </div>
`;
summary.appendChild(summaryInner);
    
    // events: increment/decrement/remove
    tbody.addEventListener('click', (ev) => {
      const btn = ev.target.closest('button');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const idx = Number(btn.getAttribute('data-index'));
      if (action === 'inc') modifyQty(idx, +1);
      else if (action === 'dec') modifyQty(idx, -1);
      else if (action === 'remove') removeItem(idx);
    });

    document.getElementById('clear-cart').addEventListener('click', () => {
      if (!confirm('Clear your cart?')) return;
      localStorage.removeItem(STORAGE_KEY);
      renderCart();
      updateCartCount();
    });

    // WhatsApp button setup
    const waBtn = document.getElementById('wa-order-btn');
    const waText = buildWhatsAppText(cart, total);
    // Use wa.me with number parameter (no + or spaces)
    waBtn.href = `https://wa.me/${7439117965}?text=${encodeURIComponent(waText)}`;

    updateCartCount();
  }

  function modifyQty(index, change) {
    const cart = getCart();
    if (!cart[index]) return;
    cart[index].qty = Math.max(1, Number(cart[index].qty || 0) + change);
    saveCart(cart);
    renderCart();
  }

  function removeItem(index) {
    const cart = getCart();
    cart.splice(index, 1);
    saveCart(cart);
    renderCart();
  }

  // Build the WhatsApp message text; buyer must replace name/phone/pickup placeholders
  function buildWhatsAppText(cart, total) {
    const lines = [];
    lines.push('Hi Millat team, I want to place an order:');
    cart.forEach(it => {
      lines.push(`${it.qty} × ${it.name} — ₹${Number(it.price).toFixed(0)}`);
    });
    lines.push('');
    lines.push(`Total: ₹${Number(total).toFixed(0)}`);
    lines.push('Name: [your name]');
    lines.push('Phone: [your phone]');
    lines.push('Pickup: [in-store / delivery]');
    return lines.join('\n');
  }

  // ====== Public API ======
  window.loadProducts = async function (opts) {
    opts = opts || {};
    const filter = opts.filter || null;
    const highlightNew = !!opts.highlightNew;
    try {
      const products = await fetchProducts();
      const list = filter ? products.filter(filter) : products;
      await renderProducts(list, highlightNew);
      updateCartCount();
    } catch (e) {
      console.error(e);
      const container = document.getElementById('products');
      if (container) container.innerHTML = '<div class="card product-card"><div class="product-body center"><p class="cart-empty">Unable to load products.</p></div></div>';
    }
  };

  window.renderCart = function () {
    updateCartCount();
    renderCart();
  };

  // init
  document.addEventListener('DOMContentLoaded', updateCartCount);

  // expose addToCart for debugging
  window.addToCart = addToCart;
})();
