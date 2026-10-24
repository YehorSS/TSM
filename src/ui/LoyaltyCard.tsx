import { useEffect, useState } from 'react'
import { loyaltyCode, setLoyaltyCode } from '../core/loyalty'
import { useT } from './i18n'

/** Окно «Карта X-GO»: ввести, сохранить или убрать номер карты. */
export function LoyaltyCard({ onClose, onChange }: { onClose: () => void; onChange: (code: string) => void }) {
  const t = useT()
  const [code, setCode] = useState(loyaltyCode())
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])
  const save = (v: string) => (onChange(setLoyaltyCode(v)), onClose())

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={t.cardTitle} onClick={onClose}>
      <form className="sheet__body" onClick={(e) => e.stopPropagation()} onSubmit={(e) => (e.preventDefault(), save(code))}>
        <button type="button" className="sheet__close btn btn--ghost" onClick={onClose} aria-label={t.close}>✕</button>
        <h2 className="sheet__title">{t.cardTitle}</h2>
        <p className="card-text">{t.cardText}</p>
        <input className="pop__input" autoFocus inputMode="numeric" placeholder={t.cardPlaceholder}
          value={code} onChange={(e) => setCode(e.target.value)} />
        <div className="sheet__buy">
          {loyaltyCode() && <button type="button" className="btn btn--ghost" onClick={() => save('')}>{t.cardRemove}</button>}
          <button type="submit" className="btn btn--primary btn--big">{t.cardSave}</button>
        </div>
      </form>
    </div>
  )
}
