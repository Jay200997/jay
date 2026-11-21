import { useState } from 'react';
import { useStore } from '../lib/store';
import { dateKey, programWeek, weekdayIndex, DAY_NAMES } from '../lib/date';
import { seedPlan, uid } from '../lib/seed';
import { MEAL_SLOTS, type DayPlan, type MealSlot } from '../lib/types';
import { Button, Card, Input, ScreenHeader } from '../ui';
import { exerciseDetail } from './Today';

export default function Plan() {
  const { data, update } = useStore();
  const todayIdx = weekdayIndex(dateKey());
  const [open, setOpen] = useState<number | null>(todayIdx);
  const [editing, setEditing] = useState(false);
  const week = programWeek(data.settings.startDate);

  const setDay = (i: number, fn: (d: DayPlan) => DayPlan) =>
    update((d) => ({ ...d, plan: d.plan.map((p, j) => (j === i ? fn(p) : p)) }));

  return (
    <>
      <div className="flex items-end justify-between">
        <ScreenHeader title="Weekly plan" sub="Tap a day to view. Edit to change anything." />
        <Button variant={editing ? 'primary' : 'soft'} onClick={() => setEditing(!editing)}>{editing ? 'Done' : 'Edit'}</Button>
      </div>

      {data.plan.map((day, i) => {
        const kcal = day.meals.reduce((s, m) => s + m.kcal, 0);
        const protein = day.meals.reduce((s, m) => s + m.protein, 0);
        const isOpen = open === i;
        return (
          <Card key={i} className={i === todayIdx ? 'border-emerald-600/60' : ''}>
            <button type="button" className="w-full flex items-center justify-between min-h-[44px] text-left" onClick={() => setOpen(isOpen ? null : i)}>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">{DAY_NAMES[i]}{i === todayIdx && <span className="text-emerald-400"> · today</span>}</p>
                <p className="font-semibold">{day.title}</p>
              </div>
              <div className="text-right text-sm text-slate-400 tabular-nums">
                {kcal} kcal<br />{protein} g protein
              </div>
            </button>

            {isOpen && !editing && (
              <div className="mt-3 space-y-3">
                <ul className="space-y-1.5">
                  {day.exercises.map((e) => (
                    <li key={e.id} className="flex justify-between gap-3 text-sm"><span>{e.name}</span><span className="text-slate-400 shrink-0">{exerciseDetail(e.detail, week)}</span></li>
                  ))}
                </ul>
                <div className="border-t border-slate-800 pt-3 space-y-1.5">
                  {day.meals.map((m) => (
                    <div key={m.id} className="flex justify-between gap-3 text-sm">
                      <span><span className="text-slate-500">{m.slot}: </span>{m.name}</span>
                      {m.slot !== 'Supplements' && <span className="text-slate-400 shrink-0 tabular-nums">{m.kcal} / {m.protein} g</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isOpen && editing && <DayEditor day={day} onChange={(fn) => setDay(i, fn)} />}
          </Card>
        );
      })}

      {editing && (
        <Button
          variant="danger"
          className="w-full"
          onClick={() => {
            if (confirm('Reset the whole weekly plan to the default? Your logs stay, but ticks for edited items will be lost.')) update((d) => ({ ...d, plan: seedPlan() }));
          }}
        >
          Reset plan to default
        </Button>
      )}
    </>
  );
}

function DayEditor({ day, onChange }: { day: DayPlan; onChange: (fn: (d: DayPlan) => DayPlan) => void }) {
  return (
    <div className="mt-3 space-y-4">
      <Input value={day.title} onChange={(e) => onChange((d) => ({ ...d, title: e.target.value }))} aria-label="Day title" />

      <div>
        <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Exercises</p>
        <div className="space-y-2">
          {day.exercises.map((e, j) => (
            <div key={e.id} className="flex gap-2">
              <Input className="flex-[3]" value={e.name} placeholder="Exercise" onChange={(ev) => onChange((d) => ({ ...d, exercises: d.exercises.map((x, k) => (k === j ? { ...x, name: ev.target.value } : x)) }))} />
              <Input className="flex-[2]" value={e.detail} placeholder="3 × 10" onChange={(ev) => onChange((d) => ({ ...d, exercises: d.exercises.map((x, k) => (k === j ? { ...x, detail: ev.target.value } : x)) }))} />
              <RemoveBtn onClick={() => onChange((d) => ({ ...d, exercises: d.exercises.filter((_, k) => k !== j) }))} />
            </div>
          ))}
        </div>
        <Button variant="soft" className="w-full mt-2" onClick={() => onChange((d) => ({ ...d, exercises: [...d.exercises, { id: uid('ex'), name: '', detail: '' }] }))}>+ Add exercise</Button>
        <p className="text-xs text-slate-500 mt-1">Tip: write <code>{'{longrun}'}</code> in the sets field to auto-show this week's long-run distance.</p>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Meals</p>
        <div className="space-y-3">
          {day.meals.map((m, j) => {
            const set = (patch: Partial<typeof m>) => onChange((d) => ({ ...d, meals: d.meals.map((x, k) => (k === j ? { ...x, ...patch } : x)) }));
            return (
              <div key={m.id} className="rounded-xl bg-slate-950/50 p-2 space-y-2">
                <div className="flex gap-2">
                  <select
                    className="min-h-[48px] rounded-xl bg-slate-800 border border-slate-700 px-2 text-base"
                    value={m.slot}
                    onChange={(e) => set({ slot: e.target.value as MealSlot })}
                  >
                    {MEAL_SLOTS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                  <RemoveBtn onClick={() => onChange((d) => ({ ...d, meals: d.meals.filter((_, k) => k !== j) }))} />
                </div>
                <Input value={m.name} placeholder="What you eat" onChange={(e) => set({ name: e.target.value })} />
                <div className="flex gap-2 items-center">
                  <Input type="number" inputMode="numeric" value={m.kcal} onChange={(e) => set({ kcal: Number(e.target.value) || 0 })} aria-label="kcal" />
                  <span className="text-slate-400 text-sm">kcal</span>
                  <Input type="number" inputMode="numeric" value={m.protein} onChange={(e) => set({ protein: Number(e.target.value) || 0 })} aria-label="protein grams" />
                  <span className="text-slate-400 text-sm">g</span>
                </div>
              </div>
            );
          })}
        </div>
        <Button variant="soft" className="w-full mt-2" onClick={() => onChange((d) => ({ ...d, meals: [...d.meals, { id: uid('meal'), slot: 'Lunch', name: '', kcal: 0, protein: 0 }] }))}>+ Add meal item</Button>
      </div>
    </div>
  );
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" aria-label="Remove" onClick={onClick} className="ml-auto shrink-0 w-12 min-h-[48px] rounded-xl bg-rose-600/15 text-rose-300 active:bg-rose-600/30 text-xl">×</button>
  );
}
