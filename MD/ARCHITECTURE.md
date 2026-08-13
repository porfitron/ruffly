# Technical Architecture & Data Schema

Aligned with `MD/PRD.md` (care-logging pivot). This doc describes the **target** architecture for P1/P2. The current codebase still has pantry / bowl / trip modules; migrate toward the structure below.

## 1. Directory & Component Structure (target)

```
ruffly/
├── MD/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   └── CONVENTIONS.md
├── public/
│   ├── favicon.svg
│   ├── apple-touch-icon.png
│   ├── pwa-192x192.png
│   └── pwa-512x512.png
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.jsx
│   │   │   ├── Navigation.jsx
│   │   │   └── AppMenu.jsx
│   │   ├── profile/                    # P1 — dog setup + kcal target
│   │   │   ├── ProfileEditor.jsx
│   │   │   ├── DogSwitchSheet.jsx
│   │   │   ├── DogsOverview.jsx
│   │   │   └── ActiveDogSummary.jsx
│   │   ├── catalog/                    # P2 — Food / Meds / Supplements library
│   │   │   ├── CatalogList.jsx
│   │   │   └── CareItemForm.jsx
│   │   ├── menu/                       # P2 — per-dog daily menu (planned routine)
│   │   │   ├── DailyMenu.jsx
│   │   │   └── MenuItemRow.jsx
│   │   ├── log/                        # P2 — primary interaction surface
│   │   │   ├── TodayView.jsx
│   │   │   ├── QuickLogSheet.jsx       # create/pick item while logging
│   │   │   └── LogEntryForm.jsx
│   │   └── ui/
│   │       ├── Button.jsx
│   │       ├── Card.jsx
│   │       ├── Field.jsx
│   │       └── Modal.jsx
│   ├── context/
│   │   └── AppContext.jsx
│   ├── utils/
│   │   ├── calculations.js             # RER / DER (P1)
│   │   ├── dogs.js
│   │   └── storage.js                  # load / save / normalize / migrate
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js
└── package.json
```

### Legacy modules (migrate away)
| Current path | Role today | Target |
| --- | --- | --- |
| `components/pantry/*` | Food pantry only | Fold into `catalog/` (Food + Meds + Supplements) |
| `components/bowl/*` | Bowl Balancer % mix | Replace with `menu/` + kcal awareness on logs |
| `components/trip/*` | Trip pack + dogsitter sheet | Deferred (later care-handoff); keep data optional |
| `profile/ProTeaserModal.jsx` | Multi-dog false door | Remove; multi-dog is core |

## 2. Stack & Hosting

| Layer | Choice |
| --- | --- |
| UI | React 19 + Vite |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Icons | Lucide React |
| Persistence | `localStorage` key `ruffly_app_data_v1` |
| PWA | `vite-plugin-pwa` (manifest + Workbox service worker) |
| Hosting | GitHub Pages under `/ruffly/` (`base: '/ruffly/'`) |

### Installability checklist
- Web App Manifest (`manifest.webmanifest` generated at build)
- Service worker with precache (`registerType: 'autoUpdate'`)
- Icons: 192 / 512 PNG (+ maskable), Apple touch icon
- iOS meta: `apple-mobile-web-app-capable`, `apple-mobile-web-app-title`
- Served over HTTPS (GitHub Pages)

### Local commands
```bash
npm run dev      # http://localhost:5173 (SW enabled via vite-plugin-pwa devOptions)
npm run build    # production bundle → dist/
npm run preview  # verify installability on a phone via tunnel/LAN HTTPS
```

### GitHub Pages deploy
Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the app and publishes `dist/` via GitHub Actions.

One-time GitHub setup (repo → **Settings → Pages**):
1. **Source:** GitHub Actions (not “Deploy from a branch”).
2. Keep the custom domain / path that serves `https://porfir.io/ruffly/`.

After you commit the workflow file, the first Actions run may need you to approve the `github-pages` environment if GitHub prompts for it.

## 3. State Flow

```
UI components
    ↓ dispatch
AppContext (useReducer)
    ↓ useEffect on every state change
saveAppData() → localStorage['ruffly_app_data_v1']
    ↑
loadAppData() → normalizeAppData() on boot
```

- All list mutations are immutable (spread / `map` / `filter`).
- Persist only through AppContext → `src/utils/storage.js` (no raw `localStorage` in feature UI).
- Dog RER/DER is recomputed on boot and on `UPSERT_DOG` via `src/utils/calculations.js`, so multiplier changes apply without re-saving the profile.
- Catalog items are shared across dogs; menus and logs are **per dog**.

## 4. LocalStorage Data Schema (target)

Storage key remains `ruffly_app_data_v1`. `normalizeAppData()` migrates older shapes (see §6).

