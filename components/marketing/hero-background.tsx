'use client';

export default function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      {/* Dark aerial landscape gradient — mimics the Mivora forest/river photo */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(160deg, #0a2e1e 0%, #0f4a30 25%, #1a6645 50%, #0d3d28 75%, #071e12 100%)',
        }}
      />

      {/* Subtle texture layer */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Soft depth glow — upper right */}
      <div
        className="absolute"
        style={{
          top: '-10%',
          right: '-5%',
          width: '55%',
          height: '70%',
          background: 'radial-gradient(ellipse at center, rgba(46,125,107,0.22) 0%, transparent 65%)',
        }}
      />

      {/* Soft depth glow — lower left */}
      <div
        className="absolute"
        style={{
          bottom: '-10%',
          left: '-5%',
          width: '45%',
          height: '60%',
          background: 'radial-gradient(ellipse at center, rgba(31,95,82,0.18) 0%, transparent 65%)',
        }}
      />
    </div>
  );
}
