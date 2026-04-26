import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Map, Navigation } from 'lucide-react';
import { Button } from './ui/button';

export function TransitionPreview() {
  const [activeTab, setActiveTab] = useState<'glitch' | 'clip' | 'fade'>('fade');
  const [show, setShow] = useState(true);

  const triggerTransition = (tab: 'glitch' | 'clip' | 'fade') => {
    setShow(false);
    setTimeout(() => {
      setActiveTab(tab);
      setShow(true);
    }, 400);
  };

  const variants = {
    glitch: {
      initial: { opacity: 0, skewX: -20, filter: 'brightness(3) contrast(1.5)', x: -50 },
      animate: { 
        opacity: 1, 
        skewX: 0, 
        filter: 'brightness(1) contrast(1)', 
        x: 0,
        transition: {
          duration: 0.4,
          ease: "easeOut" as const
        }
      },
      exit: { 
        opacity: 0, 
        skewX: 20, 
        filter: 'brightness(0) contrast(2)', 
        x: 50,
        transition: { duration: 0.3 }
      }
    },
    clip: {
      initial: { clipPath: 'inset(50% 50% 50% 50%)', opacity: 0 },
      animate: { 
        clipPath: 'inset(0% 0% 0% 0%)', 
        opacity: 1,
        transition: {
          duration: 0.8,
          ease: [0.76, 0, 0.24, 1] as const
        }
      },
      exit: { 
        clipPath: 'inset(50% 50% 50% 50%)', 
        opacity: 0,
        transition: { duration: 0.5 }
      }
    },
    fade: {
      initial: { opacity: 0, scale: 0.97 },
      animate: { 
        opacity: 1, 
        scale: 1,
        transition: { duration: 0.5, ease: "easeOut" as const }
      },
      exit: { 
        opacity: 0, 
        scale: 1.02,
        transition: { duration: 0.4, ease: "easeIn" as const }
      }
    }
  };

  const content = {
    glitch: {
      title: "Tactical Round Update",
      desc: "Synchronizing Data Nodes...",
      color: "cyan",
      icon: Zap
    },
    clip: {
      title: "Sector Map Unlocked",
      desc: "Analyzing Terrain Topography...",
      color: "neon",
      icon: Map
    },
    fade: {
      title: "System Navigation",
      desc: "Accessing Command Interface...",
      color: "white",
      icon: Navigation
    }
  };

  const current = content[activeTab];

  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] w-full p-12 bg-black/40 border border-white/5 backdrop-blur-xl rounded-2xl overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,255,0.05),transparent_70%)]" />
      </div>

      <div className="z-10 w-full max-w-2xl">
        <div className="flex justify-center gap-4 mb-12">
          <Button 
            variant={activeTab === 'glitch' ? 'primary' : 'secondary'}
            onClick={() => triggerTransition('glitch')}
            className="group"
          >
            <Zap className="w-4 h-4 mr-2 group-hover:animate-pulse" />
            Glitch Wipe
          </Button>
          <Button 
            variant={activeTab === 'clip' ? 'primary' : 'secondary'}
            onClick={() => triggerTransition('clip')}
            className="group"
          >
            <Map className="w-4 h-4 mr-2" />
            Clip Reveal
          </Button>
          <Button 
            variant={activeTab === 'fade' ? 'primary' : 'secondary'}
            onClick={() => triggerTransition('fade')}
            className="group"
          >
            <Navigation className="w-4 h-4 mr-2" />
            Fade Scale
          </Button>
        </div>

        <div className="h-[300px] flex items-center justify-center relative">
          <AnimatePresence mode="wait">
            {show && (
              <motion.div
                key={activeTab}
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full"
              >
                <div className={`p-12 border-l-4 rounded-r-lg bg-white/5 relative overflow-hidden ${
                  activeTab === 'glitch' ? 'border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.1)]' :
                  activeTab === 'clip' ? 'border-[#39FF14] shadow-[0_0_30px_rgba(57,255,20,0.1)]' :
                  'border-white/20'
                }`}>
                  {activeTab === 'glitch' && (
                    <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,255,255,0.05)_50%)] bg-[length:100%_4px] opacity-30 animate-[scanline_0.2s_infinite_linear]" />
                  )}

                  <div className="flex items-center gap-6">
                    <div className={`p-4 rounded-xl ${
                      activeTab === 'glitch' ? 'bg-cyan-500/20 text-cyan-500' :
                      activeTab === 'clip' ? 'bg-[#39FF14]/20 text-[#39FF14]' :
                      'bg-white/10 text-white'
                    }`}>
                      <current.icon className="w-12 h-12" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-3xl font-bold tracking-tighter uppercase font-mono italic">
                        {current.title}
                      </h3>
                      <p className="text-white/60 font-mono text-sm tracking-widest uppercase">
                        {current.desc}
                      </p>
                    </div>
                  </div>

                  <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-white/20" />
                  <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-white/20" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scanline {
          0% { background-position: 0 0; }
          100% { background-position: 0 4px; }
        }
      `}} />
    </div>
  );
}