```json
{
  "activeDogId": "dog_01",
      "dogs": [
    {
      "id": "dog_01",
      "slug": "buster",
      "name": "Buster",
      "weight": 45,
      "weightUnit": "lbs",
      "goal": "maintain",
      "goalIntensity": "moderate",
      "activityLevel": "neutered_adult",
      "activityMultiplier": 1.4,
      "calorieMode": "calculator",
      "manualTargetKcal": null,
      "mealsPerDay": 2,
      "calculatedRER": 520,
      "targetDER": 728,
      "photoUrl": "",
      "onboarding": {
        "basicsDone": true,
        "menuDone": true
      },
      "medicationNeedIds": ["item_102"],
      "behaviorNotes": "Reactive to skateboards; fine with calm dogs.",
      "licenseNumber": "SCL-10482",
      "vaccineInfo": "Rabies 2026-03-12 (Sunnyvale AH). DHPP current.",
      "microchipId": "985112004567890",
      "careInfo": {
        "ownerName": "Alex",
        "ownerPhone": "555-0100",
        "ownerEmail": "",
        "emergencyName": "Sam",
        "emergencyPhone": "555-0199",
        "vetName": "Sunnyvale Animal Hospital",
        "vetPhone": "555-0142",
        "notes": "Loves frozen carrots. No walks before 7am."
      }
    }
  ],
  "ownerAccount": {
    "name": "Alex",
    "phone": "555-0100",
    "email": ""
  },
  "catalog": [
    {
      "id": "item_101",
      "kind": "food",
      "name": "Original Grain-Free",
      "brand": "Orijen",
      "notes": "",
      "defaultAmount": 200,
      "unit": "g",
      "kcalPerUnit": 0.394,
      "productUrl": "https://www.chewy.com/dp/12345"
    },
    {
      "id": "item_102",
      "kind": "med",
      "name": "Apoquel",
      "brand": "",
      "notes": "With breakfast",
      "defaultAmount": 1,
      "unit": "tablet",
      "kcalPerUnit": null,
      "productUrl": ""
    },
    {
      "id": "item_103",
      "kind": "supplement",
      "name": "Joint chews",
      "brand": "Dasuquin",
      "notes": "",
      "defaultAmount": 1,
      "unit": "chew",
      "kcalPerUnit": null,
      "productUrl": ""
    }
  ],
  "menusByDogId": {
    "dog_01": [
      {
        "id": "menu_1",
        "careItemId": "item_101",
        "slot": "breakfast",
        "amount": 200,
        "unit": "g"
      },
      {
        "id": "menu_2",
        "careItemId": "item_102",
        "slot": "breakfast",
        "amount": 1,
        "unit": "tablet"
      },
      {
        "id": "menu_3",
        "careItemId": "item_103",
        "slot": "evening",
        "amount": 1,
        "unit": "chew"
      }
    ]
  },
  "logs": [
    {
      "id": "log_901",
      "dogId": "dog_01",
      "careItemId": "item_101",
      "kind": "food",
      "amount": 200,
      "unit": "g",
      "kcal": 79,
      "loggedAt": "2026-08-13T14:30:00.000Z",
      "note": "",
      "menuItemId": "menu_1"
    },
    {
      "id": "log_902",
      "dogId": "dog_01",
      "careItemId": null,
      "kind": "weight",
      "amount": 45,
      "unit": "lbs",
      "kcal": null,
      "loggedAt": "2026-08-13T08:00:00.000Z",
      "note": "Morning weigh-in",
      "menuItemId": null
    }
  ]
}
```

### Field notes

| Area | Rules |
| --- | --- |
| **dogs (profile)** | Multi-dog is core. Profile is **partial after onboarding** (name, weight, `targetDER`, menu) and **completed later** with meds / IDs / notes. |
| **dogs.onboarding** | Soft flags: `basicsDone` (P1 saved), `menuDone` (menu has items or user skipped). UI may also infer completeness from fields. |
| **dogs.medicationNeedIds** | Array of catalog ids (`kind: "med"`). Profile meds link into the shared library; may also appear on the menu. |
| **dogs.behaviorNotes / licenseNumber / vaccineInfo / microchipId** | Completable profile fields; not required before Today / logging. `vaccineInfo` is open text for P2. |
| **dogs.careInfo** | Owner / emergency / vet contacts (+ general `notes`). Also completable post-onboarding. |
| **dogs.targetDER** | Recommended daily kcal (P1). `calorieMode: "manual"` may override with `manualTargetKcal`. |
| **catalog** | Shared library. `kind`: `food` \| `med` \| `supplement`. Foods may carry kcal; meds/supplements usually do not. |
| **menusByDogId** | Planned routine per dog — **goal of onboarding**. `slot` is a flexible label (`breakfast`, `evening`, `as_needed`, etc.). |
| **logs** | Append-only care history. `kind`: `food` \| `med` \| `supplement` \| `weight`. Prefer linking `careItemId`; allow null for one-off / weight. `menuItemId` optional when logging from the menu. |
| **ownerAccount** | Defaults for new dogs’ `careInfo` owner fields. |

