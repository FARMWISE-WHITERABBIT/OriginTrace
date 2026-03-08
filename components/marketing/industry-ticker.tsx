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

const longestWord = industries.reduce((a, b) => (a.length >= b.length ? a : b));

export function IndustryTicker() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % industries.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="relative inline-block align-bottom" style={{ lineHeight: 1.3, clipPath: 'inset(-5% -5% -10% -5%)' }}>
      <span className="invisible whitespace-nowrap block" aria-hidden="true" style={{ fontWeight: 'inherit', lineHeight: 1.3 }}>
        {longestWord}
      </span>
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ y: '120%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={{ y: '-120%', opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.4, 0.25, 1] }}
          className="absolute top-0 left-0 text-emerald-500 whitespace-nowrap"
          style={{ fontWeight: 'inherit', lineHeight: 1.3 }}
        >
          {industries[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
