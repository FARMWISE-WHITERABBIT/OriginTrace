'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertTriangle, ArrowRight, ArrowLeft, Check, Shield,
  Send, Loader2, FileText, X, ChevronRight
} from 'lucide-react';

type Step = 'intro' | 'step1' | 'step2' | 'step3' | 'step4' | 'preview' | 'lead' | 'results';

interface Answers {
  role: string;
  commodities: string[];
  countries: string[];
  sourceKnowledge: string;
  gpsPolygons: string;
  siteCompliance: string;
  dataCollection: string;
  lotTraceability: string;
  multiSourceBatch: string;
  auditTrail: string;
  complianceReport: string;
  auditConfidence: number;
}

interface LeadData {
  fullName: string;
  company: string;
  role: string;
  email: string;
  phone: string;
  country: string;
  wantsWalkthrough: boolean;
}

const ROLES = [
  'Exporter / Processor',
  'Aggregator / Trader',
  'Cooperative / Association',
  'Brand / Importer',
  'Mining Company / Artisanal Miner',
  'Other',
];

const AGRI_COMMODITIES = ['Cocoa', 'Coffee', 'Palm Oil', 'Rubber', 'Timber', 'Sesame', 'Cashew', 'Soy'];
const MINERAL_COMMODITIES = ['Gold', 'Coltan', 'Tin', 'Tungsten', 'Lithium', 'Tantalum'];
const COUNTRIES = ['Nigeria', 'Ghana', "Côte d'Ivoire", 'Cameroon', 'DRC', 'Rwanda', 'Tanzania', 'Indonesia', 'Other'];

const INIT_ANSWERS: Answers = {
  role: '', commodities: [], countries: [],
  sourceKnowledge: '', gpsPolygons: '', siteCompliance: '',
  dataCollection: '', lotTraceability: '', multiSourceBatch: '',
  auditTrail: '', complianceReport: '', auditConfidence: 3,
};
const INIT_LEAD: LeadData = {
  fullName: '', company: '', role: '', email: '', phone: '', country: '', wantsWalkthrough: false,
};

/* ─── helpers ─── */

function getCommodityProfile(c: string[]) {
  const a = c.some(x => AGRI_COMMODITIES.includes(x));
  const m = c.some(x => MINERAL_COMMODITIES.includes(x));
  return { isAgri: a && !m, isMinerals: m && !a, isBoth: a && m };
}

function calculateScore(a: Answers): number {
  let s = 0, mx = 0;
  s += ({ every: 15, some: 7, none: 0 }[a.sourceKnowledge] ?? 0); mx += 15;
  s += ({ polygons: 20, points: 8, none: 0 }[a.gpsPolygons] ?? 0); mx += 20;
  s += ({ compliant: 10, partial: 4, none: 0 }[a.siteCompliance] ?? 0); mx += 10;
  s += ({ mobile: 10, paper: 5, whatsapp: 3, none: 0 }[a.dataCollection] ?? 0); mx += 10;
  s += ({ lot: 15, batch: 7, none: 0 }[a.lotTraceability] ?? 0); mx += 15;
  s += ({ recorded: 8, estimated: 3, none: 0 }[a.multiSourceBatch] ?? 0); mx += 8;
  s += ({ immutable: 12, partial: 5, none: 0 }[a.auditTrail] ?? 0); mx += 12;
  s += ({ yes: 5, manual: 2, none: 0 }[a.complianceReport] ?? 0); mx += 5;
  s += ((a.auditConfidence - 1) / 4) * 5; mx += 5;
  return Math.round((s / mx) * 100);
}

function getRiskTier(score: number) {
  if (score >= 70) return { label: 'Export Ready', color: '#059669', bg: 'rgba(5,150,105,0.1)', description: 'Your supply chain has strong compliance foundations. A few refinements will bring you to full export readiness across all target markets.' };
  if (score >= 40) return { label: 'Needs Strengthening', color: '#d97706', bg: 'rgba(217,119,6,0.1)', description: 'You have some foundational elements, but critical gaps could block market access, trigger shipment rejections, or fail regulatory audits.' };
  return { label: 'High Risk', color: '#dc2626', bg: 'rgba(220,38,38,0.1)', description: 'Significant compliance gaps exist. Without immediate action, shipment rejections and market access loss are likely across EU, US, and China markets.' };
}

