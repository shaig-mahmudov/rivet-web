# Rivet Web (Frontend)

This is the frontend React application for Rivet, an engineering workflow and task management platform.

## Repositories
- **Frontend Repository**: [https://github.com/shaig-mahmudov/rivet-web](https://github.com/shaig-mahmudov/rivet-web)
- **Backend Repository**: [https://github.com/shaig-mahmudov/rivet-api](https://github.com/shaig-mahmudov/rivet-api)

## Live Deployment
- **Vercel Deployment**: [https://rivet-eta.vercel.app](https://rivet-eta.vercel.app)

## Tech Stack
- React 18
- Vite
- TypeScript
- Vanilla CSS (Custom dark theme with glassmorphism)
- React Router DOM
- Lucide React (Icons)

## Setup & Local Development

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The application expects the backend API to be running on `http://localhost:8080`. API requests are proxied via the Vite configuration to avoid CORS issues locally.

## Production Build

To build the application for production:
```bash
npm run build
```

The output will be placed in the `dist` directory, which can be deployed to Vercel, Netlify, or served via Nginx.

When deploying to Vercel, ensure you set the `VITE_API_URL` environment variable to your production backend URL (e.g., `https://my-api.koyeb.app/api`).
