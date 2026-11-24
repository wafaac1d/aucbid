"use client";

import { useEffect, useRef, useState } from "react";
import { LotImage } from "./LotImage";

const DURATION = 320;

export function PhotoSlider({
  index,
  count,
  src,
  alt,
  className,
  fit = "cover",
}: {
  index: number;
  count: number;
  src: string;
  alt: string;
  className?: string;
  fit?: "cover" | "contain";
}) {
  const previous = useRef({ index, src });
  const [motion, setMotion] = useState<{ from: string; dir: 1 | -1; token: number } | null>(null);

  useEffect(() => {
    const last = previous.current;
    if (last.src === src && last.index === index) return;
    const dir = slideDirection(last.index, index, count);
    const from = last.src;
    previous.current = { index, src };
    if (!from || from === src) {
      setMotion(null);
      return;
    }
    const token = Date.now();
    setMotion({ from, dir, token });
    const timer = window.setTimeout(() => {
      setMotion((value) => (value?.token === token ? null : value));
    }, DURATION);
    return () => window.clearTimeout(timer);
  }, [count, index, src]);

  const enter = motion ? (motion.dir > 0 ? "is-enter-next" : "is-enter-prev") : "";
  const leave = motion ? (motion.dir > 0 ? "is-leave-next" : "is-leave-prev") : "";

  return (
    <span className={`photo-slider photo-slider--${fit}`}>
      {motion ? <LotImage src={motion.from} alt="" className={`slide ${className || ""} ${leave}`} /> : null}
      <LotImage key={src} src={src} alt={alt} className={`slide ${className || ""} ${enter}`} />
    </span>
  );
}

function slideDirection(from: number, to: number, count: number): 1 | -1 {
  if (count < 2 || from === to) return 1;
  const forward = (to - from + count) % count;
  const backward = (from - to + count) % count;
  return forward <= backward ? 1 : -1;
}
