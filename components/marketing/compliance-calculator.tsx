'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
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
  if (score >= 70) return { label: 'Export Ready', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-500/15', description: 'Your supply chain has strong compliance foundations. A few refinements will bring you to full export readiness across all target markets.' };
  if (score >= 40) return { label: 'Needs Strengthening', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-500/15', description: 'You have some foundational elements, but critical gaps could block market access, trigger shipment rejections, or fail regulatory audits.' };
  return { label: 'High Risk', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-500/15', description: 'Significant compliance gaps exist. Without immediate action, shipment rejections and market access loss are likely across EU, US, and China markets.' };
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

function SS({ options, value, onChange, tid }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void; tid: string }) {
  return (
    <div className="grid gap-2">
      {options.map(o => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} data-testid={`${tid}-${o.value}`}
          className={`text-left px-4 py-3 rounded-md border text-sm transition-colors ${value === o.value ? 'border-primary bg-primary/5 font-medium' : 'border-border hover-elevate'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function MS({ options, values, onChange, tid }: { options: string[]; values: string[]; onChange: (v: string[]) => void; tid: string }) {
  const toggle = (x: string) => onChange(values.includes(x) ? values.filter(v => v !== x) : [...values, x]);
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map(o => (
        <button key={o} type="button" onClick={() => toggle(o)} data-testid={`${tid}-${o.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
          className={`text-left px-4 py-3 rounded-md border text-sm transition-colors flex items-center gap-2 ${values.includes(o) ? 'border-primary bg-primary/5 font-medium' : 'border-border hover-elevate'}`}>
          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${values.includes(o) ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
            {values.includes(o) && <Check className="h-3 w-3 text-primary-foreground" />}
          </div>
          {o}
        </button>
      ))}
    </div>
  );
}

function ConfidenceScale({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const labels = ['Not confident', 'Slightly confident', 'Somewhat confident', 'Fairly confident', 'Fully confident'];
  return (
    <div className="space-y-3">
      <div className="flex justify-between gap-2">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" onClick={() => onChange(n)} data-testid={`confidence-${n}`}
            className={`flex-1 py-3 rounded-md border text-sm font-medium transition-colors ${value === n ? 'border-primary bg-primary/10 text-primary' : 'border-border hover-elevate'}`}>{n}</button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground px-1"><span>Not confident</span><span>Fully confident</span></div>
      {value > 0 && <p className="text-sm text-center text-muted-foreground">{labels[value - 1]}</p>}
    </div>
  );
}

function GaugeMeter({ score, animate }: { score: number; animate: boolean }) {
  const tier = getRiskTier(score);
  const angle = (score / 100) * 180 - 90;
  const needle = (
    <>
      <polygon points="100,35 96,90 104,90" fill="rgb(51,65,85)" className="dark:fill-slate-200" />
      <circle cx="100" cy="95" r="7" fill="rgb(226,232,240)" className="dark:fill-slate-700" />
      <circle cx="100" cy="95" r="3.5" fill="rgb(51,65,85)" className="dark:fill-slate-200" />
    </>
  );
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-56 h-28">
        <svg viewBox="0 0 200 110" className="w-full h-full">
          <defs>
            <linearGradient id="cgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgb(239,68,68)" /><stop offset="50%" stopColor="rgb(251,191,36)" /><stop offset="100%" stopColor="rgb(52,211,153)" />
            </linearGradient>
          </defs>
          <path d="M 20 95 A 80 80 0 0 1 180 95" fill="none" stroke="rgb(226,232,240)" strokeWidth="14" strokeLinecap="round" className="dark:stroke-slate-700" />
          <path d="M 20 95 A 80 80 0 0 1 180 95" fill="none" stroke="url(#cgGrad)" strokeWidth="14" strokeLinecap="round" />
          <text x="20" y="108" fontSize="9" fill="currentColor" textAnchor="middle">0</text>
          <text x="100" y="20" fontSize="9" fill="currentColor" textAnchor="middle">50</text>
          <text x="180" y="108" fontSize="9" fill="currentColor" textAnchor="middle">100</text>
          {animate
            ? <motion.g initial={{ rotate: -90 }} animate={{ rotate: angle }} transition={{ duration: 1.5, ease: [0.25, 0.4, 0.25, 1], delay: 0.3 }} style={{ transformOrigin: '100px 95px' }}>{needle}</motion.g>
            : <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '100px 95px' }}>{needle}</g>}
        </svg>
      </div>
      <div className="text-center -mt-2">
        <motion.span initial={animate ? { opacity: 0, scale: 0.5 } : false} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.2, duration: 0.4 }} className={`text-4xl font-bold ${tier.color}`}>{score}</motion.span>
        <span className="text-lg text-muted-foreground">/100</span>
      </div>
      <motion.div initial={animate ? { opacity: 0, y: 10 } : false} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5, duration: 0.4 }} className={`mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${tier.bgColor} ${tier.color}`}>
        <Shield className="h-4 w-4" />{tier.label}
      </motion.div>
    </div>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = (current / total) * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground"><span>Question {current} of {total}</span><span>{Math.round(pct)}%</span></div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div className="h-full bg-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.3 }} />
      </div>
    </div>
  );
}

