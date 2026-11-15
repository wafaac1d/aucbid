"use client";

import { useEffect, useRef, useState } from "react";
import { imageFallbacks } from "@/lib/images";

export function LotImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const options = imageFallbacks(src);
  const [index, setIndex] = useState(0);
  const [tracked, setTracked] = useState(src);
  const ref = useRef<HTMLImageElement>(null);
  const failedSrc = useRef("");
  if (tracked !== src) {
    failedSrc.current = "";
    setTracked(src);
    setIndex(0);
  }
  const current = (tracked === src ? options[index] : options[0]) || "";

  function fail(url: string) {
    if (!url || failedSrc.current === url) return;
    failedSrc.current = url;
    setIndex((value) => value + 1);
  }

  useEffect(() => {
    const image = ref.current;
    if (!image?.complete || image.naturalWidth > 0 || failedSrc.current === current) return;
    failedSrc.current = current;
    setIndex((value) => value + 1);
  }, [current]);

  if (!current) {
    return (
      <div className={`photo photo--empty ${className || ""}`} aria-hidden="true">
        <span>Нет фото</span>
      </div>
    );
  }

  return (
    <img
      ref={ref}
      className={className}
      src={current}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => fail(current)}
    />
  );
}
