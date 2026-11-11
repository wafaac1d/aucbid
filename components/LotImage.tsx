"use client";

import { useState } from "react";

export function LotImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`photo photo--empty ${className || ""}`} aria-hidden="true">
        <span>Нет фото</span>
      </div>
    );
  }
  return <img className={className} src={src} alt={alt} onError={() => setFailed(true)} />;
}
