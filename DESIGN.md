# Design System: Nexus Neutral Enterprise

## 1. Visual Theme & Atmosphere
A restrained, minimalist, high-density enterprise interface inspired by Swiss typographic design and modern developer tooling (Linear, Vercel, Stripe). The atmosphere is quiet, functional, and authoritative — devoid of flashy gradients, neon glows, or cartoonish AI-slop elements.

- **Density:** 7/10 (Professional Enterprise Density, compact tables, tabular numbers)
- **Variance:** 4/10 (Structured, clean geometric grids with clear visual hierarchy)
- **Motion:** 3/10 (Subtle 150ms opacity/color transitions, no distracting animations)

---

## 2. Neutral Color Palette & Roles

Strictly neutral, monochrome palette built on balanced Zinc/Charcoal scales:

### Dark Mode (Default)
- **Canvas Base:** `#09090b` (`zinc-950`) — Deep neutral dark background
- **Surface Elevation 1:** `#121215` (`zinc-900/90`) — Sidebar, headers, cards
- **Surface Elevation 2:** `#18181b` (`zinc-900`) — Modals, interactive dropdowns, hover fills
- **Subtle Surface:** `#27272a` (`zinc-800`) — Secondary buttons, search bars, tag backings
- **Border / Divider:** `#27272a` (`zinc-800`) & `#3f3f46` (`zinc-700`) — Hairline 1px structural lines
- **Primary Ink:** `#fafafa` (`zinc-50`) — High-contrast headlines and primary labels
- **Secondary Ink:** `#a1a1aa` (`zinc-400`) — Secondary descriptions, table headers, subtitles
- **Muted / Hint Ink:** `#71717a` (`zinc-500`) — Metadata, SKU labels, timestamps
- **Accent / Primary Action:** `#f4f4f5` (`zinc-100`) text with `#18181b` border, or solid `#fafafa` on `#18181b`

### Status Tokens (Subtle & Restrained)
- **In Stock:** Muted neutral green (`#22c55e` dot with `#a1a1aa` text)
- **Low Stock:** Muted neutral amber (`#f59e0b` dot with `#d4d4d8` text)
- **Out of Stock:** Muted neutral red (`#ef4444` dot with `#d4d4d8` text)

---

## 3. Typography Rules
- **Sans Font Stack:** `'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`
- **Monospace Font Stack:** `'JetBrains Mono', 'Geist Mono', SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- **Scale:**
  - `Display / Header 1`: 1.25rem (20px) to 1.5rem (24px), font-semibold, tracking-tight (`-0.025em`)
  - `Section Header 2`: 0.9375rem (15px), font-medium, text-zinc-100
  - `Body`: 0.8125rem (13px) to 0.875rem (14px), font-normal, text-zinc-300
  - `Metadata / Captions`: 0.75rem (12px), text-zinc-400
  - `Tabular Numbers / SKUs`: 0.75rem (12px) monospace, font-mono tabular-nums

---

## 4. Component Stylings
- **Buttons:**
  - *Primary Button:* Solid `#fafafa` background with `#09090b` text, font-medium, rounded-lg, crisp 1px border. No outer glow.
  - *Secondary Button:* `#18181b` background with `#e4e4e7` text, 1px `#27272a` border, subtle hover `#27272a`.
  - *Ghost Button:* Transparent with `#a1a1aa` text, hover `#18181b`.
- **Cards & Panels:** Flat background `#121215`, crisp 1px `#27272a` border, subtle 6px rounded corners (`rounded-lg`), zero colorful drop shadows.
- **Tables:** Hairline horizontal dividers (`border-zinc-800/80`), uppercase 11px muted headers, generous vertical padding, row hover highlight (`hover:bg-zinc-900/50`).
- **Inputs & Filters:** `#09090b` background with 1px `#27272a` border, crisp focus ring `focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500`.
- **Badges / Tags:** Monochrome low-contrast badges (`bg-zinc-800/70 text-zinc-300 border border-zinc-700/60`).

---

## 5. Anti-Patterns (Explicitly Banned)
- ❌ No bright cyan / purple / neon glowing borders or buttons
- ❌ No colorful pulsating glowing badges (`animate-pulse` on bright colors)
- ❌ No gradient text fills (`bg-gradient-to-r from-cyan-400 to-indigo-500`)
- ❌ No colorful drop shadows (`shadow-cyan-500/20`)
- ❌ No decorative emojis
- ❌ No cheesy AI buzzwords
