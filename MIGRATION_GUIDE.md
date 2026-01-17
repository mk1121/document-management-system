# Next.js Migration Guide

## Overview

This document describes the migration from a Vite-based React application to Next.js 15.

## Branch

- Branch: `nextjs-migration`

## What Changed

### Directory Structure

#### Before (Vite):

```
├── src/
│   ├── App.tsx
│   ├── components/
│   ├── services/
│   └── types.ts
├── backend/
│   ├── server.js (Express)
│   ├── dbConfig.js
│   └── schema.sql
├── vite.config.ts
└── package.json
```

#### After (Next.js):

```
├── app/
│   ├── layout.tsx (Root layout)
│   ├── page.tsx (Home page)
│   ├── api/
│   │   └── v1/
│   │       ├── doctors/route.ts
│   │       ├── auth/login/route.ts
│   │       ├── documents/sync/route.ts
│   │       ├── patients/
│   │       │   ├── search/route.ts
│   │       │   └── [id]/images/route.ts
│   │       └── images/[fileId]/route.ts
│   └── globals.css
├── components/
│   ├── MainApp.tsx (Client component wrapper)
│   ├── Login.tsx
│   ├── Header.tsx
│   ├── DocumentCard.tsx
│   ├── CameraModal.tsx
│   ├── ImagePreviewModal.tsx
│   ├── FormField.tsx
│   ├── Toast.tsx
│   └── ...
├── services/
│   ├── db.ts (IndexedDB service - client-side)
│   ├── imageService.ts (Client-side image compression)
│   └── ...
├── lib/ (New - for shared utilities)
├── backend/
│   ├── dbConfig.js
│   ├── schema.sql
│   └── (server.js routes moved to app/api)
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── jest.config.js
├── jest.setup.js
└── package.json
```

## Key Changes

### 1. **Build Tool Migration**

- **Removed**: Vite (`vite`, `@vitejs/plugin-react`, `vite-plugin-pwa`)
- **Added**: Next.js (`next`, `react`, `react-dom`)
- Build scripts changed:
  - `npm run dev` → starts Next.js dev server on http://localhost:3000
  - `npm run build` → builds for production
  - `npm start` → runs production server

### 2. **File Structure**

- Root HTML and main entry moved from `index.html` → `app/layout.tsx`
- Main React component `App.tsx` → `app/page.tsx` (with client component wrapper)
- All client components marked with `'use client'` directive

### 3. **API Routes**

All Express backend routes converted to Next.js API routes:

| Express Route                      | Next.js API Route                          |
| ---------------------------------- | ------------------------------------------ |
| `GET /api/health`                  | `app/api/health/route.ts`                  |
| `GET /api/v1/doctors`              | `app/api/v1/doctors/route.ts`              |
| `POST /api/v1/documents/sync`      | `app/api/v1/documents/sync/route.ts`       |
| `GET /api/v1/patients/search`      | `app/api/v1/patients/search/route.ts`      |
| `GET /api/v1/patients/:id/images`  | `app/api/v1/patients/[id]/images/route.ts` |
| `POST /api/v1/patients/:id/images` | `app/api/v1/patients/[id]/images/route.ts` |
| `DELETE /api/v1/images/:fileId`    | `app/api/v1/images/[fileId]/route.ts`      |
| `PUT /api/v1/images/:fileId`       | `app/api/v1/images/[fileId]/route.ts`      |
| `POST /api/v1/auth/login`          | `app/api/v1/auth/login/route.ts`           |

### 4. **Styling**

- **Added**: Tailwind CSS for utility-based styling
- Global CSS moved to `app/globals.css`
- Tailwind configuration added: `tailwind.config.ts`
- PostCSS configuration added: `postcss.config.mjs`

### 5. **Configuration Files**

- `next.config.ts` - Next.js configuration (replaces `vite.config.ts`)
- `tsconfig.json` - Updated for Next.js requirements
- `jest.config.js` - Jest testing configuration
- `jest.setup.js` - Jest setup file

### 6. **Environment Variables**

- Create `.env.local` with:
  ```
  NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
  ORACLE_HOST=localhost
  ORACLE_PORT=1521
  ORACLE_USER=your_user
  ORACLE_PASSWORD=your_password
  ORACLE_SERVICENAME=your_service_name
  ```

### 7. **Dependencies**

- **Removed**: Vite-related packages, vitest, jsdom
- **Added**: Next.js, Jest, Tailwind CSS, PostCSS, Autoprefixer

## Development Workflow

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

Server runs on `http://localhost:3000`

### 3. Build for Production

```bash
npm run build
npm start
```

### 4. Running Tests

```bash
npm test
npm run test:watch
```

## Important Notes

### Client Components

- Components using React hooks, event listeners, or browser APIs must be marked with `'use client'` directive
- Example: `components/MainApp.tsx`, `components/Toast.tsx`

### Server Components (by default)

- Components in `app/` that don't use browser APIs are Server Components
- They can directly access databases, APIs, etc.
- API routes in `app/api/` are always server-side

### Database Connections

- Oracle database connections are maintained in `backend/dbConfig.js`
- Used by all Next.js API routes in `app/api/`
- Connection strings configurable via environment variables

### Image Handling

- Client-side compression via `services/imageService.ts` (using Canvas API)
- Sharp library used server-side for image processing if needed
- Images stored in Oracle BLOB columns, retrieved as base64

### IndexedDB for Offline

- `services/db.ts` uses IndexedDB for client-side persistence
- Syncs with backend when online
- Each user gets separate IndexedDB: `DocDigitizeDB_{username}`

## Migration Checklist

- [x] Create new branch `nextjs-migration`
- [x] Set up Next.js structure
- [x] Configure TypeScript
- [x] Add Tailwind CSS
- [x] Migrate API routes
- [x] Update environment variables
- [x] Update package.json dependencies
- [ ] Test all features
- [ ] Update documentation
- [ ] Deploy to staging
- [ ] Merge to main

## Backend Considerations

The Express backend server (`backend/server.js`) can run separately or be:

1. **Option A**: Keep running independently on port 3001
2. **Option B**: Integrate into Next.js API routes (currently done)

Currently, all API routes are integrated into Next.js at `app/api/v1/...`

## Testing

- Unit tests: `**/*.test.ts(x)` or `**/*.spec.ts(x)`
- Run with: `npm test`
- Configured with Jest + Testing Library

## Styling Approach

The application uses Tailwind CSS for styling:

- Utility-first CSS framework
- Configuration: `tailwind.config.ts`
- Global styles: `app/globals.css`
- Component-level styles: Inline Tailwind classes

## Next Steps

1. Run `npm install` to install dependencies
2. Configure `.env.local` with your Oracle database credentials
3. Run `npm run dev` to start the development server
4. Test all features (login, document capture, search, etc.)
5. Build and deploy

## Troubleshooting

### Port Already in Use

If port 3000 is busy:

```bash
npm run dev -- -p 3001
```

### Module Not Found Errors

Ensure:

- All imports use correct paths (relative or via `@/` alias)
- `tsconfig.json` paths are configured correctly

### Oracle Connection Issues

- Verify `dbConfig.js` is correctly configured
- Check `.env.local` has correct credentials
- Ensure Oracle database is accessible

### Styling Not Applied

- Run `npm run build` to compile Tailwind
- Clear `.next` folder: `rm -rf .next`
- Restart dev server

---

**Created**: January 13, 2026
**Migration Branch**: `nextjs-migration`
