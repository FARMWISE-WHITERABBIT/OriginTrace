'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Check,
  Shield,
  Send,
  Loader2,
  FileText,
  MapPin,
  Package,
  Clock,
  X,
  ChevronRight
} from 'lucide-react';

type Step = 'intro' | 'step1' | 'step2' | 'step3' | 'step4' | 'preview' | 'lead' | 'results';

interface Answers {
  role: string;
  commodities: string[];
  countries: string[];
  farmKnowledge: string;
  gpsPolygons: string;
  farmEstablished: string;
  dataCollection: string;
  bagTraceability: string;
  multiFarmerBatch: string;
  auditTrail: string;
  eudrReport: string;
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
  'Other'
];

const COMMODITIES = ['Cocoa', 'Coffee', 'Palm Oil', 'Soy', 'Rubber', 'Timber', 'Other'];

const COUNTRIES = ['Nigeria', 'Ghana', "C\u00f4te d'Ivoire", 'Cameroon', 'Brazil', 'Indonesia', 'Other'];

const INITIAL_ANSWERS: Answers = {
  role: '',
  commodities: [],
  countries: [],
  farmKnowledge: '',
  gpsPolygons: '',
  farmEstablished: '',
  dataCollection: '',
  bagTraceability: '',
  multiFarmerBatch: '',
  auditTrail: '',
  eudrReport: '',
  auditConfidence: 3
};

const INITIAL_LEAD: LeadData = {
  fullName: '',
  company: '',
  role: '',
  email: '',
  phone: '',
  country: '',
  wantsWalkthrough: false
};

function calculateScore(answers: Answers): number {
  let score = 0;
  let maxScore = 0;

  const farmKnowledgeScores: Record<string, number> = { 'every': 15, 'some': 7, 'none': 0 };
  score += farmKnowledgeScores[answers.farmKnowledge] || 0;
  maxScore += 15;

  const polygonScores: Record<string, number> = { 'polygons': 20, 'points': 8, 'none': 0 };
  score += polygonScores[answers.gpsPolygons] || 0;
  maxScore += 20;

  const establishedScores: Record<string, number> = { 'before': 10, 'after': 0, 'mixed': 4 };
  score += establishedScores[answers.farmEstablished] || 0;
  maxScore += 10;

  const dataScores: Record<string, number> = { 'mobile': 10, 'paper': 5, 'whatsapp': 3, 'none': 0 };
  score += dataScores[answers.dataCollection] || 0;
  maxScore += 10;

  const bagScores: Record<string, number> = { 'bag': 15, 'batch': 7, 'none': 0 };
  score += bagScores[answers.bagTraceability] || 0;
  maxScore += 15;

  const batchScores: Record<string, number> = { 'recorded': 8, 'estimated': 3, 'none': 0 };
  score += batchScores[answers.multiFarmerBatch] || 0;
  maxScore += 8;

  const auditScores: Record<string, number> = { 'immutable': 12, 'partial': 5, 'none': 0 };
  score += auditScores[answers.auditTrail] || 0;
  maxScore += 12;

  const reportScores: Record<string, number> = { 'yes': 5, 'manual': 2, 'none': 0 };
  score += reportScores[answers.eudrReport] || 0;
  maxScore += 5;

  const confidenceScore = ((answers.auditConfidence - 1) / 4) * 5;
  score += confidenceScore;
  maxScore += 5;

  return Math.round((score / maxScore) * 100);
}

function getRiskTier(score: number): { label: string; color: string; bgColor: string; description: string } {
  if (score >= 70) return {
    label: 'Low Risk',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/15',
    description: 'Your supply chain has strong compliance foundations. A few refinements could bring you to full export readiness.'
  };
  if (score >= 40) return {
    label: 'Medium Risk',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/15',
    description: 'You have some foundational elements, but critical gaps could block market access and trigger shipment rejections.'
  };
  return {
    label: 'High Risk',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-500/15',
    description: 'Significant compliance gaps exist. Without immediate action, shipment rejections and market access loss are likely.'
  };
}

