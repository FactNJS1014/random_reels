import { useEffect, useRef, useState } from 'react';

interface ReelProps {
  numbers: string[];
  spinning: boolean;
  winner: string | null;
  target: string | null;
  durationMs: number;
}

const TILE_HEIGHT = 80;

interface Track {
  items: string[];
  offset: number;
  targetIndex: number;
  animation: { from: number; to: number } | null;
}

function idleTrack(numbers: string[]): Track {
  return { items: numbers, offset: TILE_HEIGHT, targetIndex: -1, animation: null };
}

export default function Reel({ numbers, spinning, winner, target, durationMs }: ReelProps) {
  const [track, setTrack] = useState<Track>(() => idleTrack(numbers));
  const trackRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<Animation | null>(null);

  useEffect(() => {
    if (!spinning || !target || numbers.length === 0) {
      if (!spinning && winner === null) setTrack(idleTrack(numbers));
      return;
    }

    const repeats = Math.max(6, Math.ceil(30 / numbers.length));
    const items = [...Array.from({ length: repeats }, () => numbers).flat(), target];
    const targetIndex = items.length - 1;
    const to = TILE_HEIGHT - targetIndex * TILE_HEIGHT;

    setTrack({ items, offset: to, targetIndex, animation: { from: TILE_HEIGHT, to } });
  }, [spinning, target, winner, numbers]);

  useEffect(() => {
    const element = trackRef.current;
    const spec = track.animation;
    if (!element || !spec) return;

    animationRef.current?.cancel();
    element.style.transform = `translateY(${spec.from}px)`;

    const animation = element.animate(
      [
        { transform: `translateY(${spec.from}px)` },
        { transform: `translateY(${spec.to}px)` },
      ],
      {
        duration: durationMs,
        easing: 'cubic-bezier(0.08, 0.7, 0.12, 1)',
        fill: 'forwards',
      },
    );

    animationRef.current = animation;

    return () => {
      animation.cancel();
    };
  }, [track.animation, durationMs]);

  return (
    <div className={`reel ${spinning ? 'is-spinning' : ''}`}>
      <div className="reel-frame">
        <span className="reel-bulbs left" aria-hidden="true" />
        <span className="reel-bulbs right" aria-hidden="true" />

        <div className="reel-window">
          {numbers.length === 0 && (
            <p className="absolute inset-0 z-10 grid place-items-center px-8 text-center text-sm text-slate-400">
              ยังไม่มีหมายเลข — เพิ่มหมายเลขก่อนเริ่มหมุน
            </p>
          )}

          <div
            ref={trackRef}
            className="reel-track"
            style={{ transform: `translateY(${track.offset}px)` }}
          >
            {track.items.map((value, index) => (
              <div
                key={`${value}-${index}`}
                className={`reel-tile ${
                  !spinning && winner !== null && index === track.targetIndex ? 'reel-tile-winner' : ''
                }`}
              >
                {value}
              </div>
            ))}
          </div>

          <div className="reel-shade top" aria-hidden="true" />
          <div className="reel-shade bottom" aria-hidden="true" />
        </div>

        <span
          className={`reel-pointer ${spinning || winner !== null ? 'is-active' : ''}`}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
