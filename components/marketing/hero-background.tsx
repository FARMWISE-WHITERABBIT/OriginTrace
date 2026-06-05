'use client';

import { useEffect, useRef } from 'react';

interface HeroBackgroundProps {
  imageSrc?: string;
  videoSrc?: string;
  youtubeId?: string;
}

export default function HeroBackground({
  imageSrc = '/images/farmer in field.jpg',
  videoSrc = '/videos/hero.mp4',
  youtubeId,
}: HeroBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    const p = video.play();
    if (p !== undefined) p.catch(() => { /* autoplay blocked — static image fallback visible */ });
  }, []);

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 0,
      overflow: 'hidden',
      borderBottomRightRadius: '1.25rem',
    }}>
      {/* Layer 0 — dark-green gradient (zero-dependency fallback) */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: 'linear-gradient(160deg, #0a2e1e 0%, #0f4a30 25%, #1a6645 50%, #0d3d28 75%, #071e12 100%)',
      }} />

      {/* Layer 1 — static image */}
      {imageSrc && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          backgroundImage: `url('${imageSrc}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
        }} />
      )}

      {/* Layer 2 — video overlay */}
      {youtubeId ? (
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}&controls=0&rel=0&modestbranding=1&playsinline=1&disablekb=1`}
          allow="autoplay; encrypted-media; fullscreen"
          style={{
            position: 'absolute', zIndex: 2,
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'max(100vw, calc(100vh * 16 / 9))',
            height: 'max(100vh, calc(100vw * 9 / 16))',
            border: 'none', pointerEvents: 'none',
          }}
          title="Hero background video"
          aria-hidden
        />
      ) : videoSrc ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 2 }}
          aria-hidden
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      ) : null}
    </div>
  );
}
