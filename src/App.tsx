import { useEffect, useState } from 'react';
import Today from './screens/Today';
import Plan from './screens/Plan';
import ProgressScreen from './screens/Progress';
import Goals from './screens/Goals';
import Settings from './screens/Settings';

type Tab = 'today' | 'plan' | 'progress' | 'goals' | 'settings';

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const TABS: { id: Tab; label: string; icon: JSX.Element }[] = [
  { id: 'today', label: 'Today', icon: icon('M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 100 8 4 4 0 000-8z') },
  { id: 'plan', label: 'Plan', icon: icon('M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z') },
  { id: 'progress', label: 'Progress', icon: icon('M3 3v18h18M7 15l4-4 3 3 6-6') },
  { id: 'goals', label: 'Goals', icon: icon('M12 22a10 10 0 100-20 10 10 0 000 20zM12 18a6 6 0 100-12 6 6 0 000 12zM12 14a2 2 0 100-4 2 2 0 000 4z') },
  { id: 'settings', label: 'Settings', icon: icon('M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z') },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('today');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  return (
    <div className="min-h-dvh max-w-lg mx-auto">
      <main className="px-4 pt-[max(env(safe-area-inset-top),12px)] pb-[calc(88px+env(safe-area-inset-bottom))] space-y-4">
        {tab === 'today' && <Today />}
        {tab === 'plan' && <Plan />}
        {tab === 'progress' && <ProgressScreen />}
        {tab === 'goals' && <Goals />}
        {tab === 'settings' && <Settings />}
      </main>
      <nav className="fixed bottom-0 inset-x-0 bg-[#0b0f14]/95 backdrop-blur border-t border-slate-800 pb-[env(safe-area-inset-bottom)] z-20">
        <ul className="max-w-lg mx-auto grid grid-cols-5">
          {TABS.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? 'page' : undefined}
                className={`w-full h-16 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                  tab === t.id ? 'text-emerald-400' : 'text-slate-500'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
