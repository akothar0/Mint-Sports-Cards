# Mint

Mint is a React + Vite app for sports-card discovery, watchlists, collection tracking, and set progress.

## Tech Stack
- React 19
- Vite 7
- React Router 7
- Recharts
- lucide-react
- react-swipeable
- Tailwind (via `@tailwindcss/vite`) + custom CSS variables

## Getting Started
1. Install dependencies:
   - `npm install`
2. Copy env template:
   - `cp .env.example .env`
3. Start the dev server:
   - `npm run dev`
4. Run lint:
   - `npm run lint`
5. Build for production:
   - `npm run build`
6. Preview production build:
   - `npm run preview`

## Scripts
- `npm run dev`: start local dev server
- `npm run build`: production build
- `npm run lint`: ESLint
- `npm run preview`: preview built app locally

## Environment Variables

### Client-side (public)
Use `.env` / `.env.local` for browser-exposed values only.

- Must be prefixed with `VITE_`
- Example: `VITE_APP_TITLE=Mint — AI Card Discovery`

Important: all `VITE_*` values are public.

## Project Structure
- `src/pages`: route-level UI
- `src/components`: shared UI pieces
- `src/context/AppContext.jsx`: global state and actions
- `src/data/cards.js`: local demo dataset
- `public/cards`, `public/logos`: static assets

## Open-Source Notes
- Asset policy and licensing guidance: [`ASSETS.md`](./ASSETS.md)

## Contributing / Security / License
- Contributing guide: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- Security policy: [`SECURITY.md`](./SECURITY.md)
- License: [`LICENSE`](./LICENSE)
- Assets policy: [`ASSETS.md`](./ASSETS.md)
- CI workflow: [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)
