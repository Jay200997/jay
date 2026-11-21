import { useRef, useState } from 'react';
import { useStore, normalize } from '../lib/store';
import { dateKey, mondayOf, programWeek } from '../lib/date';
import { longestStreak, currentStreak } from '../lib/stats';
import { seedData } from '../lib/seed';
import { Banner, Button, Card, Field, Input, ScreenHeader } from '../ui';

export default function Settings() {
  const { data, update, replace } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ tone: 'good' | 'warn'; text: string } | null>(null);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fittrack-backup-${dateKey()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMsg({ tone: 'good', text: 'Backup downloaded.' });
  };

  const importData = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== 'object' || !('plan' in parsed || 'logs' in parsed)) throw new Error('Not a FitTrack backup');
      if (!confirm('Replace ALL current data with this backup?')) return;
      replace(normalize(parsed));
      setMsg({ tone: 'good', text: 'Backup imported.' });
    } catch (e) {
      setMsg({ tone: 'warn', text: `Import failed: ${(e as Error).message}` });
    }
  };

  const completed = Object.values(data.logs).filter((l) => l.complete).length;

  return (
    <>
      <ScreenHeader title="Settings" />

      <Card title="Programme">
        <div className="space-y-3">
          <Field label="Start date">
            <Input
              type="date"
              value={data.settings.startDate}
              onChange={(e) => e.target.value && update((d) => ({ ...d, settings: { ...d.settings, startDate: e.target.value } }))}
            />
          </Field>
          <p className="text-sm text-slate-400">
            Current week: <span className="text-slate-100">{programWeek(data.settings.startDate) || 'not started'}</span>
            {data.settings.startDate !== mondayOf(data.settings.startDate) && ' · tip: start on a Monday so weeks line up with the plan'}
          </p>
          <Field label="Water target (ml)">
            <Input
              type="number"
              inputMode="numeric"
              step="250"
              value={data.settings.waterTargetMl}
              onChange={(e) => update((d) => ({ ...d, settings: { ...d.settings, waterTargetMl: Math.max(250, Number(e.target.value) || 3000) } }))}
            />
          </Field>
        </div>
      </Card>

      <Card title="Stats">
        <dl className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-slate-950/50 p-3"><dt className="text-xs text-slate-400">Current</dt><dd className="text-xl font-bold">{currentStreak(data)}</dd></div>
          <div className="rounded-xl bg-slate-950/50 p-3"><dt className="text-xs text-slate-400">Longest</dt><dd className="text-xl font-bold">{longestStreak(data)}</dd></div>
          <div className="rounded-xl bg-slate-950/50 p-3"><dt className="text-xs text-slate-400">Days done</dt><dd className="text-xl font-bold">{completed}</dd></div>
        </dl>
      </Card>

      <Card title="Backup">
        <p className="text-sm text-slate-400 mb-3">All data lives only on this device. Export regularly so you don't lose it if browser data is cleared.</p>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={exportData}>Export JSON</Button>
          <Button variant="soft" onClick={() => fileRef.current?.click()}>Import JSON</Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importData(f);
            e.target.value = '';
          }}
        />
        {msg && <div className="mt-3"><Banner tone={msg.tone}>{msg.text}</Banner></div>}
      </Card>

      <Card title="Danger zone">
        <Button
          variant="danger"
          className="w-full"
          onClick={() => confirm('Erase ALL data and restore defaults? Export a backup first!') && replace(seedData())}
        >
          Erase everything
        </Button>
      </Card>

      <p className="text-center text-xs text-slate-600 pb-2">FitTrack · works offline · no account</p>
    </>
  );
}
