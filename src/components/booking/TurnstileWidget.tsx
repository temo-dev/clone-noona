'use client'

import { useEffect, useRef, useCallback } from 'react'
import Script from 'next/script'

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: {
        sitekey: string
        callback: (token: string) => void
        'error-callback': () => void
        'expired-callback': () => void
        theme?: 'light' | 'dark' | 'auto'
      }) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
    onTurnstileLoad?: () => void
  }
}

export function TurnstileWidget({
  onVerify,
  onExpire,
}: {
  onVerify: (token: string) => void
  onExpire?: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef  = useRef<string | null>(null)
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || !siteKey) return
    if (widgetIdRef.current) return  // already rendered

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: onVerify,
      'error-callback': () => onExpire?.(),
      'expired-callback': () => {
        onExpire?.()
        // Reset so user can re-verify
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current)
        }
      },
      theme: 'light',
    })
  }, [siteKey, onVerify, onExpire])

  // If Turnstile script already loaded before this component mounted
  useEffect(() => {
    if (window.turnstile) renderWidget()
  }, [renderWidget])

  // Called by the script's onload
  useEffect(() => {
    window.onTurnstileLoad = renderWidget
    return () => { window.onTurnstileLoad = undefined }
  }, [renderWidget])

  useEffect(() => {
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [])

  if (!siteKey) {
    // Dev mode — bypass with a fake token
    return (
      <div className="text-xs text-muted-foreground border border-dashed rounded px-3 py-2">
        Turnstile disabled (NEXT_PUBLIC_TURNSTILE_SITE_KEY not set)
        <button
          type="button"
          className="ml-2 underline"
          onClick={() => onVerify('dev-bypass-token')}
        >
          Simulate verify
        </button>
      </div>
    )
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad"
        strategy="lazyOnload"
        async
        defer
      />
      <div ref={containerRef} />
    </>
  )
}
