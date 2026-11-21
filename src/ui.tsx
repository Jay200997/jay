import type { ReactNode, InputHTMLAttributes, ButtonHTMLAttributes } from 'react';

export function Card({ title, right, children, className = '' }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl bg-slate-900/80 border border-slate-800 p-4 ${className}`}>
      {(title || right) && (
        <div className="flex items-center justify-between mb-3 gap-2">
          {title && <h2 className="text-base font-semibold text-slate-100">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function CheckRow({ checked, onToggle, label, sub, right }: { checked: boolean; onToggle: () => void; label: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className="w-full flex items-center gap-3 min-h-[56px] py-2 px-1 text-left rounded-xl active:bg-slate-800/60 transition-colors"
    >
      <span
        className={`shrink-0 grid place-items-center w-7 h-7 rounded-lg border-2 transition-colors ${
          checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'
        }`}
      >
        {checked && (
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-slate-950" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l5 5 9-10" />
          </svg>
        )}
      </span>
      <span className="flex-1 min-w-0">
        <span className={`block leading-snug ${checked ? 'text-slate-500 line-through' : 'text-slate-100'}`}>{label}</span>
        {sub && <span className="block text-sm text-slate-400 mt-0.5">{sub}</span>}
      </span>
      {right && <span className="shrink-0 text-sm text-slate-400 text-right">{right}</span>}
    </button>
  );
}

export function Button({ variant = 'primary', className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'soft' }) {
  const styles = {
    primary: 'bg-emerald-500 text-slate-950 active:bg-emerald-400 font-semibold',
    soft: 'bg-slate-800 text-slate-100 active:bg-slate-700',
    ghost: 'bg-transparent text-slate-300 active:bg-slate-800',
    danger: 'bg-rose-600/20 text-rose-300 active:bg-rose-600/30',
  }[variant];
  return <button type="button" className={`min-h-[48px] px-4 rounded-xl disabled:opacity-40 transition-colors ${styles} ${className}`} {...rest} />;
}

export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`min-h-[48px] w-full rounded-xl bg-slate-800 border border-slate-700 px-3 text-base text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 ${className}`}
      {...rest}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wide text-slate-400 mb-1">{label}</span>
      {children}
    </label>
  );
}

export function Banner({ tone, children }: { tone: 'warn' | 'info' | 'good'; children: ReactNode }) {
  const s = {
    warn: 'bg-amber-500/15 border-amber-500/40 text-amber-200',
    info: 'bg-sky-500/15 border-sky-500/40 text-sky-200',
    good: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200',
  }[tone];
  return <div className={`rounded-xl border px-4 py-3 text-sm ${s}`}>{children}</div>;
}

export function Progress({ value, max, color = 'bg-emerald-500' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
      <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function ScreenHeader({ title, sub }: { title: string; sub?: ReactNode }) {
  return (
    <header className="pt-2 pb-1">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {sub && <p className="text-slate-400 text-sm mt-0.5">{sub}</p>}
    </header>
  );
}
