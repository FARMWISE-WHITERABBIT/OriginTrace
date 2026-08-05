'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';

export function TracePath() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <svg
      ref={ref}
      viewBox="0 0 800 200"
      className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="traceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
          <stop offset="50%" stopColor="#10b981" stopOpacity="1" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <motion.path
        d="M 50,100 C 200,100 250,50 400,100 S 600,150 750,100"
        stroke="#10b981"
        strokeWidth="2"
        fill="none"
        strokeDasharray="0 1"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={isInView ? { pathLength: 1, opacity: 0.5 } : {}}
        transition={{ duration: 2, ease: "easeInOut" }}
      />
      
      <circle cx="50" cy="100" r="8" fill="#10b981" opacity="0.6" />
      <text x="50" y="85" textAnchor="middle" fill="#10b981" fontSize="10" className="font-mono">ORIGIN</text>
      
      <circle cx="400" cy="100" r="8" fill="#10b981" opacity="0.6" />
      <text x="400" y="85" textAnchor="middle" fill="#10b981" fontSize="10" className="font-mono">PROCESSOR</text>
      
      <circle cx="750" cy="100" r="8" fill="#10b981" opacity="0.6" />
      <text x="750" y="85" textAnchor="middle" fill="#10b981" fontSize="10" className="font-mono">MARKET</text>
      
      {isInView && (
        <motion.circle
          cx="50"
          cy="100"
          r="4"
          fill="#34d399"
          filter="url(#glow)"
          initial={{ cx: 50 }}
          animate={{ cx: [50, 400, 750, 50] }}
          transition={{ 
            duration: 6, 
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.4, 0.8, 1]
          }}
        />
      )}
    </svg>
  );
}

export function LiveCounter({ 
  label, 
  endValue, 
  suffix = '',
  duration = 2000 
}: { 
  label: string; 
  endValue: number; 
  suffix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (isInView && !hasAnimated) {
      setHasAnimated(true);
      const startTime = Date.now();
      const startValue = Math.floor(endValue * 0.7);
      
      const animate = () => {
        const now = Date.now();
        const progress = Math.min((now - startTime) / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        setCount(Math.floor(startValue + (endValue - startValue) * easeOut));
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      animate();
    }
  }, [isInView, endValue, duration, hasAnimated]);

  useEffect(() => {
    if (hasAnimated) {
      const interval = setInterval(() => {
        setCount(prev => {
          const delta = Math.random() > 0.7 ? 1 : 0;
          return prev + delta;
        });
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [hasAnimated]);

  return (
    <div ref={ref} className="text-center">
      <p className="text-[10px] text-muted-foreground mb-1 font-mono uppercase tracking-wider">{label}</p>
      <p className="text-lg font-semibold text-primary font-mono">
        {count.toLocaleString()}{suffix}
      </p>
    </div>
  );
}

export function LiveDataBox() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: 0.8 }}
      className="absolute bottom-4 left-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-xl"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
        </span>
        <span className="text-[10px] text-muted-foreground font-mono uppercase">Live System</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <LiveCounter label="Verified Batches" endValue={12847} />
        <LiveCounter label="Mapped Hectares" endValue={149028} />
      </div>
    </motion.div>
  );
}

export function ScanningReveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [hasScanned, setHasScanned] = useState(false);

  useEffect(() => {
    if (isInView && !hasScanned) {
      const timer = setTimeout(() => setHasScanned(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [isInView, hasScanned]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <motion.div
        initial={{ opacity: 0.3 }}
        animate={{ opacity: hasScanned ? 1 : 0.3 }}
        transition={{ duration: 0.5 }}
      >
        {children}
      </motion.div>
      
      {isInView && !hasScanned && (
        <motion.div
          className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
          initial={{ top: 0 }}
          animate={{ top: '100%' }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
          style={{ boxShadow: '0 0 20px 5px rgba(16, 185, 129, 0.5)' }}
        />
      )}
    </div>
  );
}

export function LiveAgentIndicator() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
      </span>
      <span>Compliance Expert Online</span>
    </div>
  );
}
