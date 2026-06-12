import type { Metadata } from 'next';
import {
  Check, ArrowRight, Leaf, Globe, ShieldCheck, Zap, BarChart2,
  Package, Truck, Users, Lock, Star, BookOpen, ChevronDown,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Design System',
  description: 'OriginTrace marketing design system — tokens, components, and patterns.',
};

/* ─── helpers ────────────────────────────────────────────────────────────────── */

function Token({ name, value, swatch }: { name: string; value: string; swatch?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid var(--mk-border)' }}>
      {swatch && (
        <span style={{ width: '2rem', height: '2rem', borderRadius: '0.375rem', background: swatch, border: '1px solid var(--mk-border)', flexShrink: 0 }} />
      )}
      <code style={{ fontSize: '0.8125rem', color: 'var(--mk-green)', flex: 1 }}>{name}</code>
      <span style={{ fontSize: '0.75rem', color: 'var(--mk-text-muted)' }}>{value}</span>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ paddingBlock: '3rem', borderBottom: '2px solid var(--mk-border)' }}>
      <div style={{ marginBottom: '2rem' }}>
        <span className="pre-title">Section</span>
        <h2 className="text-display-sm" style={{ marginTop: '0.75rem', color: 'var(--mk-text-primary)' }}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Row({ children, gap = '1rem', wrap = true }: { children: React.ReactNode; gap?: string; wrap?: boolean }) {
  return (
    <div style={{ display: 'flex', flexWrap: wrap ? 'wrap' : 'nowrap', gap, alignItems: 'flex-start' }}>
      {children}
    </div>
  );
}

/* ─── page ───────────────────────────────────────────────────────────────────── */

