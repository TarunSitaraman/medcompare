'use client'

import { useState, useEffect } from 'react'
import { getCart } from '@/lib/cart'

export default function CartBadge() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    setCount(getCart().length)
    function onUpdate(e: Event) {
      const detail = (e as CustomEvent<{ count: number }>).detail
      setCount(detail?.count ?? getCart().length)
    }
    window.addEventListener('medcompare:cart-updated', onUpdate)
    return () => window.removeEventListener('medcompare:cart-updated', onUpdate)
  }, [])

  if (count === 0) return null

  return (
    <span style={{
      position: 'absolute', top: -5, right: -5,
      minWidth: 17, height: 17, borderRadius: 9,
      background: 'var(--accent)', color: 'white',
      fontSize: 9, fontWeight: 700, padding: '0 4px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: '1.5px solid rgba(255,255,255,0.25)',
      pointerEvents: 'none',
    }}>
      {count > 9 ? '9+' : count}
    </span>
  )
}
