'use client';

import React from 'react';
import App from '@/app/page';

/**
 * MainApp Wrapper Component
 * 
 * This component serves as a wrapper for the main application logic.
 * In Next.js App Router, the root page logic is in app/page.tsx
 * This file maintains compatibility with the migration structure.
 */
export default function MainApp() {
  return <App />;
}
