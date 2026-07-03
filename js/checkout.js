/* ============================================================
   REBREW — checkout.js
   Razorpay payment integration.

   Flow:
     1. Validate form fields
     2. Register or login user → get JWT
     3. Sync localStorage cart → backend cart (POST /cart/add)
     4. POST /payments/create-order → { razorpayOrderId, keyId, amount }
     5. Open Razorpay Checkout modal
     6. On payment success → POST /payments/verify → signature verified server-side
     7. Show order confirmation, clear cart

   Supports: UPI, Google Pay, PhonePe, Paytm, Cards, Net Banking
   API_BASE_URL and FLAVOR_META come from api.js (loaded first).
   Cart object comes from cart.js (loaded before this file).
   ============================================================ */

'use strict';

/* ── Auth token helpers ──────────────────────────────────── */
const AUTH_KEY = 'rebrew_auth_v1';

function getStoredAuth() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY)) || null; } catch { return null; }
}
function setStoredAuth(data) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(data));
}
function clearStoredAuth() {
  localStorage.removeItem(AUTH_KEY);
}

/* ── Authenticated fetch helper ──────────────────────────── */
async function apiFetch(path, options = {}) {
  const auth    = getStoredAuth();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (auth?.accessToken) headers['Authorization'] = `Bearer ${auth.accessToken}`;

  const res  = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const json = await res.json();
  return { ok: res.ok, status: res.status, json };
}

/* ── Register or login, return accessToken ───────────────── */
async function ensureAuth(email, firstName, lastName, phone) {
  // 1. Check stored token
  const auth = getStoredAuth();
  if (auth?.accessToken) {
    const { ok } = await apiFetch('/auth/profile');
    if (ok) return auth.accessToken;
    clearStoredAuth();
  }

  // 2. Try register
  const name = `${firstName} ${lastName}`.trim();
  const { ok: regOk, status: regStatus, json: regJson } = await apiFetch('/auth/register', {
    method: 'POST',
    body:   JSON.stringify({
      name,
      email,
      password: `Rb${phone.replace(/\D/g, '').slice(-6)}@1`,
      phone,
    }),
  });

  if (regOk) {
    setStoredAuth({ accessToken: regJson.data.accessToken, email, name });
    return regJson.data.accessToken;
  }

  // 3. Email already exists — try auto-generated password
  if (regStatus === 409) {
    const autoPass = `Rb${phone.replace(/\D/g, '').slice(-6)}@1`;
    const { ok: loginOk, json: loginJson } = await apiFetch('/auth/login', {
      method: 'POST',
      body:   JSON.stringify({ email, password: autoPass }),
    });

    if (loginOk) {
      setStoredAuth({ accessToken: loginJson.data.accessToken, email, name });
      return loginJson.data.accessToken;
    }

    throw { needsPassword: true, email };
  }

  throw new Error(regJson.message || 'Could not create account. Please try again.');
}

/* ── Sync localStorage cart → backend cart ───────────────── */
async function syncCartToBackend() {
  const items = Cart.items;
  if (!items.length) throw new Error('Your cart is empty.');

  await apiFetch('/cart/clear', { method: 'DELETE' });

  for (const item of items) {
    const { ok, json } = await apiFetch('/cart/add', {
      method: 'POST',
      body:   JSON.stringify({ productId: item._id || item.id, quantity: item.qty }),
    });
    if (!ok) throw new Error(json.message || `Could not add ${item.name} to cart.`);
  }
}

/* ── Shipping calculator ─────────────────────────────────── */
function calculateShipping(city, state) {

    const subtotal = Cart.total();

    city = (city || "").trim().toLowerCase();
    state = (state || "").trim().toLowerCase();

    if (subtotal >= 1000) {
        return {
            shippingCost: 0,
            deliveryEstimate:
                city === "coimbatore"
                    ? "Within 2 Hours"
                    : "Free Delivery"
        };
    }

    if (city === "coimbatore") {
        return {
            shippingCost: 100,
            deliveryEstimate: "Within 2 Hours"
        };
    }

    if (state === "tamil nadu") {
        return {
            shippingCost: 200,
            deliveryEstimate: "1–2 Business Days"
        };
    }

    return {
        shippingCost: 300,
        deliveryEstimate: "2–5 Business Days"
    };
}

