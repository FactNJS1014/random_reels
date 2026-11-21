import { useEffect, useRef, useState } from 'react';
import Reel from './components/Reel';
import { createDraw, deleteAllDraws, fetchAllDraws } from './lib/api';

const SPIN_SECONDS = 5;
const SPIN_MS = SPIN_SECONDS * 1000;
const DEFAULT_NUMBERS = Array.from({ length: 12 }, (_, index) => String(index + 1));

function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export default function App() {
  // Start with a shuffled pool so the reel never lists 1, 2, 3, 4, ... in order.
  const [numbers, setNumbers] = useState<string[]>(() => shuffle(DEFAULT_NUMBERS));
  const [usedNumbers, setUsedNumbers] = useState<string[]>([]);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(SPIN_SECONDS);
  const [target, setTarget] = useState<string | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const spinTimer = useRef<number | null>(null);
  const tickTimer = useRef<number | null>(null);
  const startSpinRef = useRef<() => void>(() => {});

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const draws = await fetchAllDraws();
        if (!active) return;

        const used = [
          ...new Set(
            draws
              .map((draw) => draw.resultNumber)
              .filter((value): value is string => Boolean(value)),
          ),
        ];

        setUsedNumbers(used);
        setSavedCount(draws.length);
        // Numbers that were already inserted must not appear on the reel again.
        setNumbers((previous) => previous.filter((value) => !used.includes(value)));
      } catch {
        if (active) {
          setApiError('โหลดข้อมูลที่บันทึกไว้ไม่ได้ — หมายเลขที่เคยออกอาจแสดงซ้ำ');
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (spinTimer.current !== null) window.clearTimeout(spinTimer.current);
      if (tickTimer.current !== null) window.clearInterval(tickTimer.current);
    };
  }, []);

  const addNumber = () => {
    const raw = input.trim();
    if (!raw) return;

    if (!/^\d+$/.test(raw)) {
      setFormError('กรอกได้เฉพาะตัวเลขจำนวนเต็ม');
      return;
    }

    const value = Number(raw);
    if (!Number.isSafeInteger(value)) {
      setFormError('ตัวเลขมีขนาดใหญ่เกินไป');
      return;
    }

    const candidate = String(value);

    if (usedNumbers.includes(candidate)) {
      setFormError(`หมายเลข ${candidate} ถูกบันทึกผลไปแล้ว ไม่สามารถใช้ซ้ำได้`);
      return;
    }

    if (numbers.includes(candidate)) {
      setFormError(`หมายเลข ${candidate} อยู่ในตู้แล้ว`);
      return;
    }

    setNumbers((previous) => shuffle([...previous, candidate]));
    setWinner(null);
    setInput('');
    setFormError(null);
  };

  const removeNumber = (value: string) => {
    if (spinning) return;
    setNumbers((previous) => previous.filter((item) => item !== value));
    if (winner === value) setWinner(null);
  };

  const clearAll = () => {
    if (spinning) return;
    setNumbers([]);
    setWinner(null);
    setFormError(null);
  };

  const startSpin = () => {
    if (spinning || numbers.length < 2) return;

    const pool = numbers;
    const result = pool[Math.floor(Math.random() * pool.length)];
    const startedAt = Date.now();

    setSpinning(true);
    setTarget(result);
    setWinner(null);
    setFormError(null);
    setNotice(null);
    setSecondsLeft(SPIN_SECONDS);

    tickTimer.current = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((SPIN_MS - (Date.now() - startedAt)) / 1000));
      setSecondsLeft(remaining);
    }, 100);

    spinTimer.current = window.setTimeout(() => {
      if (tickTimer.current !== null) {
        window.clearInterval(tickTimer.current);
        tickTimer.current = null;
      }

      setWinner(result);
      setSpinning(false);
      setSecondsLeft(0);

      void (async () => {
        try {
          await createDraw({
            numbers: pool,
            resultNumber: result,
            totalBalls: pool.length,
            spinSeconds: SPIN_SECONDS,
          });
          setApiError(null);
          setUsedNumbers((previous) => (previous.includes(result) ? previous : [...previous, result]));
          setSavedCount((previous) => (previous ?? 0) + 1);
          // Inserted results leave the reel so they cannot be drawn again.
          setNumbers((previous) => previous.filter((item) => item !== result));
        } catch (error) {
          setApiError(error instanceof Error ? error.message : 'บันทึกผลการหมุนไม่สำเร็จ');
        }
      })();
    }, SPIN_MS);
  };

  startSpinRef.current = startSpin;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement | null;
      const tag = element?.tagName;

      // Keep typing/adding with the keyboard untouched.
      if (tag === 'INPUT' || tag === 'TEXTAREA' || element?.isContentEditable) return;
      // Let a focused button handle its own Enter/Space activation.
      if (element?.closest('button')) return;
      if (event.key !== 'Enter' && event.code !== 'Space') return;

      event.preventDefault();
      startSpinRef.current();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleDeleteAll = async () => {
    if (deleting) return;

    const confirmed = window.confirm(
      'ต้องการลบข้อมูลการหมุนทั้งหมดในตาราง COMMON_RANDOM หรือไม่?\nการลบไม่สามารถย้อนกลับได้',
    );
    if (!confirmed) return;

    setDeleting(true);
    setApiError(null);
    setNotice(null);

    try {
      const { deleted } = await deleteAllDraws();
      setUsedNumbers([]);
      setSavedCount(0);
      setNotice(`ลบข้อมูลแล้ว ${deleted} รายการ — หมายเลขเดิมกลับมาใช้ได้อีกครั้ง`);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'ลบข้อมูลไม่สำเร็จ');
    } finally {
      setDeleting(false);
    }
  };

  const progress = (secondsLeft / SPIN_SECONDS) * 100;

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-amber-500/15 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-52 -right-24 h-[420px] w-[420px] rounded-full bg-indigo-500/10 blur-[130px]" />

      <header className="relative mx-auto w-full max-w-6xl shrink-0 px-5 pb-2 pt-4">
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.25em] text-amber-300">
          AOTH GAMES
        </span>
        <h1 className="mt-1.5 text-2xl font-black tracking-tight sm:text-3xl">
          ตู้{' '}
          <span className="bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400 bg-clip-text text-transparent">
            เสี่ยงโชค
          </span>
        </h1>
        <p className="mt-1 max-w-2xl text-xs text-slate-400 sm:text-sm">
          เพิ่มหมายเลขลงในตู้ แล้วกดเริ่มหมุน 5 วินาที แผ่นตัวเลขจะหมุนวนก่อนหยุดที่ลูกศรแดง
        </p>
      </header>

      <main className="relative mx-auto grid min-h-0 w-full max-w-6xl flex-1 grid-cols-1 grid-rows-[minmax(0,1.15fr)_minmax(0,1fr)] gap-3 px-5 pb-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:grid-rows-1 lg:gap-4">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-3 shadow-2xl shadow-black/40 backdrop-blur sm:p-5">
          <div className="grid min-h-0 flex-1 place-items-center overflow-hidden">
            <Reel
              numbers={numbers}
              spinning={spinning}
              winner={winner}
              target={target}
              durationMs={SPIN_MS}
            />
          </div>

          <div
            className="mt-3 flex min-h-[64px] shrink-0 flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-2 text-center"
            aria-live="polite"
          >
            {spinning ? (
              <>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">กำลังหมุน</p>
                <p className="mt-0.5 text-3xl font-black tabular-nums text-amber-300">{secondsLeft}</p>
              </>
            ) : winner !== null ? (
              <>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">ผลลัพธ์</p>
                <p className="mt-0.5 text-3xl font-black tabular-nums text-emerald-300 drop-shadow-[0_0_18px_rgba(52,211,153,0.45)] sm:text-4xl">
                  {winner}
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-400">กด “เริ่มหมุน” เพื่อลุ้นหมายเลข</p>
            )}
          </div>

          {apiError && <p className="mt-1.5 shrink-0 text-center text-xs text-rose-400">{apiError}</p>}
        </section>

        <section className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
          <div className="order-2 shrink-0 rounded-3xl border border-white/10 bg-slate-900/70 p-4 backdrop-blur lg:order-1">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">เพิ่มหมายเลข</h2>
              <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-400">
                {numbers.length} หมายเลข
              </span>
            </div>

            <form
              className="mt-4 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                addNumber();
              }}
            >
              <input
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                  if (formError) setFormError(null);
                }}
                inputMode="numeric"
                placeholder="เช่น 42"
                aria-label="หมายเลขที่ต้องการเพิ่ม"
                disabled={spinning}
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-base text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={spinning || !input.trim()}
                className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                เพิ่ม
              </button>
            </form>

            {formError && <p className="mt-2 text-xs text-rose-400">{formError}</p>}

            <p className="mt-3 text-xs text-slate-500">
              หมายเลขที่บันทึกผลลงฐานข้อมูลแล้วจะไม่ถูกนำกลับมาแสดงหรือใช้ซ้ำ
            </p>

            {numbers.length > 0 && (
              <div className="mt-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">หมายเลขในตู้</p>
                <div className="mt-2 flex max-h-20 flex-wrap gap-1.5 overflow-y-auto">
                  {numbers.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => removeNumber(value)}
                      disabled={spinning}
                      title={`ลบหมายเลข ${value}`}
                      className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-200 transition hover:border-rose-400/50 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {value}
                      <span aria-hidden="true">×</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={clearAll}
              disabled={spinning || numbers.length === 0}
              className="mt-4 w-full rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition hover:border-rose-400/40 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ล้างหมายเลขทั้งหมด
            </button>
          </div>

          <div className="order-1 shrink-0 rounded-3xl border border-amber-400/20 bg-gradient-to-br from-amber-400/10 via-slate-900/70 to-slate-900/70 p-4 backdrop-blur lg:order-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">เริ่มหมุน</h2>

            <button
              type="button"
              onClick={startSpin}
              disabled={spinning || numbers.length < 2}
              className="mt-3 w-full rounded-2xl bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 px-6 py-3 text-base font-black text-slate-950 shadow-lg shadow-orange-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 sm:text-lg"
            >
              {spinning ? `กำลังหมุน ${secondsLeft} วินาที` : 'หมุน 5 วินาที'}
            </button>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-300 to-rose-400 transition-[width] duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="mt-3 text-xs text-slate-500">
              {numbers.length < 2
                ? 'ต้องมีหมายเลขอย่างน้อย 2 รายการเพื่อเริ่มหมุน'
                : `พร้อมหมุน ${numbers.length} หมายเลข · ใช้เวลา ${SPIN_SECONDS} วินาที`}
              <span className="mt-1 block">กด Enter หรือ Spacebar เพื่อเริ่มหมุน</span>
            </p>
          </div>

          <div className="order-3 shrink-0 rounded-3xl border border-rose-400/20 bg-slate-900/70 p-4 backdrop-blur">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
              ข้อมูลในตาราง COMMON_RANDOM
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {savedCount === null ? 'กำลังโหลดข้อมูล…' : `บันทึกไว้ ${savedCount} รายการ`}
            </p>

            <button
              type="button"
              onClick={handleDeleteAll}
              disabled={deleting || !savedCount}
              className="mt-3 w-full rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {deleting ? 'กำลังลบข้อมูล…' : 'Delete ข้อมูลทั้งหมด'}
            </button>

            {notice && <p className="mt-2 text-xs text-emerald-400">{notice}</p>}
          </div>
        </section>
      </main>
    </div>
  );
}
