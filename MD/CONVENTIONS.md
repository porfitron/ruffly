# 🎨 Ruffly.app — Coding Standards & Design Conventions
1. Design System & Style Guide
Color Tokens (Tailwind Configuration)

    Background: bg-[#FBF9F5] (Warm Oatmeal / Cream)

    Card Surface: bg-white with shadow-sm hover:shadow-md transition-shadow

    Primary Accent: bg-[#F59E0B] / text-[#F59E0B] (Warm Golden Retriever Gold)

    Secondary Accent: bg-[#10B981] / text-[#10B981] (Sage Green)

    Text Primary: text-slate-800

    Text Muted: text-slate-500

    Border Accent: border-amber-200

Typography & Spacing

    Font Family: Rounded sans-serif preferred (Plus Jakarta Sans, Outfit, or system-ui rounded).

    Border Radius: Heavy rounding on interactive elements (rounded-2xl or rounded-3xl for buttons and cards).

    Touch Targets: Minimum height of 48px (h-12) for all buttons and inputs to ensure touch-friendly mobile usability.

2. Cursor Rules & Code Generation Directives

    Mobile-First Always: Write Tailwind CSS with mobile layout as default, applying md: and lg: breakpoints only for layout expansion.

    Component Isolation: Keep components focused and single-purpose. Extract reusable UI controls into src/components/ui.

    State Updates: Always immutable updates when modifying localStorage state arrays (dogs, catalog/care items, menus, logs). Persist only through AppContext → `src/utils/storage.js` (never sprinkle raw `localStorage` calls in feature UI). Prefer logging-first flows: creating Food / Med / Supplement items should usually happen from a quick log, then land in the shared catalog.

    Safe areas: Respect `env(safe-area-inset-*)` for notch / home-indicator padding on installable fullscreen shells.

    Print Styling: Use print:hidden for navigation/interactive elements; reserved for later care-handoff / printable notes (not a P1–P2 requirement).

    Graceful Fallbacks: Ensure empty states have delightful micro-copy and clear primary call-to-action buttons.

    PWA assets: Keep icons in `public/` (`pwa-192x192.png`, `pwa-512x512.png`, `apple-touch-icon.png`, `favicon.svg`) in sync with `vite.config.js` manifest entries.