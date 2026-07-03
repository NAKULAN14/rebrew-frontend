/* ============================================================
   REBREW — main.js  (Improved & Audited)
   Fixes: loader timing, cursor perf, nav active state,
          mobile menu a11y, scroll reveal, smooth scroll,
          page transitions, toast, magnetic btns, lazy imgs,
          counter animation, FAQ, newsletter, contact forms.
   ============================================================ */

/* ── Helpers ─────────────────────────────────────────────── */
const qs  = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const on  = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);

/* ── Reduced Motion ──────────────────────────────────────── */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================================
   LOADER
   ============================================================ */
(function initLoader() {
  const loader = qs('#loader');
  if (!loader) return;

  // Prevent scroll during load
  document.body.style.overflow = 'hidden';

  // Minimum display time so brand registers
  const MIN_MS = prefersReducedMotion ? 400 : 1800;

  const hide = () => {
    loader.setAttribute('aria-hidden', 'true');
    loader.classList.add('hidden');
    document.body.style.overflow = '';
  };

  if (document.readyState === 'complete') {
    setTimeout(hide, MIN_MS);
  } else {
    const t = Date.now();
    window.addEventListener('load', () => {
      const elapsed = Date.now() - t;
      const wait = Math.max(0, MIN_MS - elapsed);
      setTimeout(hide, wait);
    });
    // Hard fallback — never block forever
    setTimeout(hide, MIN_MS + 1500);
  }
})();

/* ============================================================
   CUSTOM CURSOR  (desktop only, respects reduced motion)
   ============================================================ */
(function initCursor() {
  if (window.innerWidth <= 768 || prefersReducedMotion) return;

  const dot      = qs('.cursor');
  const ring     = qs('.cursor-follower');
  if (!dot || !ring) return;

  let mx = -100, my = -100; // off-screen start
  let rx = -100, ry = -100;
  let rafId;

  on(document, 'mousemove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });

  // Dot snaps instantly; ring lerps
  const loop = () => {
    dot.style.transform  = `translate(${mx - 6}px, ${my - 6}px)`;
    rx += (mx - rx) * 0.11;
    ry += (my - ry) * 0.11;
    ring.style.transform = `translate(${rx - 20}px, ${ry - 20}px)`;
    rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);

  // Cursor states
  const grow   = () => { dot.classList.add('cursor-grow');  ring.classList.add('ring-grow');  };
  const shrink = () => { dot.classList.remove('cursor-grow'); ring.classList.remove('ring-grow'); };

  on(document, 'mouseenter', grow,   { passive: true });
  on(document, 'mouseleave', shrink, { passive: true });

  qsa('a, button, .product-card, .shop-card, .gallery-item, .faq-question, .event-item').forEach(el => {
    on(el, 'mouseenter', grow,   { passive: true });
    on(el, 'mouseleave', shrink, { passive: true });
  });
})();

/* ============================================================
   NAVBAR — scroll state + active link + keyboard trap helper
   ============================================================ */
(function initNavbar() {
  const navbar    = qs('.navbar');
  const toggle    = qs('.nav-toggle');
  const mobileMenu = qs('.mobile-menu');
  if (!navbar) return;

  /* Scroll state */
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    if (y > 60) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    lastY = y;
  };
  on(window, 'scroll', onScroll, { passive: true });
  onScroll(); // run once on load

  /* Active nav link — match current page filename */
  const currentFile = location.pathname.split('/').pop() || 'index.html';
  qsa('.nav-links a, .mobile-menu a').forEach(link => {
    const href = link.getAttribute('href') || '';
    const linkFile = href.split('/').pop() || 'index.html';
    if (linkFile === currentFile) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    }
  });

  /* Mobile menu toggle */
  if (!toggle || !mobileMenu) return;

  const openMenu = () => {
    toggle.classList.add('active');
    mobileMenu.classList.add('active');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    // Move focus to first link for a11y
    const firstLink = qs('a', mobileMenu);
    if (firstLink) firstLink.focus();
  };

  const closeMenu = () => {
    toggle.classList.remove('active');
    mobileMenu.classList.remove('active');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    toggle.focus();
  };

  on(toggle, 'click', () => {
    mobileMenu.classList.contains('active') ? closeMenu() : openMenu();
  });

  // Close on link click
  qsa('a', mobileMenu).forEach(link => on(link, 'click', closeMenu));

  // Mobile menu close button (inside the menu)
  const mobileCloseBtn = document.querySelector('.mobile-menu-close');
  if (mobileCloseBtn) {
    on(mobileCloseBtn, 'click', closeMenu);
  }

  // Close on Escape key
  on(document, 'keydown', e => {
    if (e.key === 'Escape' && mobileMenu.classList.contains('active')) closeMenu();
  });

  // Close on outside click
  on(document, 'click', e => {
    if (
      mobileMenu.classList.contains('active') &&
      !mobileMenu.contains(e.target) &&
      !toggle.contains(e.target)
    ) closeMenu();
  });
})();

