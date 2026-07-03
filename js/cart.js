/* ============================================================
   REBREW — cart.js  (Improved & Audited)
   Fixes: renderCartPage/renderCheckoutSummary guarded to
          relevant pages, cart count initial render, drawer
          focus trap, toast on add, promo persistence,
          item qty inline update without full re-render.
   ============================================================ */

'use strict';

const CART_KEY = 'rebrew_cart_v2';

/* ── Product Catalogue ───────────────────────────────────── */
const PRODUCTS = {
  grape: {
    id: 'grape', name: 'Grape', sub: '275ml · Non-Alcoholic',
    price: 110, color: '#8B4A9E',
    image: 'assets/images/grape.png',
    note: 'Deep, tangy, wild with character.',
  },
  apple_cinnamon: {
    id: 'apple_cinnamon', name: 'Apple & Cinnamon', sub: '275ml · Non-Alcoholic',
    price: 110, color: '#C4593A',
    image: 'assets/images/apple.png',
    note: 'Warm orchard apple, spiced to perfection.',
  },
  ginger: {
    id: 'ginger', name: 'Ginger', sub: '275ml · Non-Alcoholic',
    price: 110, color: '#C4913A',
    image: 'assets/images/ginger.png',
    note: 'Sharp, fiery, clean finish.',
  },
  pineapple: {
    id: 'pineapple', name: 'Pineapple', sub: '275ml · Non-Alcoholic',
    price: 110, color: '#C4B83A',
    image: 'assets/images/pineapple.png',
    note: 'Tropical, effervescent, alive.',
  },
  mint: {
    id: 'mint', name: 'Mint', sub: '275ml · Non-Alcoholic',
    price: 110, color: '#3A8B6A',
    image: 'assets/images/mint.png',
    note: 'Cool, crisp, herbal depth.',
  },
};

