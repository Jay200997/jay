import { useRef, useState } from 'react';
import { useStore, normalize } from '../lib/store';
import { dateKey, mondayOf, programWeek } from '../lib/date';
import { longestStreak, currentStreak } from '../lib/stats';
import { seedData } from '../lib/seed';
import { Banner, Button, Card, ConfirmButton, Field, Input, ScreenHeader } from '../ui';
import type { AppData } from '../lib/types';

/** Embedded viewers block downloads, so the hosted single-file build hides that button. */
const CAN_DOWNLOAD = import.meta.env.VITE_TARGET !== 'artifact';

export default function Settings() {
  const { data, update, replace } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ tone: 'good' | 'warn'; text: string } | null>(null);

  const [pending, setPending] = useState<AppData | null>(null);
  const [paste, setPaste] = useState('');
  const [showJson, setShowJson] = useState(false);
  const json = JSON.stringify(data);

  const downloadData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fittrack-backup-${dateKey()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMsg({ tone: 'good', text: 'Backup file downloaded.' });
  };

  const copyData = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setMsg({ tone: 'good', text: 'Backup copied. Paste it into Notes, an email to yourself, or a file.' });
    } catch {
      setShowJson(true);
      setMsg({ tone: 'warn', text: 'Copy was blocked. Select the text below and copy it manually.' });
    }
  };

  const readBackup = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || !('plan' in parsed || 'logs' in parsed)) throw new Error('this is not a FitTrack backup');
      setPending(normalize(parsed));
      setMsg(null);
    } catch (e) {
      setPending(null);
      setMsg({ tone: 'warn', text: `Import failed: ${(e as Error).message}. Check you copied the whole backup.` });
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
        <p className="text-sm text-slate-400 mb-3">All data lives only in this browser on this phone. Back it up every week or two so you don't lose it if browser data is cleared.</p>
        <div className={`grid gap-2 ${CAN_DOWNLOAD ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <Button onClick={copyData}>Copy backup</Button>
          {CAN_DOWNLOAD && <Button variant="soft" onClick={downloadData}>Download file</Button>}
        </div>
        {showJson && <textarea readOnly value={json} onFocus={(e) => e.target.select()} className="mt-3 w-full h-28 rounded-xl bg-slate-800 border border-slate-700 p-2 text-xs font-mono" />}

        <p className="text-xs uppercase tracking-wide text-slate-400 mt-5 mb-1">Restore</p>
        <textarea
          id="restore-json"
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder="Paste a backup here"
          className="w-full h-24 rounded-xl bg-slate-800 border border-slate-700 p-2 text-sm font-mono placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
        />
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Button variant="soft" disabled={!paste.trim()} onClick={() => readBackup(paste)}>Check pasted</Button>
          <Button variant="soft" onClick={() => fileRef.current?.click()}>Choose file</Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) readBackup(await f.text());
          }}
        />
        {pending && (
          <div className="mt-3 space-y-2">
            <Banner tone="info">
              Backup found: {Object.values(pending.logs).filter((l) => l.complete).length} completed days, {pending.weights.length} weigh-ins, {pending.runs.length} runs. Restoring replaces everything on this phone.
            </Banner>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="ghost" onClick={() => setPending(null)}>Cancel</Button>
              <ConfirmButton
                label="Restore"
                confirmLabel="Tap to confirm"
                onConfirm={() => {
                  replace(pending);
                  setPending(null);
                  setPaste('');
                  setMsg({ tone: 'good', text: 'Backup restored.' });
                }}
              />
            </div>
          </div>
        )}
        {msg && <div className="mt-3"><Banner tone={msg.tone}>{msg.text}</Banner></div>}
      </Card>

      <Card title="Danger zone">
        <ConfirmButton className="w-full" label="Erase everything" confirmLabel="Tap again to erase all data" onConfirm={() => replace(seedData())} />
      </Card>

      <p className="text-center text-xs text-slate-600 pb-2">FitTrack · data stays on this device</p>
    </>
  );
}
