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
    video.muted = true;
    video.load();
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