function getGaps(a: Answers, min: boolean) {
  const gaps: { icon: typeof X | typeof AlertTriangle; severity: 'critical' | 'warning'; text: string }[] = [];
  if (a.gpsPolygons !== 'polygons') gaps.push({ icon: X, severity: 'critical', text: min ? 'Missing GPS boundaries for extraction sites / concessions' : 'Missing GPS farm boundary polygons' });
  if (a.sourceKnowledge !== 'every') gaps.push({ icon: X, severity: 'critical', text: min ? 'Incomplete extraction site traceability' : 'Incomplete farm-level traceability' });
  if (a.lotTraceability !== 'lot') gaps.push({ icon: a.lotTraceability === 'batch' ? AlertTriangle : X, severity: a.lotTraceability === 'batch' ? 'warning' : 'critical', text: min ? 'Cannot trace consignments to individual extraction sites' : 'Incomplete bag-to-farm traceability' });
  if (a.auditTrail !== 'immutable') gaps.push({ icon: a.auditTrail === 'partial' ? AlertTriangle : X, severity: a.auditTrail === 'partial' ? 'warning' : 'critical', text: 'No verifiable digital audit trail' });
  if (a.siteCompliance !== 'compliant') gaps.push({ icon: AlertTriangle, severity: 'warning', text: min ? 'Unlicensed or unverified extraction sites in supply chain' : 'Deforestation risk: unverified farm establishment dates' });
  if (a.multiSourceBatch !== 'recorded') gaps.push({ icon: AlertTriangle, severity: 'warning', text: 'Multi-source attribution gaps in aggregated batches' });
  if (a.dataCollection !== 'mobile') gaps.push({ icon: AlertTriangle, severity: 'warning', text: 'Non-digital field data collection limits auditability' });
  if (a.complianceReport !== 'yes') gaps.push({ icon: AlertTriangle, severity: 'warning', text: 'Cannot generate a compliance-ready Due Diligence Statement on demand' });
  return gaps;
}

function getActions(a: Answers, min: boolean) {
  const r: { priority: 'urgent' | 'important' | 'recommended'; title: string; description: string }[] = [];
  if (a.gpsPolygons !== 'polygons') r.push({ priority: 'urgent', title: min ? 'Map Extraction Site Boundaries' : 'Implement GPS Polygon Farm Mapping', description: min ? 'OECD DDG and LBMA require documented site boundaries. Deploy GPS-enabled field tools to record concession perimeters.' : 'EUDR requires farm boundary polygons, not just GPS points. Field agents must walk and record farm perimeters.' });
  if (a.sourceKnowledge !== 'every') r.push({ priority: 'urgent', title: min ? 'Register All Extraction Sites' : 'Establish Farm-Level Traceability', description: min ? 'Register every mine or extraction site with verified identity. OECD due diligence requires traceability to the point of extraction.' : 'Register every source farm with verifiable identity. Export regulations mandate plot-level traceability.' });
  if (a.lotTraceability !== 'lot') r.push({ priority: 'urgent', title: min ? 'Enable Consignment-to-Site Tracking' : 'Enable Bag-to-Farm Tracking', description: min ? 'Assign unique identifiers to every consignment and link to extraction sites. Batch-level tracing is insufficient for responsible sourcing audits.' : 'Assign unique IDs to every bag and link to farms. Batch-level tracing is insufficient for regulatory audits.' });
  if (a.auditTrail !== 'immutable') r.push({ priority: 'important', title: 'Digitize Audit Trails', description: 'Replace paper records with immutable digital logs. EU and OECD auditors require verifiable, tamper-proof evidence.' });
  if (a.siteCompliance !== 'compliant') r.push({ priority: 'important', title: min ? 'Verify Concession Licences' : 'Verify Deforestation Compliance', description: min ? 'Confirm all extraction sites hold valid concession licences. Unlicensed sourcing fails OECD and LBMA responsible sourcing requirements.' : 'Confirm all source farms were established before regulatory cut-off dates. Sourcing from recently deforested land triggers compliance failures.' });
  if (a.dataCollection !== 'mobile') r.push({ priority: 'recommended', title: 'Upgrade Field Data Collection', description: 'Transition to a mobile-first, offline-capable data collection system. Paper and messaging apps cannot produce verifiable data.' });
  return r;
}

/* ─── sub-components ─── */

const GREEN = 'var(--mk-green, #1a3d2b)';

