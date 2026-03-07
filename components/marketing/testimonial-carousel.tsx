'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';

const testimonials = [
  {
    quote: "OriginTrace reduced our shipment rejection rate from 12% to under 1%. The pre-shipment compliance scoring caught issues we would have missed — saving us hundreds of thousands in lost cargo.",
    name: "Adebayo Ogundimu",
    title: "Export Director",
    company: "West Africa Cocoa Cooperative",
    initials: "AO",
  },
  {
    quote: "Before OriginTrace, we spent weeks assembling compliance dossiers. Now our EUDR documentation is generated automatically with GPS-verified farm polygons. Our buyers trust us completely.",
    name: "Marie-Claire Dupont",
    title: "Compliance Manager",
    company: "Sahel Commodities S.A.",
    initials: "MD",
  },
  {
    quote: "The buyer portal gives us real-time visibility into our suppliers' traceability data. We can verify origin claims before shipments even leave port. It's transformed how we source.",
    name: "Henrik Johansson",
    title: "Head of Procurement",
    company: "Nordic Foods Group",
    initials: "HJ",
  },
  {
    quote: "Our field agents collect data offline in remote areas, and everything syncs when they're back in range. The system just works — even in areas with zero connectivity.",
    name: "Fatima Bello",
    title: "Operations Manager",
    company: "Green Harvest Nigeria",
    initials: "FB",
  },
  {
    quote: "The Digital Product Passport feature has been a game-changer for our EU exports. Buyers scan one QR code and see the full chain of custody back to the farm. Audit time went from days to minutes.",
    name: "James Kariuki",
    title: "CEO",
    company: "East African Timber Exports",
    initials: "JK",
  },
  {
    quote: "We switched from spreadsheets and WhatsApp to OriginTrace in two weeks. Our 98% compliance score opened doors to three new European buyers within the first quarter.",
    name: "Amina Touré",
    title: "Managing Director",
    company: "Sahel Shea Processing Ltd",
    initials: "AT",
  },
];

export function TestimonialCarousel() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % testimonials.length);
  }, []);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(next, 5000);
    return () => clearInterval(interval);
  }, [isPaused, next]);

  const visibleCount = 3;
  const getVisibleIndices = () => {
    const indices = [];
    for (let i = 0; i < visibleCount; i++) {
      indices.push((current + i) % testimonials.length);
    }
    return indices;
  };

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="hidden md:grid md:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {getVisibleIndices().map((idx, position) => (
            <motion.div
              key={`${idx}-${position}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
            >
              <TestimonialCard testimonial={testimonials[idx]} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="md:hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
          >
            <TestimonialCard testimonial={testimonials[current]} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-4 mt-8">
        <button
          onClick={prev}
          className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Previous testimonial"
          data-testid="button-testimonial-prev"
        >
          <ChevronLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
        </button>
        <div className="flex gap-1.5">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === current
                  ? 'bg-emerald-500 w-6'
                  : 'bg-slate-300 dark:bg-slate-600'
              }`}
              aria-label={`Go to testimonial ${i + 1}`}
            />
          ))}
        </div>
        <button
          onClick={next}
          className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Next testimonial"
          data-testid="button-testimonial-next"
        >
          <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-400" />
        </button>
      </div>
    </div>
  );
}

function TestimonialCard({ testimonial }: { testimonial: typeof testimonials[0] }) {
  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
      <Quote className="h-5 w-5 text-emerald-500/40 mb-4 shrink-0" />
      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed flex-1 mb-6">
        &ldquo;{testimonial.quote}&rdquo;
      </p>
      <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
        <div className="w-10 h-10 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{testimonial.initials}</span>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{testimonial.name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{testimonial.title}, {testimonial.company}</p>
        </div>
      </div>
    </div>
  );
}