function getGaps(answers: Answers) {
  const gaps: { icon: typeof X | typeof AlertTriangle; severity: 'critical' | 'warning'; text: string }[] = [];

  if (answers.gpsPolygons !== 'polygons') {
    gaps.push({ icon: X, severity: 'critical', text: 'Missing GPS farm polygons' });
  }
  if (answers.farmKnowledge !== 'every') {
    gaps.push({ icon: X, severity: 'critical', text: 'Incomplete farm-level traceability' });
  }
  if (answers.bagTraceability !== 'bag') {
    gaps.push({ icon: answers.bagTraceability === 'batch' ? AlertTriangle : X, severity: answers.bagTraceability === 'batch' ? 'warning' : 'critical', text: 'Incomplete bag-to-farm traceability' });
  }
  if (answers.auditTrail !== 'immutable') {
    gaps.push({ icon: answers.auditTrail === 'partial' ? AlertTriangle : X, severity: answers.auditTrail === 'partial' ? 'warning' : 'critical', text: 'No verifiable digital audit trail' });
  }
  if (answers.farmEstablished !== 'before') {
    gaps.push({ icon: AlertTriangle, severity: 'warning', text: 'Deforestation risk: farms established after 2020 or unknown' });
  }
  if (answers.multiFarmerBatch !== 'recorded') {
    gaps.push({ icon: AlertTriangle, severity: 'warning', text: 'Multi-farmer batch attribution gaps' });
  }
  if (answers.dataCollection !== 'mobile') {
    gaps.push({ icon: AlertTriangle, severity: 'warning', text: 'Non-digital field data collection' });
  }
  if (answers.eudrReport !== 'yes') {
    gaps.push({ icon: AlertTriangle, severity: 'warning', text: 'Cannot generate compliance-ready export reports on demand' });
  }
  return gaps;
}

function getActionItems(answers: Answers) {
  const actions: { priority: 'urgent' | 'important' | 'recommended'; title: string; description: string }[] = [];

  if (answers.gpsPolygons !== 'polygons') {
    actions.push({
      priority: 'urgent',
      title: 'Implement GPS Polygon Mapping',
      description: 'EU regulators require farm boundary polygons, not just GPS points. Deploy field agents with GPS-enabled devices to walk and record farm perimeters.'
    });
  }
  if (answers.farmKnowledge !== 'every') {
    actions.push({
      priority: 'urgent',
      title: 'Establish Farm-Level Traceability',
      description: 'Register every source farm with verifiable identity. Export regulations mandate traceability to the plot level, not just aggregation points.'
    });
  }
  if (answers.bagTraceability !== 'bag') {
    actions.push({
      priority: 'urgent',
      title: 'Enable Bag-to-Farm Tracking',
      description: 'Assign unique identifiers to every bag or lot and link them to specific farms and farmers. Batch-level tracing is insufficient for regulatory audits.'
    });
  }
  if (answers.auditTrail !== 'immutable') {
    actions.push({
      priority: 'important',
      title: 'Digitize Audit Trails',
      description: 'Replace paper records with immutable digital logs. EU auditors require verifiable evidence, not estimates.'
    });
  }
  if (answers.farmEstablished !== 'before') {
    actions.push({
      priority: 'important',
      title: 'Verify Deforestation Compliance',
      description: 'Confirm all source farms were established before regulatory cut-off dates. Sourcing from recently deforested land triggers compliance failures.'
    });
  }
  if (answers.dataCollection !== 'mobile') {
    actions.push({
      priority: 'recommended',
      title: 'Upgrade Field Data Collection',
      description: 'Transition from paper forms or messaging apps to a mobile-first, offline-capable data collection system for consistent, verifiable data.'
    });
  }
  return actions;
}

function SingleSelect({ options, value, onChange, testIdPrefix }: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  testIdPrefix: string;
}) {
  return (
    <div className="grid gap-2">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`text-left px-4 py-3 rounded-md border text-sm transition-colors ${
            value === opt.value
              ? 'border-primary bg-primary/5 font-medium'
              : 'border-border hover-elevate'
          }`}
          data-testid={`${testIdPrefix}-${opt.value}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function MultiSelect({ options, values, onChange, testIdPrefix }: {
  options: string[];
  values: string[];
  onChange: (v: string[]) => void;
  testIdPrefix: string;
}) {
  const toggle = (item: string) => {
    onChange(values.includes(item) ? values.filter(v => v !== item) : [...values, item]);
  };
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={`text-left px-4 py-3 rounded-md border text-sm transition-colors flex items-center gap-2 ${
            values.includes(opt)
              ? 'border-primary bg-primary/5 font-medium'
              : 'border-border hover-elevate'
          }`}
          data-testid={`${testIdPrefix}-${opt.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
        >
          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
            values.includes(opt) ? 'bg-primary border-primary' : 'border-muted-foreground/40'
          }`}>
            {values.includes(opt) && <Check className="h-3 w-3 text-primary-foreground" />}
          </div>
          {opt}
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
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 py-3 rounded-md border text-sm font-medium transition-colors ${
              value === n
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border hover-elevate'
            }`}
            data-testid={`confidence-${n}`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground px-1">
        <span>Not confident</span>
        <span>Fully confident</span>
      </div>
      {value > 0 && (
        <p className="text-sm text-center text-muted-foreground">{labels[value - 1]}</p>
      )}
    </div>
  );
}