/* ── Update checkout summary ─────────────────────────────── */
function updateShippingDisplay() {
  const city  = document.getElementById('city')?.value  || '';
  const state = document.getElementById('state')?.value || '';
  const { shippingCost, deliveryEstimate } = calculateShipping(city, state);

  const shippingEl = document.getElementById('checkout-shipping-cost');
  const estimateEl = document.getElementById('checkout-delivery-estimate');
  const totalEl    = document.querySelector('.checkout-total-value');

  if (shippingEl) shippingEl.textContent = `₹${shippingCost}`;
  if (estimateEl) estimateEl.textContent = deliveryEstimate;

  if (totalEl) {
    const subtotal = typeof Cart !== 'undefined' ? Cart.total() : 0;
    totalEl.textContent = `₹${(subtotal + shippingCost).toLocaleString('en-IN')}`;
  }
}

/* ── Build shippingAddress from form ─────────────────────── */
function buildShippingAddress() {
  const v = (id) => (document.getElementById(id)?.value || '').trim();
  return {
    fullName: `${v('first-name')} ${v('last-name')}`.trim(),
    line1:    v('address'),
    city:     v('city'),
    state:    v('state'),
    pincode:  v('pincode'),
    country:  'India',
    phone:    v('phone'),
  };
}

/* ── Form validation ─────────────────────────────────────── */
function validateForm() {
  const required = [
    ['first-name', 'First name'],
    ['last-name',  'Last name'],
    ['email',      'Email'],
    ['phone',      'Phone'],
    ['address',    'Address'],
    ['city',       'City'],
    ['state',      'State'],
    ['pincode',    'PIN code'],
  ];

  for (const [id, label] of required) {
    const el = document.getElementById(id);
    if (!el || !el.value.trim()) { el?.focus(); return `${label} is required.`; }
  }

  const email   = document.getElementById('email').value.trim();
  const pincode = document.getElementById('pincode').value.trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.';
  if (!/^\d{6}$/.test(pincode))                    return 'PIN code must be exactly 6 digits.';
  if (Cart.items.length === 0)                      return 'Your cart is empty. Add some brews first.';

  return null;
}

/* ── UI helpers ──────────────────────────────────────────── */
function setBtn(text, disabled = false) {
  const btn = document.getElementById('place-order-btn');
  if (!btn) return;
  btn.textContent = text;
  btn.disabled    = disabled;
}

