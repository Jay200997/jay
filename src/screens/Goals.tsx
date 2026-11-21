import { useEffect, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { addDays, formatShort, programWeek } from '../lib/date';
import { seedGoals, uid } from '../lib/seed';
import type { GoalWeek } from '../lib/types';
import { Button, Card, CheckRow, ConfirmButton, Input, Progress, ScreenHeader } from '../ui';

export default function Goals() {
  const { data, update } = useStore();
  const [editing, setEditing] = useState(false);
  const week = programWeek(data.settings.startDate);
  const currentRef = useRef<HTMLDivElement>(null);

  const isCurrent = (g: GoalWeek) => (g.week !== null ? g.week === week : week > 12);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center' });
  }, []);

  const total = data.goals.reduce((s, g) => s + g.items.length, 0);
  const done = data.goals.reduce((s, g) => s + g.items.filter((i) => data.goalsDone[i.id]).length, 0);

  const setGoal = (id: string, fn: (g: GoalWeek) => GoalWeek) => update((d) => ({ ...d, goals: d.goals.map((g) => (g.id === id ? fn(g) : g)) }));

  return (
    <>
      <div className="flex items-end justify-between">
        <ScreenHeader title="Goals" sub={week > 0 ? `You're in week ${week}` : `Starts ${formatShort(data.settings.startDate)}`} />
        <Button variant={editing ? 'primary' : 'soft'} onClick={() => setEditing(!editing)}>{editing ? 'Done' : 'Edit'}</Button>
      </div>
      <div>
        <div className="flex justify-between text-xs text-slate-400 mb-1"><span>Overall</span><span>{done}/{total}</span></div>
        <Progress value={done} max={total} />
      </div>

      {data.goals.map((g) => {
        const cur = isCurrent(g);
        const past = g.week !== null && week > g.week;
        const start = g.week !== null ? addDays(data.settings.startDate, (g.week - 1) * 7) : addDays(data.settings.startDate, 84);
        return (
          <div key={g.id} ref={cur ? currentRef : undefined}>
            <Card
              className={cur ? 'border-emerald-500 ring-1 ring-emerald-500/40' : past ? 'opacity-75' : ''}
              title={
                <span>
                  {g.label}
                  {cur && <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 align-middle">This week</span>}
                </span>
              }
              right={<span className="text-xs text-slate-500">from {formatShort(start)}</span>}
            >
              {editing ? (
                <div className="space-y-2">
                  {g.items.map((it, j) => (
                    <div key={it.id} className="flex gap-2">
                      <Input value={it.text} onChange={(e) => setGoal(g.id, (x) => ({ ...x, items: x.items.map((y, k) => (k === j ? { ...y, text: e.target.value } : y)) }))} />
                      <button type="button" aria-label="Remove goal" className="shrink-0 w-12 min-h-[48px] rounded-xl bg-rose-600/15 text-rose-300 text-xl" onClick={() => setGoal(g.id, (x) => ({ ...x, items: x.items.filter((_, k) => k !== j) }))}>×</button>
                    </div>
                  ))}
                  <Button variant="soft" className="w-full" onClick={() => setGoal(g.id, (x) => ({ ...x, items: [...x.items, { id: uid('g'), text: '' }] }))}>+ Add goal</Button>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/70">
                  {g.items.map((it) => (
                    <CheckRow
                      key={it.id}
                      checked={!!data.goalsDone[it.id]}
                      onToggle={() => update((d) => ({ ...d, goalsDone: { ...d.goalsDone, [it.id]: !d.goalsDone[it.id] } }))}
                      label={it.text}
                    />
                  ))}
                </div>
              )}
            </Card>
          </div>
        );
      })}

      {editing && (
        <ConfirmButton
          className="w-full"
          label="Reset goals to default"
          confirmLabel="Tap again to reset goals"
          onConfirm={() => update((d) => ({ ...d, goals: seedGoals(), goalsDone: {} }))}
        />
      )}
    </>
  );
}
