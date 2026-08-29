# OceanScope Frontend Shell 🌊

React 19 + TypeScript + Vite frontend application for OceanScope.

## Current Stage
> **Frontend foundation**

## Available Scripts

- `npm run dev`: Starts local development server at `http://localhost:3000`
- `npm run build`: Type-checks and builds production output in `dist/`
- `npm run preview`: Previews local production build

## Architecture & Structure
- `src/components/common/`: Shared UI primitives (Buttons, Cards, Badges, Header, Footer)
- `src/components/layout/`: Navigation bar & Page shell
- `src/components/dashboard/`: Scientific dashboard widgets
- `src/pages/`: Main application routes (Home, Dashboard, Explorer, Observations, Analytics, About)
- `src/three/`: 3D Globe & WebGL visualization layers (Standby shell)
- `src/types/`: Domain TypeScript type definitions
- `src/config/`: App constants and API configurations
- `src/data/mock/`: Sample scientific placeholder data
