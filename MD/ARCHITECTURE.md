# Technical Architecture & Data Schema

## 1. Directory & Component Structure

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
│   │   │   └── Navigation.jsx
│   │   ├── profile/
│   │   │   ├── ProfileEditor.jsx
│   │   │   └── ProTeaserModal.jsx
│   │   ├── pantry/
│   │   │   ├── PantryList.jsx
│   │   │   └── FoodItemForm.jsx
│   │   ├── bowl/
│   │   │   ├── BowlBalancer.jsx
│   │   │   ├── CalorieRing.jsx
│   │   │   └── PortionSlider.jsx
│   │   ├── trip/
│   │   │   ├── TripCalculator.jsx
│   │   │   └── DogsitterSheet.jsx
│   │   └── ui/
│   │       ├── Button.jsx
│   │       ├── Card.jsx
│   │       └── Modal.jsx
│   ├── context/
│   │   └── AppContext.jsx
│   ├── utils/
│   │   ├── calculations.js
│   │   └── storage.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js
└── package.json
```

## 2. Stack & Hosting

| Layer | Choice |
| --- | --- |
| UI | React 19 + Vite |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Icons | Lucide React |
| Persistence | `localStorage` key `ruffly_app_data_v1` |
| PWA | `vite-plugin-pwa` (manifest + Workbox service worker) |
| Hosting | GitHub Pages (static) |

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

## 3. State Flow

```
UI components
    ↓ dispatch
AppContext (useReducer)
    ↓ useEffect on every state change
saveAppData() → localStorage['ruffly_app_data_v1']
    ↑
loadAppData() on boot
```

- All list mutations are immutable (spread / `map` / `filter`).
- Dog RER/DER is recomputed in the reducer on `UPSERT_DOG` via `src/utils/calculations.js`.

## 4. LocalStorage Data Schema

All application state is synchronized under the key `ruffly_app_data_v1`.

```json
{
  "activeDogId": "dog_01",
  "dogs": [
    {
      "id": "dog_01",
      "name": "Buster",
      "weight": 45,
      "weightUnit": "lbs",
      "goal": "maintain",
      "activityLevel": "neutered_adult",
      "activityMultiplier": 1.6,
      "calculatedRER": 520,
      "targetDER": 832,
      "photoUrl": ""
    }
  ],
  "pantry": [
    {
      "id": "food_101",
      "name": "Original Grain-Free",
      "brand": "Orijen",
      "category": "kibble",
      "kcalPerKg": 3940,
      "kcalPerCup": 473,
      "productUrl": "https://www.chewy.com/dp/12345"
    },
    {
      "id": "food_102",
      "name": "Turkey & Red Lentils",
      "brand": "Farmer's Dog",
      "category": "wet",
      "kcalPerKg": 1250,
      "kcalPerCup": 300,
      "productUrl": ""
    }
  ],
  "currentMealPlan": [
    { "foodId": "food_101", "percentage": 80 },
    { "foodId": "food_102", "percentage": 20 }
  ],
  "proTeaser": {
    "hasClickedAddDog": false,
    "userEmail": null
  }
}
```

## 5. Feature → Module Map

| Priority | Feature | Primary modules |
| --- | --- | --- |
| P1 | Dog profile + RER/DER + grams | `profile/*`, `utils/calculations.js` |
| P2 | Pantry + Bowl Balancer | `pantry/*`, `bowl/*` |
| P3 | Trip pack + Dogsitter sheet | `trip/*` (+ `print:` utilities) |
| False door | Multi-dog Pro teaser | `profile/ProTeaserModal.jsx` |