### Catalog `kind` vs log `kind`
- Catalog items are only Food / Med / Supplement.
- Logs may also be `weight` (no catalog row required).
- When logging creates a new catalog item, write the catalog row first, then the log with that `careItemId`.

## 5. Feature → Module Map

| Priority | Feature | Primary modules |
| --- | --- | --- |
| P1 | Add dog + recommended daily kcal (partial profile) | `profile/*`, `utils/calculations.js` |
| P1 | Multi-dog switcher / overview | `profile/DogSwitchSheet.jsx`, `DogsOverview.jsx` |
| P2 | Onboarding → daily menu | `menu/*`, onboarding flow in profile / Today |
| P2 | Care library (Food / Meds / Supplements) | `catalog/*` |
| P2 | Today view + quick log (logging-first) | `log/*` |
| P2 | Profile completion (meds needs, behavior, license, vaccines, microchip) | `profile/*` (+ catalog med pickers) |
| Later | Weight trends, reminders, care handoff print | (new) — former `trip/*` ideas |

### Suggested AppContext actions (P1/P2)

| Action | Purpose |
| --- | --- |
| `UPSERT_DOG` / `UPDATE_DOG_PROFILE` / `DELETE_DOG` / `SET_ACTIVE_DOG` | Dog basics + profile completion |
| `UPSERT_CARE_ITEM` / `DELETE_CARE_ITEM` | Catalog CRUD |
| `SET_DOG_MENU` / `UPSERT_MENU_ITEM` / `DELETE_MENU_ITEM` | Per-dog menu (marks `onboarding.menuDone`) |
| `ADD_LOG` / `UPDATE_LOG` / `DELETE_LOG` | Care + weight logs |
| `SET_OWNER_ACCOUNT` | Account defaults |

## 6. Migration from current schema

`normalizeAppData()` in `src/utils/storage.js` **implements** this migration on every load / `REPLACE_ALL`.

| Legacy field | Migration |
| --- | --- |
| `pantry[]` | Merged into `catalog` as `kind: "food"` (ids and density fields preserved). `pantry` is re-derived for legacy UI / QR and **not** persisted. |
| `mealPlansByDogId` / `currentMealPlan` | Kept for bowl UI; also mirrored into `menusByDogId` (`slot: "daily"`, `legacyPercentage`). Meal-plan writes keep menus in sync (and vice versa for % rows). |
| `dogs[].primaryFood` | Upserted into catalog when no matching food name exists. |
| `tripSettings` / `proTeaser` | Still read/written for existing screens; not part of the P1/P2 product focus. |

**Catalog is the source of truth** for care items. Context actions `UPSERT_FOOD` / `REMOVE_FOOD` write through to catalog; new P2 actions are `UPSERT_CARE_ITEM`, `REMOVE_CARE_ITEM`, `SET_DOG_MENU`, `UPSERT_MENU_ITEM`, `DELETE_MENU_ITEM`, `ADD_LOG`, `UPDATE_LOG`, `DELETE_LOG`.

## 7. UX architecture (plant-care analogue)

Post-onboarding shell (see PRD “Post-onboarding UX”):

```
Today                          ← primary home (cross-dog care tasks)
  ├── Due / planned from menus (grouped by dog or slot)
  ├── One-tap Done → ADD_LOG
  ├── Soft kcal progress (logged vs targetDER)
  └── Edit routine → dog menu

Log (+)                        ← primary FAB / sheet
  └── Food | Med | Supplement | Weight
      (pick or create catalog item → ADD_LOG)

Pack                           ← secondary (dog management)
  ├── Dog list / switch
  ├── Dog detail: menu editor, profile completion, history
  └── Add dog (onboarding re-entry)

Account (overflow menu)        ← tertiary
  └── Owner profile, share/receive, reset, about

Catalog                        ← not a primary tab
  └── Reachable from log / menu / meds-need / Pack tidy-up
```

**Onboarding path:** Add dog (basics + kcal) → build daily menu → land on **Today**.  
**Logging-first rule:** Quick log can create a catalog item inline. Dedicated catalog screens are for organization, not the main add path.  
**Profile completion** is never a gate on logging.  
**Nav weight:** Today + Log are primary; Pack is secondary; Account / catalog tidy-up are tertiary. Legacy Bowl / Trip tabs are not the post-onboarding IA.