function GaugeMeter({ score, animate }: { score: number; animate: boolean }) {
  const tier = getRiskTier(score);
  const needleAngle = (score / 100) * 180 - 90;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-56 h-28">
        <svg viewBox="0 0 200 110" className="w-full h-full">
          <defs>
            <linearGradient id="complianceGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgb(239, 68, 68)" />
              <stop offset="50%" stopColor="rgb(251, 191, 36)" />
              <stop offset="100%" stopColor="rgb(52, 211, 153)" />
            </linearGradient>
          </defs>
          <path
            d="M 20 95 A 80 80 0 0 1 180 95"
            fill="none"
            stroke="rgb(226, 232, 240)"
            strokeWidth="14"
            strokeLinecap="round"
            className="dark:stroke-slate-700"
          />
          <path
            d="M 20 95 A 80 80 0 0 1 180 95"
            fill="none"
            stroke="url(#complianceGaugeGrad)"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <text x="20" y="108" fontSize="9" fill="currentColor" className="text-muted-foreground" textAnchor="middle">0</text>
          <text x="100" y="20" fontSize="9" fill="currentColor" className="text-muted-foreground" textAnchor="middle">50</text>
          <text x="180" y="108" fontSize="9" fill="currentColor" className="text-muted-foreground" textAnchor="middle">100</text>
          {animate ? (
            <motion.g
              initial={{ rotate: -90 }}
              animate={{ rotate: needleAngle }}
              transition={{ duration: 1.5, ease: [0.25, 0.4, 0.25, 1], delay: 0.3 }}
              style={{ transformOrigin: '100px 95px' }}
            >
              <polygon
                points="100,35 96,90 104,90"
                fill="rgb(51, 65, 85)"
                className="dark:fill-slate-200"
              />
              <circle cx="100" cy="95" r="7" fill="rgb(226, 232, 240)" className="dark:fill-slate-700" />
              <circle cx="100" cy="95" r="3.5" fill="rgb(51, 65, 85)" className="dark:fill-slate-200" />
            </motion.g>
          ) : (
            <g style={{ transform: `rotate(${needleAngle}deg)`, transformOrigin: '100px 95px' }}>
              <polygon
                points="100,35 96,90 104,90"
                fill="rgb(51, 65, 85)"
                className="dark:fill-slate-200"
              />
              <circle cx="100" cy="95" r="7" fill="rgb(226, 232, 240)" className="dark:fill-slate-700" />
              <circle cx="100" cy="95" r="3.5" fill="rgb(51, 65, 85)" className="dark:fill-slate-200" />
            </g>
          )}
        </svg>
      </div>
      <div className="text-center -mt-2">
        <motion.span
          initial={animate ? { opacity: 0, scale: 0.5 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2, duration: 0.4 }}
          className={`text-4xl font-bold ${tier.color}`}
        >
          {score}
        </motion.span>
        <span className="text-lg text-muted-foreground">/100</span>
      </div>
      <motion.div
        initial={animate ? { opacity: 0, y: 10 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.4 }}
        className={`mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${tier.bgColor} ${tier.color}`}
      >
        <Shield className="h-4 w-4" />
        {tier.label}
      </motion.div>
    </div>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = (current / total) * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Question {current} of {total}</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
}

