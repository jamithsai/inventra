# NEXUS — Enterprise Studio Design System (DESIGN.md)

This design system defines the visual language, design tokens, component standards, and tenant isolation UX patterns for the **NEXUS Multi-Tenant Inventory Platform**.

---

## 1. Design Movement & Philosophy

- **Movement**: Precision Modern Enterprise (Swiss-inspired data density with soft slate neutrals).
- **Core Aesthetic**: Clean, high-legibility, professional enterprise workspace.
- **Anti-AI Design Directive**: No neon glows, no cyan/purple decorative gradients, no unnecessary pill badge clutter. Clean white cards, soft slate canvas (`#F8FAFC`), dark slate typography, and clear semantic dot indicators.

---

## 2. Color Palette & Semantic Tokens

### Neutral Palette (Slate)
- **Canvas Base**: `#F8FAFC` (`bg-slate-50`)
- **Card / Surface**: `#FFFFFF` (`bg-white`)
- **Surface Muted**: `#F1F5F9` (`bg-slate-100`)
- **Borders & Dividers**: `#E2E8F0` (`border-slate-200`)
- **Inputs & Dropdown Borders**: `#CBD5E1` (`border-slate-300`)
- **Primary Ink (Text)**: `#0F172A` (`text-slate-900`)
- **Secondary Ink (Descriptions)**: `#64748B` (`text-slate-500`)
- **Tertiary Ink (Captions / IDs)**: `#94A3B8` (`text-slate-400`)

### Brand & Interactive Tokens
- **Primary Action**: `#0F172A` (Hover: `#334155`, Text: `#FFFFFF`)
- **Secondary Action**: `#FFFFFF` (Border: `#CBD5E1`, Text: `#334155`, Hover: `#F8FAFC`)

### Status Indicators
- **In Stock (Normal)**: Background `#ECFDF5`, Border `#A7F3D0`, Text `#065F46`, Indicator Dot `#10B981`
- **Low Stock (Warning)**: Background `#FFFBEB`, Border `#FDE68A`, Text `#92400E`, Indicator Dot `#F59E0B`
- **Out of Stock (Critical)**: Background `#FEF2F2`, Border `#FECACA`, Text `#991B1B`, Indicator Dot `#EF4444`

---

## 3. Typography Hierarchy

- **Primary Typeface**: `Inter`, `-apple-system`, `sans-serif`
- **Tabular & Code Typeface**: `JetBrains Mono`, `ui-monospace`, `monospace`
- **Display / Headers**: Semi-bold to bold (`font-semibold` / `font-bold`), negative letter-spacing (`tracking-tight`).
- **Data Tables**: Numeric values and currency are strictly formatted in `JetBrains Mono` for vertical alignment.

---

## 4. Multi-Tenant UI Isolation Patterns

1. **Context Navigation Bar**: Always displays the currently active tenant organization with clean dropdown switching and authorized membership badges.
2. **Deterministic Partition Tags**: Explicitly visualizes the tenant ID (`TNT-0842` / `acme-retail`) in table headers and detail sheets.
3. **S3 File Partitioning**: File storage view clearly states the resolved tenant bucket path (`/tenants/{tenantId}/products/`).
4. **Tenant Isolation Benchmark**: Real-time interactive security penetration test harness with live audit console.