export function ComplianceCalculator() {
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

  const sv = { enter: { x: 30, opacity: 0 }, center: { x: 0, opacity: 1 }, exit: { x: -30, opacity: 0 } };
  const mk = `${step}-${qi}`;

  const Q = (section: string, q: { title: string; helper: string; content: React.ReactNode }) => (
    <motion.div key={mk} variants={sv} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
      <ProgressBar current={qn()} total={12} />
      <div className="mt-1 mb-6"><p className="text-xs font-medium text-primary uppercase tracking-wide">{section}</p></div>
      <h3 className="text-lg font-semibold mb-2" data-testid="text-question-title">{q.title}</h3>
      <p className="text-sm text-muted-foreground mb-5">{q.helper}</p>
      {q.content}
      <div className="flex justify-between mt-6 gap-3">
        <Button variant="outline" onClick={prev} className="gap-1" data-testid="button-prev"><ArrowLeft className="h-4 w-4" />Back</Button>
        <Button onClick={next} disabled={!canProceed()} className="gap-1" data-testid="button-next">{step === 'step4' && qi === 2 ? 'See Results' : 'Next'}<ArrowRight className="h-4 w-4" /></Button>
      </div>
    </motion.div>
  );

  const renderIntro = () => (
    <motion.div key="intro" variants={sv} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="text-center py-8">
      <div className="h-16 w-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center"><Shield className="h-8 w-8 text-primary" /></div>
      <h2 className="text-2xl md:text-3xl font-semibold mb-3" data-testid="text-calc-headline">Check Your Export Readiness in 3 Minutes</h2>
      <p className="text-muted-foreground mb-4 max-w-md mx-auto">Answer 12 questions about your supply chain — agricultural or mineral — and get an instant compliance risk score against EU, US, and China requirements.</p>
      <p className="text-xs text-muted-foreground mb-8">No sales spam. Results are confidential.</p>
      <Button size="lg" onClick={() => { setStep('step1'); setQi(0); }} className="gap-2" data-testid="button-start-assessment">Start Assessment <ArrowRight className="h-4 w-4" /></Button>
    </motion.div>
  );

  const renderStep1 = () => Q('Supply Chain Profile', [
    { title: 'What best describes your role in the supply chain?', helper: 'This helps us tailor compliance requirements to your position.', content: <SS options={ROLES.map(r => ({ value: r.toLowerCase().replace(/[^a-z]/g, '_'), label: r }))} value={answers.role} onChange={v => ua('role', v)} tid="role" /> },
    { title: 'What commodities do you handle or export?', helper: 'Select all that apply. Compliance requirements vary significantly by commodity type.', content: <div className="space-y-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Agricultural</p><MS options={AGRI_COMMODITIES} values={answers.commodities} onChange={v => ua('commodities', v)} tid="commodity" /></div><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Minerals</p><MS options={MINERAL_COMMODITIES} values={answers.commodities} onChange={v => ua('commodities', v)} tid="commodity" /></div></div> },
    { title: 'Which countries does your supply originate from?', helper: 'Risk benchmarks and regulatory requirements differ by origin country.', content: <MS options={COUNTRIES} values={answers.countries} onChange={v => ua('countries', v)} tid="country" /> },
  ][qi]);

  const renderStep2 = () => {
    const src = min ? 'extraction sites' : 'farms';
    return Q(min ? 'Extraction Site & Origin Data' : 'Farm & Origin Data', [
      { title: min ? 'Do you know exactly which extraction sites your minerals come from?' : 'Do you know exactly which farms your commodities come from?', helper: `Regulatory standards require traceability to the ${src} level, not just warehouses or aggregation points.`, content: <SS options={[{ value: 'every', label: `Yes — every ${min ? 'site' : 'farm'}` }, { value: 'some', label: `Partially — some ${src}` }, { value: 'none', label: 'No — only aggregation points' }]} value={answers.sourceKnowledge} onChange={v => ua('sourceKnowledge', v)} tid="source-knowledge" /> },
      { title: min ? 'Do you collect GPS boundaries for extraction sites or mining concessions?' : 'Do you collect GPS boundary polygons for farms?', helper: min ? 'OECD DDG and LBMA require documented site boundaries, not just a GPS point.' : 'GPS coordinates alone are insufficient for most regulations. Polygons are required.', content: <SS options={[{ value: 'polygons', label: 'Yes — GPS boundary polygons' }, { value: 'points', label: 'Only GPS points / coordinates' }, { value: 'none', label: 'No geolocation data' }]} value={answers.gpsPolygons} onChange={v => ua('gpsPolygons', v)} tid="gps" /> },
      { title: min ? 'Do your extraction sites hold valid concession licences?' : 'When were most of your source farms established?', helper: min ? 'OECD and LBMA require all sourcing to originate from licenced, legal operations.' : 'Regulations prohibit sourcing from land deforested after specific regulatory cut-off dates.', content: <SS options={min ? [{ value: 'compliant', label: 'Yes — all sites fully licenced' }, { value: 'partial', label: 'Partially — some sites unverified' }, { value: 'none', label: 'No — unlicensed or unknown' }] : [{ value: 'compliant', label: 'Before 2020 — all farms verified' }, { value: 'partial', label: 'Mixed — some farms after 2020 or unknown' }, { value: 'none', label: 'After 2020 or unknown' }]} value={answers.siteCompliance} onChange={v => ua('siteCompliance', v)} tid="site-compliance" /> },
    ][qi]);
  };

  const renderStep3 = () => Q('Data Capture & Field Operations', [
    { title: 'How is field or site data collected today?', helper: 'Digital collection produces verifiable, auditable records that regulators accept.', content: <SS options={[{ value: 'mobile', label: 'Mobile app (offline capable)' }, { value: 'paper', label: 'Paper forms' }, { value: 'whatsapp', label: 'WhatsApp / Excel' }, { value: 'none', label: 'Not collected consistently' }]} value={answers.dataCollection} onChange={v => ua('dataCollection', v)} tid="data-collection" /> },
    { title: min ? 'Can you trace each consignment back to a specific extraction site?' : 'Can you trace each bag or lot back to specific farms?', helper: min ? 'Chain-of-custody audits require consignment-level traceability to the point of extraction.' : 'Compliance audits commonly fail at the bag-to-farm step.', content: <SS options={[{ value: 'lot', label: `Yes — ${min ? 'consignment' : 'bag/lot'} level traceability` }, { value: 'batch', label: 'Partially — batch level only' }, { value: 'none', label: 'No' }]} value={answers.lotTraceability} onChange={v => ua('lotTraceability', v)} tid="lot-trace" /> },
    { title: min ? 'How do you handle consignments from multiple extraction sites?' : 'How do you handle batches aggregated from multiple farmers?', helper: 'Proper attribution prevents batch contamination and supports due diligence requirements.', content: <SS options={[{ value: 'recorded', label: `Recorded per ${min ? 'site' : 'farmer'}` }, { value: 'estimated', label: 'Estimated splits' }, { value: 'none', label: 'Not recorded' }]} value={answers.multiSourceBatch} onChange={v => ua('multiSourceBatch', v)} tid="multi-batch" /> },
  ][qi]);

  const renderStep4 = () => Q('Compliance & Audit Readiness', [
    { title: 'Do you maintain digital audit trails for your supply chain?', helper: 'EU, US, and OECD auditors require verifiable, tamper-proof records — not estimates.', content: <SS options={[{ value: 'immutable', label: 'Yes — immutable digital logs' }, { value: 'partial', label: 'Partial records' }, { value: 'none', label: 'No formal audit trail' }]} value={answers.auditTrail} onChange={v => ua('auditTrail', v)} tid="audit-trail" /> },
    { title: 'Can you generate a compliance-ready Due Diligence Statement today?', helper: 'EUDR, OECD DDG, FSMA 204, and GACC all require documentation available on demand.', content: <SS options={[{ value: 'yes', label: 'Yes — immediately, from our system' }, { value: 'manual', label: 'With manual assembly work' }, { value: 'none', label: 'No' }]} value={answers.complianceReport} onChange={v => ua('complianceReport', v)} tid="compliance-report" /> },
    { title: 'How confident are you in passing a compliance audit right now?', helper: 'Rate your overall readiness honestly — this calibrates your final score.', content: <ConfidenceScale value={answers.auditConfidence} onChange={v => ua('auditConfidence', v)} /> },
  ][qi]);

  const renderPreview = () => (
    <motion.div key="preview" variants={sv} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="text-center">
      <h2 className={`text-xl font-semibold mb-2 ${tier.color}`} data-testid="text-risk-tier">Export Readiness: {tier.label}</h2>
      <p className="text-sm text-muted-foreground mb-6">{tier.description}</p>
      <GaugeMeter score={score} animate />
      <div className="mt-8 space-y-2 text-left max-w-sm mx-auto">
        {gaps.slice(0, 3).map((g, i) => (
          <div key={i} className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md ${g.severity === 'critical' ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
            <g.icon className="h-4 w-4 shrink-0" />{g.text}
          </div>
        ))}
        {gaps.length > 3 && <p className="text-xs text-muted-foreground mt-2 filter blur-sm select-none text-center">+ {gaps.length - 3} more compliance gaps identified</p>}
      </div>
      <div className="mt-8"><Button size="lg" onClick={() => setStep('lead')} className="gap-2" data-testid="button-get-report">Get Full Report &amp; Action Plan <ArrowRight className="h-4 w-4" /></Button></div>
    </motion.div>
  );

  const renderLead = () => (
    <motion.div key="lead" variants={sv} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
      <h2 className="text-xl font-semibold mb-1" data-testid="text-lead-headline">Get Your Full Compliance Breakdown</h2>
      <p className="text-sm text-muted-foreground mb-6">Enter your details to receive your personalized action plan.</p>
      <div className="space-y-4">
        <div><Label htmlFor="ln" className="text-sm">Full Name *</Label><Input id="ln" value={leadData.fullName} onChange={e => ul('fullName', e.target.value)} placeholder="Jane Doe" data-testid="input-lead-name" /></div>
        <div><Label htmlFor="lc" className="text-sm">Company Name *</Label><Input id="lc" value={leadData.company} onChange={e => ul('company', e.target.value)} placeholder="Acme Exports Ltd." data-testid="input-lead-company" /></div>
        <div><Label htmlFor="lr" className="text-sm">Role</Label><Input id="lr" value={leadData.role} onChange={e => ul('role', e.target.value)} placeholder="Head of Compliance" data-testid="input-lead-role" /></div>
        <div><Label htmlFor="le" className="text-sm">Work Email *</Label><Input id="le" type="email" value={leadData.email} onChange={e => ul('email', e.target.value)} placeholder="jane@acme-exports.com" data-testid="input-lead-email" /></div>
        <div><Label htmlFor="lp" className="text-sm">Phone Number *</Label><Input id="lp" type="tel" value={leadData.phone} onChange={e => ul('phone', e.target.value)} placeholder="+234..." data-testid="input-lead-phone" /></div>
        <div><Label htmlFor="lco" className="text-sm">Country of Operation</Label><Input id="lco" value={leadData.country} onChange={e => ul('country', e.target.value)} placeholder="Nigeria" data-testid="input-lead-country" /></div>
        <div className="flex items-center gap-2">
          <Checkbox id="lw" checked={leadData.wantsWalkthrough} onCheckedChange={v => ul('wantsWalkthrough', v as boolean)} data-testid="checkbox-walkthrough" />
          <Label htmlFor="lw" className="text-sm font-normal cursor-pointer">I&apos;d like a free compliance walkthrough from the OriginTrace team</Label>
        </div>
      </div>
      <div className="flex justify-between mt-6 gap-3">
        <Button variant="outline" onClick={() => setStep('preview')} className="gap-1" data-testid="button-lead-back"><ArrowLeft className="h-4 w-4" />Back</Button>
        <Button onClick={submitLead} disabled={!leadData.fullName || !leadData.email || !leadData.company || !leadData.phone || submitting} className="gap-2" data-testid="button-send-report">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Send My Report
        </Button>
      </div>
    </motion.div>
  );

  const renderResults = () => (
    <motion.div key="results" variants={sv} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
      <h2 className="text-xl font-semibold mb-6" data-testid="text-results-headline">Your Compliance Action Plan</h2>
      <div className="mb-6"><GaugeMeter score={score} animate={false} /></div>
      <div className="mb-6 p-4 rounded-md bg-muted/50"><h3 className="text-sm font-semibold mb-1">Risk Summary</h3><p className="text-sm text-muted-foreground">{tier.description}</p></div>
      {gaps.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" />Gaps Blocking {min ? 'OECD / EU' : 'EU / US'} Compliance</h3>
          <div className="space-y-2">{gaps.map((g, i) => <div key={i} className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md ${g.severity === 'critical' ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}><g.icon className="h-4 w-4 shrink-0" />{g.text}</div>)}</div>
        </div>
      )}
      {actions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />What You Need to Fix (Next 30–60 Days)</h3>
          <div className="space-y-3">{actions.map((a, i) => (
            <div key={i} className="p-3 rounded-md border">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${a.priority === 'urgent' ? 'bg-red-500/15 text-red-600 dark:text-red-400' : a.priority === 'important' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-primary/10 text-primary'}`}>{a.priority}</span>
                <span className="text-sm font-medium">{a.title}</span>
              </div>
              <p className="text-xs text-muted-foreground">{a.description}</p>
            </div>
          ))}</div>
        </div>
      )}
      <div className="p-4 rounded-md bg-primary/5 border border-primary/20 mb-6">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Shield className="h-4 w-4 text-primary" />How OriginTrace Solves This</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />GPS polygon mapping for farms and extraction site concessions</li>
          <li className="flex items-start gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />{min ? 'Consignment-to-site chain-of-custody with OECD-aligned audit trail' : 'Bag-to-farm traceability with unique QR identifiers'}</li>
          <li className="flex items-start gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />Immutable digital audit trail with one-click Due Diligence Statement export</li>
          <li className="flex items-start gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />{min ? 'OECD DDG, LBMA, and RMI responsible sourcing alignment' : 'EUDR, FSMA 204, GACC, and CS3D compliance scoring'}</li>
        </ul>
      </div>
      <a href="/demo"><Button className="w-full gap-2" data-testid="button-book-walkthrough">Book a Compliance Walkthrough <ChevronRight className="h-4 w-4" /></Button></a>
    </motion.div>
  );

  return (
    <Card className="shadow-lg max-w-xl mx-auto overflow-visible" data-testid="compliance-calculator">
      <CardContent className="p-6 md:p-8">
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
      </CardContent>
    </Card>
  );
}
