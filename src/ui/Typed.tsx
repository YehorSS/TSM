import { useEffect, useState } from 'react'

/** Строка «передачи», печатается по букве — как на сайте Stellar Horizons. */
export function Typed({ text, className = '' }: { text: string; className?: string }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    setN(0)
    const id = setInterval(() => setN((v) => (v >= text.length ? (clearInterval(id), v) : v + 1)), 28)
    return () => clearInterval(id)
  }, [text])
  return (
    <span className={`typed ${className}`} aria-label={text}>
      <span aria-hidden="true">{text.slice(0, n)}</span>
      <i aria-hidden="true" />
    </span>
  )
}
