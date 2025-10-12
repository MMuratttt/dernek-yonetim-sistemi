'use client'

import { useEffect, useRef } from 'react'
import clsx from 'clsx'

type Props = {
  children: React.ReactNode
  className?: string
  delay?: number
}

// Simple IntersectionObserver-based reveal wrapper
export default function Reveal({ children, className, delay = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let cancelled = false
    let obs: IntersectionObserver | null = null

    const timer = setTimeout(() => {
      if (cancelled) return
      if (!el.isConnected) return
      obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              if (!el.isConnected) return
              el.classList.remove('reveal-hidden')
              el.classList.add('reveal-show')
              obs && obs.disconnect()
            }
          })
        },
        { threshold: 0.2 }
      )
      obs.observe(el)
    }, delay)

    return () => {
      cancelled = true
      clearTimeout(timer)
      if (obs) obs.disconnect()
    }
  }, [delay])

  return (
    <div ref={ref} className={clsx('reveal-hidden', className)}>
      {children}
    </div>
  )
}
