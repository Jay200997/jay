import { useEffect, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { buildPrompt, errorCopy, getSample, toAnalysis, type Analysis, type SampleFn } from '../lib/coach';
import { dateKey, formatShort } from '../lib/date';
import { uid } from '../lib/seed';
import type { AppData } from '../lib/types';
import { Banner, Button, Card, CheckRow } from '../ui';

type Phase = 'idle' | 'thinking' | 'review' | 'applied';

export default function PhotoCheckin() {
  const { data, update, replace } = useStore();
  const [sample, setSample] = useState<SampleFn | null | undefined>(undefined);
  const [maxCount, setMaxCount] = useState(1);
  const [accept, setAccept] = useState('image/jpeg,image/png,image/webp');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [undo, setUndo] = useState<AppData | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const ctl = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    getSample().then(async (s) => {
      if (!live) return;
      const lim = s ? await s.limits().catch(() => null) : null;
      if (!live) return;
      if (s && lim?.images) {
        setMaxCount(Math.max(1, Math.min(3, lim.images.maxCount)));
        setAccept(lim.images.mediaTypes.join(','));
        setSample(s);
      } else setSample(null);
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const analyse = async () => {
    if (!sample || !files.length) return;
    ctl.current = new AbortController();
    setPhase('thinking');
    setError(null);
    try {
      const raw = await sample.json(buildPrompt(data, note), { images: files, signal: ctl.current.signal, cache: false });
      const a = toAnalysis(raw, data);
      setAnalysis(a);
      setPicked(Object.fromEntries(a.proposals.map((p) => [p.id, true])));
      setPhase('review');
    } catch (e) {
      const code = (e as { code?: string })?.code;
      setPhase('idle');
      if (code !== 'cancelled') setError(errorCopy(code));
      if (code === 'not_granted' || code === 'sampling_disabled' || code === 'images_unavailable') setSample(null);
    }
  };

  const apply = () => {
    if (!analysis) return;
    const chosen = analysis.proposals.filter((p) => picked[p.id]);
    setUndo(data);
    update((d) => {
      const next = chosen.reduce((acc, p) => p.apply(acc), d);
      return {
        ...next,
        checkins: [
          { id: uid('ci'), date: dateKey(), summary: analysis.summary, observations: analysis.observations, applied: chosen.map((p) => p.label) },
          ...next.checkins,
        ].slice(0, 30),
      };
    });
    setPhase('applied');
  };

  const reset = () => {
    setFiles([]);
    setNote('');
    setAnalysis(null);
    setPhase('idle');
  };

  const chosenCount = analysis ? analysis.proposals.filter((p) => picked[p.id]).length : 0;

  return (
    <Card title="Photo check-in" right={<span className="text-xs text-slate-500">AI coach</span>}>
      {sample === undefined && <p className="text-sm text-slate-400">Checking whether photo analysis is available…</p>}

      {sample === null && phase !== 'applied' && (
        <p className="text-sm text-slate-400">
          Photo analysis works when the app is opened from its claude.ai link while you’re signed in. It isn’t available in this view.
        </p>
      )}

      {sample && phase === 'idle' && (
        <div className="space-y-3">
          <p className="text-sm text-slate-400">
            Add a progress photo (front or side, fitted clothes, good light). Claude looks at it alongside your logged weight, waist and runs, then suggests changes to your goals and workouts. You choose which ones to apply. Photos are not saved in the app.
          </p>
          {previews.length > 0 && (
            <div className="flex gap-2">
              {previews.map((u, i) => (
                <div key={u} className="relative">
                  <img src={u} alt={`Selected photo ${i + 1}`} className="w-24 h-32 object-cover rounded-xl border border-slate-700" />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-slate-800 border border-slate-600 text-slate-200"
                    onClick={() => setFiles(files.filter((_, j) => j !== i))}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <input
            ref={fileRef}
            id="checkin-photo"
            type="file"
            accept={accept}
            multiple={maxCount > 1}
            className="hidden"
            onChange={(e) => {
              const list = Array.from(e.target.files ?? []);
              e.target.value = '';
              setFiles((prev) => [...prev, ...list].slice(0, maxCount));
              setError(null);
            }}
          />
          {files.length < maxCount && (
            <Button variant="soft" className="w-full" onClick={() => fileRef.current?.click()}>
              {files.length ? '+ Add another photo' : 'Choose or take a photo'}
            </Button>
          )}
          <textarea
            id="checkin-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note, e.g. “knees sore after long run” or “want flatter stomach”"
            className="w-full h-20 rounded-xl bg-slate-800 border border-slate-700 p-3 text-base placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <Button className="w-full" disabled={!files.length} onClick={analyse}>Analyse</Button>
        </div>
      )}

      {phase === 'thinking' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-5 h-5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            <p className="text-sm text-slate-300">Analysing your photo and progress… this can take up to a minute.</p>
          </div>
          <Button variant="ghost" className="w-full" onClick={() => ctl.current?.abort()}>Stop</Button>
        </div>
      )}

      {error && <div className="mt-3"><Banner tone="warn">{error}</Banner></div>}

      {phase === 'review' && analysis && (
        <div className="space-y-4">
          <p className="text-slate-100 leading-relaxed">{analysis.summary}</p>
          {analysis.observations.length > 0 && (
            <ul className="list-disc pl-5 space-y-1 text-sm text-slate-300">
              {analysis.observations.map((o, i) => <li key={i}>{o}</li>)}
            </ul>
          )}
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">Suggested changes</p>
            {analysis.proposals.length === 0 ? (
              <p className="text-sm text-slate-400">No changes needed. Keep following the plan.</p>
            ) : (
              <div className="divide-y divide-slate-800/70">
                {analysis.proposals.map((p) => (
                  <CheckRow key={p.id} checked={!!picked[p.id]} onToggle={() => setPicked({ ...picked, [p.id]: !picked[p.id] })} label={p.label} sub={p.reason} strike={false} />
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={reset}>Discard</Button>
            <Button onClick={apply}>{chosenCount ? `Apply ${chosenCount}` : 'Save check-in'}</Button>
          </div>
          <p className="text-xs text-slate-500">AI suggestions are a rough guide, not medical advice. Untick anything that doesn’t feel right.</p>
        </div>
      )}

      {phase === 'applied' && (
        <div className="space-y-3">
          <Banner tone="good">Check-in saved{chosenCount ? ` and ${chosenCount} change${chosenCount > 1 ? 's' : ''} applied to your Plan and Goals` : ''}.</Banner>
          <div className="grid grid-cols-2 gap-2">
            {undo && chosenCount > 0 ? (
              <Button
                variant="soft"
                onClick={() => {
                  replace({ ...undo, checkins: undo.checkins });
                  setUndo(null);
                  reset();
                }}
              >
                Undo changes
              </Button>
            ) : <span />}
            <Button variant="soft" onClick={reset}>Done</Button>
          </div>
        </div>
      )}

      {data.checkins.length > 0 && (
        <div className="mt-4 border-t border-slate-800 pt-2">
          <button type="button" className="text-sm text-slate-400 min-h-[44px]" onClick={() => setShowHistory(!showHistory)}>
            {showHistory ? 'Hide' : 'Show'} past check-ins ({data.checkins.length})
          </button>
          {showHistory && (
            <ul className="space-y-3">
              {data.checkins.map((c) => (
                <li key={c.id} className="text-sm">
                  <p className="text-slate-400">{formatShort(c.date)}</p>
                  <p className="text-slate-200">{c.summary}</p>
                  {c.applied.length > 0 && (
                    <ul className="list-disc pl-5 text-slate-400 mt-1">
                      {c.applied.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
