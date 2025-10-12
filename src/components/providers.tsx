'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { SessionProvider } from 'next-auth/react'
import { ToastProvider } from './ui/toast'
import { GlobalLoadingProvider } from './GlobalLoadingProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(() => new QueryClient())
  return (
    <SessionProvider>
      <QueryClientProvider client={client}>
        <ToastProvider>
          <GlobalLoadingProvider>{children}</GlobalLoadingProvider>
        </ToastProvider>
      </QueryClientProvider>
    </SessionProvider>
  )
}
