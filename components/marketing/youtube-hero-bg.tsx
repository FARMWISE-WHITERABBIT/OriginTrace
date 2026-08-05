'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    YT: {
      Player: new (el: string | HTMLElement, opts: object) => YTPlayer;
      PlayerState: { ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  mute(): void;
  playVideo(): void;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  destroy(): void;
}

export default function YouTubeHeroBg({ videoId }: { videoId: string }) {
  const playerRef = useRef<YTPlayer | null>(null);
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let destroyed = false;

    function createPlayer() {
      if (destroyed || !divRef.current) return;
      playerRef.current = new window.YT.Player(divRef.current, {
        videoId,
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          rel: 0,
          playsinline: 1,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          origin: window.location.origin,
          // No loop param — we handle it via onStateChange for seamless replay
        },
        events: {
          onReady(e: { target: YTPlayer }) {
            e.target.mute();
            e.target.playVideo();
          },
          onStateChange(e: { data: number; target: YTPlayer }) {
            // State 0 = ENDED — seek to start instantly, no reload
            if (e.data === 0) {
              e.target.seekTo(0, true);
              e.target.playVideo();
            }
          },
        },
      });
    }

    if (window.YT?.Player) {
      createPlayer();
    } else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        createPlayer();
      };
      if (!document.getElementById('yt-iframe-api')) {
        const s = document.createElement('script');
        s.id = 'yt-iframe-api';
        s.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(s);
      }
    }

    return () => {
      destroyed = true;
      playerRef.current?.destroy();
    };
  }, [videoId]);

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 0,
      overflow: 'hidden',
      borderBottomRightRadius: '1.25rem',
    }}>
      {/*
        Player div is oversized: 16/9 to always cover the hero regardless of viewport,
        and pushed 60px below centre so the YouTube logo (bottom-right of player)
        is clipped by the overflow:hidden wrapper above.
      */}
      <div
        ref={divRef}
        style={{
          position: 'absolute',
          top: 'calc(50% + 30px)',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'max(100vw, calc((100vh + 60px) * 16 / 9))',
          height: 'calc(max(100vh, calc(100vw * 9 / 16)) + 60px)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
