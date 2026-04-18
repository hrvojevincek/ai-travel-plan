# Vite Rolldown Integration Guide

This guide explains how to integrate Vite 8 Beta with Rolldown for the AI Travel Plan feature.

## Overview

Vite 8 Beta introduces Rolldown, a Rust-based bundler that replaces both esbuild and Rollup, offering significant build performance improvements.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

This will install:

- `vite@^8.0.0-beta.0` - Vite 8 Beta with Rolldown support
- `@vitejs/plugin-react@^4.3.1` - React plugin for Vite

### 2. Running with Vite Rolldown

You have two options:

#### Option A: Use Vite for Frontend (Recommended for AI Travel Plan)

Run the Vite dev server:

```bash
npm run dev:vite
```

Build with Vite:

```bash
npm run build:vite
```

Preview the production build:

```bash
npm run preview:vite
```

#### Option B: Keep Next.js for Full-Stack

If you want to keep Next.js for API routes:

- Run Next.js on port 3001: `npm run dev` (update next.config.ts to use port 3001)
- Run Vite on port 3000: `npm run dev:vite`
- Vite will proxy `/api` requests to Next.js

### 3. Configuration

The `vite.config.ts` file is configured with:

- **Rolldown enabled** (default in Vite 8 Beta)
- **Native plugins** enabled for better performance
- **Path aliases** matching your Next.js setup (`@/*`)
- **Code splitting** optimized for React and UI libraries
- **API proxy** to Next.js if running both

## Key Features

### Rolldown Benefits

- **Faster builds**: Rust-based bundling is significantly faster
- **Better tree-shaking**: More efficient dead code elimination
- **Native plugins**: Many Vite plugins have been converted to Rust for better performance

### Migration Notes

1. **Image Handling**: Vite uses standard `<img>` tags instead of Next.js `Image` component
2. **Routing**: You'll need to add a router (React Router) if migrating from Next.js
3. **API Routes**: Keep Next.js API routes or migrate to a separate backend
4. **Server Components**: Vite doesn't support Next.js Server Components

## File Structure

```
New-AiTravelPlan/
├── index.html          # Vite entry point
├── vite.config.ts     # Vite configuration with Rolldown
├── src/
│   ├── main.tsx       # Vite entry file
│   ├── App.tsx        # Main App component (Vite version)
│   └── features/
│       └── home-search.tsx  # AI Travel Plan search form
└── package.json       # Updated with Vite scripts
```

## Next Steps

1. **Install dependencies**: `npm install`
2. **Test Vite build**: `npm run dev:vite`
3. **Migrate API routes**: Either keep Next.js API routes or create a separate backend
4. **Add routing**: Install React Router if needed: `npm install react-router-dom`
5. **Update imports**: Replace Next.js-specific imports with standard React/Vite equivalents

## Troubleshooting

- **Module not found errors**: Run `npm install` to ensure all dependencies are installed
- **Port conflicts**: Change the port in `vite.config.ts` if 3000 is already in use
- **API proxy issues**: Ensure Next.js is running on the correct port if using the proxy

## Resources

- [Vite 8 Beta Announcement](https://vite.dev/blog/announcing-vite8-beta)
- [Rolldown Integration Guide](https://vite.dev/guide/rolldown)
- [Vite Migration Guide](https://vite.dev/blog/announcing-vite8-beta#migration-guide)
