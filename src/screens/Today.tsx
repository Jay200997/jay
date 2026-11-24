import { useRef, useState, type TouchEvent } from 'react';
import { useStore, emptyLog } from '../lib/store';
import { addDays, dateKey, daysBetween, formatLong, formatShort, programWeek, weekdayIndex, DAY_NAMES } from '../lib/date';
import { resolveDetail } from '../lib/seed';
import { MEAL_SLOTS, type Meal } from '../lib/types';
import { currentStreak, missedInARow, recentLossRate, FAST_LOSS_KG_PER_WEEK } from '../lib/stats';
import { splitName, videoUrl } from '../lib/videos';
import { Banner, Button, Card, CheckRow, Input, Pill, PlayLink, Progress } from '../ui';

export const exerciseDetail = resolveDetail;

/** "130 g rice (cooked) + 150 g dal (cooked) · 2 tsp oil" → main "130 g rice · 150 g dal", note "2 tsp oil". */
function mealText(m: Meal): { main: string; note?: string } {
  const named = splitName(m.name);
  if (named.note && m.name.includes(': ')) return { main: named.title, note: named.note };
  const [main, ...rest] = m.name.split(' · ');
  return { main: main.replace(/ \(cooked\)/g, '').split(' + ').join(' · '), note: rest.join(' · ') || undefined };
}

