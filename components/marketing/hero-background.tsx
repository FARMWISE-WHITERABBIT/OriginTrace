'use client';

import { useEffect, useRef } from 'react';

interface HeroBackgroundProps {
  videoSrc?: string;
}

export default function HeroBackground({ videoSrc }: HeroBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // Fallback play() call for browsers that don't honour the autoPlay attribute
    // Do NOT call video.load() here — it aborts the browser's native autoplay
    video.muted = true;
    const p = video.play();
    if (p !== undefined) p.catch(() => {});
  }, []);

  if (!videoSrc) return null;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 0,
      overflow: 'hidden',
      borderBottomRightRadius: '1.25rem',
    }}>
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover', zIndex: 1,
        }}
        aria-hidden
      >
        <source src={videoSrc} type="video/mp4" />
      </video>
    </div>
  );
}
