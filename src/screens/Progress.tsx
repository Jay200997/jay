import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '../lib/store';
import { addDays, dateKey, formatDuration, formatShort, parseDuration, paceString, weekdayIndex, daysBetween } from '../lib/date';
import { uid } from '../lib/seed';
import { recentLossRate, weeklyAverages, FAST_LOSS_KG_PER_WEEK } from '../lib/stats';
import { Banner, Button, Card, Field, Input, ScreenHeader } from '../ui';

const INK = '#94a3b8';
const GRID = '#1e293b';
const WEIGHT = '#34d399';
const AVG = '#60a5fa';
const WAIST = '#fbbf24';

const tooltipStyle = { background: '#0f172a', border: '1px solid #334155', borderRadius: 12, color: '#e2e8f0', fontSize: 13 };

export default function ProgressScreen() {
  const { data, update } = useStore();
  const today = dateKey();

  const weights = useMemo(() => [...data.weights].sort((a, b) => a.date.localeCompare(b.date)), [data.weights]);
  const waists = useMemo(() => [...data.waists].sort((a, b) => a.date.localeCompare(b.date)), [data.waists]);
  const runs = useMemo(() => [...data.runs].sort((a, b) => b.date.localeCompare(a.date)), [data.runs]);
  const avgs = useMemo(() => weeklyAverages(weights), [weights]);
  const lossRate = recentLossRate(weights);

  // Weigh-ins this week (target 3)
  const monday = addDays(today, -weekdayIndex(today));
  const weighInsThisWeek = weights.filter((w) => w.date >= monday && w.date <= today).length;
  const lastWaist = waists[waists.length - 1];
  const waistDue = !lastWaist || daysBetween(lastWaist.date, today) >= 14;

  // Chart data: each weigh-in plus the weekly average drawn at that week's Sunday-ish midpoint.
  const weightChart = useMemo(() => {
    const avgMap = new Map(avgs.map((a) => [a.week, a.avg]));
    const rows = new Map<string, { date: string; kg?: number; avg?: number }>();
    for (const w of weights) rows.set(w.date, { ...(rows.get(w.date) ?? { date: w.date }), kg: w.kg });
    for (const [wk, avg] of avgMap) {
      const mid = addDays(wk, 3);
      rows.set(mid, { ...(rows.get(mid) ?? { date: mid }), avg: Number(avg.toFixed(2)) });
    }
    return [...rows.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [weights, avgs]);

  return (
    <>
      <ScreenHeader title="Progress" sub="Weigh in 3 mornings a week · waist every 2 weeks" />

      {lossRate !== null && lossRate > FAST_LOSS_KG_PER_WEEK && (
        <Banner tone="warn">
          Losing {lossRate.toFixed(2)} kg/week (target ≤ {FAST_LOSS_KG_PER_WEEK}). <strong>Add food to protect muscle</strong> — e.g. +1 roti or +150 g curd a day.
        </Banner>
      )}

      <Card title="Weight" right={<span className={`text-sm ${weighInsThisWeek >= 3 ? 'text-emerald-400' : 'text-slate-400'}`}>{weighInsThisWeek}/3 this week</span>}>
        <QuickLog
          unit="kg"
          step="0.1"
          placeholder="e.g. 69.6"
          onAdd={(date, v) => update((d) => ({ ...d, weights: [...d.weights.filter((w) => w.date !== date), { id: uid('w'), date, kg: v }] }))}
        />
        {avgs.length > 0 && (
          <div className="mt-4">
            <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Weekly average</p>
            <ul className="space-y-1">
              {avgs.slice(-6).reverse().map((a, i, arr) => {
                const prev = arr[i + 1];
                const diff = prev ? a.avg - prev.avg : null;
                return (
                  <li key={a.week} className="flex justify-between text-sm tabular-nums">
                    <span className="text-slate-400">Week of {formatShort(a.week)} <span className="text-slate-600">({a.count})</span></span>
                    <span>
                      {a.avg.toFixed(1)} kg
                      {diff !== null && <span className={`ml-2 ${diff > 0 ? 'text-rose-300' : 'text-emerald-400'}`}>{diff > 0 ? '+' : ''}{diff.toFixed(1)}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {weightChart.length >= 2 ? (
          <div className="mt-4">
            <div className="flex gap-4 text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: WEIGHT }} />Weigh-in</span>
              <span className="flex items-center gap-1.5"><span className="w-4 h-0.5" style={{ background: AVG }} />Weekly avg</span>
            </div>
            <div className="h-56 -ml-2">
              <ResponsiveContainer>
                <LineChart data={weightChart} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="date" tickFormatter={formatShort} stroke={INK} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} stroke={INK} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} tickFormatter={(v: number) => v.toFixed(1)} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={(l: string) => formatShort(l)} formatter={(v: number, n: string) => [`${v} kg`, n === 'kg' ? 'Weigh-in' : 'Weekly avg']} />
                  <Line type="monotone" dataKey="kg" stroke={WEIGHT} strokeWidth={0} dot={{ r: 4, fill: WEIGHT, stroke: '#0f172a', strokeWidth: 2 }} activeDot={{ r: 6 }} connectNulls isAnimationActive={false} />
                  <Line type="monotone" dataKey="avg" stroke={AVG} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 mt-3">Log at least two weigh-ins to see the chart.</p>
        )}
        <EntryList
          items={weights.slice().reverse().map((w) => ({ id: w.id, left: formatShort(w.date), right: `${w.kg.toFixed(1)} kg` }))}
          onDelete={(id) => update((d) => ({ ...d, weights: d.weights.filter((w) => w.id !== id) }))}
        />
      </Card>

      <Card title="Waist" right={<span className={`text-sm ${waistDue ? 'text-amber-300' : 'text-slate-400'}`}>{waistDue ? 'Check due' : `Next ${formatShort(addDays(lastWaist!.date, 14))}`}</span>}>
        <QuickLog
          unit="in"
          step="0.25"
          placeholder="e.g. 34.5"
          onAdd={(date, v) => update((d) => ({ ...d, waists: [...d.waists.filter((w) => w.date !== date), { id: uid('wa'), date, inches: v }] }))}
        />
        {waists.length >= 2 ? (
          <div className="h-48 mt-4 -ml-2">
            <ResponsiveContainer>
              <LineChart data={waists} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="date" tickFormatter={formatShort} stroke={INK} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} stroke={INK} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} tickFormatter={(v: number) => v.toFixed(1)} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={(l: string) => formatShort(l)} formatter={(v: number) => [`${v} in`, 'Waist']} />
                <Line type="monotone" dataKey="inches" stroke={WAIST} strokeWidth={2} dot={{ r: 4, fill: WAIST, stroke: '#0f172a', strokeWidth: 2 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-slate-500 mt-3">Log at least two waist checks to see the chart. Goal: under 32 in.</p>
        )}
        <EntryList
          items={waists.slice().reverse().map((w) => ({ id: w.id, left: formatShort(w.date), right: `${w.inches.toFixed(2)} in` }))}
          onDelete={(id) => update((d) => ({ ...d, waists: d.waists.filter((w) => w.id !== id) }))}
        />
      </Card>

      <RunLog
        runs={runs}
        onAdd={(r) => update((d) => ({ ...d, runs: [...d.runs, { id: uid('run'), ...r }] }))}
        onDelete={(id) => update((d) => ({ ...d, runs: d.runs.filter((r) => r.id !== id) }))}
      />
    </>
  );
}

function QuickLog({ unit, step, placeholder, onAdd }: { unit: string; step: string; placeholder: string; onAdd: (date: string, v: number) => void }) {
  const [date, setDate] = useState(dateKey());
  const [val, setVal] = useState('');
  const n = Number(val);
  const ok = val !== '' && Number.isFinite(n) && n > 0;
  return (
    <div className="flex gap-2">
      <Input type="date" className="flex-[1.2]" value={date} max={dateKey()} onChange={(e) => setDate(e.target.value || dateKey())} />
      <Input type="number" inputMode="decimal" step={step} placeholder={placeholder} className="flex-1" value={val} onChange={(e) => setVal(e.target.value)} aria-label={unit} />
      <Button disabled={!ok} onClick={() => { onAdd(date, Math.round(n * 100) / 100); setVal(''); }}>Add</Button>
    </div>
  );
}

function EntryList({ items, onDelete }: { items: { id: string; left: string; right: string }[]; onDelete: (id: string) => void }) {
  const [show, setShow] = useState(false);
  if (!items.length) return null;
  return (
    <div className="mt-3">
      <button type="button" className="text-sm text-slate-400 min-h-[44px]" onClick={() => setShow(!show)}>
        {show ? 'Hide' : 'Show'} all entries ({items.length})
      </button>
      {show && (
        <ul className="divide-y divide-slate-800">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between py-1.5 text-sm tabular-nums">
              <span className="text-slate-400">{it.left}</span>
              <span className="flex items-center gap-3">
                {it.right}
                <button type="button" aria-label="Delete" className="w-10 h-10 rounded-lg text-rose-300 active:bg-rose-600/20" onClick={() => onDelete(it.id)}>×</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RunLog({ runs, onAdd, onDelete }: { runs: { id: string; date: string; km: number; seconds: number }[]; onAdd: (r: { date: string; km: number; seconds: number }) => void; onDelete: (id: string) => void }) {
  const [date, setDate] = useState(dateKey());
  const [km, setKm] = useState('');
  const [time, setTime] = useState('');
  const kmN = Number(km);
  const secs = parseDuration(time);
  const ok = kmN > 0 && secs !== null;
  const best5k = runs.filter((r) => r.km >= 5).reduce<number | null>((b, r) => {
    const est = (r.seconds / r.km) * 5;
    return b === null || est < b ? est : b;
  }, null);
  const longest = runs.reduce((m, r) => Math.max(m, r.km), 0);

  return (
    <Card title="Runs">
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Date"><Input type="date" value={date} max={dateKey()} onChange={(e) => setDate(e.target.value || dateKey())} /></Field>
          <Field label="Distance (km)"><Input type="number" inputMode="decimal" step="0.01" placeholder="5.0" value={km} onChange={(e) => setKm(e.target.value)} /></Field>
        </div>
        <Field label="Time (mm:ss or h:mm:ss)"><Input inputMode="numeric" placeholder="31:45" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-400">Pace: <span className="text-slate-100 tabular-nums">{ok ? paceString(secs!, kmN) : '–'}</span></span>
          <Button disabled={!ok} onClick={() => { onAdd({ date, km: kmN, seconds: secs! }); setKm(''); setTime(''); }}>Save run</Button>
        </div>
      </div>

      {runs.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
            <div className="rounded-xl bg-slate-950/50 p-3"><p className="text-slate-400 text-xs">Longest</p><p className="font-semibold tabular-nums">{longest.toFixed(2)} km</p></div>
            <div className="rounded-xl bg-slate-950/50 p-3"><p className="text-slate-400 text-xs">Best 5 km (est.)</p><p className="font-semibold tabular-nums">{best5k ? formatDuration(best5k) : '–'}</p></div>
          </div>
          <ul className="divide-y divide-slate-800 mt-3">
            {runs.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2 text-sm tabular-nums">
                <div>
                  <p>{r.km.toFixed(2)} km · {formatDuration(r.seconds)}</p>
                  <p className="text-slate-400">{formatShort(r.date)} · {paceString(r.seconds, r.km)}</p>
                </div>
                <button type="button" aria-label="Delete run" className="w-10 h-10 rounded-lg text-rose-300 active:bg-rose-600/20" onClick={() => onDelete(r.id)}>×</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