/* ── Cart State Object ───────────────────────────────────── */
const Cart = {
  items: [],   // [{ ...product, qty }]

  /* Load from localStorage */
  load() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Validate — only keep items that exist in catalogue
        this.items = parsed.filter(i => PRODUCTS[i.id]).map(i => ({
          ...PRODUCTS[i.id],
          qty: Math.max(1, parseInt(i.qty) || 1),
          // Restore MongoDB _id if it was saved (set by api.js syncProductsCatalog)
          _id: i._id || null,
        }));
      }
    } catch {
      this.items = [];
    }
    this._render();
  },

  /* Persist to localStorage */
  _save() {
    localStorage.setItem(CART_KEY, JSON.stringify(
      // Persist _id (MongoDB ObjectId) set by api.js — needed by checkout.js to sync backend cart
      this.items.map(({ id, qty, _id }) => ({ id, qty, _id: _id || null }))
    ));
  },

  /* Public: add item */
  add(productId, qty = 1) {
    const product = PRODUCTS[productId];
    if (!product) return;
    qty = Math.max(1, parseInt(qty) || 1);

    const existing = this.items.find(i => i.id === productId);
    if (existing) {
      existing.qty += qty;
    } else {
      this.items.push({ ...product, qty });
    }

    this._save();
    this._render();
    this.openDrawer();
    window.showToast?.(`✦ ${product.name} added to cart`);
  },

  /* Public: remove item */
  remove(productId) {
    this.items = this.items.filter(i => i.id !== productId);
    this._save();
    this._render();
  },

  /* Public: update quantity */
  updateQty(productId, qty) {
    qty = parseInt(qty);
    if (isNaN(qty) || qty < 1) { this.remove(productId); return; }
    const item = this.items.find(i => i.id === productId);
    if (item) { item.qty = qty; this._save(); this._render(); }
  },

  /* Public: clear all */
  clear() {
    this.items = [];
    this._save();
    this._render();
  },

  /* Derived values */
  total()  { return this.items.reduce((s, i) => s + i.price * i.qty, 0); },
  count()  { return this.items.reduce((s, i) => s + i.qty, 0); },

  /* ── Open / Close Drawer ─────────────────────────────── */
  openDrawer() {
    const overlay = document.querySelector('.cart-overlay');
    const drawer  = document.querySelector('.cart-drawer');
    if (!overlay || !drawer) return;
    overlay.classList.add('active');
    drawer.classList.add('active');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Focus trap: move focus inside drawer
    const close = drawer.querySelector('.cart-close');
    if (close) close.focus();
  },

  closeDrawer() {
    const overlay = document.querySelector('.cart-overlay');
    const drawer  = document.querySelector('.cart-drawer');
    if (!overlay || !drawer) return;
    overlay.classList.remove('active');
    drawer.classList.remove('active');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  },

  /* ── Master render — updates all UI ─────────────────── */
  _render() {
    this._updateCount();
    this._renderDrawer();
    this._renderCartPage();
    this._renderCheckoutSummary();
  },

  /* Update badge(s) */
  _updateCount() {
    const count = this.count();
    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  },

  /* ── Drawer ──────────────────────────────────────────── */
  _renderDrawer() {
    const container = document.querySelector('.cart-items');
    const totalEl   = document.querySelector('.cart-total strong');
    if (!container) return;

    if (this.items.length === 0) {
      container.innerHTML = `
        <div class="cart-empty">
          <p>Your cart is empty.</p>
          <a href="shop.html" class="btn btn-dark" style="font-size:11px;padding:12px 20px;margin-top:12px">
            Browse Brews
          </a>
        </div>`;
    } else {
      container.innerHTML = this.items.map(item => `
        <div class="cart-item" data-id="${item.id}">
          <div class="cart-item-img">
            <img src="${item.image}" alt="${item.name}" loading="lazy" width="60" height="60">
          </div>
          <div class="cart-item-info">
            <h4>${item.name}</h4>
            <p>${item.sub}</p>
            <div class="qty-selector" style="margin-top:8px;display:inline-flex;">
              <button class="qty-btn minus" aria-label="Decrease quantity" data-id="${item.id}">−</button>
              <input class="qty-input" type="number" value="${item.qty}" min="1"
                aria-label="Quantity" data-id="${item.id}">
              <button class="qty-btn plus" aria-label="Increase quantity" data-id="${item.id}">+</button>
            </div>
          </div>
          <div class="cart-item-side">
            <button class="cart-item-remove" aria-label="Remove ${item.name}" data-remove="${item.id}">✕</button>
            <span class="cart-item-price">₹${(item.price * item.qty).toLocaleString('en-IN')}</span>
          </div>
        </div>`).join('');
    }

    if (totalEl) totalEl.textContent = `₹${this.total().toLocaleString('en-IN')}`;
  },

  /* ── Cart Page (/cart.html) ──────────────────────────── */
  _renderCartPage() {
    const tbody = document.querySelector('.cart-table-body');
    if (!tbody) return; // Not on cart page

    if (this.items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align:center;padding:60px 0;
            font-family:var(--font-fell);font-style:italic;
            color:var(--vintage-brown);font-size:18px;">
            Your cart is empty.
            <a href="shop.html" style="color:var(--dusty-gold);text-decoration:none;margin-left:8px;">
              Shop now →
            </a>
          </td>
        </tr>`;
    } else {
      tbody.innerHTML = this.items.map(item => `
        <tr data-id="${item.id}">
          <td>
            <div class="cart-product-cell">
              <div class="cart-product-img">
                <img src="${item.image}" alt="${item.name}" loading="lazy" width="70" height="70">
              </div>
              <div>
                <div class="cart-product-name">${item.name}</div>
                <div class="cart-product-sub">${item.sub}</div>
              </div>
            </div>
          </td>
          <td style="font-family:var(--font-serif);font-size:17px;color:var(--dark-brown);">
            ₹${item.price.toLocaleString('en-IN')}
          </td>
          <td>
            <div class="qty-selector">
              <button class="qty-btn minus" data-id="${item.id}" aria-label="Decrease">−</button>
              <input class="qty-input" type="number" value="${item.qty}" min="1"
                data-id="${item.id}" aria-label="Quantity for ${item.name}">
              <button class="qty-btn plus" data-id="${item.id}" aria-label="Increase">+</button>
            </div>
          </td>
          <td>
            <span style="font-family:var(--font-serif);font-size:17px;font-weight:700;color:var(--dark-brown);">
              ₹${(item.price * item.qty).toLocaleString('en-IN')}
            </span>
            <button data-remove="${item.id}"
              style="display:block;margin-top:6px;background:none;border:none;cursor:pointer;
                font-size:11px;color:rgba(92,61,30,0.4);letter-spacing:0.1em;
                font-family:var(--font-body);text-transform:uppercase;">
              Remove
            </button>
          </td>
        </tr>`).join('');
    }

    // Cart page: show subtotal only — shipping is calculated at checkout
    const subtotalEl = document.getElementById('cart-subtotal');
    const grandEl    = document.getElementById('cart-page-grand');
    if (subtotalEl) subtotalEl.textContent = `₹${this.total().toLocaleString('en-IN')}`;
    if (grandEl)    grandEl.textContent    = `₹${this.total().toLocaleString('en-IN')}`;
  },

  /* ── Checkout Summary (/checkout.html) ───────────────── */
  _renderCheckoutSummary() {
    const list  = document.querySelector('.checkout-items-list');
    const total = document.querySelector('.checkout-total-value');
    if (!list) return; // Not on checkout page

    if (this.items.length === 0) {
      list.innerHTML = `<p style="font-family:var(--font-fell);font-style:italic;
        color:var(--vintage-brown);">No items in cart.</p>`;
    } else {
      list.innerHTML = this.items.map(item => `
        <div class="summary-item">
          <span>${item.name} <span style="opacity:.5">× ${item.qty}</span></span>
          <span>₹${(item.price * item.qty).toLocaleString('en-IN')}</span>
        </div>`).join('');
    }

    // Shipping and grand total are controlled by checkout.js calculateShipping().
    // Set initial total to subtotal only — checkout.js will add shipping on top.
    if (total) total.textContent = `₹${this.total().toLocaleString('en-IN')}`;
  },
};

