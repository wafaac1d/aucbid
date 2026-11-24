"use client";

import { type MouseEvent, type ReactNode, useRef, useState } from "react";
import Link from "next/link";
import { auctionImageUrl } from "@/lib/images";
import { PhotoSlider } from "./PhotoSlider";

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

export function CardPhotos({
  lotId,
  source,
  image,
  alt,
  href,
  cached,
  badges,
}: {
  lotId: string;
  source: string;
  image: string;
  alt: string;
  href: string;
  cached: string[];
  badges: ReactNode;
}) {
  const initial = cached.length > 0 ? cached : image ? [image] : [];
  const [images, setImages] = useState(initial);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [solo, setSolo] = useState(false);
  const imagesRef = useRef(initial);
  const jobRef = useRef<Promise<string[]> | null>(null);

  function gallery(): Promise<string[]> {
    if (imagesRef.current.length > 1) return Promise.resolve(imagesRef.current);
    if (!jobRef.current) {
      jobRef.current = (async () => {
        let next: string[] = [];
        if (source === "iaai") {
          const candidates = iaaiCandidates(image);
          if (candidates.length > 1) {
            const found = await Promise.all(candidates.map(async (url) => ((await loadImage(url)) ? url : "")));
            next = found.filter(Boolean);
          }
        } else if (source === "copart") {
          const response = await fetch(`/api/lots/${encodeURIComponent(lotId)}/images`);
          const payload = response.ok ? ((await response.json()) as { images?: string[] }) : null;
          next = [...new Set((payload?.images || []).map((url) => auctionImageUrl(url)).filter(Boolean))];
        }
        if (next.length === 0 && image) next = [image];
        imagesRef.current = next;
        setImages(next);
        setSolo(next.length < 2);
        return next;
      })().finally(() => {
        jobRef.current = null;
      });
    }
    return jobRef.current;
  }

  async function step(event: MouseEvent<HTMLButtonElement>, delta: number) {
    event.preventDefault();
    event.stopPropagation();
    setBusy(true);
    try {
      const list = await gallery();
      if (list.length < 2) return;
      setIndex((value) => (value + delta + list.length) % list.length);
    } finally {
      setBusy(false);
    }
  }

  const current = images[index] || images[0] || "";
  const canFlip = !solo && (images.length > 1 || source === "copart" || /~I\d+/.test(image));

  return (
    <>
      <Link href={href} className="card-photo-link">
        <PhotoSlider index={index} count={images.length} src={current} alt={alt} />
      </Link>
      {badges}
      {canFlip ? (
        <>
          <button type="button" className="photo-nav photo-nav--prev" aria-label="Предыдущее фото" disabled={busy} onClick={(event) => void step(event, -1)}>
            ‹
          </button>
          <button type="button" className="photo-nav photo-nav--next" aria-label="Следующее фото" disabled={busy} onClick={(event) => void step(event, 1)}>
            ›
          </button>
        </>
      ) : null}
    </>
  );
}
