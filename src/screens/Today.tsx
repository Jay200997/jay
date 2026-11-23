import { useState } from 'react';
import { useStore, emptyLog } from '../lib/store';
import { addDays, dateKey, daysBetween, formatLong, formatShort, programWeek, weekdayIndex, DAY_NAMES } from '../lib/date';
import { resolveDetail } from '../lib/seed';
import { MEAL_SLOTS } from '../lib/types';
import { currentStreak, missedInARow, recentLossRate, FAST_LOSS_KG_PER_WEEK } from '../lib/stats';
import { Banner, Button, Card, CheckRow, Input, Progress } from '../ui';

export const exerciseDetail = resolveDetail;

export default function Today() {
  const { data, updateLog } = useStore();
  const today = dateKey();
  const [day, setDay] = useState(today);
  const isToday = day === today;
  const isFuture = day > today;
  const dayNum = daysBetween(data.settings.startDate, day) + 1;

  const idx = weekdayIndex(day);
  const plan = data.plan[idx];
  const log = data.logs[day] ?? emptyLog();
  const week = programWeek(data.settings.startDate, day);
  const target = data.settings.waterTargetMl;

  const toggle = (id: string) => updateLog(day, (l) => ({ ...l, checked: { ...l.checked, [id]: !l.checked[id] } }));

  const exDone = plan.exercises.filter((e) => log.checked[e.id]).length;
  const meals = plan.meals.filter((m) => !m.fromWeek || week >= m.fromWeek);
  const food = meals.filter((m) => m.slot !== 'Supplements');
  const planned = food.reduce((a, m) => ({ kcal: a.kcal + m.kcal, protein: a.protein + m.protein }), { kcal: 0, protein: 0 });
  const eaten = food
    .filter((m) => log.checked[m.id])
    .reduce((a, m) => ({ kcal: a.kcal + m.kcal, protein: a.protein + m.protein }), { kcal: 0, protein: 0 });

  const streak = currentStreak(data, today);
  const missed = missedInARow(data, today);
  const lossRate = recentLossRate(data.weights);

  return (
    <>
      <header className="pt-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-emerald-400 text-sm font-medium">
            {dayNum >= 1 ? `Day ${dayNum} · Week ${week}` : `Day 1 is ${formatShort(data.settings.startDate)}`} · {DAY_NAMES[idx]}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">{plan.title}</h1>
          <p className="text-slate-400 text-sm">
            {isToday ? 'Today' : day === addDays(today, 1) ? 'Tomorrow' : formatLong(day)}
            {!isToday && (
              <button type="button" className="ml-2 text-emerald-400 underline underline-offset-2 min-h-[32px]" onClick={() => setDay(today)}>
                Back to today
              </button>
            )}
          </p>
        </div>
        <div className="flex gap-1">
          <button aria-label="Previous day" className="w-11 h-11 rounded-xl bg-slate-800 active:bg-slate-700 text-xl" onClick={() => setDay(addDays(day, -1))}>‹</button>
          <button aria-label="Next day" className="w-11 h-11 rounded-xl bg-slate-800 active:bg-slate-700 text-xl disabled:opacity-30" onClick={() => setDay(addDays(day, 1))}>›</button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Streak</p>
          <p className="text-3xl font-bold">{streak}<span className="text-base font-medium text-slate-400"> {streak === 1 ? 'day' : 'days'}</span></p>
        </div>
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Workout</p>
          <p className="text-3xl font-bold">{exDone}<span className="text-base font-medium text-slate-400">/{plan.exercises.length}</span></p>
        </div>
      </div>

      {missed >= 2 && (
        <Banner tone="warn">
          <strong>You've missed {missed} days in a row.</strong> Never miss two in a row — do even 10 minutes today and mark it complete.
        </Banner>
      )}
      {missed === 1 && !data.logs[today]?.complete && (
        <Banner tone="info">Yesterday was missed. Never miss two in a row — today counts.</Banner>
      )}
      {lossRate !== null && lossRate > FAST_LOSS_KG_PER_WEEK && (
        <Banner tone="warn">
          Weekly average dropped {lossRate.toFixed(2)} kg — faster than {FAST_LOSS_KG_PER_WEEK} kg/week. <strong>Add food to protect muscle.</strong>
        </Banner>
      )}

      <Card title="Workout" right={<span className="text-sm text-slate-400">{exDone}/{plan.exercises.length}</span>}>
        <div className="divide-y divide-slate-800/70">
          {plan.exercises.map((e) => (
            <CheckRow key={e.id} checked={!!log.checked[e.id]} onToggle={() => toggle(e.id)} label={e.name} right={exerciseDetail(e.detail, week)} />
          ))}
          {plan.exercises.length === 0 && <p className="text-slate-500 py-2">No exercises — edit in Plan.</p>}
        </div>
      </Card>

      <Card
        title="Meals"
        right={
          <span className="text-sm text-slate-300 tabular-nums">
            {eaten.kcal} kcal · {eaten.protein} g
          </span>
        }
      >
        <div className="space-y-2 mb-3">
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1"><span>Calories</span><span className="tabular-nums">{eaten.kcal} / {planned.kcal} kcal</span></div>
            <Progress value={eaten.kcal} max={planned.kcal} color="bg-amber-400" />
          </div>
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1"><span>Protein</span><span className="tabular-nums">{eaten.protein} / {planned.protein} g</span></div>
            <Progress value={eaten.protein} max={planned.protein} color="bg-sky-400" />
          </div>
        </div>
        {MEAL_SLOTS.map((slot) => {
          const items = meals.filter((m) => m.slot === slot);
          if (!items.length) return null;
          return (
            <div key={slot} className="mt-2">
              <p className="text-xs uppercase tracking-wide text-slate-500 mt-3 mb-1">{slot}</p>
              <div className="divide-y divide-slate-800/70">
                {items.map((m) => (
                  <CheckRow
                    key={m.id}
                    checked={!!log.checked[m.id]}
                    onToggle={() => toggle(m.id)}
                    label={m.name}
                    right={slot === 'Supplements' ? undefined : <span className="tabular-nums">{m.kcal} kcal<br />{m.protein} g</span>}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </Card>

      <Card title="Water" right={<span className="text-sm text-slate-300 tabular-nums">{(log.waterMl / 1000).toFixed(2)} / {(target / 1000).toFixed(1)} L</span>}>
        <Progress value={log.waterMl} max={target} color="bg-sky-500" />
        <div className="flex gap-2 mt-3">
          <Button variant="soft" className="w-16" aria-label="Remove 250 ml" onClick={() => updateLog(day, (l) => ({ ...l, waterMl: Math.max(0, l.waterMl - 250) }))}>−</Button>
          <Button className="flex-1 !bg-sky-500 active:!bg-sky-400" onClick={() => updateLog(day, (l) => ({ ...l, waterMl: l.waterMl + 250 }))}>+250 ml</Button>
        </div>
      </Card>

      <Card title="Sleep">
        <div className="flex items-center gap-3">
          <Input
            type="number"
            inputMode="decimal"
            step="0.25"
            min="0"
            max="24"
            placeholder="Hours slept"
            value={log.sleepHours ?? ''}
            onChange={(e) => {
              const v = e.target.value === '' ? null : Number(e.target.value);
              updateLog(day, (l) => ({ ...l, sleepHours: v }));
            }}
          />
          <span className="text-slate-400 shrink-0">hours</span>
        </div>
        {log.sleepHours !== null && log.sleepHours < 7 && <p className="text-amber-300 text-sm mt-2">Aim for 7–9 h — recovery drives fat loss and muscle retention.</p>}
      </Card>

      {isFuture && <p className="text-center text-sm text-slate-400">Preview of {formatLong(day)}. You can mark it complete on the day.</p>}
      <Button
        disabled={isFuture}
        className={`w-full !min-h-[60px] text-lg ${log.complete ? '!bg-slate-800 !text-emerald-400' : ''}`}
        onClick={() => updateLog(day, (l) => ({ ...l, complete: !l.complete }))}
      >
        {log.complete ? '✓ Day complete (tap to undo)' : 'Mark day complete'}
      </Button>
    </>
  );
}
