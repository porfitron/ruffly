# 🐾 Ruffly.app — Product Requirements Document (PRD)

## 1. Project Overview & Vision
**Ruffly.app** is a mobile-first Progressive Web App (PWA) for dog owners and caretakers who want a simple, reliable place to log day-to-day care — food, meds, supplements, and weight — for each dog they look after.

Think of it like a plant-care app, but for dogs: you add a dog once, get a sensible daily calorie target, then use the app as the daily logbook and “menu” for what goes into that dog’s bowl and routine.

### Key Value Propositions
* **Care logging first:** Fast, low-friction logs for meals, meds, supplements, and weight — built for people who care for one dog or a small pack.
* **Dog-first setup:** Adding a dog captures weight and produces a recommended daily kcal allocation so later logs have a clear target.
* **Progressive profiles:** Each dog has a profile started in onboarding (enough to set kcal + menu) and completed later with meds, behavior, ID, and vaccine details.
* **Catalog + log in one flow:** Food, Meds, and Supplements live in an organized library, but most items are created in the moment while logging (“just fed / just gave”).
* **Zero Backend Overhead:** Runs 100% client-side on GitHub Pages using `localStorage`.

---

## 2. Target Audience & Design Philosophy
* **Persona:** Owners and caretakers (including multi-dog households and sitters) who want a calm, dependable care log — not a veterinary EMR and not a meal-math spreadsheet.
* **Product analogue:** Plant-care apps (per-living-thing profiles, today’s care, quick logs, a small library of care items).
* **Design Language:** Warm, organic, tactile, and delightful.
  * **Background:** Soft Cream / Oatmeal (`#FBF9F5`)
  * **Primary Accent:** Warm Golden Retriever (`#F59E0B`)
  * **Secondary Accent:** Soft Sage Green (`#10B981`)
  * **Cards:** Crisp White (`#FFFFFF`) with diffuse, ambient shadows.
* **Micro-Copy Tone:** Friendly, playful, encouraging, and human.

---

## 3. Product Roadmap & Priority Feature Matrix

┌─────────────────────────────────────────────────────────────────────────────┐
│ P1: ADD A DOG + RECOMMENDED DAILY KCAL                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ P2: DAILY MENU & CARE LOG (Food / Meds / Supplements + logging-first UX)    │
├─────────────────────────────────────────────────────────────────────────────┤
│ Later: History, reminders, weight trends, care handoff / printable notes    │
└─────────────────────────────────────────────────────────────────────────────┘

### Dog profile model (partial → complete)
Every dog has a **profile**. It is intentionally incomplete after first-run setup; the product nudges completion when those details become useful (handoff, meds logging, etc.).

| Stage | What’s collected | Done when |
| --- | --- | --- |
| **Onboarding (partial profile)** | Name, photo (optional), weight → recommended daily kcal, activity/goal as needed | User can move on |
| **Onboarding goal** | Initial **daily menu** (food / meds / supplements on the routine) | Menu has at least one item (or user explicitly skips) |
| **Complete later** | Medication needs, behavior notes, license #, vaccine info, microchip ID | Profile “completeness” checklist satisfied |

**Complete-later profile fields**
* **Medication needs** — references to Med items in the shared catalog (`catalog` / DB), not free-text-only. Adding a need may create a catalog med and optionally add it to the dog’s menu.
* **Behavior notes** — open text (temperament, triggers, handling tips).
* **License number** — open text / ID string.
* **Vaccine info** — open text for P2 (e.g. rabies date / notes); structured records can come later.
* **Microchip ID** — open text / ID string.

Owner / emergency / vet contacts remain part of the fuller profile (useful for care handoff) and are also completable after onboarding — not blockers for first-run.

### Post-onboarding UX (plant-care analogue)
After onboarding, the caretaker’s relationship to the app mirrors a good plant-care app: **you open it to care for living things today**, not to administer a database.

#### Primary jobs (daily)
1. **See what needs doing** — due / planned care across the pack (or focused on one dog).
2. **Log care** — mark meals / meds / supplements given (one-tap from the list when possible; ad-hoc “just did X” when not on the plan).
3. **Adjust the plan** — tweak a dog’s menu / routine when life changes (amounts, slots, add/remove items).

#### Secondary jobs (occasional)
* **Dog management** — add/switch dogs, edit basics, complete profile fields, browse a dog’s history.
* **User / account** — owner contact defaults, share/receive plan, reset, about.
* **Catalog tidy-up** — rename/archive Food / Meds / Supplements (creation still prefers log / menu / meds-need flows).

#### Recommended information architecture

| Surface | Role | Nav weight |
| --- | --- | --- |
| **Today** | Home. Cross-dog care checklist + kcal progress + done state (“everyone’s fed”). Primary log actions live here. | **Primary tab** |
| **Log (+)** | Global quick-log sheet (Food / Med / Supplement / Weight), create-or-pick catalog item inline. | **Primary FAB / center action** |
| **Pack** | Dog list / switcher → dog detail (menu editor, profile completion, history). Management, not daily home. | **Secondary tab** |
| **Account** | User profile & app utilities. | **Menu only** (not a tab) |

**Do not** make Bowl / Pantry / Trip / Profile-as-home the default shell after onboarding. Those are either folded into Today + Pack or deferred.

