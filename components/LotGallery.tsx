"use client";

import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { auctionImageUrl } from "@/lib/images";
import { LotImage } from "./LotImage";

function iaaiCandidates(image: string): string[] {
  if (!/~I\d+/.test(image)) return image ? [image] : [];
  return Array.from({ length: 20 }, (_, index) => image.replace(/~I\d+/, `~I${index + 1}`));
}

function loadImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image();
    image.referrerPolicy = "no-referrer";
    image.onload = () => resolve(image.naturalWidth > 0);
    image.onerror = () => resolve(false);
    image.src = url;
  });
}

export function LotGallery({
  lotId,
  source,
  image,
  alt,
  badges,
}: {
  lotId: string;
  source: string;
  image: string;
  alt: string;
  badges: ReactNode;
}) {
  const expectsMore = source === "copart" || /~I\d+/.test(image);
  const [images, setImages] = useState<string[]>(image ? [image] : []);
  const [active, setActive] = useState(0);
  const [pending, setPending] = useState(expectsMore);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const initial = image ? [image] : [];
    setImages(initial);
    setActive(0);
    const finish = (next: string[]) => {
      if (cancelled) return;
      if (next.length > 0) setImages(next);
      setPending(false);
    };
    if (source === "iaai") {
      const candidates = iaaiCandidates(image);
      if (candidates.length < 2) {
        setPending(false);
        return () => {
          cancelled = true;
        };
      }
      setPending(true);
      void Promise.all(candidates.map(async (url) => ((await loadImage(url)) ? url : ""))).then((found) => {
        finish(found.filter(Boolean));
      });
      return () => {
        cancelled = true;
      };
    }
    if (source === "copart") {
      setPending(true);
      void fetch(`/api/lots/${encodeURIComponent(lotId)}/images`)
        .then((response) => (response.ok ? response.json() : null))
        .then((payload: { images?: string[] } | null) => {
          const next = [...new Set((payload?.images || []).map(auctionImageUrl).filter(Boolean))];
          finish(next);
        })
        .catch(() => finish([]));
    } else setPending(false);
    return () => {
      cancelled = true;
    };
  }, [image, lotId, source]);

  const current = images[active] || images[0] || "";
  const showStrip = pending || images.length > 1;
  const canStep = images.length > 1;

  function step(delta: number) {
    setActive((value) => {
      if (images.length < 2) return value;
      return (value + delta + images.length) % images.length;
    });
  }

  useEffect(() => {
    if (!zoom) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [zoom]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target;
      if (target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (event.key === "Escape") setZoom(false);
      if (!canStep) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canStep, images.length]);

  return (
    <div className="gallery">
      <div className="photo-frame">
        <button type="button" className="photo-open" aria-label="Увеличить фото" disabled={!current} onClick={() => setZoom(true)}>
          <LotImage src={current} alt={alt} className="lot-photo" />
          {current ? <span className="photo-zoom">Увеличить</span> : null}
        </button>
        {badges}
        {canStep ? (
          <>
            <button type="button" className="photo-nav photo-nav--prev" aria-label="Предыдущее фото" onClick={() => step(-1)}>
              ‹
            </button>
            <button type="button" className="photo-nav photo-nav--next" aria-label="Следующее фото" onClick={() => step(1)}>
              ›
            </button>
          </>
        ) : null}
      </div>
      {zoom && current
        ? createPortal(
            <div className="lightbox" role="dialog" aria-modal="true" aria-label="Увеличенное фото">
              <button type="button" className="lightbox-backdrop" aria-label="Закрыть" onClick={() => setZoom(false)} />
              <button type="button" className="lightbox-close" onClick={() => setZoom(false)}>
                Закрыть
              </button>
              <LotImage src={current} alt={alt} className="lightbox-photo" />
              {canStep ? (
                <>
                  <button type="button" className="photo-nav photo-nav--prev" aria-label="Предыдущее фото" onClick={() => step(-1)}>
                    ‹
                  </button>
                  <button type="button" className="photo-nav photo-nav--next" aria-label="Следующее фото" onClick={() => step(1)}>
                    ›
                  </button>
                  <p className="lightbox-count">
                    {active + 1} из {images.length}
                  </p>
                </>
              ) : null}
            </div>,
            document.body,
          )
        : null}
      {showStrip ? (
        <div className="thumbs" aria-busy={pending} aria-label={pending ? "Загрузка фотографий" : "Фотографии лота"}>
          {pending
            ? Array.from({ length: 6 }, (_, index) => (
                <span key={index} className="thumb-slot" aria-hidden="true">
                  <span className="thumb-loader" />
                </span>
              ))
            : images.map((src, index) => (
                <Thumb
                  key={src}
                  src={src}
                  active={index === active}
                  label={`Фото ${index + 1}`}
                  onClick={() => setActive(index)}
                />
              ))}
        </div>
      ) : null}
    </div>
  );
}

function Thumb({ src, active, label, onClick }: { src: string; active: boolean; label: string; onClick: () => void }) {
  const [ready, setReady] = useState(false);
  return (
    <button type="button" className={active ? "is-active" : undefined} aria-label={label} aria-pressed={active} onClick={onClick}>
      {ready ? null : <span className="thumb-loader" />}
      <LotImage src={src} alt="" onReady={() => setReady(true)} />
    </button>
  );
}
