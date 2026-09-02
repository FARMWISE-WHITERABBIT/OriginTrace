import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'OriginTrace — Trust Infrastructure for Origin-Sensitive Supply Chains';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          background: 'linear-gradient(135deg, #14332C 0%, #2E7D6B 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '26px',
              fontWeight: 800,
              color: '#2E7D6B',
            }}
          >
            O
          </div>
          <div style={{ fontSize: '30px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.5px' }}>
            OriginTrace
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '920px' }}>
          <div style={{ fontSize: '58px', fontWeight: 800, color: '#ffffff', lineHeight: 1.15, letterSpacing: '-1.5px' }}>
            Know you&apos;re compliant before you export.
          </div>
          <div style={{ fontSize: '26px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.4 }}>
            Trust infrastructure for origin-sensitive supply chains — traceability, compliance verification, and export readiness.
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
