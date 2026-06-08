'use client';

import React from 'react';
import { Toaster } from 'react-hot-toast';
import { DirtyFormProvider } from './dashboard/shared/dirty-form-context';

/** Client-only providers (toasts + unsaved-changes guard) for the whole app.
 *  Mounted from the root server layout. */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <DirtyFormProvider>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '13px',
          },
        }}
      />
    </DirtyFormProvider>
  );
}
