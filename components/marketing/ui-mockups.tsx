'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Check, MapPin, Package, AlertTriangle, Shield } from 'lucide-react';

export function DashboardMockup() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
      className="relative"
    >
      <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden shadow-2xl">
        <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 border-b border-slate-700">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          <span className="ml-3 text-[10px] text-slate-400 font-mono">origintrace.trade/dashboard</span>
        </div>
        
        <div className="p-4">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-slate-800/50 rounded p-3 border border-slate-700/50">
              <p className="text-[10px] text-slate-400 mb-1">Verified Farms</p>
              <p className="text-lg font-semibold text-emerald-400">2,847</p>
            </div>
            <div className="bg-slate-800/50 rounded p-3 border border-slate-700/50">
              <p className="text-[10px] text-slate-400 mb-1">Active Batches</p>
              <p className="text-lg font-semibold text-white">156</p>
            </div>
            <div className="bg-slate-800/50 rounded p-3 border border-slate-700/50">
              <p className="text-[10px] text-slate-400 mb-1">Compliance</p>
              <p className="text-lg font-semibold text-emerald-400">98.4%</p>
            </div>
          </div>
          
          <div className="bg-slate-800/30 rounded p-3 border border-slate-700/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-300">Recent Collections</span>
              <span className="text-[10px] text-slate-500">Today</span>
            </div>
            <div className="space-y-2">
              {[
                { id: 'BAG-2847', farm: 'Adeyemi Farm', status: 'verified' },
                { id: 'BAG-2846', farm: 'Okonkwo Holdings', status: 'verified' },
                { id: 'BAG-2845', farm: 'Emeka Cooperative', status: 'pending' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-700/50 last:border-0">
                  <span className="text-slate-400 font-mono text-[10px]">{item.id}</span>
                  <span className="text-slate-300">{item.farm}</span>
                  <span className={item.status === 'verified' ? 'text-emerald-400' : 'text-amber-400'}>
                    {item.status === 'verified' ? <Check className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="absolute -inset-4 bg-emerald-500/5 blur-3xl rounded-full -z-10" />
    </motion.div>
  );
}

export function PolygonMapMockup() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
      className="relative"
    >
      <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden shadow-2xl">
        <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 border-b border-slate-700">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          <span className="ml-3 text-[10px] text-slate-400 font-mono">Farm Polygon Mapping</span>
        </div>
        
        <div className="relative h-64 bg-gradient-to-br from-slate-800 to-slate-900">
          <svg viewBox="0 0 400 200" className="w-full h-full">
            <defs>
              <pattern id="mapGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(100,116,139,0.2)" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#mapGrid)" />
            
            <motion.polygon 
              points="60,140 100,80 160,60 200,100 180,150 100,160" 
              fill="rgba(52, 211, 153, 0.2)" 
              stroke="rgb(52, 211, 153)" 
              strokeWidth="2"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.3, duration: 0.5 }}
            />
            <motion.polygon 
              points="220,120 260,70 320,80 340,130 300,160 240,150" 
              fill="rgba(52, 211, 153, 0.2)" 
              stroke="rgb(52, 211, 153)" 
              strokeWidth="2"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.5, duration: 0.5 }}
            />
            <motion.polygon 
              points="140,170 180,150 210,165 190,185 150,180" 
              fill="rgba(251, 191, 36, 0.2)" 
              stroke="rgb(251, 191, 36)" 
              strokeWidth="2"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.7, duration: 0.5 }}
            />
            
            <motion.circle 
              cx="130" cy="110" r="4" 
              fill="rgb(52, 211, 153)"
              initial={{ scale: 0 }}
              animate={isInView ? { scale: 1 } : {}}
              transition={{ delay: 0.8, type: 'spring' }}
            />
            <motion.circle 
              cx="280" cy="115" r="4" 
              fill="rgb(52, 211, 153)"
              initial={{ scale: 0 }}
              animate={isInView ? { scale: 1 } : {}}
              transition={{ delay: 0.9, type: 'spring' }}
            />
            <motion.circle 
              cx="175" cy="167" r="4" 
              fill="rgb(251, 191, 36)"
              initial={{ scale: 0 }}
              animate={isInView ? { scale: 1 } : {}}
              transition={{ delay: 1, type: 'spring' }}
            />
          </svg>
          
          <div className="absolute bottom-3 left-3 flex items-center gap-4 text-[10px]">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-slate-300">Verified</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-slate-300">Pending Review</span>
            </div>
          </div>
          
          <div className="absolute top-3 right-3 bg-slate-800/90 rounded px-2 py-1 text-[10px] text-slate-300">
            <MapPin className="h-3 w-3 inline mr-1" />
            3 farms selected
          </div>
        </div>
      </div>
      
      <div className="absolute -inset-4 bg-emerald-500/5 blur-3xl rounded-full -z-10" />
    </motion.div>
  );
}

export function TraceabilityMockup() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  const steps = [
    { icon: MapPin, label: 'Farm Origin', detail: 'GPS: 7.3775°N, 3.9470°E', status: 'verified' },
    { icon: Package, label: 'Bag Collection', detail: 'BAG-2847 • 45kg', status: 'verified' },
    { icon: Package, label: 'Batch Assigned', detail: 'BATCH-0892', status: 'verified' },
    { icon: Shield, label: 'Export Status', detail: 'Compliant', status: 'verified' },
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
      className="relative"
    >
      <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden shadow-2xl">
        <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 border-b border-slate-700">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          <span className="ml-3 text-[10px] text-slate-400 font-mono">Bag Traceability Timeline</span>
        </div>
        
        <div className="p-4">
          <div className="relative">
            <div className="absolute left-[19px] top-6 bottom-6 w-px bg-slate-700" />
            
            <div className="space-y-4">
              {steps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.2 + i * 0.15, duration: 0.4 }}
                  className="flex items-start gap-3 relative"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    step.status === 'verified' 
                      ? 'bg-emerald-500/20 border border-emerald-500/50' 
                      : 'bg-slate-800 border border-slate-600'
                  }`}>
                    <step.icon className={`h-4 w-4 ${
                      step.status === 'verified' ? 'text-emerald-400' : 'text-slate-400'
                    }`} />
                  </div>
                  <div className="pt-2">
                    <p className="text-sm text-slate-200">{step.label}</p>
                    <p className="text-xs text-slate-400 font-mono">{step.detail}</p>
                  </div>
                  {step.status === 'verified' && (
                    <Check className="h-4 w-4 text-emerald-400 ml-auto mt-3" />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="absolute -inset-4 bg-emerald-500/5 blur-3xl rounded-full -z-10" />
    </motion.div>
  );
}

export function ComplianceBadge({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const isDark = variant === 'dark';
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${
      isDark 
        ? 'bg-emerald-500/15 border border-emerald-500/40' 
        : 'bg-emerald-500/10 border border-emerald-500/30'
    }`}>
      <Shield className={`h-4 w-4 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
      <span className={`text-xs font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`}>Export Compliance Ready</span>
    </div>
  );
}

export function CommodityBar() {
  const commodities = ['Cocoa', 'Cashew', 'Palm Kernel', 'Ginger', 'Sesame', 'Shea'];
  
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 py-4">
      {commodities.map((commodity) => (
        <div 
          key={commodity}
          className="flex items-center gap-2 px-3 py-1.5 bg-muted/60 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-600 dark:text-slate-300"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          {commodity}
        </div>
      ))}
    </div>
  );
}
