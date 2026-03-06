'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { Check, MapPin, QrCode, Shield } from 'lucide-react';

export function IPhoneMockup() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [scanComplete, setScanComplete] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);

  useEffect(() => {
    if (isInView) {
      const scanTimer = setTimeout(() => setScanComplete(true), 1500);
      const certTimer = setTimeout(() => setShowCertificate(true), 2200);
      return () => {
        clearTimeout(scanTimer);
        clearTimeout(certTimer);
      };
    }
  }, [isInView]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 100 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, ease: [0.25, 0.4, 0.25, 1] }}
      className="flex justify-center"
    >
      <div className="relative">
        <div className="w-[280px] h-[560px] bg-slate-950 rounded-[40px] p-2 shadow-2xl shadow-black/50">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100px] h-[28px] bg-slate-950 rounded-b-2xl z-10" />
          
          <div className="w-full h-full bg-slate-900 rounded-[32px] overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-800/50 to-slate-900" />
            
            <div className="relative z-10 p-4 pt-10">
              <div className="flex items-center gap-2 text-emerald-400 text-xs mb-4">
                <Shield className="h-3 w-3" />
                <span className="font-mono">origintrace.trade/verify</span>
              </div>
              
              <div className="flex justify-center mb-4">
                <motion.div
                  initial={{ scale: 1 }}
                  animate={scanComplete ? { scale: 0.8, opacity: 0.5 } : { scale: [1, 1.02, 1] }}
                  transition={scanComplete ? { duration: 0.3 } : { duration: 2, repeat: Infinity }}
                  className="relative"
                >
                  <QrCode className={`h-20 w-20 ${scanComplete ? 'text-slate-600' : 'text-white'}`} />
                  {!scanComplete && (
                    <motion.div
                      initial={{ top: '10%' }}
                      animate={{ top: '90%' }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      className="absolute left-0 right-0 h-1 bg-emerald-500/80 rounded-full shadow-lg shadow-emerald-500/50"
                    />
                  )}
                </motion.div>
              </div>

              {scanComplete && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="bg-slate-800/80 rounded-lg p-3 mb-3 border border-slate-700">
                    <div className="relative h-32 rounded overflow-hidden mb-2">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/30 to-slate-800">
                        <svg viewBox="0 0 200 100" className="w-full h-full opacity-60">
                          <polygon 
                            points="30,70 50,30 90,20 110,50 80,80" 
                            fill="none" 
                            stroke="rgb(52, 211, 153)" 
                            strokeWidth="1.5"
                            className="animate-pulse"
                          />
                          <polygon 
                            points="100,60 130,25 170,35 160,70 120,80" 
                            fill="none" 
                            stroke="rgb(52, 211, 153)" 
                            strokeWidth="1.5"
                            className="animate-pulse"
                            style={{ animationDelay: '0.5s' }}
                          />
                          <polygon 
                            points="60,90 80,75 100,85 90,95" 
                            fill="none" 
                            stroke="rgb(52, 211, 153)" 
                            strokeWidth="1.5"
                            className="animate-pulse"
                            style={{ animationDelay: '1s' }}
                          />
                          <circle cx="50" cy="50" r="3" fill="rgb(52, 211, 153)" />
                          <circle cx="130" cy="45" r="3" fill="rgb(52, 211, 153)" />
                          <circle cx="85" cy="85" r="3" fill="rgb(52, 211, 153)" />
                        </svg>
                      </div>
                      <div className="absolute bottom-1 left-1 flex items-center gap-1 text-[10px] text-emerald-400">
                        <MapPin className="h-2.5 w-2.5" />
                        <span>347 farms traced</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Product</span>
                        <span className="text-white font-medium">Cocoa Butter</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Batch ID</span>
                        <span className="text-white font-mono text-[10px]">FW-2026-CB-0847</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Origin</span>
                        <span className="text-white">Nigeria</span>
                      </div>
                    </div>
                  </div>

                  {showCertificate && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4 }}
                      className="bg-emerald-500/20 border border-emerald-500/50 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        >
                          <Check className="h-5 w-5 text-emerald-400" />
                        </motion.div>
                        <span className="text-emerald-400 font-medium text-sm">EXPORT READY</span>
                      </div>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                        className="h-0.5 bg-gradient-to-r from-emerald-500/0 via-emerald-400 to-emerald-500/0 mt-2"
                      />
                    </motion.div>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </div>
        
        <div className="absolute -inset-4 bg-emerald-500/10 blur-3xl rounded-full -z-10" />
      </div>
    </motion.div>
  );
}
