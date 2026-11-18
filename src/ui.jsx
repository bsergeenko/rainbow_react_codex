import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { asset, validate } from './lib.js';

export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);
export function Link({ to, children, onClick, ...props }) {
  const { navigate } = useApp();
  return <a href={to} {...props} onClick={event => { onClick?.(event); if (!event.defaultPrevented && !event.ctrlKey && !event.metaKey && !event.shiftKey && event.button === 0) { event.preventDefault(); navigate(to); } }}>{children}</a>;
}
export function Icon({ name, size = 22, filled = false }) {
  const paths = {
    search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></>,
    user: <><circle cx="12" cy="7.5" r="3.5"/><path d="M4.5 21v-2a7.5 7.5 0 0 1 15 0v2"/></>,
    heart: <path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.5a5.5 5.5 0 0 0 0-7.8Z"/>,
    bag: <><path d="M5 7h14l1 14H4L5 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/></>,
    arrow: <><path d="M4 12h16m-6-6 6 6-6 6"/></>,
    close: <path d="m5 5 14 14M19 5 5 19"/>,
    menu: <path d="M3 6h18M3 12h18M3 18h18"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    needle: <><path d="m5 20 9-15a3 3 0 0 1 5 3L5 20Z"/><path d="m15 8 2-2"/></>,
    drop: <path d="M12 2S5 10 5 15a7 7 0 0 0 14 0C19 10 12 2 12 2Z"/>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.arrow}</svg>;
}
export function Photo({ src, alt, ...props }) { return src ? <img src={asset(src)} alt={alt} {...props}/> : null; }
export function Loading() { return <div className="loading" role="status"><span/>Wird geladen …</div>; }
export function ErrorBox({ children }) { return children ? <div className="error-box" role="alert">{children}</div> : null; }
export function Empty({ children, action = true }) { return <div className="empty"><Icon name="bag" size={38}/><p>{children}</p>{action && <Link className="button secondary" to="/">Zur Startseite <Icon name="arrow" size={17}/></Link>}</div>; }
export function PageTitle({ eyebrow, title, children }) { return <div className="page-title">{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{children && <p>{children}</p>}</div>; }
export function useResource(loader, dependencies = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [version, setVersion] = useState(0);
  useEffect(() => { let active = true; setState({ data: null, loading: true, error: null }); Promise.resolve().then(loader).then(data => { if (active) setState({ data, loading: false, error: null }); }).catch(error => { if (active) setState({ data: null, loading: false, error }); }); return () => { active = false; }; }, [...dependencies, version]);
  return { ...state, reload: () => setVersion(value => value + 1) };
}
export function Form({ fields, initial = {}, extraValidate, onSubmit, submitLabel = 'Speichern', children, className = '' }) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);
  const check = next => ({ ...validate(next, fields), ...extraValidate?.(next) });
  async function submit(event) {
    event.preventDefault(); setError('');
    const nextErrors = check(values); setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { requestAnimationFrame(() => ref.current?.querySelector('[aria-invalid="true"]')?.focus()); return; }
    setBusy(true);
    try { const result = await onSubmit(values); if (result?.reset) { setValues(Object.fromEntries(fields.map(([name]) => [name, '']))); setErrors({}); } }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <form ref={ref} className={`form ${className}`} noValidate onSubmit={submit}>
    <div className="form-grid">{fields.map(([name, label, type = 'text', optional = false, options = {}]) => <label key={name} className={`field ${type === 'textarea' ? 'full' : ''}`} htmlFor={name}>{label}{!optional && <span className="required"> *</span>}
      {type === 'textarea' ? <textarea id={name} value={values[name] || ''} rows="5" aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${name}-error` : undefined} onChange={e => { setValues({ ...values, [name]: e.target.value }); if (errors[name]) setErrors({ ...errors, [name]: '' }); }} onBlur={() => setErrors(previous => ({ ...previous, [name]: check(values)[name] }))}/> : <input id={name} name={name} type={type} value={values[name] ?? ''} required={!optional} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${name}-error` : undefined} autoComplete={type === 'password' ? (name === 'currentPassword' || name === 'password' ? 'current-password' : 'new-password') : undefined} {...options} onChange={e => { setValues({ ...values, [name]: e.target.value }); if (errors[name]) setErrors({ ...errors, [name]: '' }); }} onBlur={() => setErrors(previous => ({ ...previous, [name]: check(values)[name] }))}/>}
      {errors[name] && <span className="field-error" id={`${name}-error`}>{errors[name]}</span>}
    </label>)}</div>
    {children}<ErrorBox>{error}</ErrorBox><button className="button" disabled={busy} type="submit">{busy ? 'Wird gespeichert …' : submitLabel}<Icon name="arrow" size={17}/></button>
  </form>;
}
export function ConfirmDialog({ title, children, onConfirm, onClose, confirmLabel = 'Bestätigen' }) {
  const ref = useRef(); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={ref} className="dialog" onCancel={onClose}><button className="icon-button dialog-close" aria-label="Schließen" onClick={onClose}><Icon name="close"/></button><h2>{title}</h2><p>{children}</p><ErrorBox>{error}</ErrorBox><div className="button-row"><button className="button secondary" onClick={onClose} disabled={busy}>Abbrechen</button><button className="button danger" disabled={busy} onClick={async () => { setBusy(true); try { await onConfirm(); onClose(); } catch (e) { setError(e.message); } finally { setBusy(false); } }}>{busy ? 'Bitte warten …' : confirmLabel}</button></div></dialog>;
}
