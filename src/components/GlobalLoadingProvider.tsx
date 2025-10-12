'use client'
import React, { createContext, useContext, useState, useCallback } from 'react'

interface GlobalLoadingContextValue {
  start: () => void
  stop: () => void
  active: boolean
}

const GlobalLoadingContext = createContext<GlobalLoadingContextValue | null>(
  null
)

export function GlobalLoadingProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [count, setCount] = useState(0)

  const start = useCallback(() => setCount((c) => c + 1), [])
  const stop = useCallback(() => setCount((c) => (c > 0 ? c - 1 : 0)), [])

  const active = count > 0

  return (
    <GlobalLoadingContext.Provider value={{ start, stop, active }}>
      {children}
      <GlobalLoadingOverlay active={active} />
    </GlobalLoadingContext.Provider>
  )
}

export function useGlobalLoading() {
  const ctx = useContext(GlobalLoadingContext)
  if (!ctx)
    throw new Error(
      'useGlobalLoading must be used within GlobalLoadingProvider'
    )
  return ctx
}

function GlobalLoadingOverlay({ active }: { active: boolean }) {
  return (
    <div
      className={[
        'pointer-events-none fixed inset-0 z-40 flex items-start justify-center',
        active ? 'opacity-100' : 'opacity-0',
        'transition-opacity duration-150',
      ].join(' ')}
      aria-hidden={!active}
    >
      {/* Blur / backdrop */}
      <div
        className={[
          'absolute inset-0 backdrop-blur-sm bg-background/40 dark:bg-black/40 transition-opacity',
          active ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      />
      <div className="mt-24 relative z-10 rounded-md border bg-card px-6 py-4 shadow">
        <div className="flex items-center gap-3">
          <Spinner />
          <div className="text-sm font-medium">İşlem yapılıyor…</div>
        </div>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
  )
}