export function ComplianceCalculator() {
  const [step, setStep] = useState<Step>('intro');
  const [answers, setAnswers] = useState<Answers>(INITIAL_ANSWERS);
  const [leadData, setLeadData] = useState<LeadData>(INITIAL_LEAD);
  const [submittingLead, setSubmittingLead] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);

  const score = useMemo(() => calculateScore(answers), [answers]);
  const tier = useMemo(() => getRiskTier(score), [score]);
  const gaps = useMemo(() => getGaps(answers), [answers]);
  const actions = useMemo(() => getActionItems(answers), [answers]);

  const updateAnswer = useCallback(<K extends keyof Answers>(key: K, value: Answers[K]) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateLead = useCallback(<K extends keyof LeadData>(key: K, value: LeadData[K]) => {
    setLeadData(prev => ({ ...prev, [key]: value }));
  }, []);

  const getQuestionNumber = () => {
    if (step === 'step1') return questionIndex + 1;
    if (step === 'step2') return questionIndex + 4;
    if (step === 'step3') return questionIndex + 7;
    if (step === 'step4') return questionIndex + 10;
    return 0;
  };

  const canProceed = () => {
    if (step === 'step1') {
      if (questionIndex === 0) return answers.role !== '';
      if (questionIndex === 1) return answers.commodities.length > 0;
      if (questionIndex === 2) return answers.countries.length > 0;
    }
    if (step === 'step2') {
      if (questionIndex === 0) return answers.farmKnowledge !== '';
      if (questionIndex === 1) return answers.gpsPolygons !== '';
      if (questionIndex === 2) return answers.farmEstablished !== '';
    }
    if (step === 'step3') {
      if (questionIndex === 0) return answers.dataCollection !== '';
      if (questionIndex === 1) return answers.bagTraceability !== '';
      if (questionIndex === 2) return answers.multiFarmerBatch !== '';
    }
    if (step === 'step4') {
      if (questionIndex === 0) return answers.auditTrail !== '';
      if (questionIndex === 1) return answers.eudrReport !== '';
      if (questionIndex === 2) return true;
    }
    return true;
  };

  const nextQuestion = () => {
    const stepsOrder: Step[] = ['step1', 'step2', 'step3', 'step4'];
    const currentStepIdx = stepsOrder.indexOf(step);

    if (questionIndex < 2) {
      setQuestionIndex(qi => qi + 1);
    } else if (currentStepIdx < stepsOrder.length - 1) {
      setStep(stepsOrder[currentStepIdx + 1]);
      setQuestionIndex(0);
    } else {
      setStep('preview');
    }
  };

  const prevQuestion = () => {
    const stepsOrder: Step[] = ['step1', 'step2', 'step3', 'step4'];
    const currentStepIdx = stepsOrder.indexOf(step);

    if (questionIndex > 0) {
      setQuestionIndex(qi => qi - 1);
    } else if (currentStepIdx > 0) {
      setStep(stepsOrder[currentStepIdx - 1]);
      setQuestionIndex(2);
    } else {
      setStep('intro');
    }
  };

  const handleLeadSubmit = async () => {
    if (!leadData.fullName || !leadData.email || !leadData.company || !leadData.phone) return;
    setSubmittingLead(true);
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: leadData.fullName,
          email: leadData.email,
          company: leadData.company,
          phone: leadData.phone,
          role: leadData.role,
          message: `Risk score: ${score}/100 | Tier: ${tier?.label || 'Unknown'} | Country: ${leadData.country} | Gaps: ${gaps.map(g => g.text).join(', ')}`,
          source: 'calculator',
        }),
      });
    } catch {
      // fail silently — still show results
    } finally {
      setSubmittingLead(false);
      setStep('results');
    }
  };

  const slideVariants = {
    enter: { x: 30, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -30, opacity: 0 }
  };

  const renderIntro = () => (
    <motion.div
      key="intro"
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3 }}
      className="text-center py-8"
    >
      <div className="h-16 w-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Shield className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-2xl md:text-3xl font-semibold mb-3" data-testid="text-calc-headline">
        Check Your Export Readiness in 3 Minutes
      </h2>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Answer a few questions about your supply chain and get an instant compliance risk assessment.
      </p>
      <p className="text-xs text-muted-foreground mb-8">
        No sales spam. Results are confidential.
      </p>
      <Button size="lg" onClick={() => { setStep('step1'); setQuestionIndex(0); }} className="gap-2" data-testid="button-start-assessment">
        Start Assessment
        <ArrowRight className="h-4 w-4" />
      </Button>
    </motion.div>
  );

  const renderStep1 = () => {
    const questions = [
      {
        title: 'What best describes your role?',
        helper: 'This helps us tailor compliance requirements to your position in the chain.',
        content: (
          <SingleSelect
            options={ROLES.map(r => ({ value: r.toLowerCase().replace(/[^a-z]/g, '_'), label: r }))}
            value={answers.role}
            onChange={v => updateAnswer('role', v)}
            testIdPrefix="role"
          />
        )
      },
      {
        title: 'What commodities do you handle?',
        helper: 'Compliance requirements vary by commodity type.',
        content: (
          <MultiSelect
            options={COMMODITIES}
            values={answers.commodities}
            onChange={v => updateAnswer('commodities', v)}
            testIdPrefix="commodity"
          />
        )
      },
      {
        title: 'Countries of origin of your supply?',
        helper: 'Risk benchmarks differ by origin country.',
        content: (
          <MultiSelect
            options={COUNTRIES}
            values={answers.countries}
            onChange={v => updateAnswer('countries', v)}
            testIdPrefix="country"
          />
        )
      }
    ];
    return renderQuestion('Supply Chain Profile', questions[questionIndex]);
  };

  const renderStep2 = () => {
    const questions = [
      {
        title: 'Do you know exactly which farms your commodities come from?',
        helper: 'Regulatory standards require traceability to the farm level, not just the community or warehouse.',
        content: (
          <SingleSelect
            options={[
              { value: 'every', label: 'Yes \u2014 every farm' },
              { value: 'some', label: 'Partially \u2014 some farms' },
              { value: 'none', label: 'No \u2014 only aggregation points' }
            ]}
            value={answers.farmKnowledge}
            onChange={v => updateAnswer('farmKnowledge', v)}
            testIdPrefix="farm-knowledge"
          />
        )
      },
      {
        title: 'Do you collect GPS boundaries (polygons) for farms?',
        helper: 'Coordinates alone are insufficient for most regulations. Polygons are required.',
        content: (
          <SingleSelect
            options={[
              { value: 'polygons', label: 'Yes \u2014 GPS polygons' },
              { value: 'points', label: 'Only GPS points' },
              { value: 'none', label: 'No geolocation data' }
            ]}
            value={answers.gpsPolygons}
            onChange={v => updateAnswer('gpsPolygons', v)}
            testIdPrefix="gps"
          />
        )
      },
      {
        title: 'When were most of these farms established?',
        helper: 'Regulations prohibit sourcing from land deforested after specific cut-off dates.',
        content: (
          <SingleSelect
            options={[
              { value: 'before', label: 'Before 2020' },
              { value: 'after', label: 'After 2020' },
              { value: 'mixed', label: 'Mixed / Unknown' }
            ]}
            value={answers.farmEstablished}
            onChange={v => updateAnswer('farmEstablished', v)}
            testIdPrefix="established"
          />
        )
      }
    ];
    return renderQuestion('Farm & Origin Data', questions[questionIndex]);
  };

  const renderStep3 = () => {
    const questions = [
      {
        title: 'How is field data collected today?',
        helper: 'Digital collection enables verifiable, auditable records.',
        content: (
          <SingleSelect
            options={[
              { value: 'mobile', label: 'Mobile app (offline capable)' },
              { value: 'paper', label: 'Paper forms' },
              { value: 'whatsapp', label: 'WhatsApp / Excel' },
              { value: 'none', label: 'Not collected consistently' }
            ]}
            value={answers.dataCollection}
            onChange={v => updateAnswer('dataCollection', v)}
            testIdPrefix="data-collection"
          />
        )
      },
      {
        title: 'Can you trace each bag or lot back to specific farms?',
        helper: 'Audits often fail at the bag-to-farm step.',
        content: (
          <SingleSelect
            options={[
              { value: 'bag', label: 'Yes \u2014 bag/lot level traceability' },
              { value: 'batch', label: 'Partially \u2014 batch only' },
              { value: 'none', label: 'No' }
            ]}
            value={answers.bagTraceability}
            onChange={v => updateAnswer('bagTraceability', v)}
            testIdPrefix="bag-trace"
          />
        )
      },
      {
        title: 'How do you handle multi-farmer batches?',
        helper: 'Proper attribution prevents batch contamination.',
        content: (
          <SingleSelect
            options={[
              { value: 'recorded', label: 'Recorded per farmer' },
              { value: 'estimated', label: 'Estimated splits' },
              { value: 'none', label: 'Not recorded' }
            ]}
            value={answers.multiFarmerBatch}
            onChange={v => updateAnswer('multiFarmerBatch', v)}
            testIdPrefix="multi-batch"
          />
        )
      }
    ];
    return renderQuestion('Data Capture & Field Operations', questions[questionIndex]);
  };

  const renderStep4 = () => {
    const questions = [
      {
        title: 'Do you maintain digital audit trails?',
        helper: 'Auditors require verifiable evidence, not estimates.',
        content: (
          <SingleSelect
            options={[
              { value: 'immutable', label: 'Yes \u2014 immutable logs' },
              { value: 'partial', label: 'Partial records' },
              { value: 'none', label: 'No formal audit trail' }
            ]}
            value={answers.auditTrail}
            onChange={v => updateAnswer('auditTrail', v)}
            testIdPrefix="audit-trail"
          />
        )
      },
      {
        title: 'Can you generate a compliance-ready export report today?',
        helper: 'Compliance reports must be available on demand.',
        content: (
          <SingleSelect
            options={[
              { value: 'yes', label: 'Yes \u2014 immediately' },
              { value: 'manual', label: 'With manual work' },
              { value: 'none', label: 'No' }
            ]}
            value={answers.eudrReport}
            onChange={v => updateAnswer('eudrReport', v)}
            testIdPrefix="eudr-report"
          />
        )
      },
      {
        title: 'How confident are you in passing a compliance audit?',
        helper: 'Rate your overall audit readiness.',
        content: (
          <ConfidenceScale
            value={answers.auditConfidence}
            onChange={v => updateAnswer('auditConfidence', v)}
          />
        )
      }
    ];
    return renderQuestion('Compliance & Audit Readiness', questions[questionIndex]);
  };

  const renderQuestion = (sectionTitle: string, q: { title: string; helper: string; content: React.ReactNode }) => (
    <motion.div
      key={`${step}-${questionIndex}`}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.25 }}
    >
      <ProgressBar current={getQuestionNumber()} total={12} />

      <div className="mt-1 mb-6">
        <p className="text-xs font-medium text-primary uppercase tracking-wide">{sectionTitle}</p>
      </div>

      <h3 className="text-lg font-semibold mb-2" data-testid="text-question-title">{q.title}</h3>
      <p className="text-sm text-muted-foreground mb-5">{q.helper}</p>

      {q.content}

      <div className="flex justify-between mt-6 gap-3">
        <Button variant="outline" onClick={prevQuestion} className="gap-1" data-testid="button-prev">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={nextQuestion} disabled={!canProceed()} className="gap-1" data-testid="button-next">
          {step === 'step4' && questionIndex === 2 ? 'See Results' : 'Next'}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );

  const renderPreview = () => (
    <motion.div
      key="preview"
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3 }}
      className="text-center"
    >
      <h2 className={`text-xl font-semibold mb-2 ${tier.color}`} data-testid="text-risk-tier">
        Your Export Readiness: {tier.label}
      </h2>
      <p className="text-sm text-muted-foreground mb-6">{tier.description}</p>

      <GaugeMeter score={score} animate={true} />

      <div className="mt-8 space-y-2 text-left max-w-sm mx-auto">
        {gaps.slice(0, 3).map((gap, i) => (
          <div key={i} className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md ${
            gap.severity === 'critical' ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
          }`}>
            <gap.icon className="h-4 w-4 shrink-0" />
            {gap.text}
          </div>
        ))}
        {gaps.length > 3 && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground mt-2 filter blur-sm select-none">
              + {gaps.length - 3} more compliance gaps identified
            </p>
          </div>
        )}
      </div>

      <div className="mt-8">
        <Button size="lg" onClick={() => setStep('lead')} className="gap-2" data-testid="button-get-report">
          Get Full Report & Action Plan
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );

  const renderLeadCapture = () => (
    <motion.div
      key="lead"
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-xl font-semibold mb-1" data-testid="text-lead-headline">Get Your Full Compliance Breakdown</h2>
      <p className="text-sm text-muted-foreground mb-6">Enter your details to receive your personalized action plan.</p>

      <div className="space-y-4">
        <div>
          <Label htmlFor="lead-name" className="text-sm">Full Name *</Label>
          <Input id="lead-name" value={leadData.fullName} onChange={e => updateLead('fullName', e.target.value)} placeholder="Jane Doe" data-testid="input-lead-name" />
        </div>
        <div>
          <Label htmlFor="lead-company" className="text-sm">Company Name *</Label>
          <Input id="lead-company" value={leadData.company} onChange={e => updateLead('company', e.target.value)} placeholder="Acme Exports" data-testid="input-lead-company" />
        </div>
        <div>
          <Label htmlFor="lead-role" className="text-sm">Role</Label>
          <Input id="lead-role" value={leadData.role} onChange={e => updateLead('role', e.target.value)} placeholder="Head of Compliance" data-testid="input-lead-role" />
        </div>
        <div>
          <Label htmlFor="lead-email" className="text-sm">Work Email *</Label>
          <Input id="lead-email" type="email" value={leadData.email} onChange={e => updateLead('email', e.target.value)} placeholder="jane@acme-exports.com" data-testid="input-lead-email" />
        </div>
        <div>
          <Label htmlFor="lead-phone" className="text-sm">Phone Number *</Label>
          <Input id="lead-phone" type="tel" value={leadData.phone} onChange={e => updateLead('phone', e.target.value)} placeholder="+234..." data-testid="input-lead-phone" />
        </div>
        <div>
          <Label htmlFor="lead-country" className="text-sm">Country of Operation</Label>
          <Input id="lead-country" value={leadData.country} onChange={e => updateLead('country', e.target.value)} placeholder="Ghana" data-testid="input-lead-country" />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="lead-walkthrough"
            checked={leadData.wantsWalkthrough}
            onCheckedChange={v => updateLead('wantsWalkthrough', v as boolean)}
            data-testid="checkbox-walkthrough"
          />
          <Label htmlFor="lead-walkthrough" className="text-sm font-normal cursor-pointer">
            I'd like a free compliance walkthrough
          </Label>
        </div>
      </div>

      <div className="flex justify-between mt-6 gap-3">
        <Button variant="outline" onClick={() => setStep('preview')} className="gap-1" data-testid="button-lead-back">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleLeadSubmit}
          disabled={!leadData.fullName || !leadData.email || !leadData.company || !leadData.phone || submittingLead}
          className="gap-2"
          data-testid="button-send-report"
        >
          {submittingLead ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send My Report
        </Button>
      </div>
    </motion.div>
  );

  const renderResults = () => (
    <motion.div
      key="results"
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-xl font-semibold mb-6" data-testid="text-results-headline">Your Compliance Action Plan</h2>

      <div className="mb-6">
        <GaugeMeter score={score} animate={false} />
      </div>

      <div className="mb-6 p-4 rounded-md bg-muted/50">
        <h3 className="text-sm font-semibold mb-1">Risk Summary</h3>
        <p className="text-sm text-muted-foreground">{tier.description}</p>
      </div>

      {gaps.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Gaps Blocking EU Compliance
          </h3>
          <div className="space-y-2">
            {gaps.map((gap, i) => (
              <div key={i} className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md ${
                gap.severity === 'critical' ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              }`}>
                <gap.icon className="h-4 w-4 shrink-0" />
                {gap.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {actions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            What You Need to Fix (Next 30\u201360 Days)
          </h3>
          <div className="space-y-3">
            {actions.map((action, i) => (
              <div key={i} className="p-3 rounded-md border">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    action.priority === 'urgent' ? 'bg-red-500/15 text-red-600 dark:text-red-400' :
                    action.priority === 'important' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' :
                    'bg-primary/10 text-primary'
                  }`}>
                    {action.priority}
                  </span>
                  <span className="text-sm font-medium">{action.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 rounded-md bg-primary/5 border border-primary/20 mb-6">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          How OriginTrace Solves This
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            GPS polygon farm mapping with offline-capable mobile app
          </li>
          <li className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            Bag-to-farm traceability with unique QR identifiers
          </li>
          <li className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            Immutable digital audit trails with instant DDS export
          </li>
          <li className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            Deforestation-free verification against 2020 baseline
          </li>
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <a href="/demo">
          <Button className="w-full gap-2" data-testid="button-book-walkthrough">
            Book a Compliance Walkthrough
            <ChevronRight className="h-4 w-4" />
          </Button>
        </a>
        <Button variant="outline" className="w-full gap-2" data-testid="button-download-pdf">
          <FileText className="h-4 w-4" />
          Download PDF Report
        </Button>
      </div>
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
          {step === 'lead' && renderLeadCapture()}
          {step === 'results' && renderResults()}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
