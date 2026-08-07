# 🐾 Ruffly.app — Product Requirements Document (PRD)

## 1. Project Overview & Vision
**Ruffly.app** is a mobile-first Progressive Web App (PWA) designed for modern dog parents (e.g., millennial couples/DINKs) who treat their pet like family. It helps users calculate exact daily caloric needs, measure portions in precise grams across different food types (kibble, canned, toppers, treats), track product reorder links, and generate printable trip/dogsitter care guides.

### Key Value Propositions
* **Precision Nutrition:** Replaces guesswork with veterinary RER/DER formulas and exact gram calculations.
* **Meal Customization:** Interactive "Bowl Balancer" lets users blend kibble, wet food, and treats seamlessly.
* **Travel & Care Ease:** Calculates total food weight to pack for trips and generates a polished Dogsitter Care Sheet.
* **Zero Backend Overhead:** Runs 100% client-side on GitHub Pages using `localStorage`.

---

## 2. Target Audience & Design Philosophy
* **Persona:** Young adult dog parents who value sleek, Apple/Instagram-tier software aesthetics.
* **Design Language:** Warm, organic, tactile, and delightful.
  * **Background:** Soft Cream / Oatmeal (`#FBF9F5`)
  * **Primary Accent:** Warm Golden Retriever (`#F59E0B`)
  * **Secondary Accent:** Soft Sage Green (`#10B981`)
  * **Cards:** Crisp White (`#FFFFFF`) with diffuse, ambient shadows.
* **Micro-Copy Tone:** Friendly, playful, encouraging, and human.

---

## 3. Product Roadmap & Priority Feature Matrix

┌─────────────────────────────────────────────────────────────────────────────┐
│ P1: CALORIE & GRAM CALCULATOR (Core RER/DER Calculator + Food Density Inputs)│
├─────────────────────────────────────────────────────────────────────────────┤
│ P2: RUFFLY FOOD PANTRY & BOWL BALANCER (Save Foods, URLs & Mix Portions)   │
├─────────────────────────────────────────────────────────────────────────────┤
│ P3: "PACK MY BAG" TRIP PLANNER & PRINTABLE DOGSITTER CARE SHEET             │
└─────────────────────────────────────────────────────────────────────────────┘


### 🟢 Priority 1 (P1): Core Calorie & Gram Engine
* **Dog Profile Setup:**
  * Name, Photo/Avatar.
  * Weight ($lbs$ or $kg$).
  * Weight Goal: Maintain, Weight Loss ($1.0 - 1.2 \times RER$), Weight Gain ($1.2 - 1.4 \times RER$).
  * Life Stage & Activity Level (Inactive Adult, Typical Pet Adult, Intact Adult, Active/Working, Puppy).
* **Mathematical Calculation Logic:**
  * **Resting Energy Requirement (RER):**
    $$RER = 70 \times (\text{weight in kg})^{0.75}$$
  * **Daily Energy Requirement (DER):**
    $$DER = RER \times \text{Activity Multiplier}$$
  * **Portion in Grams:**
    $$\text{Daily Grams} = \left( \frac{DER}{\text{Food Density in kcal/kg}} \right) \times 1000$$

### 🟡 Priority 2 (P2): Food Pantry & Interactive Bowl Balancer
* **Pantry Management:**
  * Store custom food items in `localStorage`.
  * Fields: Name, Brand, Category (`Kibble`, `Wet/Canned`, `Topper/Fresh`, `Treat`), Caloric Density ($\text{kcal/kg}$, $\text{kcal/cup}$, or $\text{kcal/can}$), and **Product Reorder URL**.
* **The "Bowl Balancer" UI:**
  * Interactive progress ring/bar showing current meal calories vs. daily target ($DER$).
  * Sliders/inputs to allocate calorie percentages (e.g., 70% Kibble, 20% Wet Food, 10% Treats).
  * Real-time recalculation of precise grams required per item for the daily meal and split portions (Breakfast vs. Dinner).

### 🔴 Priority 3 (P3): "Pack My Bag" Trip Planner & Dogsitter Sheet
* **Trip Packing Calculator:**
  * Duration input (Days) + Safety Buffer ($+1\text{ Day default}$ or $+10\%$).
  * Outputs total weight in grams/cups/cans needed to pack.
* **Dogsitter Care Guide:**
  * Generates a beautifully styled, print-ready card (CSS `@media print` optimized).
  * Includes dog profile, emergency contact/vet info, exact morning/evening serving sizes, and direct product reorder links.

### ⚡ False Door Feature (Monetization / Validation)
* **Multi-Dog Switcher:**
  * "+ Add Another Dog" button triggers a high-converting Pro modal: *"Managing a multi-pup pack? Ruffly Pro is coming soon!"* with email waitlist opt-in stored in `localStorage`.

---

## 4. Technical Constraints & Architecture
* **Stack:** React / Vite / Tailwind CSS / Lucide React Icons.
* **Hosting:** GitHub Pages static hosting at `/ruffly/` (e.g. `https://porfir.io/ruffly/`).
* **Persistence:** `localStorage` key `ruffly_app_data_v1` (no server DB). See `MD/ARCHITECTURE.md` for schema.
* **PWA / Installability:**
  * `vite-plugin-pwa` generates the web app manifest + Workbox service worker.
  * Vite `base` / manifest `start_url` + `scope` are `/ruffly/` so assets resolve on the project Pages URL.
  * **Deploy the `dist/` output of `npm run build`**, not the repo source — publishing `index.html` that points at `/src/main.jsx` will white-screen in browsers.
  * Android Chrome: Install / Add to Home screen from the browser menu (or install banner when criteria are met).
  * iOS Safari: Share → **Add to Home Screen** (requires HTTPS + `apple-mobile-web-app-*` meta tags; already wired in `index.html`).
* **Source of truth for formulas:** `src/utils/calculations.js`.