function SS({ options, value, onChange, tid }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void; tid: string }) {
  return (
    <div className="flex flex-col gap-2">
      {options.map(o => {
        const sel = value === o.value;
        return (
          <button key={o.value} type="button" onClick={() => onChange(o.value)}
            data-testid={`${tid}-${o.value}`}
            style={{
              textAlign: 'left', padding: '14px 18px', borderRadius: '10px',
              border: sel ? `2px solid ${GREEN}` : '1.5px solid rgba(0,0,0,0.12)',
              background: sel ? 'rgba(26,61,43,0.06)' : '#fff',
              fontWeight: sel ? 600 : 400,
              fontSize: '0.9rem',
              color: sel ? GREEN : '#374151',
              transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
            <span style={{
              width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
              border: sel ? `5px solid ${GREEN}` : '2px solid rgba(0,0,0,0.2)',
              background: '#fff', display: 'inline-block',
            }} />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function MS({ options, values, onChange, tid }: { options: string[]; values: string[]; onChange: (v: string[]) => void; tid: string }) {
  const toggle = (x: string) => onChange(values.includes(x) ? values.filter(v => v !== x) : [...values, x]);
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map(o => {
        const sel = values.includes(o);
        return (
          <button key={o} type="button" onClick={() => toggle(o)}
            data-testid={`${tid}-${o.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
            style={{
              textAlign: 'left', padding: '12px 16px', borderRadius: '10px',
              border: sel ? `2px solid ${GREEN}` : '1.5px solid rgba(0,0,0,0.12)',
              background: sel ? 'rgba(26,61,43,0.06)' : '#fff',
              fontWeight: sel ? 600 : 400,
              fontSize: '0.875rem',
              color: sel ? GREEN : '#374151',
              transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
            <span style={{
              width: 16, height: 16, borderRadius: '4px', flexShrink: 0,
              border: sel ? `none` : '2px solid rgba(0,0,0,0.2)',
              background: sel ? GREEN : '#fff',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {sel && <Check size={10} color="#fff" strokeWidth={3} />}
            </span>
            {o}
          </button>
        );
      })}
    </div>
  );
}

function ConfidenceScale({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between gap-2">
        {[1, 2, 3, 4, 5].map(n => {
          const sel = value === n;
          return (
            <button key={n} type="button" onClick={() => onChange(n)}
              data-testid={`confidence-${n}`}
              style={{
                flex: 1, padding: '14px 0', borderRadius: '10px', fontSize: '1rem',
                fontWeight: sel ? 700 : 400,
                border: sel ? `2px solid ${GREEN}` : '1.5px solid rgba(0,0,0,0.12)',
                background: sel ? GREEN : '#fff',
                color: sel ? '#fff' : '#374151',
                transition: 'all 0.15s',
              }}>
              {n}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-xs px-1" style={{ color: '#9ca3af' }}>
        <span>Not confident</span><span>Fully confident</span>
      </div>
    </div>
  );
}

function GaugeMeter({ score, animate }: { score: number; animate: boolean }) {
  const tier = getRiskTier(score);
  const angle = (score / 100) * 180 - 90;
  const needle = (
    <>
      <polygon points="100,38 96,90 104,90" fill="#1f2937" />
      <circle cx="100" cy="95" r="7" fill="#e2e8f0" />
      <circle cx="100" cy="95" r="3.5" fill="#1f2937" />
    </>
  );
  return (
    <div className="flex flex-col items-center">
      <div style={{ width: 200, height: 106, position: 'relative' }}>
        <svg viewBox="0 0 200 110" style={{ width: '100%', height: '100%' }}>
          <defs>
            <linearGradient id="cgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" /><stop offset="50%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          <path d="M 20 95 A 80 80 0 0 1 180 95" fill="none" stroke="#e5e7eb" strokeWidth="14" strokeLinecap="round" />
          <path d="M 20 95 A 80 80 0 0 1 180 95" fill="none" stroke="url(#cgGrad)" strokeWidth="14" strokeLinecap="round" />
          <text x="20" y="108" fontSize="9" fill="#6b7280" textAnchor="middle">0</text>
          <text x="100" y="20" fontSize="9" fill="#6b7280" textAnchor="middle">50</text>
          <text x="180" y="108" fontSize="9" fill="#6b7280" textAnchor="middle">100</text>
          {animate
            ? <motion.g initial={{ rotate: -90 }} animate={{ rotate: angle }} transition={{ duration: 1.5, ease: [0.25, 0.4, 0.25, 1], delay: 0.3 }} style={{ transformOrigin: '100px 95px' }}>{needle}</motion.g>
            : <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '100px 95px' }}>{needle}</g>}
        </svg>
      </div>
      <div className="text-center -mt-2">
        <motion.span
          initial={animate ? { opacity: 0, scale: 0.5 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2, duration: 0.4 }}
          style={{ fontSize: '2.5rem', fontWeight: 800, color: tier.color }}
        >{score}</motion.span>
        <span style={{ fontSize: '1rem', color: '#9ca3af' }}>/100</span>
      </div>
      <motion.div
        initial={animate ? { opacity: 0, y: 10 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.4 }}
        style={{
          marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 999, fontSize: '0.8rem', fontWeight: 600,
          background: tier.bg, color: tier.color,
        }}
      >
        <Shield size={14} />{tier.label}
      </motion.div>
    </div>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = (current / total) * 100;
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.75rem', color: '#9ca3af' }}>
        <span>Question {current} of {total}</span>
        <span style={{ color: GREEN, fontWeight: 600 }}>{Math.round(pct)}%</span>
      </div>
      <div style={{ height: 4, background: 'rgba(0,0,0,0.07)', borderRadius: 99, overflow: 'hidden' }}>
        <motion.div
          style={{ height: '100%', background: GREEN, borderRadius: 99 }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
    </div>
  );
}

/* ─── nav button styles ─── */
const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '12px 24px', borderRadius: 10, fontSize: '0.9rem', fontWeight: 600,
  background: GREEN, color: '#fff', border: 'none', cursor: 'pointer',
  transition: 'opacity 0.15s',
};
const btnGhost: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '12px 20px', borderRadius: 10, fontSize: '0.9rem', fontWeight: 500,
  background: 'transparent', color: '#6b7280',
  border: '1.5px solid rgba(0,0,0,0.12)', cursor: 'pointer',
  transition: 'background 0.15s',
};

/* ─── main component ─── */

export function ComplianceCalculator({ onClose }: { onClose?: () => void }) {
  const [step, setStep] = useState<Step>('intro');
  const [answers, setAnswers] = useState<Answers>(INIT_ANSWERS);
  const [leadData, setLeadData] = useState<LeadData>(INIT_LEAD);
  const [submitting, setSubmitting] = useState(false);
  const [qi, setQi] = useState(0);

  const { isMinerals, isBoth } = useMemo(() => getCommodityProfile(answers.commodities), [answers.commodities]);
  const min = isMinerals || isBoth;

  const score = useMemo(() => calculateScore(answers), [answers]);
  const tier = useMemo(() => getRiskTier(score), [score]);
  const gaps = useMemo(() => getGaps(answers, min), [answers, min]);
  const actions = useMemo(() => getActions(answers, min), [answers, min]);

  const ua = useCallback(<K extends keyof Answers>(k: K, v: Answers[K]) => setAnswers(p => ({ ...p, [k]: v })), []);
  const ul = useCallback(<K extends keyof LeadData>(k: K, v: LeadData[K]) => setLeadData(p => ({ ...p, [k]: v })), []);

  const qn = () => step === 'step1' ? qi + 1 : step === 'step2' ? qi + 4 : step === 'step3' ? qi + 7 : step === 'step4' ? qi + 10 : 0;

  const canProceed = () => {
    if (step === 'step1') { if (qi === 0) return answers.role !== ''; if (qi === 1) return answers.commodities.length > 0; if (qi === 2) return answers.countries.length > 0; }
    if (step === 'step2') { if (qi === 0) return answers.sourceKnowledge !== ''; if (qi === 1) return answers.gpsPolygons !== ''; if (qi === 2) return answers.siteCompliance !== ''; }
    if (step === 'step3') { if (qi === 0) return answers.dataCollection !== ''; if (qi === 1) return answers.lotTraceability !== ''; if (qi === 2) return answers.multiSourceBatch !== ''; }
    if (step === 'step4') { if (qi === 0) return answers.auditTrail !== ''; if (qi === 1) return answers.complianceReport !== ''; return true; }
    return true;
  };

  const order: Step[] = ['step1', 'step2', 'step3', 'step4'];
  const next = () => { const i = order.indexOf(step); if (qi < 2) setQi(q => q + 1); else if (i < 3) { setStep(order[i + 1]); setQi(0); } else setStep('preview'); };
  const prev = () => { const i = order.indexOf(step); if (qi > 0) setQi(q => q - 1); else if (i > 0) { setStep(order[i - 1]); setQi(2); } else setStep('intro'); };

  const submitLead = async () => {
    if (!leadData.fullName || !leadData.email || !leadData.company || !leadData.phone) return;
    setSubmitting(true);
    try {
      await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ full_name: leadData.fullName, email: leadData.email, company: leadData.company, phone: leadData.phone, role: leadData.role, message: `Readiness score: ${score}/100 | Tier: ${tier?.label} | Commodities: ${answers.commodities.join(', ')} | Country: ${leadData.country} | Gaps: ${gaps.map(g => g.text).join(', ')}`, source: 'calculator' }) });
    } catch { /* silent */ } finally { setSubmitting(false); setStep('results'); }
  };

  const sv = { enter: { x: 24, opacity: 0 }, center: { x: 0, opacity: 1 }, exit: { x: -24, opacity: 0 } };
  const mk = `${step}-${qi}`;

  /* ─── question wrapper ─── */
  const Q = (section: string, q: { title: string; helper: string; content: React.ReactNode }) => (
    <motion.div key={mk} variants={sv} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22 }}>
      <ProgressBar current={qn()} total={12} />
      <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: GREEN, marginBottom: 10 }}>{section}</p>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111827', marginBottom: 8, lineHeight: 1.4 }} data-testid="text-question-title">{q.title}</h3>
      <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: 20, lineHeight: 1.6 }}>{q.helper}</p>
      {q.content}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, gap: 12 }}>
        <button type="button" style={btnGhost} onClick={prev} data-testid="button-prev"><ArrowLeft size={16} />Back</button>
        <button type="button"
          style={{ ...btnPrimary, opacity: canProceed() ? 1 : 0.4, cursor: canProceed() ? 'pointer' : 'not-allowed' }}
          onClick={next} disabled={!canProceed()} data-testid="button-next">
          {step === 'step4' && qi === 2 ? 'See My Score' : 'Next'}<ArrowRight size={16} />
        </button>
      </div>
    </motion.div>
  );

  /* ─── intro ─── */
  const renderIntro = () => (
    <motion.div key="intro" variants={sv} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 14, background: 'rgba(26,61,43,0.1)', marginBottom: 24 }}>
        <Shield size={26} color={GREEN} />
      </div>
      <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', marginBottom: 12, lineHeight: 1.3 }} data-testid="text-calc-headline">
        Check Your Export Readiness<br />in 3 Minutes
      </h2>
      <p style={{ fontSize: '0.9rem', color: '#6b7280', lineHeight: 1.7, maxWidth: 420, marginBottom: 8 }}>
        Answer 12 questions about your supply chain — agricultural or mineral — and get an instant compliance risk score against EU, US, and China requirements.
      </p>
      <p style={{ fontSize: '0.78rem', color: '#9ca3af', marginBottom: 36 }}>No sales spam. Results are confidential.</p>

      <div style={{ display: 'flex', gap: 32, marginBottom: 40 }}>
        {[['12', 'questions'], ['3 min', 'to complete'], ['Instant', 'results']].map(([val, label]) => (
          <div key={label}>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: GREEN }}>{val}</div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{label}</div>
          </div>
        ))}
      </div>

      <button type="button" style={btnPrimary} onClick={() => { setStep('step1'); setQi(0); }} data-testid="button-start-assessment">
        Start Assessment <ArrowRight size={16} />
      </button>
    </motion.div>
  );

  /* ─── steps ─── */
  const renderStep1 = () => Q('Supply Chain Profile', [
    { title: 'What best describes your role?', helper: 'This helps us tailor compliance requirements to your position in the supply chain.', content: <SS options={ROLES.map(r => ({ value: r.toLowerCase().replace(/[^a-z]/g, '_'), label: r }))} value={answers.role} onChange={v => ua('role', v)} tid="role" /> },
    { title: 'What commodities do you handle or export?', helper: 'Select all that apply — compliance requirements vary significantly by commodity type.', content: <div className="space-y-4"><div><p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 8 }}>Agricultural</p><MS options={AGRI_COMMODITIES} values={answers.commodities} onChange={v => ua('commodities', v)} tid="commodity" /></div><div><p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 8, marginTop: 16 }}>Minerals</p><MS options={MINERAL_COMMODITIES} values={answers.commodities} onChange={v => ua('commodities', v)} tid="commodity" /></div></div> },
    { title: 'Which countries does your supply originate from?', helper: 'Risk benchmarks and regulatory requirements differ by origin country.', content: <MS options={COUNTRIES} values={answers.countries} onChange={v => ua('countries', v)} tid="country" /> },
  ][qi]);

  const renderStep2 = () => {
    const src = min ? 'extraction sites' : 'farms';
    return Q(min ? 'Extraction Site & Origin Data' : 'Farm & Origin Data', [
      { title: min ? 'Do you know exactly which extraction sites your minerals come from?' : 'Do you know exactly which farms your commodities come from?', helper: `Regulatory standards require traceability to the ${src} level, not just warehouses or aggregation points.`, content: <SS options={[{ value: 'every', label: `Yes — every ${min ? 'site' : 'farm'}` }, { value: 'some', label: `Partially — some ${src}` }, { value: 'none', label: 'No — only aggregation points' }]} value={answers.sourceKnowledge} onChange={v => ua('sourceKnowledge', v)} tid="source-knowledge" /> },
      { title: min ? 'Do you collect GPS boundaries for extraction sites?' : 'Do you collect GPS boundary polygons for farms?', helper: min ? 'OECD DDG and LBMA require documented site boundaries, not just a GPS point.' : 'GPS coordinates alone are insufficient for most regulations. Polygons are required.', content: <SS options={[{ value: 'polygons', label: 'Yes — GPS boundary polygons' }, { value: 'points', label: 'Only GPS points / coordinates' }, { value: 'none', label: 'No geolocation data' }]} value={answers.gpsPolygons} onChange={v => ua('gpsPolygons', v)} tid="gps" /> },
      { title: min ? 'Do your extraction sites hold valid concession licences?' : 'When were most of your source farms established?', helper: min ? 'OECD and LBMA require all sourcing to originate from licenced, legal operations.' : 'Regulations prohibit sourcing from land deforested after specific regulatory cut-off dates.', content: <SS options={min ? [{ value: 'compliant', label: 'Yes — all sites fully licenced' }, { value: 'partial', label: 'Partially — some sites unverified' }, { value: 'none', label: 'No — unlicensed or unknown' }] : [{ value: 'compliant', label: 'Before 2020 — all farms verified' }, { value: 'partial', label: 'Mixed — some farms after 2020 or unknown' }, { value: 'none', label: 'After 2020 or unknown' }]} value={answers.siteCompliance} onChange={v => ua('siteCompliance', v)} tid="site-compliance" /> },
    ][qi]);
  };

  const renderStep3 = () => Q('Data Capture & Field Operations', [
    { title: 'How is field or site data collected today?', helper: 'Digital collection produces verifiable, auditable records that regulators accept.', content: <SS options={[{ value: 'mobile', label: 'Mobile app (offline capable)' }, { value: 'paper', label: 'Paper forms' }, { value: 'whatsapp', label: 'WhatsApp / Excel' }, { value: 'none', label: 'Not collected consistently' }]} value={answers.dataCollection} onChange={v => ua('dataCollection', v)} tid="data-collection" /> },
    { title: min ? 'Can you trace each consignment back to a specific extraction site?' : 'Can you trace each bag or lot back to specific farms?', helper: min ? 'Chain-of-custody audits require consignment-level traceability to the point of extraction.' : 'Compliance audits commonly fail at the bag-to-farm step.', content: <SS options={[{ value: 'lot', label: `Yes — ${min ? 'consignment' : 'bag/lot'} level traceability` }, { value: 'batch', label: 'Partially — batch level only' }, { value: 'none', label: 'No' }]} value={answers.lotTraceability} onChange={v => ua('lotTraceability', v)} tid="lot-trace" /> },
    { title: min ? 'How do you handle consignments from multiple extraction sites?' : 'How do you handle batches from multiple farmers?', helper: 'Proper attribution prevents batch contamination and supports due diligence requirements.', content: <SS options={[{ value: 'recorded', label: `Recorded per ${min ? 'site' : 'farmer'}` }, { value: 'estimated', label: 'Estimated splits' }, { value: 'none', label: 'Not recorded' }]} value={answers.multiSourceBatch} onChange={v => ua('multiSourceBatch', v)} tid="multi-batch" /> },
  ][qi]);

  const renderStep4 = () => Q('Compliance & Audit Readiness', [
    { title: 'Do you maintain digital audit trails?', helper: 'EU, US, and OECD auditors require verifiable, tamper-proof records — not estimates.', content: <SS options={[{ value: 'immutable', label: 'Yes — immutable digital logs' }, { value: 'partial', label: 'Partial records' }, { value: 'none', label: 'No formal audit trail' }]} value={answers.auditTrail} onChange={v => ua('auditTrail', v)} tid="audit-trail" /> },
    { title: 'Can you generate a Due Diligence Statement today?', helper: 'EUDR, OECD DDG, FSMA 204, and GACC all require documentation available on demand.', content: <SS options={[{ value: 'yes', label: 'Yes — immediately, from our system' }, { value: 'manual', label: 'With manual assembly work' }, { value: 'none', label: 'No' }]} value={answers.complianceReport} onChange={v => ua('complianceReport', v)} tid="compliance-report" /> },
    { title: 'How confident are you in passing a compliance audit right now?', helper: 'Rate your overall readiness honestly — this calibrates your final score.', content: <ConfidenceScale value={answers.auditConfidence} onChange={v => ua('auditConfidence', v)} /> },
  ][qi]);

  /* ─── preview ─── */
  const renderPreview = () => (
    <motion.div key="preview" variants={sv} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
      <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: GREEN, marginBottom: 12 }}>Your Score Preview</p>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', marginBottom: 6 }} data-testid="text-risk-tier">
        Export Readiness: <span style={{ color: tier.color }}>{tier.label}</span>
      </h2>
      <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: 28, lineHeight: 1.6 }}>{tier.description}</p>
      <GaugeMeter score={score} animate />

      <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {gaps.slice(0, 3).map((g, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.825rem',
            padding: '10px 14px', borderRadius: 8,
            background: g.severity === 'critical' ? 'rgba(220,38,38,0.08)' : 'rgba(217,119,6,0.08)',
            color: g.severity === 'critical' ? '#dc2626' : '#d97706',
          }}>
            <g.icon size={14} style={{ flexShrink: 0 }} />{g.text}
          </div>
        ))}
        {gaps.length > 3 && (
          <p style={{ fontSize: '0.78rem', color: '#9ca3af', textAlign: 'center', filter: 'blur(3px)', userSelect: 'none', marginTop: 4 }}>
            + {gaps.length - 3} more compliance gaps identified
          </p>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, gap: 12 }}>
        <button type="button" style={btnGhost} onClick={() => setStep('step4')} data-testid="button-preview-back"><ArrowLeft size={16} />Back</button>
        <button type="button" style={btnPrimary} onClick={() => setStep('lead')} data-testid="button-get-report">
          Get Full Report &amp; Action Plan <ArrowRight size={16} />
        </button>
      </div>
    </motion.div>
  );

  /* ─── lead capture ─── */
  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: '1.5px solid rgba(0,0,0,0.14)', fontSize: '0.9rem',
    outline: 'none', color: '#111827',
    transition: 'border-color 0.15s',
  };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 6 };

  const renderLead = () => (
    <motion.div key="lead" variants={sv} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
      <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: GREEN, marginBottom: 12 }}>Almost There</p>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', marginBottom: 6 }} data-testid="text-lead-headline">Get Your Full Compliance Breakdown</h2>
      <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: 24 }}>Enter your details to unlock the full report and personalised action plan.</p>

      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr 1fr' }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Full Name *</label>
          <input style={fieldStyle} value={leadData.fullName} onChange={e => ul('fullName', e.target.value)} placeholder="Jane Doe" data-testid="input-lead-name" />
        </div>
        <div>
          <label style={labelStyle}>Company *</label>
          <input style={fieldStyle} value={leadData.company} onChange={e => ul('company', e.target.value)} placeholder="Acme Exports Ltd." data-testid="input-lead-company" />
        </div>
        <div>
          <label style={labelStyle}>Role</label>
          <input style={fieldStyle} value={leadData.role} onChange={e => ul('role', e.target.value)} placeholder="Head of Compliance" data-testid="input-lead-role" />
        </div>
        <div>
          <label style={labelStyle}>Work Email *</label>
          <input style={fieldStyle} type="email" value={leadData.email} onChange={e => ul('email', e.target.value)} placeholder="jane@acme.com" data-testid="input-lead-email" />
        </div>
        <div>
          <label style={labelStyle}>Phone *</label>
          <input style={fieldStyle} type="tel" value={leadData.phone} onChange={e => ul('phone', e.target.value)} placeholder="+234 801 234 5678" data-testid="input-lead-phone" />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Country of Operation</label>
          <input style={fieldStyle} value={leadData.country} onChange={e => ul('country', e.target.value)} placeholder="Nigeria" data-testid="input-lead-country" />
        </div>
        <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <Checkbox id="lw" checked={leadData.wantsWalkthrough} onCheckedChange={v => ul('wantsWalkthrough', v as boolean)} data-testid="checkbox-walkthrough" />
          <label htmlFor="lw" style={{ fontSize: '0.83rem', color: '#6b7280', cursor: 'pointer', lineHeight: 1.5 }}>
            I&apos;d like a free compliance walkthrough from the OriginTrace team
          </label>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, gap: 12 }}>
        <button type="button" style={btnGhost} onClick={() => setStep('preview')} data-testid="button-lead-back"><ArrowLeft size={16} />Back</button>
        <button type="button"
          style={{ ...btnPrimary, opacity: (!leadData.fullName || !leadData.email || !leadData.company || !leadData.phone || submitting) ? 0.4 : 1, cursor: (!leadData.fullName || !leadData.email || !leadData.company || !leadData.phone || submitting) ? 'not-allowed' : 'pointer' }}
          onClick={submitLead}
          disabled={!leadData.fullName || !leadData.email || !leadData.company || !leadData.phone || submitting}
          data-testid="button-send-report">
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Send My Report
        </button>
      </div>
    </motion.div>
  );

  /* ─── results ─── */
  const renderResults = () => (
    <motion.div key="results" variants={sv} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
      <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: GREEN, marginBottom: 12 }}>Your Report</p>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', marginBottom: 24 }} data-testid="text-results-headline">Your Compliance Action Plan</h2>

      <div style={{ marginBottom: 28 }}><GaugeMeter score={score} animate={false} /></div>

      <div style={{ padding: '14px 18px', borderRadius: 10, background: '#f9fafb', border: '1px solid rgba(0,0,0,0.07)', marginBottom: 20 }}>
        <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: 4 }}>Risk Summary</p>
        <p style={{ fontSize: '0.83rem', color: '#6b7280', lineHeight: 1.6 }}>{tier.description}</p>
      </div>

      {gaps.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={13} color="#f59e0b" />Gaps Blocking {min ? 'OECD / EU' : 'EU / US'} Compliance
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {gaps.map((g, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.82rem', padding: '9px 13px', borderRadius: 8, background: g.severity === 'critical' ? 'rgba(220,38,38,0.07)' : 'rgba(217,119,6,0.07)', color: g.severity === 'critical' ? '#dc2626' : '#d97706' }}>
                <g.icon size={13} style={{ flexShrink: 0 }} />{g.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {actions.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileText size={13} color={GREEN} />What You Need to Fix (Next 30–60 Days)
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {actions.map((a, i) => (
              <div key={i} style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.09)', background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
                    padding: '2px 7px', borderRadius: 99,
                    background: a.priority === 'urgent' ? 'rgba(220,38,38,0.1)' : a.priority === 'important' ? 'rgba(217,119,6,0.1)' : 'rgba(26,61,43,0.1)',
                    color: a.priority === 'urgent' ? '#dc2626' : a.priority === 'important' ? '#d97706' : GREEN,
                  }}>{a.priority}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>{a.title}</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.5 }}>{a.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: '16px 18px', borderRadius: 10, background: 'rgba(26,61,43,0.05)', border: `1px solid rgba(26,61,43,0.15)`, marginBottom: 24 }}>
        <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#111827', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Shield size={13} color={GREEN} />How OriginTrace Solves This
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            'GPS polygon mapping for farms and extraction site concessions',
            min ? 'Consignment-to-site chain-of-custody with OECD-aligned audit trail' : 'Bag-to-farm traceability with unique QR identifiers',
            'Immutable digital audit trail with one-click Due Diligence Statement export',
            min ? 'OECD DDG, LBMA, and RMI responsible sourcing alignment' : 'EUDR, FSMA 204, GACC, and CS3D compliance scoring',
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.83rem', color: '#374151' }}>
              <Check size={14} color={GREEN} style={{ flexShrink: 0, marginTop: 2 }} />{item}
            </div>
          ))}
        </div>
      </div>

      <a href="/demo" style={{ display: 'block', textDecoration: 'none' }}>
        <button type="button" style={{ ...btnPrimary, width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: '0.95rem' }} data-testid="button-book-walkthrough">
          Book a Compliance Walkthrough <ChevronRight size={16} />
        </button>
      </a>
    </motion.div>
  );

  return (
    <div data-testid="compliance-calculator" style={{ maxWidth: 560 }}>
      <AnimatePresence mode="wait">
        {step === 'intro' && renderIntro()}
        {step === 'step1' && renderStep1()}
        {step === 'step2' && renderStep2()}
        {step === 'step3' && renderStep3()}
        {step === 'step4' && renderStep4()}
        {step === 'preview' && renderPreview()}
        {step === 'lead' && renderLead()}
        {step === 'results' && renderResults()}
      </AnimatePresence>
    </div>
  );
}
