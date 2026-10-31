import React, { useEffect, useRef, useState } from 'react';

// No count-up when motion is reduced, or in a background tab where animation frames stop (it would stay at 0).
const reducedMotion = () => document.hidden || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Counts up from 0 when first shown, then glides to each new value.
export const AnimatedNumber: React.FC<{ value: number; className?: string }> = ({ value, className }) => {
  const [shown, setShown] = useState(() => (reducedMotion() ? value : 0));
  const current = useRef(shown);

  useEffect(() => {
    if (reducedMotion()) {
      current.current = value;
      setShown(value);
      return;
    }
    const from = current.current;
    const begin = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - begin) / 700);
      const next = Math.round(from + (value - from) * (1 - Math.pow(1 - t, 3)));
      current.current = next;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    // Frames can stall on a page that isn't on screen: the true number must still appear.
    const settle = setTimeout(() => {
      cancelAnimationFrame(frame);
      current.current = value;
      setShown(value);
    }, 800);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settle);
    };
  }, [value]);

  return <span className={className}>{shown}</span>;
};
