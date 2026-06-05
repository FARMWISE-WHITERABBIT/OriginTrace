'use client';

interface HeroBackgroundProps {
  videoSrc?: string; // e.g. "/videos/hero.mp4"
  posterSrc?: string; // e.g. "/videos/hero-poster.jpg"
}

export default function HeroBackground({
  videoSrc = '/videos/hero.mp4',
  posterSrc = '/videos/hero-poster.jpg',
}: HeroBackgroundProps) {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      {/* Fallback gradient — always behind video, visible while video loads */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(160deg, #0a2e1e 0%, #0f4a30 25%, #1a6645 50%, #0d3d28 75%, #071e12 100%)',
          zIndex: 0,
        }}
      />

      {/* Video — sits above gradient, covers it once loaded */}
      <video
        autoPlay
        muted
        loop
        playsInline
        poster={posterSrc}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ zIndex: 1 }}
        aria-hidden
      >
        <source src={videoSrc} type="video/mp4" />
      </video>
    </div>
  );
}
