import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Activity, AlertTriangle, ChevronDown, LoaderCircle } from 'lucide-react'
import { getPortrait, loadPortraits, teamColor, type Driver } from './data'

export const Mark = () => <span className="brand-mark" aria-hidden><i/><i/><i/></span>
export function Label({ children }: { children: ReactNode }) {
  return <span className="label"><span className="label-line"/>{children}</span>
}
export function Portrait({ driver, eager = false }: { driver: Driver; eager?: boolean }) {
  const [loaded, setLoaded] = useState(false)
  const [failedFile, setFailedFile] = useState('')
  useEffect(() => { let active = true; void loadPortraits().then(() => { if (active) setLoaded(true) }); return () => { active = false } }, [])
  const portrait = loaded ? getPortrait(driver) : undefined
  return <div className="portrait" style={{ '--team': teamColor(driver) } as CSSProperties}>
    <span className="portrait-number" aria-hidden>{String(driver.driver_number).padStart(2, '0')}</span>
    {portrait && failedFile !== portrait.file ?
      <img src={portrait.file} alt={driver.full_name} loading={eager ? 'eager' : 'lazy'} onError={() => setFailedFile(portrait.file)} /> :
      <span className="portrait-initials" aria-hidden>{driver.name_acronym}</span>}
  </div>
}
export function Loading({ children = 'Acquiring timing data' }: { children?: ReactNode }) {
  return <div className="empty-state" role="status"><LoaderCircle className="spin" size={19}/><span>{children}</span></div>
}
export function Empty({ children, error = false, action }: { children: ReactNode; error?: boolean; action?: ReactNode }) {
  const Icon = error ? AlertTriangle : Activity
  return <div className="empty-state" role={error ? 'alert' : 'status'}><Icon size={19}/><span>{children}</span>{action}</div>
}
type Choice = { value: string | number; label: string }
export function Select({ title, value, choices, onChange }: { title: string; value: string | number; choices: Choice[]; onChange: (value: number) => void }) {
  return <label className="select-field"><span>{title}</span><span className="select-wrap"><select value={value} onChange={e => onChange(Number(e.target.value))} disabled={choices.length === 0}>
    {choices.length === 0 && <option value="">Unavailable</option>}
    {choices.map(choice => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
  </select><ChevronDown size={15} aria-hidden /></span></label>
}
export class WebGlError extends Error {}
export function hasWebGl() {
  try { return Boolean(document.createElement('canvas').getContext('webgl2')) } catch { return false }
}
