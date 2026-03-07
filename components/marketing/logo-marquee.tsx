'use client';

import { motion } from 'framer-motion';

const partners = [
  { name: 'EUDR Certified', abbr: 'EUDR' },
  { name: 'FSMA Compliant', abbr: 'FSMA' },
  { name: 'Rainforest Alliance', abbr: 'RA' },
  { name: 'Fairtrade', abbr: 'FT' },
  { name: 'ISO 22000', abbr: 'ISO' },
  { name: 'Global GAP', abbr: 'GGAP' },
  { name: 'UK Env Act', abbr: 'UKEA' },
  { name: 'CS3D Ready', abbr: 'CS3D' },
];

function LogoItem({ partner }: { partner: { name: string; abbr: string } }) {
  return (
    <div className="flex items-center gap-2.5 px-5 py-2.5 mx-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/40 backdrop-blur-sm shrink-0">
      <div className="w-7 h-7 rounded bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center">
        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">{partner.abbr}</span>
      </div>
      <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{partner.name}</span>
    </div>
  );
}

export function LogoMarquee() {
  const doubled = [...partners, ...partners];

  return (
    <div className="relative overflow-hidden py-6">
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10" />
      <motion.div
        className="flex"
        animate={{ x: ['0%', '-50%'] }}
        transition={{
          duration: 30,
          ease: 'linear',
          repeat: Infinity,
        }}
      >
        {doubled.map((partner, i) => (
          <LogoItem key={i} partner={partner} />
        ))}
      </motion.div>
    </div>
  );
}
