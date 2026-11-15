"use client";

import { useEffect, useRef, useState } from "react";
import { imageFallbacks } from "@/lib/images";

export function LotImage({
  src,
  alt,
  className,
  onReady,
}: {
  src: string;
  alt: string;
  className?: string;
  onReady?: () => void;
}) {
  const options = imageFallbacks(src);
  const [index, setIndex] = useState(0);
  const [tracked, setTracked] = useState(src);
  const ref = useRef<HTMLImageElement>(null);
  const failedSrc = useRef("");
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
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

  function ready() {
    onReadyRef.current?.();
  }

  useEffect(() => {
    if (!current) {
      ready();
      return;
    }
    const image = ref.current;
    if (!image?.complete) return;
    if (image.naturalWidth > 0) {
      ready();
      return;
    }
    if (failedSrc.current === current) return;
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
      onLoad={() => {
        if (ref.current?.naturalWidth) ready();
      }}
      onError={() => fail(current)}
    />
  );
}