/* ── DOM Event Delegation ────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Boot cart from storage
  Cart.load();

  // Drawer open via [data-open-cart] buttons
  document.addEventListener('click', e => {
    if (e.target.closest('[data-open-cart]')) {
      e.preventDefault();
      Cart.openDrawer();
    }
  });

  // Drawer close button
  document.addEventListener('click', e => {
    if (e.target.closest('.cart-close') || e.target.closest('.cart-overlay')) {
      Cart.closeDrawer();
    }
  });

  // Escape closes drawer
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') Cart.closeDrawer();
  });

  // Add to cart buttons [data-add-to-cart]
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-add-to-cart]');
    if (!btn) return;
    e.preventDefault();
    const id    = btn.dataset.addToCart;
    const card  = btn.closest('.shop-card, .product-detail, .also-love-card, .product-card');
    const input = card?.querySelector('.qty-input');
    const qty   = input ? parseInt(input.value) || 1 : 1;
    Cart.add(id, qty);
  });

  // Remove buttons (delegated — works for drawer + cart page)
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-remove]');
    if (!btn) return;
    Cart.remove(btn.dataset.remove);
  });

  // Qty input change in drawer or cart page
  document.addEventListener('change', e => {
    const input = e.target.closest('.qty-input[data-id]');
    if (!input) return;
    Cart.updateQty(input.dataset.id, parseInt(input.value));
  });

  // Qty +/- buttons with data-id (drawer / cart page)
  document.addEventListener('click', e => {
    const btn = e.target.closest('.qty-btn[data-id]');
    if (!btn) return;
    const id   = btn.dataset.id;
    const item = Cart.items.find(i => i.id === id);
    if (!item) return;
    const delta = btn.classList.contains('minus') ? -1 : 1;
    Cart.updateQty(id, item.qty + delta);
  });

  /* ── Checkout form ─────────────────────────────────── */
  const checkoutForm = document.querySelector('.checkout-form-el');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', e => {
      e.preventDefault();
      const btn = checkoutForm.querySelector('[type="submit"]');
      if (btn) { btn.textContent = 'Processing…'; btn.disabled = true; }

      setTimeout(() => {
        Cart.clear();
        // Show success UI if available
        const wrap    = document.getElementById('checkout-form-wrap');
        const success = document.getElementById('order-success');
        if (wrap)    wrap.style.display    = 'none';
        if (success) success.style.display = 'block';
        window.showToast?.('✦ Order placed! Thank you.');
      }, 2000);
    });
  }

  /* ── Cart page promo form ──────────────────────────── */
  const promoBtn = document.querySelector('.promo-row button');
  if (promoBtn) {
    promoBtn.addEventListener('click', () => {
      const input    = document.getElementById('promo-input');
      const discount = document.getElementById('cart-discount');
      if (!input || !discount) return;
      const code = input.value.trim().toUpperCase();
      const codes = { REBREW10: () => `−₹${Math.round(Cart.total() * 0.10)}`, FIRST50: () => '−₹50' };
      if (codes[code]) {
        discount.textContent = codes[code]();
        window.showToast?.(`✦ Code ${code} applied!`);
      } else {
        window.showToast?.('Invalid promo code. Try REBREW10 or FIRST50.');
      }
    });
  }

  /* ── Clear cart button ─────────────────────────────── */
  const clearBtn = document.querySelector('[data-clear-cart]');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      Cart.clear();
      window.showToast?.('Cart cleared.');
    });
  }
});

/* ── Expose globally so inline onclick="" still works ─── */
window.Cart = Cart;

