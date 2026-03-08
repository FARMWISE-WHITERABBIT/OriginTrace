'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const industries = [
  'Agriculture',
  'Timber',
  'Minerals',
  'Seafood',
  'Textiles',
];

export function IndustryTicker() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % industries.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="relative inline-block overflow-hidden align-bottom" style={{ height: '1.15em', width: '6.2em' }}>
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ y: '110%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={{ y: '-110%', opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.4, 0.25, 1] }}
          className="absolute bottom-0 left-0 text-emerald-500"
          style={{ lineHeight: 'inherit', fontWeight: 'inherit' }}
        >
          {industries[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