/* ============================================================
   SCROLL REVEAL — IntersectionObserver with stagger support
   ============================================================ */
(function initScrollReveal() {
  if (prefersReducedMotion) {
    // Just show everything immediately
    qsa('.reveal, .reveal-left, .reveal-right, .stagger-children, .text-reveal, .img-reveal-wrap')
      .forEach(el => el.classList.add('visible'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('visible');

      // Stagger direct children
      if (el.classList.contains('stagger-children')) {
        qsa(':scope > *', el).forEach((child, i) => {
          child.style.transitionDelay = `${i * 90}ms`;
        });
      }

      io.unobserve(el);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -48px 0px' });

  // Expose for pages that render elements dynamically after DOMContentLoaded
  window._rebrewRevealObserver = io;

  qsa('.reveal, .reveal-left, .reveal-right, .stagger-children, .text-reveal, .img-reveal-wrap')
    .forEach(el => io.observe(el));
})();

/* ============================================================
   SMOOTH SCROLL — for hash links on same page
   ============================================================ */
(function initSmoothScroll() {
  on(document, 'click', e => {
    const anchor = e.target.closest('a[href^="#"]');
    if (!anchor) return;
    const hash = anchor.getAttribute('href');
    if (hash === '#') return;
    const target = qs(hash);
    if (!target) return;
    e.preventDefault();
    const offset = 88;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    // Update URL without jump
    history.pushState(null, '', hash);
  });
})();

/* ============================================================
   SCROLL PROGRESS BAR
   ============================================================ */
(function initScrollProgress() {
  const bar = qs('#scroll-progress');
  if (!bar) return;
  const update = () => {
    const max  = document.documentElement.scrollHeight - window.innerHeight;
    const pct  = max > 0 ? (window.scrollY / max) * 100 : 0;
    bar.style.width = pct + '%';
  };
  on(window, 'scroll', update, { passive: true });
  update();
})();

/* ============================================================
   PAGE TRANSITION — cinematic wipe on internal navigation
   ============================================================ */
(function initPageTransitions() {
  if (prefersReducedMotion) return;

  // Inject overlay element once
  const overlay = document.createElement('div');
  overlay.id = 'page-wipe';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.style.cssText = `
    position:fixed;inset:0;background:var(--dark-brown);
    z-index:99998;transform:scaleX(0);transform-origin:left;
    pointer-events:none;transition:transform 0.45s cubic-bezier(0.76,0,0.24,1);
  `;
  document.body.appendChild(overlay);

  // Animate OUT on page load
  requestAnimationFrame(() => {
    overlay.style.transformOrigin = 'right';
    overlay.style.transform = 'scaleX(0)';
  });

  on(document, 'click', e => {
    const link = e.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (
      !href ||
      href.startsWith('#') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('http') ||
      link.hasAttribute('target') ||
      link.hasAttribute('data-open-cart')
    ) return;

    e.preventDefault();
    overlay.style.transformOrigin = 'left';
    overlay.style.transform = 'scaleX(1)';
    setTimeout(() => { window.location.href = href; }, 460);
  });
})();

/* ============================================================
   FAQ ACCORDION
   ============================================================ */
(function initFAQ() {
  qsa('.faq-item').forEach(item => {
    const question = qs('.faq-question', item);
    const answer   = qs('.faq-answer',   item);
    if (!question || !answer) return;

    // Set initial ARIA
    question.setAttribute('aria-expanded', 'false');
    answer.setAttribute('aria-hidden', 'true');

    on(question, 'click', () => {
      const isOpen = item.classList.contains('active');
      // Close all
      qsa('.faq-item').forEach(i => {
        i.classList.remove('active');
        qs('.faq-question', i)?.setAttribute('aria-expanded', 'false');
        qs('.faq-answer',   i)?.setAttribute('aria-hidden', 'true');
      });
      if (!isOpen) {
        item.classList.add('active');
        question.setAttribute('aria-expanded', 'true');
        answer.setAttribute('aria-hidden', 'false');
      }
    });

    on(question, 'keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); question.click(); }
    });
  });
})();

/* ============================================================
   COUNTER ANIMATION
   ============================================================ */
(function initCounters() {
  const counters = qsa('.counter-num[data-target]');
  if (!counters.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el      = entry.target;
      const target  = parseInt(el.dataset.target, 10) || 0;
      const suffix  = el.dataset.suffix || '';
      const dur     = prefersReducedMotion ? 0 : 1600;

      if (dur === 0) { el.textContent = target + suffix; io.unobserve(el); return; }

      const start = performance.now();
      const tick  = now => {
        const p   = Math.min((now - start) / dur, 1);
        const val = Math.floor((1 - Math.pow(1 - p, 3)) * target);
        el.textContent = val + suffix;
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = target + suffix;
      };
      requestAnimationFrame(tick);
      io.unobserve(el);
    });
  }, { threshold: 0.5 });

  counters.forEach(c => io.observe(c));
})();