function showError(msg) {
  let el = document.getElementById('checkout-error');
  if (!el) {
    el = document.createElement('div');
    el.id = 'checkout-error';
    el.style.cssText = [
      'background:rgba(107,39,55,0.08)',
      'border:1.5px solid var(--burgundy)',
      'color:var(--burgundy)',
      'padding:14px 20px',
      'margin-bottom:20px',
      'font-family:var(--font-body)',
      'font-size:13px',
      'line-height:1.5',
    ].join(';');
    document.getElementById('checkout-form')?.insertBefore(el, el.firstChild);
  }
  el.textContent = msg;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function clearError() {
  document.getElementById('checkout-error')?.remove();
}

function showSuccess(orderNumber) {
  const wrap    = document.getElementById('checkout-form-wrap');
  const success = document.getElementById('order-success');
  if (wrap)    wrap.style.display    = 'none';
  if (success) success.style.display = 'block';

  if (orderNumber) {
    const h2   = success?.querySelector('h2');
    const note = success?.querySelector('p:last-of-type');
    if (h2)   h2.textContent   = 'Order Confirmed!';
    if (note) note.textContent = `Order reference: ${orderNumber}`;
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Open Razorpay Checkout modal ────────────────────────── */
function openRazorpay(orderData, shippingAddress, orderNumber) {
  const options = {
    key:          orderData.keyId,
    amount:       orderData.amount,          // in paise
    currency:     orderData.currency || 'INR',
    name:         'ReBrew',
    description:  'Premium Non-Alcoholic Fermented Fruit Soda',
    order_id:     orderData.razorpayOrderId, // Razorpay order ID

    // Prefilled customer details
    prefill: {
      name:    orderData.prefill?.name    || '',
      email:   orderData.prefill?.email   || '',
      contact: orderData.prefill?.contact || '',
    },

    // Accepted payment methods
    method: {
      upi:        true,
      card:       true,
      netbanking: true,
      wallet:     true,
      emi:        false,
    },

    // UPI apps shown in the modal
    config: {
      display: {
        blocks: {
          banks: {
            name:       'Pay via UPI or Card',
            instruments: [
              { method: 'upi' },
              { method: 'card' },
              { method: 'netbanking' },
              { method: 'wallet', wallets: ['paytm', 'phonepe', 'amazonpay'] },
            ],
          },
        },
        sequence:     ['block.banks'],
        preferences:  { show_default_blocks: false },
      },
    },

    // Branding
    theme: { color: '#3B2410' },

    // Notes stored on Razorpay dashboard for reference
    notes: {
      address:     shippingAddress.line1,
      city:        shippingAddress.city,
      orderNumber: orderNumber,
    },

    /* ── Payment success handler ─────────────────────────── */
    handler: async function (response) {
      // Razorpay calls this AFTER payment is captured on their end.
      // We MUST verify the signature server-side before marking paid.
      setBtn('Verifying payment…', true);

      const { ok, json } = await apiFetch('/payments/verify', {
        method: 'POST',
        body:   JSON.stringify({
          razorpay_order_id:   response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature:  response.razorpay_signature,
        }),
      });

      if (!ok) {
        showError(
          json.message ||
          'Payment was received but verification failed. Please contact support with your payment ID: ' +
          response.razorpay_payment_id
        );
        setBtn('Place Order →', false);
        return;
      }

      // Server verified signature — payment is confirmed
      Cart.clear();
      showSuccess(json.data?.orderNumber || orderNumber || '');
      window.showToast?.('✦ Order confirmed! Check your email for details.');
    },

    /* ── Modal dismissed without payment ────────────────── */
    modal: {
      ondismiss: function () {
        setBtn('Place Order →', false);
        window.showToast?.('Payment cancelled. Your cart is saved.');
      },
    },
  };

  // Razorpay SDK is loaded via <script> in checkout.html
  const rzp = new window.Razorpay(options);

  // Handle payment failures inside the modal
  rzp.on('payment.failed', function (response) {
    const desc = response.error?.description || 'Payment failed.';
    showError(`Payment failed: ${desc}. Please try again.`);
    setBtn('Place Order →', false);
  });

  rzp.open();
}

/* ── Password prompt for returning users ─────────────────── */
let _pendingSubmit = null;

function showPasswordPrompt(email) {
  if (document.getElementById('existing-account-prompt')) return;

  const wrap = document.createElement('div');
  wrap.id    = 'existing-account-prompt';
  wrap.style.cssText = [
    'background:var(--aged-paper)',
    'border:1.5px solid var(--dusty-gold)',
    'padding:20px 24px',
    'margin-bottom:20px',
    'font-family:var(--font-body)',
    'font-size:13px',
  ].join(';');

  wrap.innerHTML = `
    <p style="color:var(--dark-brown);font-weight:600;margin-bottom:8px;">Account found for ${email}</p>
    <p style="color:var(--vintage-brown);margin-bottom:14px;font-size:12px;">Enter your ReBrew password to continue:</p>
    <div style="display:flex;gap:0;">
      <input type="password" id="existing-password" placeholder="Your password"
        style="flex:1;padding:12px 14px;border:1.5px solid rgba(92,61,30,0.2);background:var(--cream);
               font-family:var(--font-body);font-size:14px;color:var(--dark-brown);outline:none;min-height:44px;">
      <button id="existing-password-btn"
        style="padding:12px 20px;background:var(--dark-brown);color:var(--cream);border:none;cursor:pointer;
               font-family:var(--font-body);font-size:11px;letter-spacing:0.15em;text-transform:uppercase;min-height:44px;">
        Continue
      </button>
    </div>
    <p style="margin-top:8px;font-size:11px;color:rgba(92,61,30,0.4);">
      <a href="#" id="forgot-pw-link" style="color:var(--dusty-gold);">Forgot password?</a>
    </p>`;

  document.getElementById('checkout-form')?.insertBefore(wrap, wrap.firstChild);
  document.getElementById('existing-password')?.focus();

  document.getElementById('existing-password-btn')?.addEventListener('click', async () => {
    const password = (document.getElementById('existing-password')?.value || '').trim();
    if (!password) return;

    setBtn('Verifying…', true);
    const { ok, json } = await apiFetch('/auth/login', {
      method: 'POST',
      body:   JSON.stringify({ email, password }),
    });

    if (!ok) {
      showError(json.message || 'Incorrect password. Please try again.');
      setBtn('Place Order →', false);
      return;
    }

    setStoredAuth({ accessToken: json.data.accessToken, email });
    wrap.remove();
    clearError();
    if (_pendingSubmit) await _pendingSubmit(json.data.accessToken);
  });

  document.getElementById('forgot-pw-link')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await apiFetch('/auth/forgot-password', {
      method: 'POST',
      body:   JSON.stringify({ email }),
    });
    window.showToast?.('Password reset link sent to ' + email);
  });
}

/* ── Main submit handler ─────────────────────────────────── */
async function handleCheckoutSubmit(e) {
  e.preventDefault();
  clearError();

  const formError = validateForm();
  if (formError) { showError(formError); return; }

  const email     = document.getElementById('email').value.trim();
  const firstName = document.getElementById('first-name').value.trim();
  const lastName  = document.getElementById('last-name').value.trim();
  const phone     = document.getElementById('phone').value.trim();
  const shipping  = buildShippingAddress();

  _pendingSubmit = async (token) => {
    await processCheckout(token, shipping);
  };

  setBtn('Connecting…', true);

  let token;
  try {
    token = await ensureAuth(email, firstName, lastName, phone);
  } catch (err) {
    if (err.needsPassword) {
      setBtn('Place Order →', false);
      showPasswordPrompt(err.email);
      return;
    }
    showError(err.message || 'Authentication failed. Please try again.');
    setBtn('Place Order →', false);
    return;
  }

  await processCheckout(token, shipping);
}

/* ── Core checkout process ───────────────────────────────── */
async function processCheckout(token, shippingAddress) {
  setBtn('Syncing cart…', true);

  // 1. Sync localStorage cart to server-side cart
  try {
    await syncCartToBackend();
  } catch (err) {
    showError(err.message || 'Cart sync failed. Please check your items and try again.');
    setBtn('Place Order →', false);
    return;
  }

  // 2. Create Razorpay order via backend
  // Backend computes shipping server-side from the address.
  // We pass the address so it can calculate the correct amount.
  setBtn('Preparing payment…', true);
  const city = shippingAddress.city.trim().toLowerCase();
const state = shippingAddress.state.trim().toLowerCase();

const totalBottles = Cart.items.reduce(
    (sum, item) => sum + item.qty,
    0
);

if (state === "tamil nadu" &&
    city !== "coimbatore" &&
    totalBottles < 5) {

    showError("Minimum order outside Coimbatore is 5 bottles.");
    setBtn("Place Order →", false);
    return;
}

if (state !== "tamil nadu" &&
    totalBottles < 10) {

    showError("Minimum order outside Tamil Nadu is 10 bottles.");
    setBtn("Place Order →", false);
    return;
}
  const { ok, json } = await apiFetch('/payments/create-order', {
    method: 'POST',
    body:   JSON.stringify({
      shippingAddress,
      customerNote: document.getElementById('customer-note')?.value?.trim() || '',
    }),
  });

  if (!ok) {
    showError(json.message || 'Could not create order. Please try again.');
    setBtn('Place Order →', false);
    return;
  }

  // 3. Open Razorpay modal — button re-enabled by modal dismiss handler
  const orderData   = json.data;
  const orderNumber = orderData.orderNumber;
  openRazorpay(orderData, shippingAddress, orderNumber);
}

/* ── Bootstrap ───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Wire the form submit
  const form = document.getElementById('checkout-form');
  if (form) {
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    newForm.addEventListener('submit', handleCheckoutSubmit);
  }

  // Pre-fill email from stored auth
  const auth = getStoredAuth();
  if (auth?.email) {
    const emailEl = document.getElementById('email');
    if (emailEl && !emailEl.value) emailEl.value = auth.email;
  }

  // Live shipping calculation as user types city/state
  ['city', 'state'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateShippingDisplay);
  });

  updateShippingDisplay();

  // Warn if cart is empty
  setTimeout(() => {
    if (typeof Cart !== 'undefined' && Cart.items.length === 0) {
      const s = document.getElementById('order-success');
      if (!s || s.style.display === 'none') {
        window.showToast?.('Your cart is empty. Add some brews first.');
      }
    }
  }, 800);
});
