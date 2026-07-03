/* ============================================================
   REBREW — animations.js  (Improved & Audited)
   Fixes: bottle tilt transition jank, touch support for
          gallery lightbox & swipe, qty spinners, scramble text,
          3D card tilt with proper reset, scroll progress,
          reduced-motion guard throughout.
   ============================================================ */

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.addEventListener('DOMContentLoaded', () => {

  /* ============================================================
     HERO BOTTLE — 3D tilt on mouse move, smooth reset
     ============================================================ */
  const heroSection = document.querySelector('.hero');
  const heroBottle  = document.querySelector('.hero-bottle-main');

  if (heroBottle && heroSection && window.innerWidth > 768 && !prefersReduced) {
    let rafId = null;
    let targetRX = 0, targetRY = 0;
    let currentRX = 0, currentRY = 0;
    let isOver = false;

    heroSection.addEventListener('mousemove', e => {
      const rect  = heroSection.getBoundingClientRect();
      const normX = ((e.clientX - rect.left) / rect.width)  * 2 - 1;  // -1 to +1
      const normY = ((e.clientY - rect.top)  / rect.height) * 2 - 1;
      targetRY =  normX * 7;   // max 7deg horizontal
      targetRX = -normY * 4;   // max 4deg vertical
      isOver = true;
    });

    heroSection.addEventListener('mouseleave', () => {
      isOver = false;
      targetRX = 0;
      targetRY = 0;
    });

    const lerp = (a, b, t) => a + (b - a) * t;

    const tick = () => {
      const factor = isOver ? 0.08 : 0.05;
      currentRX = lerp(currentRX, targetRX, factor);
      currentRY = lerp(currentRY, targetRY, factor);
      heroBottle.style.transform =
        `perspective(900px) rotateX(${currentRX.toFixed(2)}deg) rotateY(${currentRY.toFixed(2)}deg)`;
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }

  /* ============================================================
     PRODUCT & SHOP CARD — smooth 3D tilt + rotation reset
     ============================================================ */
  if (window.innerWidth > 768 && !prefersReduced) {
    document.querySelectorAll('.product-card, .shop-card').forEach(card => {
      let animating = false;

      card.addEventListener('mousemove', e => {
        const rect  = card.getBoundingClientRect();
        const x     = e.clientX - rect.left;
        const y     = e.clientY - rect.top;
        const normX = (x / rect.width)  * 2 - 1;
        const normY = (y / rect.height) * 2 - 1;
        const rX    = -normY * 6;
        const rY    =  normX * 6;

        // Shine effect
        const shine = card.querySelector('.card-shine');
        if (shine) {
          shine.style.opacity = '1';
          shine.style.backgroundImage = `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,0.07), transparent 60%)`;
        }

        card.style.transition = 'transform 0.1s ease';
        card.style.transform  =
          `perspective(700px) rotateX(${rX}deg) rotateY(${rY}deg) translateY(-10px) scale(1.01)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transition = 'transform 0.6s cubic-bezier(0.25,0.46,0.45,0.94)';
        card.style.transform  = '';
        const shine = card.querySelector('.card-shine');
        if (shine) shine.style.opacity = '0';
      });
    });
  }

  /* ============================================================
     SCROLL PROGRESS BAR
     (handled in main.js but we also ensure it here as backup)
     ============================================================ */
  // Delegated to main.js — no duplicate here.

  /* ============================================================
     TEXT SCRAMBLE — hero eyebrow cycling
     ============================================================ */
  class TextScramble {
    constructor(el) {
      this.el    = el;
      this.chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ✦·–';
      this.frame = 0;
      this.queue = [];
      this.frameRequest = null;
      this.resolve = null;
      this.update = this.update.bind(this);
    }

    setText(newText) {
      const old    = this.el.innerText;
      const length = Math.max(old.length, newText.length);
      const promise = new Promise(res => (this.resolve = res));
      this.queue = Array.from({ length }, (_, i) => ({
        from:  old[i]    || '',
        to:    newText[i] || '',
        start: Math.floor(Math.random() * 14),
        end:   Math.floor(Math.random() * 14) + 14,
        char:  '',
      }));
      cancelAnimationFrame(this.frameRequest);
      this.frame = 0;
      this.update();
      return promise;
    }

    update() {
      let output   = '';
      let complete = 0;
      for (const item of this.queue) {
        const { from, to, start, end } = item;
        if (this.frame >= end) {
          complete++;
          output += to;
        } else if (this.frame >= start) {
          if (!item.char || Math.random() < 0.3) {
            item.char = this.chars[Math.floor(Math.random() * this.chars.length)];
          }
          output += `<span style="opacity:.35;color:var(--dusty-gold)">${item.char}</span>`;
        } else {
          output += from;
        }
      }
      this.el.innerHTML = output;
      if (complete === this.queue.length) {
        this.resolve?.();
      } else {
        this.frame++;
        this.frameRequest = requestAnimationFrame(this.update);
      }
    }
  }

  const scrambleEl = document.querySelector('.scramble-text');
  if (scrambleEl && !prefersReduced) {
    const fx    = new TextScramble(scrambleEl);
    const texts = ['BREWED ONCE', 'BORN AGAIN', 'ESTD 2025', 'TIME MAKES IT WILD', 'NATURALLY FERMENTED'];
    let idx     = 0;

    const cycle = () => {
      fx.setText(texts[idx]).then(() => setTimeout(cycle, 3000));
      idx = (idx + 1) % texts.length;
    };
    // Delay until loader is gone
    setTimeout(cycle, 2600);
  }

  /* ============================================================
     GALLERY LIGHTBOX — keyboard + touch + swipe support
     ============================================================ */
  const galleryItems = [...document.querySelectorAll('.gallery-item')];

  if (galleryItems.length) {
    let activeLightbox = null;
    let currentIndex  = 0;

    const images = galleryItems.map(item => {
      const img = item.querySelector('img');
      return { src: img?.src || '', alt: img?.alt || '' };
    });

    const destroyLightbox = () => {
      if (!activeLightbox) return;
      activeLightbox.style.opacity = '0';
      setTimeout(() => {
        activeLightbox?.remove();
        activeLightbox = null;
        document.body.style.overflow = '';
      }, 350);
    };

    const showLightbox = (index) => {
      currentIndex = (index + images.length) % images.length;
      const { src, alt } = images[currentIndex];
      if (!src) return;

      if (!activeLightbox) {
        activeLightbox = document.createElement('div');
        activeLightbox.className = 'lightbox-overlay';
        activeLightbox.setAttribute('role', 'dialog');
        activeLightbox.setAttribute('aria-modal', 'true');
        activeLightbox.setAttribute('aria-label', 'Image viewer');
        document.body.appendChild(activeLightbox);
        document.body.style.overflow = 'hidden';
      }

      activeLightbox.innerHTML = `
        <div class="lb-backdrop"></div>
        <button class="lb-close" aria-label="Close">&times;</button>
        <button class="lb-prev" aria-label="Previous">&#8592;</button>
        <button class="lb-next" aria-label="Next">&#8594;</button>
        <div class="lb-img-wrap">
          <img src="${src}" alt="${alt}" class="lb-img">
        </div>
        <div class="lb-counter">${currentIndex + 1} / ${images.length}</div>
      `;

      activeLightbox.style.cssText = `
        position:fixed;inset:0;z-index:99990;
        display:flex;align-items:center;justify-content:center;
        opacity:0;transition:opacity 0.35s ease;
      `;

      activeLightbox.querySelector('.lb-backdrop').style.cssText = `
        position:absolute;inset:0;background:rgba(15,8,3,0.94);
        backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);
      `;

      const styleBtn = (el, extra = '') => {
        el.style.cssText = `
          position:absolute;background:none;border:1.5px solid rgba(245,237,214,0.2);
          color:var(--cream);cursor:pointer;font-family:var(--font-body);
          transition:all 0.3s;z-index:2; ${extra}
        `;
        el.addEventListener('mouseenter', () => el.style.borderColor = 'var(--dusty-gold)');
        el.addEventListener('mouseleave', () => el.style.borderColor = 'rgba(245,237,214,0.2)');
      };

      const closeBtn = activeLightbox.querySelector('.lb-close');
      const prevBtn  = activeLightbox.querySelector('.lb-prev');
      const nextBtn  = activeLightbox.querySelector('.lb-next');
      const counter  = activeLightbox.querySelector('.lb-counter');
      const imgWrap  = activeLightbox.querySelector('.lb-img-wrap');
      const img      = activeLightbox.querySelector('.lb-img');

      styleBtn(closeBtn, 'top:20px;right:20px;width:44px;height:44px;font-size:22px;border-radius:50%;');
      styleBtn(prevBtn,  'left:20px;top:50%;transform:translateY(-50%);width:48px;height:48px;font-size:20px;border-radius:50%;');
      styleBtn(nextBtn,  'right:20px;top:50%;transform:translateY(-50%);width:48px;height:48px;font-size:20px;border-radius:50%;');

      counter.style.cssText = `
        position:absolute;bottom:20px;left:50%;transform:translateX(-50%);
        font-family:var(--font-body);font-size:11px;letter-spacing:0.25em;
        text-transform:uppercase;color:rgba(245,237,214,0.4);z-index:2;
      `;

      imgWrap.style.cssText = `
        position:relative;z-index:1;max-width:90vw;max-height:88vh;
        transform:scale(0.93);transition:transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94);
      `;

      img.style.cssText = 'max-width:100%;max-height:88vh;object-fit:contain;display:block;box-shadow:0 40px 100px rgba(0,0,0,0.7);';

      requestAnimationFrame(() => {
        activeLightbox.style.opacity = '1';
        imgWrap.style.transform = 'scale(1)';
      });

      closeBtn.addEventListener('click', destroyLightbox);
      activeLightbox.querySelector('.lb-backdrop').addEventListener('click', destroyLightbox);
      prevBtn.addEventListener('click', (e) => { e.stopPropagation(); showLightbox(currentIndex - 1); });
      nextBtn.addEventListener('click', (e) => { e.stopPropagation(); showLightbox(currentIndex + 1); });

      // Touch swipe
      let touchStartX = 0;
      activeLightbox.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
      activeLightbox.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) > 50) showLightbox(currentIndex + (dx < 0 ? 1 : -1));
      }, { passive: true });

      closeBtn.focus();
    };

    galleryItems.forEach((item, i) => {
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.setAttribute('aria-label', `View image ${i + 1}`);
      item.addEventListener('click', () => showLightbox(i));
      item.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showLightbox(i); }
      });
    });

    // Keyboard navigation when lightbox is open
    document.addEventListener('keydown', e => {
      if (!activeLightbox) return;
      if (e.key === 'Escape')     destroyLightbox();
      if (e.key === 'ArrowLeft')  showLightbox(currentIndex - 1);
      if (e.key === 'ArrowRight') showLightbox(currentIndex + 1);
    });
  }

  /* ============================================================
     QUANTITY SELECTORS — delegated, works for dynamically added
     ============================================================ */
  document.addEventListener('click', e => {
    const btn = e.target.closest('.qty-btn');
    if (!btn) return;
    const selector = btn.closest('.qty-selector');
    if (!selector) return;
    const input = selector.querySelector('.qty-input');
    if (!input) return;

    let val = parseInt(input.value) || 1;
    if (btn.classList.contains('minus')) val = Math.max(1, val - 1);
    if (btn.classList.contains('plus'))  val = val + 1;
    input.value = val;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  document.addEventListener('change', e => {
    if (!e.target.classList.contains('qty-input')) return;
    const val = parseInt(e.target.value);
    if (isNaN(val) || val < 1) e.target.value = 1;
  });

  /* ============================================================
     FORM INPUT FOCUS STATES — floating label helper
     ============================================================ */
  document.querySelectorAll('.form-group input, .form-group textarea, .form-group select').forEach(input => {
    const group = input.closest('.form-group');
    if (!group) return;
    const toggle = () => group.classList.toggle('focused', !!input.value || document.activeElement === input);
    input.addEventListener('focus', toggle);
    input.addEventListener('blur', toggle);
    toggle(); // initial state
  });

  /* ============================================================
     PARALLAX — subtle depth on data-parallax elements
     ============================================================ */
  if (!prefersReduced && window.innerWidth > 768) {
    const parallaxEls = document.querySelectorAll('[data-parallax]');
    if (parallaxEls.length) {
      let ticking = false;
      window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          parallaxEls.forEach(el => {
            const speed  = parseFloat(el.dataset.parallax) || 0.2;
            const rect   = el.getBoundingClientRect();
            const offset = (rect.top + scrollY - window.innerHeight * 0.5) * speed * 0.4;
            el.style.transform = `translateY(${offset.toFixed(2)}px)`;
          });
          ticking = false;
        });
      }, { passive: true });
    }
  }

  /* ============================================================
     HORIZONTAL DRAG SCROLL — for any .horizontal-scroll section
     ============================================================ */
  document.querySelectorAll('.horizontal-scroll').forEach(section => {
    let isDown = false, startX, scrollLeft;
    section.addEventListener('mousedown', e => {
      isDown = true;
      section.classList.add('dragging');
      startX     = e.pageX - section.offsetLeft;
      scrollLeft = section.scrollLeft;
    });
    section.addEventListener('mouseleave', () => { isDown = false; section.classList.remove('dragging'); });
    section.addEventListener('mouseup',    () => { isDown = false; section.classList.remove('dragging'); });
    section.addEventListener('mousemove',  e => {
      if (!isDown) return;
      e.preventDefault();
      section.scrollLeft = scrollLeft - (e.pageX - section.offsetLeft - startX) * 1.4;
    });
  });

  /* ============================================================
     ROTATING BADGE — pause on hover to respect user intent
     ============================================================ */
  document.querySelectorAll('.rotate-slow, .about-intro-badge img').forEach(el => {
    el.addEventListener('mouseenter', () => { el.style.animationPlayState = 'paused'; });
    el.addEventListener('mouseleave', () => { el.style.animationPlayState = 'running'; });
  });

}); // END DOMContentLoaded

