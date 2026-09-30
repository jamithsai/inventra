# INVENTRA — Warm Ivory, Cobalt & Amber Enterprise Design System (DESIGN.md)

This design system defines the visual language, design tokens, component standards, and tenant isolation UX patterns for the **INVENTRA Multi-Tenant Inventory Platform**.

---

## 1. Design Movement & Philosophy

- **Movement**: Modern Warm Enterprise SaaS (Humanist operational workspace inspired by Stripe / Linear / Ramp).
- **Core Aesthetic**: Warm ivory canvas (`#F7F5F0`), crisp white card containers (`#FFFFFF`), bold cobalt primary actions (`#3157D5`), and calibrated amber warning accents (`#FFB547`).
- **85 / 8 / 5 / 2 Proportional Principle**:
  - **85% Surface / Canvas**: Warm ivory `#F7F5F0`, white card surfaces `#FFFFFF`, warm card sub-surfaces `#FBFAF7`, and delicate `#E5E1D8` / `#EEEAE3` borders.
  - **8% High-Legibility Ink**: Primary typography `#172033` (ink-900), secondary `#667085` (ink-600), muted `#98A2B3` (ink-400).
  - **5% Cobalt Blue**: Action buttons, active navigation states, interactive focus rings, metric progress indicators (`#3157D5`, hover `#2648BE`, light `#E9EEFF`).
  - **2% Amber Highlights**: Low stock warnings, pending sync states, metric attention indicators (`#FFB547`, dark `#C77B16`, light `#FFF3DC`).
- **Anti-AI Design Directive**: No neon halos, no purple/cyan gradient mesh, no dark mode gimmicks. Clean, tactile, high-density professional software.

---

## 2. Color Palette & Semantic Tokens

### Canvas & Surface Tokens (85%)
- **Canvas Base**: `#F7F5F0` (`ivory-canvas`)
- **Card Surface**: `#FFFFFF` (`ivory-surface`)
- **Sub-surface / Table Head / Inputs**: `#FBFAF7` (`ivory-50`)
- **Borders & Dividers**: `#E5E1D8` (`ivory-border`)
- **Subtle Row Separators**: `#EEEAE3` (`ivory-border-light`)

### Ink & Typography Tokens (8%)
- **Primary Ink (Headers & Titles)**: `#172033` (`ink-900`)
- **Secondary Ink (Labels & Descriptions)**: `#667085` (`ink-600`)
- **Muted Ink (Captions & Disabled)**: `#98A2B3` (`ink-400`)

### Brand & Interactive Accent Tokens (5%)
- **Primary Action**: `#3157D5` (`cobalt-600`)
- **Primary Action Hover**: `#2648BE` (`cobalt-700`)
- **Soft Accent / Active Tab Background**: `#E9EEFF` (`cobalt-50`)
- **Accent Border**: `#D5E0FF` (`cobalt-100`)

### Attention & Warning Tokens (2%)
- **Amber Primary**: `#FFB547` (`amber-500`)
- **Amber Text / Icon**: `#C77B16` (`amber-600`)
- **Amber Background**: `#FFF3DC` (`amber-50`)
- **Amber Border**: `#FDE2B0` (`amber-100`)

### Semantic Status Badges
- **In Stock / Success / PASS / 200**: Background `#E8F6EF`, Border `#BDE5D2`, Text `#1E7E51`
- **Low Stock / Warning / 403 / Pending**: Background `#FFF3DC`, Border `#FDE2B0`, Text `#C77B16`
- **Out of Stock / Critical / 404 / Blocked**: Background `#FDECEC`, Border `#F9C5C5`, Text `#D9383A`
- **Neutral / Info / Invariant**: Background `#FBFAF7`, Border `#E5E1D8`, Text `#667085`

---

## 3. Radii & Spacing Matrix

- **Buttons & Form Controls**: `rounded-[7px]`
- **Status & Partition Badges**: `rounded-[5px]` or `rounded-[6px]`
- **Cards, Modals & Data Containers**: `rounded-[9px]`
- **Borders**: Strictly `1px solid #E5E1D8`
- **Shadows**: Soft natural ambient shadows (`shadow-xs` / `shadow-sm`)

---

## 4. Multi-Tenant UI Isolation Patterns

1. **Context Navigation Bar**: Displays the currently active tenant organization with clean dropdown switching and authorized membership badges.
2. **Deterministic Partition Tags**: Explicitly visualizes the tenant ID (`TNT-0842` / `acme-retail`) in table headers and detail sheets.
3. **S3 File Partitioning**: File storage view clearly states the resolved tenant bucket path (`/tenants/{tenantId}/products/`).
4. **Tenant Isolation Benchmark**: Real-time interactive security penetration test harness with live audit console.