#### Today screen principles (like Planta / Greg “tasks”)
* Default to **all dogs’ due items**, grouped by dog (or by time slot). A subtle dog filter / header avatar can focus one pup without forcing “pick a dog first.”
* Each row = one care action: dog · item · amount · **Done** (optional adjust before save).
* Soft kcal context for the focused or listed dog (logged vs `targetDER`) — informative, not a calculator workspace.
* Celebratory empty / all-clear state when the pack is caught up.
* “Edit routine” on a dog section links into that dog’s **menu** (plan updates), not a separate product pillar.

#### Why this wins
* Matches how caretakers think: *what do I owe my dogs right now?*
* Keeps management (dogs, account, catalog) reachable without competing with the daily habit.
* Multi-dog households get a garden-style “tasks for my plants” list instead of bouncing between profiles to discover work.

### 🟢 Priority 1 (P1): Add a Dog + Recommended Daily kcal
Goal: start a dog profile and leave with a clear daily energy target, ready for menu onboarding.

* **Onboarding profile (partial):**
  * Name, photo/avatar (optional).
  * Current weight (`lbs` or `kg`).
  * Optional goal: Maintain, Lose, Gain (affects multiplier range).
  * Life stage & activity level (e.g. Inactive Adult, Typical Pet Adult, Intact Adult, Active/Working, Puppy).
* **Recommended daily kcal allocation:**
  * **Resting Energy Requirement (RER):**
    $$RER = 70 \times (\text{weight in kg})^{0.75}$$
  * **Daily Energy Requirement (DER):**
    $$DER = RER \times \text{Activity / Goal Multiplier}$$
  * Surface the recommended daily kcal on the dog’s profile / home care view as the baseline for logging against.
* **Multi-dog:**
  * Support multiple dogs from the start (switcher / dog picker). Each dog has its own profile, kcal target, menu, and logs.
* **Source of truth for formulas:** `src/utils/calculations.js`.

### 🟡 Priority 2 (P2): Daily Menu, Care Log & Profile Completion
Goal: finish onboarding with a daily menu, then use the app as the habit log — and fill in the rest of the profile when needed.

#### Onboarding → menu
* After P1 basics, guide the user to build the dog’s **daily menu** (the success state of onboarding).
* Menu items pull from / create catalog Food, Meds, and Supplements.
* Skipping is allowed, but empty-menu empty states should invite setup.

#### Care library (organize once, reuse often)
* Categories: **Food**, **Meds**, **Supplements**.
* Per item (as relevant): name, brand/notes, amount unit (g, scoop, tablet, ml, etc.), optional kcal density for foods, optional reorder URL.
* Users can browse/edit the library on its own, but **creating an item is usually done from a log or from profile medication needs** (“Log food” / “Add medication” → pick existing or add new → save to catalog + wire to menu/profile).

#### Daily menu
* Per dog, a simple menu of recurring care items (e.g. breakfast kibble, evening meds, daily joint supplement).
* Menu is the planned routine; the log is what actually happened.
* Logging against the menu should be one-tap where possible (mark as given / adjust amount).

#### Logging (primary interaction)
* Log types for P2: Food given, Med given, Supplement given; weight check-ins can sit alongside (even if lightweight).
* Each log: dog, item (or free-text if not in library), amount, timestamp, optional note.
* “Today” view: what’s due / planned from the menu vs what’s already logged.
* Inventory/library grows organically from logging, not from a separate onboarding chore.

#### Profile completion (post-onboarding)
* Profile screen (or checklist) for the active dog shows what’s still missing.
* **Medication needs** pick/create catalog meds and can suggest adding them to the menu.
* Behavior notes, license number, vaccine info, and microchip ID are simple fields on the dog profile.
* Completing these must not be required before logging or using Today.

#### Explicitly out of scope for P2
* Full veterinary dosing protocols, prescriptions, or clinical decision support.
* Complex “bowl balancer” calorie-mix math as the primary UX (kcal target from P1 informs logging; deep portion engineering is not the product focus).
* Structured vaccine schedules / reminder engines (open-text vaccine info is enough for now).

### Later (post–P2 backlog)
* Weight history / trends against the kcal target.
* Reminders / nudges for missed menu items.
* Care handoff / printable notes for sitters (uses completed profile: meds, behavior, IDs, contacts).
* Trip packing totals derived from the daily menu.
* Structured vaccine records and license renewal dates.

---

## 4. What Changed (Pivot Notes)
Previous framing centered on precision gram calculation, an interactive Bowl Balancer, and a Pack-My-Bag / dogsitter print sheet as core pillars. The product now centers on **care logging and daily menu management**, with kcal recommendation as the onboarding outcome of adding a dog — closer to how plant-care apps treat profiles + today’s care + a small item library.

| Was (prior PRD) | Now |
| --- | --- |
| Calorie & gram calculator as the product | Dog profile + recommended daily kcal as setup (P1) |
| Pantry + Bowl Balancer as P2 | Care library (Food / Meds / Supplements) + daily menu + logging-first UX (P2) |
| Trip planner & dogsitter sheet as P3 | Deferred to later / care-handoff backlog |
| Multi-dog as Pro “false door” | Multi-dog is core (owners/caretakers of a pack) |

---

## 5. Technical Constraints & Architecture
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
