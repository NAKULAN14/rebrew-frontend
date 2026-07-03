/* ============================================================
   REBREW — api.js
   Centralised API client. Import before cart.js and page
   scripts that render products.
   ============================================================ */

'use strict';
const API_BASE_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000/api/v1"
        : "https://api.rebrew.in/api/v1";

/* ── Fetch helpers ───────────────────────────────────────── */

/**
 * Fetch all active products from the backend.
 * Returns the data.data array (the products list).
 * @returns {Promise<Array>}
 */
async function getProducts() {
  const res  = await fetch(`${API_BASE_URL}/products?limit=20&sort=newest`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Failed to fetch products');
  return json.data;
}

/**
 * Fetch only featured products (for homepage etc.)
 * @returns {Promise<Array>}
 */
async function getFeaturedProducts() {
  const res  = await fetch(`${API_BASE_URL}/products/featured`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Failed to fetch featured products');
  return json.data.products;
}

/**
 * Fetch a single product by MongoDB _id or slug.
 * @param {string} id  — ObjectId or slug string
 * @returns {Promise<Object>}
 */
async function getProduct(id) {
  const res  = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(id)}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Product not found');
  return json.data.product;
}

/* ── Product image resolver ──────────────────────────────── */

/**
 * Returns the best available image URL for a product.
 * If Cloudinary images exist, uses the primary one.
 * Falls back to local placeholder assets keyed by flavor.
 */
const FLAVOR_FALLBACK_IMAGES = {
  grape:          'assets/images/grape.png',
  apple_cinnamon: 'assets/images/apple.png',
  ginger:         'assets/images/ginger.png',
  pineapple:      'assets/images/pineapple.png',
  mint:           'assets/images/mint.png',
};

function getProductImage(product) {
  if (product.images && product.images.length > 0) {
    const primary = product.images.find(img => img.isPrimary);
    return primary ? primary.url : product.images[0].url;
  }
  return FLAVOR_FALLBACK_IMAGES[product.flavor] || 'assets/images/bottles-lineup.png';
}

/* ── Flavour display metadata ────────────────────────────── */
// Visual metadata keyed by flavor enum value.
// Matches the existing hardcoded design exactly.
const FLAVOR_META = {
  grape: {
    color:       '#8B4A9E',
    category:    'fruity',
    tagline:     'Fruity · Tangy',
    badge:       'Bestseller',
    badgeBg:     'var(--dusty-gold)',
    badgeColor:  'var(--dark-brown)',
    latin:       'Vitis vinifera fermentum',
  },
  apple_cinnamon: {
    color:       '#C4593A',
    category:    'spiced',
    tagline:     'Spiced · Warm',
    badge:       null,
    latin:       'Malus domestica · Cinnamomum verum',
  },
  ginger: {
    color:       '#C4913A',
    category:    'spiced',
    tagline:     'Spiced · Bold',
    badge:       'Fan Fav',
    badgeBg:     'var(--burgundy)',
    badgeColor:  'white',
    latin:       'Zingiber officinale fermentum',
  },
  pineapple: {
    color:       '#C4B83A',
    category:    'fruity',
    tagline:     'Fruity · Tropical',
    badge:       null,
    badgeColor:  '#333',
    latin:       'Ananas comosus fermentum',
  },
  mint: {
    color:       '#3A8B6A',
    category:    'fresh',
    tagline:     'Fresh · Herbal',
    badge:       'New',
    badgeBg:     'var(--dark-olive)',
    badgeColor:  'white',
    latin:       'Mentha spicata fermentum',
  },
};

/**
 * Populate the cart.js PRODUCTS catalog from backend data.
 * Call this once after api.js and before cart.js renders anything.
 * cart.js reads the PRODUCTS global — this updates it in-place.
 */
function syncProductsCatalog(products) {
  if (typeof PRODUCTS === 'undefined') return;

  products.forEach(product => {
    const flavor = product.flavor;
    const meta   = FLAVOR_META[flavor] || {};

    PRODUCTS[flavor] = {
      id:    flavor,
      name:  product.name.replace('ReBrew ', ''), // "ReBrew Grape" → "Grape"
      sub:   `${product.volume || 275}ml · Non-Alcoholic`,
      price: product.price,
      color: meta.color || '#5C3D1E',
      image: getProductImage(product),
      note:  product.shortDescription || product.description?.slice(0, 80) || '',
      _id:   product._id, // MongoDB _id — available for future API cart calls
    };
  });
}

/* ── Exports (available globally when loaded as <script>) ── */
// api.js is loaded as a plain <script>, not an ES module,
// so everything declared here is available in the global scope.