export default function DesignSystemPage() {
  return (
    <div className="mk-page" style={{ background: 'var(--mk-surface-white)', minHeight: '100vh' }}>

      {/* ── Page header ── */}
      <div style={{ background: 'var(--color--gray-1)', color: '#fff', padding: '5rem 0 3rem' }}>
        <div className="mk-container">
          <span className="pre-title" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)' }}>
            Marketing
          </span>
          <h1 className="text-display-xl" style={{ marginTop: '1rem', color: '#fff' }}>
            OriginTrace Design System
          </h1>
          <p style={{ fontSize: '1.125rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.75rem', maxWidth: '52ch' }}>
            Canonical reference for all CSS tokens, component classes, and layout patterns
            defined in <code style={{ color: 'hsl(166 46% 55%)' }}>app/marketing.css</code>.
          </p>

          {/* Jump links */}
          <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '2rem' }}>
            {['tokens','typography','containers','spacing','surfaces','buttons','cards','blog','stats','badges','grids','dividers','role-panels','timeline','animations'].map(id => (
              <a key={id} href={`#${id}`} style={{ padding: '0.375rem 0.875rem', background: 'rgba(255,255,255,0.08)', borderRadius: '9999px', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', transition: 'background 0.15s' }}>
                {id}
              </a>
            ))}
          </nav>
        </div>
      </div>

      <div className="mk-container" style={{ paddingBlock: '1rem' }}>

        {/* ── 1. Design Tokens ── */}
        <Section id="tokens" title="Design Tokens">
          <div className="mk-grid-3" style={{ gap: '3rem' }}>

            <div>
              <h3 style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--mk-text-muted)', marginBottom: '1rem' }}>Brand Colours</h3>
              <Token name="--mk-green"        value="#2E7D6B" swatch="#2E7D6B" />
              <Token name="--mk-green-dark"   value="#1F5F52" swatch="#1F5F52" />
              <Token name="--mk-green-mid"    value="#3d9b86" swatch="#3d9b86" />
              <Token name="--mk-green-light"  value="hsl(166 46% 92%)" swatch="hsl(166 46% 92%)" />
              <Token name="--mk-green-pale"   value="hsl(166 30% 97%)" swatch="hsl(166 30% 97%)" />
            </div>

            <div>
              <h3 style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--mk-text-muted)', marginBottom: '1rem' }}>Text</h3>
              <Token name="--mk-text-primary"   value="#212121" swatch="#212121" />
              <Token name="--mk-text-secondary" value="#636363" swatch="#636363" />
              <Token name="--mk-text-muted"     value="#7b7b7b" swatch="#7b7b7b" />
              <Token name="--mk-text-on-dark"   value="hsl(0 0% 95%)" swatch="hsl(0 0% 95%)" />
              <Token name="--mk-text-on-dark-2" value="#bebebe" swatch="#bebebe" />
            </div>

            <div>
              <h3 style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--mk-text-muted)', marginBottom: '1rem' }}>Surfaces & Border</h3>
              <Token name="--mk-surface-white" value="white" swatch="white" />
              <Token name="--mk-surface-warm"  value="hsl(43 30% 97%)" swatch="hsl(43 30% 97%)" />
              <Token name="--mk-surface-green" value="hsl(166 30% 97%)" swatch="hsl(166 30% 97%)" />
              <Token name="--mk-surface-gray"  value="#f9f9f9" swatch="#f9f9f9" />
              <Token name="--mk-surface-dark"  value="#212121" swatch="#212121" />
              <Token name="--mk-border"        value="#ebebeb" swatch="#ebebeb" />
            </div>
          </div>

          <div className="mk-grid-3" style={{ gap: '3rem', marginTop: '2.5rem' }}>
            <div>
              <h3 style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--mk-text-muted)', marginBottom: '1rem' }}>Section Spacing</h3>
              <Token name="--section-xs" value="3rem (48px)" />
              <Token name="--section-sm" value="5rem (80px)" />
              <Token name="--section-md" value="8.125rem (130px) — standard" />
              <Token name="--section-lg" value="10.5rem (168px)" />
              <Token name="--section-xl" value="13.5rem (216px)" />
            </div>
            <div>
              <h3 style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--mk-text-muted)', marginBottom: '1rem' }}>Radii</h3>
              <Token name="--mk-radius-xs"   value="0.375rem" />
              <Token name="--mk-radius-sm"   value="0.625rem" />
              <Token name="--mk-radius-md"   value="0.875rem" />
              <Token name="--mk-radius-card" value="1rem" />
              <Token name="--mk-radius-hero" value="1.5rem" />
              <Token name="--mk-radius-pill" value="9999px" />
            </div>
            <div>
              <h3 style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--mk-text-muted)', marginBottom: '1rem' }}>Shadows</h3>
              <Token name="--mk-shadow-xs" value="0 1px 3px" />
              <Token name="--mk-shadow-sm" value="0 2px 8px" />
              <Token name="--mk-shadow-md" value="0 6px 20px" />
              <Token name="--mk-shadow-lg" value="0 16px 40px" />
              <Token name="--mk-shadow-xl" value="0 24px 64px" />
              <Token name="--mk-glow-green" value="0 8px 28px green/30%" />
            </div>
          </div>
        </Section>

        {/* ── 2. Typography ── */}
        <Section id="typography" title="Typography">
          <p style={{ fontSize: '0.875rem', color: 'var(--mk-text-muted)', marginBottom: '2rem' }}>
            Display font: <strong>Instrument Sans</strong> (loaded via Next.js font loader as <code>--font-instrument</code>). Body: <strong>Inter</strong>.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {[
              { cls: 'text-display-2xl', label: 'display-2xl', sample: 'Supply Chain Verified' },
              { cls: 'text-display-xl',  label: 'display-xl',  sample: 'Supply Chain Verified' },
              { cls: 'text-display-lg',  label: 'display-lg',  sample: 'Supply Chain Verified' },
              { cls: 'text-display-md',  label: 'display-md',  sample: 'Supply Chain Verified' },
              { cls: 'text-display-sm',  label: 'display-sm',  sample: 'Supply Chain Verified' },
            ].map(({ cls, label, sample }) => (
              <div key={cls} style={{ display: 'flex', alignItems: 'baseline', gap: '1.5rem', borderBottom: '1px solid var(--mk-border)', paddingBottom: '1rem' }}>
                <code style={{ fontSize: '0.75rem', color: 'var(--mk-text-muted)', minWidth: '10rem', flexShrink: 0 }}>.{label}</code>
                <p className={cls} style={{ margin: 0 }}>{sample}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div><code style={{ fontSize: '0.75rem', color: 'var(--mk-text-muted)' }}>.text-mk-primary</code><p className="text-mk-primary" style={{ margin: '0.25rem 0 0' }}>Primary text</p></div>
            <div><code style={{ fontSize: '0.75rem', color: 'var(--mk-text-muted)' }}>.text-mk-muted</code><p className="text-mk-muted" style={{ margin: '0.25rem 0 0' }}>Muted text</p></div>
            <div><code style={{ fontSize: '0.75rem', color: 'var(--mk-text-muted)' }}>.text-mk-brand</code><p className="text-mk-brand" style={{ margin: '0.25rem 0 0' }}>Brand text</p></div>
            <div style={{ background: 'var(--mk-surface-dark)', padding: '0.5rem 1rem', borderRadius: '0.5rem' }}>
              <code style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>.text-mk-on-dark</code>
              <p className="text-mk-on-dark" style={{ margin: '0.25rem 0 0' }}>On-dark text</p>
            </div>
            <div style={{ background: 'var(--mk-surface-dark)', padding: '0.5rem 1rem', borderRadius: '0.5rem' }}>
              <code style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>.text-mk-faded</code>
              <p className="text-mk-faded" style={{ margin: '0.25rem 0 0' }}>Faded on-dark</p>
            </div>
          </div>
        </Section>

        {/* ── 3. Containers ── */}
        <Section id="containers" title="Container System">
          <p style={{ fontSize: '0.875rem', color: 'var(--mk-text-muted)', marginBottom: '1.5rem' }}>
            All containers share <code>width:100%; margin-inline:auto; padding-inline:1.25rem</code> — padding scales to 2rem @640px, 2.5rem @1024px.
          </p>
          {[
            ['.mk-container-2xs', '576px',  '44rem'],
            ['.mk-container-xs',  '704px',  '44rem'],
            ['.mk-container-sm',  '980px',  '61.25rem'],
            ['.mk-container',     '1200px', '75rem'],
            ['.mk-container-md',  '1200px', '75rem'],
            ['.mk-container-lg',  '1390px', '86.875rem'],
            ['.mk-container-full','none',   '—'],
          ].map(([cls, px, rem]) => (
            <div key={cls} style={{ display: 'flex', gap: '1.5rem', padding: '0.5rem 0', borderBottom: '1px solid var(--mk-border)', fontSize: '0.875rem' }}>
              <code style={{ color: 'var(--mk-green)', minWidth: '14rem' }}>{cls}</code>
              <span style={{ color: 'var(--mk-text-secondary)', minWidth: '6rem' }}>{px}</span>
              <span style={{ color: 'var(--mk-text-muted)' }}>{rem}</span>
            </div>
          ))}
        </Section>

        {/* ── 4. Spacing ── */}
        <Section id="spacing" title="Section Spacing & Margins">
          <Row gap="2rem">
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--mk-text-muted)', marginBottom: '1rem' }}>Section utilities</h3>
              {['.section-spacing-xs','section-spacing-sm','.section-spacing','.section-spacing-lg','.section-spacing-xl','.section-pt','.section-pb','.section-pt-lg','.section-pb-lg','.section-pt-sm','.section-pb-sm'].map(c => (
                <div key={c} style={{ padding: '0.375rem 0', borderBottom: '1px solid var(--mk-border)', fontSize: '0.8125rem' }}>
                  <code style={{ color: 'var(--mk-green)' }}>{c}</code>
                </div>
              ))}
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--mk-text-muted)', marginBottom: '1rem' }}>Margin combo-class pattern</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--mk-text-secondary)', marginBottom: '1rem' }}>
                Usage: <code>&lt;div class=&quot;margin-bottom margin-large&quot;&gt;</code>
              </p>
              {['tiny:4px','xsmall:8px','small:12px','medium:16px','medium-2:24px','large:32px','large-2:40px','xlarge:48px','xlarge-2:64px','2xlarge:80px','2xlarge-2:96px','3xlarge:112px','3xlarge-2:130px','4xlarge:160px'].map(s => {
                const [name, px] = s.split(':');
                return (
                  <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid var(--mk-border)', fontSize: '0.8125rem' }}>
                    <code style={{ color: 'var(--mk-green)' }}>.margin-{name}</code>
                    <span style={{ color: 'var(--mk-text-muted)' }}>{px}</span>
                  </div>
                );
              })}
            </div>
          </Row>
        </Section>

        {/* ── 5. Surfaces ── */}
        <Section id="surfaces" title="Section Surfaces">
          <div className="mk-grid-3" style={{ gap: '1rem' }}>
            {[
              { cls: 'section-white',  label: '.section-white',  extra: '' },
              { cls: 'section-warm',   label: '.section-warm',   extra: '' },
              { cls: 'section-green',  label: '.section-green',  extra: '' },
              { cls: 'section-gray',   label: '.section-gray',   extra: '' },
              { cls: 'section-dark',   label: '.section-dark',   extra: 'text-mk-on-dark' },
              { cls: 'section-black',  label: '.section-black',  extra: 'text-mk-on-dark' },
            ].map(({ cls, label, extra }) => (
              <div key={cls} className={cls} style={{ padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--mk-border)' }}>
                <code style={{ fontSize: '0.8125rem', color: extra ? 'rgba(255,255,255,0.5)' : 'var(--mk-text-muted)' }}>{label}</code>
                <p className={extra} style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Surface sample text</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="section-bordered-t" style={{ padding: '0.75rem 0' }}><code style={{ fontSize: '0.8125rem', color: 'var(--mk-text-muted)' }}>.section-bordered-t</code></div>
            <div className="section-bordered-b" style={{ padding: '0.75rem 0' }}><code style={{ fontSize: '0.8125rem', color: 'var(--mk-text-muted)' }}>.section-bordered-b</code></div>
            <div className="section-bordered" style={{ padding: '0.75rem 0' }}><code style={{ fontSize: '0.8125rem', color: 'var(--mk-text-muted)' }}>.section-bordered</code></div>
          </div>
        </Section>

        {/* ── 6. Pre-title chips + section header ── */}
        <Section id="pretitle" title="Pre-title Chip & Section Header">
          <Row gap="1rem">
            <span className="pre-title">Pre-title chip</span>
            <span className="pre-title"><Leaf size={10} /> With icon</span>
          </Row>
          <div style={{ marginTop: '1.5rem', background: 'var(--mk-surface-dark)', padding: '2rem', borderRadius: '1rem' }}>
            <span className="pre-title">Dark surface</span>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem' }}>Auto-adapts to white glass style on .section-dark / .section-black</p>
          </div>

          <div className="section-header" style={{ marginTop: '3rem' }}>
            <span className="pre-title">Platform</span>
            <h2 className="text-display-lg section-header__title">
              Section Header — Centred<br />
              <span className="text-mk-muted">with muted line</span>
            </h2>
            <p className="section-header__body">
              This is the standard section header pattern. Max-width 52rem, margin-inline auto,
              4rem bottom margin. Used before every major content block.
            </p>
          </div>

          <div className="section-header section-header--left" style={{ marginTop: '1rem' }}>
            <span className="pre-title">Left-aligned</span>
            <h2 className="text-display-md section-header__title">Left-aligned Variant</h2>
            <p className="section-header__body">Add <code>.section-header--left</code> for left-aligned headers, e.g. on split-column sections.</p>
          </div>
        </Section>

        {/* ── 7. Buttons ── */}
        <Section id="buttons" title="Buttons">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--mk-text-muted)', marginBottom: '0.875rem' }}>Standard variants</p>
              <Row gap="0.75rem">
                <button className="btn-mk-primary">btn-mk-primary</button>
                <button className="btn-mk-dark">btn-mk-dark</button>
                <button className="btn-mk-outline">btn-mk-outline</button>
              </Row>
            </div>
            <div style={{ background: 'var(--mk-surface-dark)', padding: '1.5rem', borderRadius: '0.75rem' }}>
              <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.875rem' }}>On dark</p>
              <Row gap="0.75rem">
                <button className="btn-mk-primary">btn-mk-primary</button>
                <button className="btn-mk-ghost">btn-mk-ghost</button>
              </Row>
            </div>
            <div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--mk-text-muted)', marginBottom: '0.875rem' }}>Size modifiers</p>
              <Row gap="0.75rem" wrap={false}>
                <button className="btn-mk-primary btn-mk-sm">btn-mk-sm</button>
                <button className="btn-mk-primary">default</button>
                <button className="btn-mk-primary btn-mk-lg">btn-mk-lg</button>
              </Row>
            </div>
            <div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--mk-text-muted)', marginBottom: '0.875rem' }}>With icons</p>
              <Row gap="0.75rem">
                <button className="btn-mk-primary">Get Started <ArrowRight size={16} /></button>
                <button className="btn-mk-outline">Learn More <ArrowRight size={16} /></button>
                <span className="btn-mk-icon-circle"><ArrowRight size={18} /></span>
              </Row>
            </div>
          </div>
        </Section>

        {/* ── 8. Cards ── */}
        <Section id="cards" title="Feature / Capability Cards">
          <div className="mk-grid-3" style={{ gap: '1.5rem' }}>
            <div className="mk-card">
              <div className="mk-card__icon"><Leaf size={20} /></div>
              <p className="mk-card__title">Traceability</p>
              <p className="mk-card__body">Farm-to-border chain-of-custody, immutably logged and auditable at any point in the supply chain.</p>
              <div className="mk-card__arrow">Learn more <ArrowRight size={14} /></div>
            </div>
            <div className="mk-card">
              <div className="mk-card__icon"><Globe size={20} /></div>
              <p className="mk-card__title">Multi-market Compliance</p>
              <p className="mk-card__body">EUDR, FSMA 204, UK Environment Act, China GACC and UAE ESMA — covered in a single platform.</p>
              <div className="mk-card__arrow">Learn more <ArrowRight size={14} /></div>
            </div>
            <div className="mk-card">
              <div className="mk-card__icon"><ShieldCheck size={20} /></div>
              <p className="mk-card__title">Audit Ready</p>
              <p className="mk-card__body">Every event timestamped and signed. Share a compliance bundle with authorities in two clicks.</p>
              <div className="mk-card__arrow">Learn more <ArrowRight size={14} /></div>
            </div>
          </div>

          {/* Dark surface cards */}
          <div className="section-dark" style={{ padding: '2rem', borderRadius: '1rem', marginTop: '1.5rem' }}>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1.25rem' }}>On .section-dark — icon, title, body auto-adapt</p>
            <div className="mk-grid-3" style={{ gap: '1.5rem' }}>
              {[Zap, BarChart2, Package].map((Icon, i) => (
                <div key={i} className="mk-card">
                  <div className="mk-card__icon"><Icon size={20} /></div>
                  <p className="mk-card__title">Dark Card {i + 1}</p>
                  <p className="mk-card__body">Cards adapt automatically to dark section backgrounds via CSS context selectors.</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── 9. Blog cards ── */}
        <Section id="blog" title="Blog Cards & Carousel">
          <div className="mk-grid-3" style={{ gap: '1.5rem' }}>
            {[
              { cat: 'EUDR', date: 'Jun 2026', title: 'How African Exporters Can Prepare for EUDR Enforcement' },
              { cat: 'Traceability', date: 'May 2026', title: 'Building a Digital Chain-of-Custody for Cocoa Cooperatives' },
              { cat: 'Payments', date: 'Apr 2026', title: 'Farmer Payout Automation: From Harvest to Mobile Money in 48h' },
            ].map((post, i) => (
              <a key={i} className="mk-blog-card" href="#blog">
                <div className="mk-blog-card__img-wrap" style={{ background: 'var(--mk-green-light)' }}>
                  <div style={{ position: 'absolute', inset: 0, background: `hsl(${166 + i * 30} 40% ${30 + i * 8}%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BookOpen size={32} style={{ color: 'rgba(255,255,255,0.2)' }} />
                  </div>
                  <div className="mk-blog-card__overlay" />
                </div>
                <div className="mk-blog-card__body">
                  <div className="mk-blog-card__meta">
                    <span>{post.cat}</span>
                    <span>·</span>
                    <span>{post.date}</span>
                  </div>
                  <p className="mk-blog-card__title">{post.title}</p>
                  <p className="mk-blog-card__desc">A deep-dive into what exporters need to know about the regulation and how OriginTrace maps each requirement.</p>
                  <div className="mk-blog-card__link">Read more <ArrowRight size={12} /></div>
                </div>
              </a>
            ))}
          </div>

          <p style={{ fontSize: '0.8125rem', color: 'var(--mk-text-muted)', marginTop: '1.5rem' }}>
            Carousel variant uses <code>.mk-blog-layout</code> / <code>.mk-blog-slider</code> / <code>.mk-blog-cards</code> / <code>.mk-blog-item</code> — see <code>components/marketing/blog-carousel.tsx</code>.
          </p>
        </Section>

        {/* ── 10. Stats ── */}
        <Section id="stats" title="Stat Cards & Counter Rows">
          <div className="mk-grid-4" style={{ gap: '1rem' }}>
            <div className="mk-stat-card">
              <p className="mk-stat-card__value">2,400+</p>
              <p className="mk-stat-card__label">Farmers registered across 6 cooperatives</p>
            </div>
            <div className="mk-stat-card">
              <p className="mk-stat-card__value">98%</p>
              <p className="mk-stat-card__label">Shipment documentation accuracy</p>
            </div>
            <div className="mk-stat-card">
              <p className="mk-stat-card__value">14</p>
              <p className="mk-stat-card__label">Export markets covered end-to-end</p>
            </div>
            <div className="mk-stat-card">
              <p className="mk-stat-card__value">48h</p>
              <p className="mk-stat-card__label">Average time from batch to payout</p>
            </div>
          </div>

          <div className="mk-stat-row" style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--mk-surface-gray)', borderRadius: '0.75rem' }}>
            <div className="mk-stat-row__item">
              <p className="mk-stat-row__value">12,000</p>
              <p className="mk-stat-row__label">Batches processed</p>
            </div>
            <div className="mk-stat-row__divider" />
            <div className="mk-stat-row__item">
              <p className="mk-stat-row__value">$4.2M</p>
              <p className="mk-stat-row__label">Farmer disbursements</p>
            </div>
            <div className="mk-stat-row__divider" />
            <div className="mk-stat-row__item">
              <p className="mk-stat-row__value">99.9%</p>
              <p className="mk-stat-row__label">Platform uptime</p>
            </div>
          </div>

          {/* Counter grid */}
          <div className="mk-counter-grid" style={{ marginTop: '2rem', border: '1px solid var(--mk-border)', borderRadius: '0.75rem', overflow: 'hidden' }}>
            {[
              { label: 'Active cooperatives on the platform', value: '47', arrow: '↑' },
              { label: 'Tonnes of certified commodity exported', value: '8,200', arrow: '↑' },
              { label: 'Compliance documents auto-generated', value: '31K', arrow: '↑' },
              { label: 'Countries with live shipment coverage', value: '19', arrow: '↑' },
            ].map((item, i) => (
              <div key={i} className="mk-counter-item">
                <p className="mk-counter-title">{item.label}</p>
                <div className="mk-counter-wrap">
                  <span className="mk-counter-arrow">{item.arrow}</span>
                  <h3 className="mk-counter-number">{item.value}</h3>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 11. Badges & Pills ── */}
        <Section id="badges" title="Badges, Chips & Pills">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            <div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--mk-text-muted)', marginBottom: '0.75rem' }}>Icon badge (.mk-icon-badge)</p>
              <Row gap="0.75rem">
                <div className="mk-icon-badge"><Leaf size={18} /></div>
                <div className="mk-icon-badge mk-icon-badge--lg"><Globe size={22} /></div>
                <div className="mk-icon-badge mk-icon-badge--xl"><ShieldCheck size={28} /></div>
              </Row>
            </div>

            <div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--mk-text-muted)', marginBottom: '0.75rem' }}>Regulation tags (.reg-tag)</p>
              <Row gap="0.5rem">
                <span className="reg-tag reg-tag--eudr">EUDR</span>
                <span className="reg-tag reg-tag--fsma">FSMA 204</span>
                <span className="reg-tag reg-tag--uk">UK UKDDS</span>
                <span className="reg-tag reg-tag--china">China GACC</span>
                <span className="reg-tag reg-tag--uae">UAE ESMA</span>
              </Row>
            </div>

            <div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--mk-text-muted)', marginBottom: '0.75rem' }}>Mission items (.mk-mission-item)</p>
              <Row gap="0.5rem">
                <span className="mk-mission-item"><span className="mk-mission-item__icon"><Check size={12} /></span>Farm KYC</span>
                <span className="mk-mission-item"><span className="mk-mission-item__icon"><Check size={12} /></span>Batch tracking</span>
                <span className="mk-mission-item"><span className="mk-mission-item__icon"><Check size={12} /></span>EUDR ready</span>
              </Row>
            </div>

            <div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--mk-text-muted)', marginBottom: '0.75rem' }}>List items (.mk-list-item)</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', maxWidth: '28rem' }}>
                {['Geo-tagged plot registration with satellite overlay','Automated batch weight reconciliation','Real-time shipment document generation'].map(t => (
                  <div key={t} className="mk-list-item">
                    <div className="mk-list-item__icon"><Check size={10} /></div>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--mk-text-muted)', marginBottom: '0.75rem' }}>Cert items (marquee) — .mk-cert-item</p>
              <Row gap="0.5rem">
                <span className="mk-cert-item"><span className="mk-cert-dot" />Rainforest Alliance</span>
                <span className="mk-cert-item"><span className="mk-cert-dot" />Fairtrade</span>
                <span className="mk-cert-item"><span className="mk-cert-dot" />UTZ Certified</span>
                <span className="mk-cert-item"><span className="mk-cert-dot" />GlobalG.A.P.</span>
              </Row>
            </div>

            <div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--mk-text-muted)', marginBottom: '0.75rem' }}>Blog chips — .mk-blog-category / .mk-blog-date</p>
              <Row gap="0.5rem">
                <span className="mk-blog-category">EUDR</span>
                <span className="mk-blog-category">Traceability</span>
                <span className="mk-blog-date">Jun 2026</span>
              </Row>
            </div>
          </div>
        </Section>

        {/* ── 12. Grid helpers ── */}
        <Section id="grids" title="Grid Helpers">
          {[
            { cls: 'mk-grid-2', cols: 2 },
            { cls: 'mk-grid-3', cols: 3 },
            { cls: 'mk-grid-4', cols: 4 },
          ].map(({ cls, cols }) => (
            <div key={cls} style={{ marginBottom: '2rem' }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--mk-text-muted)', marginBottom: '0.75rem' }}><code>.{cls}</code> — collapses at 1024px → 2-col, 640px → 1-col</p>
              <div className={cls}>
                {Array.from({ length: cols }).map((_, i) => (
                  <div key={i} style={{ background: 'var(--mk-surface-gray)', border: '1px solid var(--mk-border)', borderRadius: '0.5rem', padding: '1rem', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--mk-text-muted)' }}>
                    col {i + 1}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <p style={{ fontSize: '0.8125rem', color: 'var(--mk-text-muted)' }}>
            <code>.mk-grid-auto</code> — <code>repeat(auto-fill, minmax(17rem, 1fr))</code>, always responsive without breakpoints.<br />
            Gap modifiers: <code>.mk-gap-sm (1rem)</code> · <code>.mk-gap-md (2rem)</code> · <code>.mk-gap-lg (3rem)</code> · <code>.mk-gap-xl (4rem)</code>
          </p>

          {/* Demo & form grids */}
          <div style={{ marginTop: '2rem' }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--mk-text-muted)', marginBottom: '0.75rem' }}><code>.mk-feature-grid</code> — 3→2→1 col (used on demo page)</p>
            <div className="mk-feature-grid">
              {['Feature A', 'Feature B', 'Feature C'].map(f => (
                <div key={f} style={{ background: 'var(--mk-surface-gray)', border: '1px solid var(--mk-border)', borderRadius: '0.5rem', padding: '1rem', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--mk-text-muted)' }}>{f}</div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── 13. Dividers ── */}
        <Section id="dividers" title="Dividers & Rules">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--mk-text-muted)', marginBottom: '0.5rem' }}><code>.mk-divider-h</code> — full-width horizontal rule</p>
              <hr className="mk-divider-h" />
            </div>
            <div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--mk-text-muted)', marginBottom: '0.5rem' }}><code>.mk-rule</code> — short 3rem decorative rule</p>
              <span className="mk-rule" />
            </div>
            <div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--mk-text-muted)', marginBottom: '0.5rem' }}><code>.mk-divider-v</code> — vertical rule (use inside flex containers)</p>
              <div style={{ display: 'flex', alignItems: 'stretch', height: '3rem', gap: '1.5rem' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--mk-text-secondary)' }}>Left</span>
                <div className="mk-divider-v" />
                <span style={{ fontSize: '0.875rem', color: 'var(--mk-text-secondary)' }}>Right</span>
              </div>
            </div>
          </div>
        </Section>

        {/* ── 14. Role panels ── */}
        <Section id="role-panels" title="Role / Who-It's-For Panels">
          <p style={{ fontSize: '0.875rem', color: 'var(--mk-text-secondary)', marginBottom: '1.5rem' }}>
            Used on industry pages and the solutions page. Image + content split, alternating sides via inline <code>style&#123;&#123;order&#125;&#125;</code>.
            Responsive classes handle mobile stacking automatically.
          </p>
          <div style={{ border: '1px solid var(--mk-border)', borderRadius: '1rem', overflow: 'hidden' }}>
            <div className="mk-role-grid" style={{ background: 'var(--color--gray-1)' }}>
              <div className="mk-role-image" style={{ order: 0, background: 'linear-gradient(135deg, #1F5F52, #2E7D6B)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Truck size={64} style={{ color: 'rgba(255,255,255,0.2)' }} />
              </div>
              <div className="mk-role-content" style={{ order: 1 }}>
                <div>
                  <span className="reg-tag reg-tag--eudr" style={{ marginBottom: '1rem', display: 'inline-flex' }}>Logistics</span>
                  <h3 className="text-display-sm" style={{ color: '#fff', marginTop: '0.5rem' }}>Logistics Coordinator</h3>
                  <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '0.75rem', fontSize: '0.9375rem', lineHeight: '1.65' }}>
                    Dispatch batches, generate waybills and track shipments from warehouse to port — all in one workflow.
                  </p>
                </div>
                <div className="mk-role-stats">
                  <div>
                    <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--mk-green-mid)' }}>48h</p>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Average dispatch time</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--mk-green-mid)' }}>100%</p>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Digital waybills</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--mk-green-mid)' }}>12</p>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Dest. countries</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--mk-text-muted)', marginTop: '0.75rem' }}>
            Classes: <code>.mk-role-grid</code> · <code>.mk-role-image</code> · <code>.mk-role-content</code> · <code>.mk-role-stats</code>
          </p>
        </Section>

        {/* ── 15. Timeline strip ── */}
        <Section id="timeline" title="Compliance Timeline Strip">
          <p style={{ fontSize: '0.875rem', color: 'var(--mk-text-secondary)', marginBottom: '1.5rem' }}>
            Used on all compliance sub-pages (EUDR, UK, USA, China, UAE) to show regulation milestones. Scrollable on mobile.
          </p>
          <div style={{ background: 'var(--color--gray-1)', borderRadius: '1rem', padding: '2rem' }}>
            <div className="mk-timeline-strip">
              {[
                { date: '2021', event: 'Regulation drafted' },
                { date: 'Jun 2023', event: 'Regulation enacted', active: true },
                { date: 'Dec 2024', event: 'Large operators deadline' },
                { date: 'Jun 2025', event: 'SME deadline' },
                { date: '2026+', event: 'Full enforcement' },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`mk-timeline-item${item.active ? ' mk-timeline-item--active' : ''}`}
                  style={{ borderLeft: item.active ? '2px solid var(--mk-green)' : '1px solid rgba(255,255,255,0.15)' }}
                >
                  <p className="mk-timeline-year">{item.date}</p>
                  <p className="mk-timeline-label">{item.event}</p>
                </div>
              ))}
            </div>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--mk-text-muted)', marginTop: '0.75rem' }}>
            Classes: <code>.mk-timeline-strip</code> · <code>.mk-timeline-item</code> · <code>.mk-timeline-item--active</code> · <code>.mk-timeline-year</code> · <code>.mk-timeline-label</code>
          </p>
        </Section>

        {/* ── 16. Animations ── */}
        <Section id="animations" title="Animation Utilities">
          <div className="mk-grid-2" style={{ gap: '2rem' }}>
            <div>
              <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--mk-text-muted)', marginBottom: '1rem' }}>CSS keyframe classes</h3>
              {['.animate-fade-in-up', '.animate-fade-in', '.animate-scale-in'].map(c => (
                <div key={c} style={{ padding: '0.375rem 0', borderBottom: '1px solid var(--mk-border)', fontSize: '0.8125rem' }}>
                  <code style={{ color: 'var(--mk-green)' }}>{c}</code>
                </div>
              ))}
              <p style={{ fontSize: '0.8125rem', color: 'var(--mk-text-muted)', marginTop: '0.75rem' }}>
                Delay modifiers: <code>.animate-delay-100</code> through <code>.animate-delay-600</code>
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--mk-text-muted)', marginBottom: '1rem' }}>data-animate (IntersectionObserver)</h3>
              {['fade-up', 'fade-down', 'fade-left', 'fade-right', 'scale', 'scale-up'].map(v => (
                <div key={v} style={{ padding: '0.375rem 0', borderBottom: '1px solid var(--mk-border)', fontSize: '0.8125rem' }}>
                  <code style={{ color: 'var(--mk-green)' }}>data-animate=&quot;{v}&quot;</code>
                </div>
              ))}
              <p style={{ fontSize: '0.8125rem', color: 'var(--mk-text-muted)', marginTop: '0.75rem' }}>
                Add <code>.is-visible</code> via IntersectionObserver to trigger. Delay via <code>data-delay=&quot;200&quot;</code> (100–800).
              </p>
            </div>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--mk-text-muted)', marginTop: '1.5rem' }}>
            Primary animation is via Framer Motion — see <code>components/marketing/motion.tsx</code> (<code>FadeIn</code>, <code>FadeInStagger</code>, <code>ScaleIn</code>).
            CSS-only utilities are a no-JS fallback and useful for simple one-shot reveals.
          </p>
        </Section>

        {/* ── Footer note ── */}
        <div style={{ paddingBlock: '3rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--mk-text-muted)' }}>
            Source: <code>app/marketing.css</code> · Updated {new Date(2026, 5, 12).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

      </div>
    </div>
  );
}