export default function Today() {
  const { data, updateLog } = useStore();
  const today = dateKey();
  const [day, setDayRaw] = useState(today);
  const [slide, setSlide] = useState<'left' | 'right' | null>(null);
  const setDay = (next: string) => {
    setSlide(next > day ? 'left' : next < day ? 'right' : null);
    setDayRaw(next);
  };

  // Swipe left = next day, swipe right = previous day. Only clear, quick, mostly-horizontal swipes count,
  // so vertical scrolling and the browser's edge-swipe-back gesture are left alone.
  const touch = useRef<{ x: number; y: number; t: number } | null>(null);
  const onTouchStart = (e: TouchEvent) => {
    const el = e.target as HTMLElement;
    const t = e.touches[0];
    if (e.touches.length !== 1 || el.closest('input, textarea, select') || t.clientX < 24 || t.clientX > window.innerWidth - 24) {
      touch.current = null;
      return;
    }
    touch.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8 || Date.now() - start.t > 700) return;
    setDay(addDays(day, dx < 0 ? 1 : -1));
  };
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
  const supplements = meals.filter((m) => m.slot === 'Supplements');
  const planned = food.reduce((a, m) => ({ kcal: a.kcal + m.kcal, protein: a.protein + m.protein }), { kcal: 0, protein: 0 });
  const eaten = food
    .filter((m) => log.checked[m.id])
    .reduce((a, m) => ({ kcal: a.kcal + m.kcal, protein: a.protein + m.protein }), { kcal: 0, protein: 0 });

  const streak = currentStreak(data, today);
  const missed = missedInARow(data, today);
  const lossRate = recentLossRate(data.weights);

  return (
    <div
      key={day}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className={`space-y-4 ${slide === 'left' ? 'slide-from-right' : slide === 'right' ? 'slide-from-left' : ''}`}
    >
      <header className="pt-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-emerald-400 text-sm font-medium">
            {dayNum >= 1 ? `Day ${dayNum} · Week ${week}` : `Day 1 is ${formatShort(data.settings.startDate)}`} · {DAY_NAMES[idx]}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-balance">{plan.title}</h1>
          <p className="text-slate-400 text-sm">
            {isToday ? 'Today' : day === addDays(today, 1) ? 'Tomorrow' : formatLong(day)}
            {!isToday && (
              <button type="button" className="ml-2 text-emerald-400 underline underline-offset-2 min-h-[32px]" onClick={() => setDay(today)}>
                Back to today
              </button>
            )}
          </p>
        </div>
        <div className="flex gap-1 shrink-0">
          <button aria-label="Previous day" className="w-11 h-11 rounded-xl bg-slate-800 active:bg-slate-700 text-xl" onClick={() => setDay(addDays(day, -1))}>‹</button>
          <button aria-label="Next day" className="w-11 h-11 rounded-xl bg-slate-800 active:bg-slate-700 text-xl" onClick={() => setDay(addDays(day, 1))}>›</button>
        </div>
      </header>

      {/* One slim summary strip instead of separate tiles */}
      <div className="grid grid-cols-3 rounded-2xl bg-slate-900/80 border border-slate-800 divide-x divide-slate-800 text-center">
        <Stat label="Streak" value={`${streak}`} unit={streak === 1 ? 'day' : 'days'} />
        <Stat label="Workout" value={`${exDone}`} unit={`/ ${plan.exercises.length}`} />
        <Stat label="Protein" value={`${eaten.protein}`} unit={`/ ${planned.protein} g`} />
      </div>

      {missed >= 2 && (
        <Banner tone="warn">
          <strong>You've missed {missed} days in a row.</strong> Never miss two in a row. Do even 10 minutes today and mark it complete.
        </Banner>
      )}
      {missed === 1 && !data.logs[today]?.complete && <Banner tone="info">Yesterday was missed. Never miss two in a row: today counts.</Banner>}
      {lossRate !== null && lossRate > FAST_LOSS_KG_PER_WEEK && (
        <Banner tone="warn">
          Weekly average dropped {lossRate.toFixed(2)} kg, faster than {FAST_LOSS_KG_PER_WEEK} kg/week. <strong>Add food to protect muscle.</strong>
        </Banner>
      )}

      <Card title="Workout" right={<span className="text-sm text-slate-400 tabular-nums">{exDone}/{plan.exercises.length}</span>}>
        <Progress value={exDone} max={plan.exercises.length} />
        <div className="divide-y divide-slate-800/70 mt-2">
          {plan.exercises.map((e) => {
            const { title, note } = splitName(e.name);
            const url = videoUrl(e);
            return (
              <CheckRow
                key={e.id}
                checked={!!log.checked[e.id]}
                onToggle={() => toggle(e.id)}
                label={title}
                sub={note}
                strike={false}
                right={<Pill>{exerciseDetail(e.detail, week)}</Pill>}
                action={url ? <PlayLink href={url} label={title} /> : <span className="w-10 shrink-0" aria-hidden="true" />}
              />
            );
          })}
          {plan.exercises.length === 0 && <p className="text-slate-500 py-2">No exercises. Add some in Plan.</p>}
        </div>
        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
          <span className="text-rose-400" aria-hidden="true">▶</span> opens a how-to video on YouTube
        </p>
      </Card>

      <Card title="Meals" right={<span className="text-sm text-slate-300 tabular-nums">{eaten.kcal} / {planned.kcal} kcal</span>}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1"><span>Calories</span><span className="tabular-nums">{Math.round((eaten.kcal / (planned.kcal || 1)) * 100)}%</span></div>
            <Progress value={eaten.kcal} max={planned.kcal} color="bg-amber-400" />
          </div>
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1"><span>Protein</span><span className="tabular-nums">{eaten.protein} / {planned.protein} g</span></div>
            <Progress value={eaten.protein} max={planned.protein} color="bg-sky-400" />
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-2">Rice, dal and sabzi weights are cooked.</p>

        {MEAL_SLOTS.filter((s) => s !== 'Supplements').map((slot) => {
          const items = food.filter((m) => m.slot === slot);
          if (!items.length) return null;
          return (
            <div key={slot}>
              <p className="text-[11px] uppercase tracking-wider text-slate-500 mt-4 mb-0.5">{slot}</p>
              <div className="divide-y divide-slate-800/70">
                {items.map((m) => {
                  const { main, note } = mealText(m);
                  return (
                    <CheckRow
                      key={m.id}
                      checked={!!log.checked[m.id]}
                      onToggle={() => toggle(m.id)}
                      label={main}
                      sub={note}
                      strike={false}
                      right={
                        <span className="tabular-nums text-xs leading-tight">
                          <span className="text-slate-300">{m.kcal}</span> kcal
                          <br />
                          <span className="text-slate-300">{m.protein}</span> g
                        </span>
                      }
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {supplements.length > 0 && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-500 mt-4 mb-2">Supplements</p>
            <div className="flex flex-wrap gap-2">
              {supplements.map((m) => {
                const on = !!log.checked[m.id];
                return (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(m.id)}
                    className={`min-h-[44px] px-4 rounded-full border text-sm transition-colors ${
                      on ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300' : 'border-slate-700 text-slate-300 active:bg-slate-800'
                    }`}
                  >
                    {on ? '✓ ' : ''}
                    {m.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      <Card title="Water & sleep">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>Water</span>
          <span className="tabular-nums">{(log.waterMl / 1000).toFixed(2)} / {(target / 1000).toFixed(1)} L</span>
        </div>
        <Progress value={log.waterMl} max={target} color="bg-sky-500" />
        <div className="flex gap-2 mt-3">
          <Button variant="soft" className="w-14" aria-label="Remove 250 ml" onClick={() => updateLog(day, (l) => ({ ...l, waterMl: Math.max(0, l.waterMl - 250) }))}>−</Button>
          <Button className="flex-1 !bg-sky-500 active:!bg-sky-400" onClick={() => updateLog(day, (l) => ({ ...l, waterMl: l.waterMl + 250 }))}>+250 ml</Button>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <label htmlFor="sleep-hours" className="text-sm text-slate-300 shrink-0 w-14">Sleep</label>
          <Input
            id="sleep-hours"
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
          <span className="text-slate-400 shrink-0 text-sm">h</span>
        </div>
        {log.sleepHours !== null && log.sleepHours < 7 && <p className="text-amber-300 text-sm mt-2">Aim for 7–9 h. Recovery drives fat loss and muscle retention.</p>}
      </Card>

      {isFuture && <p className="text-center text-sm text-slate-400">Preview of {formatLong(day)}. You can mark it complete on the day.</p>}
      <Button
        disabled={isFuture}
        className={`w-full !min-h-[60px] text-lg ${log.complete ? '!bg-slate-800 !text-emerald-400' : ''}`}
        onClick={() => updateLog(day, (l) => ({ ...l, complete: !l.complete }))}
      >
        {log.complete ? '✓ Day complete (tap to undo)' : 'Mark day complete'}
      </Button>
      <p className="text-center text-xs text-slate-600">Swipe left or right to change day</p>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="py-3 px-2">
      <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-xl font-bold tabular-nums">
        {value}
        <span className="text-xs font-medium text-slate-400"> {unit}</span>
      </p>
    </div>
  );
}
