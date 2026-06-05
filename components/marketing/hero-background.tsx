'use client';

interface HeroBackgroundProps {
  /**
   * YouTube video ID (e.g. "dQw4w9WgXcQ").
   * When provided, renders a muted autoplay YouTube iframe scaled to cover.
   * When absent, falls back to a self-hosted <video> at videoSrc.
   */
  youtubeId?: string;
  /** Self-hosted video — used when youtubeId is not set. Default: /videos/hero.mp4 */
  videoSrc?: string;
  /** Poster image shown before the video loads. Omit to show the gradient fallback. */
  posterSrc?: string;
}

export default function HeroBackground({
  youtubeId,
  videoSrc = '/videos/hero.mp4',
  posterSrc,
}: HeroBackgroundProps) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
      {/* Always-visible fallback gradient behind the video */}
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(160deg, #0a2e1e 0%, #0f4a30 25%, #1a6645 50%, #0d3d28 75%, #071e12 100%)',
          zIndex: 0,
        }}
      />

      {youtubeId ? (
        /*
         * YouTube iframe background.
         *
         * The iframe is oversized (min 100vw × 100vh) and centered so the
         * video always fills the hero regardless of aspect ratio. Pointer
         * events are disabled so it can't be interacted with.
         *
         * Parameters:
         *   autoplay=1        — starts immediately (requires mute=1 per browser policy)
         *   mute=1            — required for autoplay
         *   loop=1            — loops; playlist must equal the video id for loop to work
         *   controls=0        — hides player UI
         *   showinfo=0        — hides title bar (legacy, still useful)
         *   rel=0             — no related videos on pause
         *   modestbranding=1  — reduces YouTube branding
         *   iv_load_policy=3  — hides annotations
         *   playsinline=1     — iOS inline playback
         *   disablekb=1       — disables keyboard controls
         *   enablejsapi=0     — no JS API needed
         *
         * Limitation: YouTube may still show a logo watermark. For a fully
         * clean background video with no branding, use a self-hosted file
         * via the videoSrc prop (Cloudflare R2, Bunny.net, etc.).
         */
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&disablekb=1&enablejsapi=0`}
          allow="autoplay; fullscreen"
          className="absolute"
          style={{
            zIndex: 1,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            /* Ensures 16:9 iframe is always taller/wider than viewport */
            width: 'max(100vw, calc(100vh * 16 / 9))',
            height: 'max(100vh, calc(100vw * 9 / 16))',
            border: 'none',
            pointerEvents: 'none',
          }}
          title="Hero background video"
          aria-hidden
        />
      ) : (
        /* Self-hosted video fallback */
        <video
          autoPlay
          muted
          loop
          playsInline
          {...(posterSrc ? { poster: posterSrc } : {})}
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            zIndex: 1,
          }}
          aria-hidden
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}
    </div>
  );
}
