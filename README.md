# REBREW — Complete Frontend Website

> Premium Non-Alcoholic Fermented Fruit Soda Brand
> "Every bottle has its own story."

---

## Project Overview

REBREW is a fully responsive, cinematic, vintage-aesthetic frontend website for a premium handcrafted fermented fruit soda brand. Built with pure HTML, CSS, and Vanilla JavaScript — no frameworks, no React, no Bootstrap.

---

## Project Structure

```
/rebrew
│
├── index.html          — Homepage (Hero, Products, Founder, Process, Reviews, Events, Gallery)
├── about.html          — Full founder story, brand values, timeline
├── products.html       — Detailed product pages for all 5 flavours
├── shop.html           — Shop grid with filters, cart, pack deal
├── ingredients.html    — Full ingredient breakdown per flavour
├── events.html         — Upcoming & past events with tabs
├── reviews.html        — Reviews with stats, featured review, write-a-review form
├── blog.html           — Journal/blog with featured post and grid
├── faq.html            — Accordion FAQ with category filtering
├── contact.html        — Contact form, partner section, location
├── cart.html           — Full cart page with promo codes
├── checkout.html       — Checkout form with fake payment UI
│
├── /css
│   ├── style.css       — Main design system, components, all page styles
│   ├── animations.css  — Animation keyframes, reveal classes, effects
│   └── responsive.css  — Mobile-first responsive breakpoints
│
├── /js
│   ├── main.js         — Loader, cursor, navbar, scroll reveal, FAQ, newsletter
│   ├── animations.js   — 3D tilt, scramble text, gallery lightbox, qty spinners
│   └── cart.js         — Full cart state, localStorage, drawer, page rendering
│
└── /assets
    ├── /images
    │   ├── brand-grid.png          — Instagram editorial grid (9-panel)
    │   ├── bottles-lineup.png      — 4 bottles standing lineup
    │   ├── bottles-scattered.png   — Bottles scattered close-up
    │   ├── label-closeup.png       — Extreme label detail shot
    │   ├── founder.png             — Founder portrait
    │   ├── bottles-dramatic.png    — Dramatic spotlight editorial
    │   └── pineapple-bottle.png    — Pineapple bottle outdoor shot
    └── /logos
        └── rebrew-logo.png         — Main circular badge logo
```

---

## Design System

### Color Palette
| Name           | Hex       | Usage                        |
|----------------|-----------|------------------------------|
| Cream          | `#F5EDD6` | Main background              |
| Aged Paper     | `#EAD9B0` | Section backgrounds          |
| Warm Beige     | `#D9C89A` | Subtle fills                 |
| Vintage Brown  | `#5C3D1E` | Body text, borders           |
| Dark Brown     | `#3B2410` | Headings, dark sections      |
| Burgundy       | `#6B2737` | Accent, reviews section      |
| Dusty Gold     | `#B8963E` | Primary brand accent         |
| Olive          | `#5C6B3A` | Process section              |
| Ink            | `#1C1008` | Footer, darkest backgrounds  |

### Typography
- **Headings**: Playfair Display (Serif) — weights 700–900
- **Italic / Pull Quotes**: IM Fell English — elegant editorial
- **Body**: Jost (Sans-serif) — clean, minimal weight 300–600
- **Story Text**: Libre Baskerville — literary, warm

### Breakpoints
- Desktop: 1200px+ container
- Tablet: ≤1024px
- Mobile: ≤768px
- Small Mobile: ≤480px

---

## Features

### Global
- ✅ Custom animated cursor (desktop)
- ✅ Film grain CSS overlay (cinematic texture)
- ✅ Loading screen with logo + progress bar
- ✅ Scroll progress bar
- ✅ Smooth navbar transition on scroll
- ✅ Full-screen mobile menu with stagger animation
- ✅ Scroll-triggered reveal animations (IntersectionObserver)
- ✅ Stagger children animations
- ✅ Image reveal (mask wipe effect)
- ✅ Parallax elements
- ✅ Custom toast notifications

### Cart System
- ✅ Persistent cart via localStorage
- ✅ Slide-out cart drawer
- ✅ Add/remove/update quantity
- ✅ Cart count badge in navbar
- ✅ Full cart page with table view
- ✅ Promo code system (REBREW10, FIRST50)
- ✅ Order summary panel

### Homepage
- ✅ Fullscreen cinematic hero with floating bottles
- ✅ Text scramble animation (hero eyebrow)
- ✅ Parallax bottle tilt on mouse move
- ✅ Marquee brand strip
- ✅ 5-column product grid with hover 3D tilt
- ✅ Founder story split layout
- ✅ 4-step fermentation process
- ✅ Why ReBrew mosaic grid
- ✅ Reviews section (Burgundy theme)
- ✅ Events list with dates
- ✅ Gallery grid with lightbox
- ✅ Newsletter signup

### Shop Page
- ✅ Pack deal banner
- ✅ Filter buttons (All / Fruity / Spiced / Fresh)
- ✅ Product cards with qty selector
- ✅ Trust badges
- ✅ Add to cart (opens drawer)

### Products Page
- ✅ Full detail view for all 5 flavours
- ✅ Latin names, tasting notes
- ✅ Specs grid (volume, alcohol, carbonation, shelf life)
- ✅ Alternating layout (left/right)
- ✅ Add to cart with qty

### Checkout
- ✅ Multi-step form UI (contact → shipping → payment)
- ✅ Stripe-style card UI
- ✅ UPI & COD options
- ✅ Order summary sidebar
- ✅ Success state after submit

### Other Pages
- ✅ About: Timeline, values grid, mission block
- ✅ Ingredients: Per-flavour tab breakdown + "What We Never Use"
- ✅ Events: Upcoming/Past tabs
- ✅ Reviews: Stats counters, featured review, write-a-review
- ✅ Blog: Featured post + 6-card grid + newsletter
- ✅ FAQ: Category filter + accordion
- ✅ Contact: Form + partner cards + map placeholder

---

## How to Run

1. Open any `.html` file directly in a browser — no build step required.
2. Or serve locally:
   ```bash
   # Python
   python -m http.server 8000

   # Node (if installed)
   npx serve .
   ```
3. Open `http://localhost:8000` in your browser.

---

## Image Asset Guide

Place brand images in `/assets/images/`:

| Filename                | What it is                              |
|-------------------------|------------------------------------------|
| `brand-grid.png`        | 9-panel editorial Instagram grid         |
| `bottles-lineup.png`    | 4 bottles standing in a row             |
| `bottles-scattered.png` | Bottles scattered with labels visible   |
| `label-closeup.png`     | Extreme label macro shot                |
| `founder.png`           | Founder portrait photo                  |
| `bottles-dramatic.png`  | Dramatic spotlight editorial shot       |
| `pineapple-bottle.png`  | Pineapple bottle outdoor lifestyle shot |

Place logo in `/assets/logos/`:

| Filename            | What it is                       |
|---------------------|-----------------------------------|
| `rebrew-logo.png`   | Main circular "Brewed Once" badge |

---

## Promo Codes (Demo)
- `REBREW10` — 10% discount
- `FIRST50` — ₹50 flat off

---

## Brand Details
- **Brand**: REBREW
- **Est**: 2023
- **Location**: Coimbatore, Tamil Nadu, India
- **Phone**: +91 84388 17294
- **Instagram**: @re_brew
- **Email**: hello.rebrew@gmail.com

---

## Credits
Built as a complete production-level frontend for the REBREW brand.
Design direction: Vintage cinematic · Handcrafted luxury · Editorial premium.

*"Time makes it wild."*
