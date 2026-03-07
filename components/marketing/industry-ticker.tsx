'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const industries = [
  { name: 'Agriculture', color: 'text-emerald-500' },
  { name: 'Timber', color: 'text-amber-600' },
  { name: 'Minerals', color: 'text-blue-500' },
  { name: 'Seafood', color: 'text-cyan-500' },
  { name: 'Textiles', color: 'text-violet-500' },
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
    <span className="inline-flex relative h-[1.2em] overflow-hidden align-bottom min-w-[200px]">
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
          className={`absolute left-0 whitespace-nowrap font-semibold ${industries[index].color}`}
        >
          {industries[index].name}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