/* ============================================================
   MAGNETIC BUTTONS
   ============================================================ */
(function initMagnetic() {
  if (window.innerWidth <= 768 || prefersReducedMotion) return;
  qsa('.magnetic').forEach(btn => {
    on(btn, 'mousemove', e => {
      const r  = btn.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width  / 2) * 0.25;
      const dy = (e.clientY - r.top  - r.height / 2) * 0.25;
      btn.style.transform = `translate(${dx}px,${dy}px)`;
    });
    on(btn, 'mouseleave', () => {
      btn.style.transform = '';
    });
  });
})();

/* ============================================================
   LAZY IMAGES
   ============================================================ */
(function initLazyImages() {
  const imgs = qsa('img[data-src]');
  if (!imgs.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(({ isIntersecting, target }) => {
      if (!isIntersecting) return;
      target.src = target.dataset.src;
      target.removeAttribute('data-src');
      io.unobserve(target);
    });
  }, { rootMargin: '300px' });
  imgs.forEach(img => io.observe(img));
})();

/* ============================================================
   NEWSLETTER FORMS
   ============================================================ */
(function initForms() {
  // Newsletter
  qsa('.newsletter-form').forEach(form => {
    on(form, 'submit', e => {
      e.preventDefault();
      const inp = qs('input[type="email"]', form);
      if (inp && inp.value.trim()) {
        showToast('✦ You\'re on the list. Welcome to ReBrew.');
        inp.value = '';
      }
    });
  });

  // Contact form
  const contactForm = qs('.contact-form-el');
  on(contactForm, 'submit', e => {
    e.preventDefault();
    showToast('✦ Message sent. We\'ll be in touch soon.');
    contactForm.reset();
  });
})();

/* ============================================================
   TOAST NOTIFICATION — globally available
   ============================================================ */
window.showToast = (function() {
  let toast = null;
  let timer = null;

  return function(message, duration = 3200) {
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span class="toast-icon" aria-hidden="true">✦</span>${message}`;

    clearTimeout(timer);
    // Allow re-triggering animation
    toast.classList.remove('show');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.classList.add('show');
        timer = setTimeout(() => toast.classList.remove('show'), duration);
      });
    });
  };
})();

