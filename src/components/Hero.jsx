import React from 'react'
import { motion } from 'framer-motion'
import { heroTextReveal, fadeUp, staggerContainer, staggerItem, lineGrow, EASE_PREMIUM, sectionViewport } from '../animations'
import AnimatedCounter from './AnimatedCounter'

const PORTAL_URL = '#register'
const STATS = [
  { value: 500, prefix: '$', suffix: '', label: 'Minimum Investment' },
  { value: 1200, prefix: '', suffix: '+', label: 'Registered Users' },
  { value: 82500, prefix: '$', suffix: '', label: 'Property Transactions' },
  { value: 7.6, suffix: '%', label: 'Avg. APY', decimals: 1 },
]

export default function Hero() {
  return (
    <section className="relative lg:min-h-[calc(100vh-56px)] flex flex-col justify-center overflow-hidden bg-ir-white pt-14">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[500px] lg:w-[700px] h-[500px] lg:h-[700px] rounded-full bg-ir-teal/[0.05] blur-[180px]" />
        <div className="absolute -bottom-[20%] -left-[15%] w-[400px] lg:w-[600px] h-[400px] lg:h-[600px] rounded-full bg-ir-teal/[0.03] blur-[140px]" />
      </div>

      <div className="ir-container relative z-10 pt-8 md:pt-12 lg:pt-16 pb-10 md:pb-12">
        <div className="grid lg:grid-cols-[1.1fr,1fr] gap-10 lg:gap-16 items-center">
          <div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE_PREMIUM, delay: 0.2 }} className="mb-4 md:mb-5">
              <span className="ir-overline inline-flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-ir-teal animate-glow-pulse" />
                Now Open for Early Access
              </span>
            </motion.div>

            <motion.div variants={staggerContainer(0.12)} initial="hidden" animate="visible" className="max-w-[640px]">
              <motion.h1 variants={heroTextReveal} className="text-[clamp(2.25rem,9vw,5rem)] leading-[1] font-bold tracking-[-0.035em] text-ir-dark">Earn Income</motion.h1>
              <motion.h1 variants={heroTextReveal} className="text-[clamp(2.25rem,9vw,5rem)] leading-[1] font-bold tracking-[-0.035em] text-ir-dark">with <span className="ir-teal-text">Real Estate</span></motion.h1>
            </motion.div>

            <motion.p variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.6 }} className="mt-5 md:mt-6 max-w-[500px] text-body md:text-[clamp(1.05rem,1.7vw,1.25rem)] leading-relaxed text-ir-dark/65">
              Own a piece of real estate from $500. High-yield properties across global markets, fully managed.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE_PREMIUM, delay: 0.8 }} className="mt-7 md:mt-8 flex flex-col sm:flex-row items-stretch sm:items-start gap-3 sm:gap-4">
              <a href={PORTAL_URL} className="ir-btn-primary text-body !px-6 sm:!px-8 !py-3.5 group"><span className="whitespace-nowrap">Create Your Free Account</span> <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg></a>
              <a href="#how-it-works" className="ir-btn-ghost text-body">See How It Works <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg></a>
            </motion.div>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1, duration: 0.5 }} className="mt-4 text-caption text-ir-dark/35">No credit card required. Takes 2 minutes.</motion.p>
          </div>

          {/* Visual — mobile scaled version */}
          <div className="relative h-[380px] sm:h-[440px] lg:h-[580px] mt-6 lg:mt-0">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, ease: EASE_PREMIUM, delay: 0.4 }} className="absolute right-0 top-0 w-[85%] sm:w-[88%] lg:w-[90%] h-[85%] lg:h-[480px] rounded-[20px] lg:rounded-[24px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.15)] lg:shadow-[0_30px_80px_rgba(0,0,0,0.18)]">
              <img src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&h=1400&fit=crop&q=85" alt="Premium real estate" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-ir-dark/30 via-transparent to-transparent" />
              <div className="absolute bottom-4 lg:bottom-6 left-4 lg:left-6 right-4 lg:right-6 flex items-center justify-between bg-white/95 backdrop-blur-md rounded-lg lg:rounded-xl p-3 lg:p-3.5 shadow-lg">
                <div>
                  <p className="text-caption text-ir-dark/50 font-medium">2BR · Sukhumvit</p>
                  <p className="text-body-sm text-ir-dark font-bold">Bangkok, Thailand</p>
                </div>
                <div className="text-right">
                  <p className="text-caption text-ir-dark/50 font-medium">Tgt. Yield</p>
                  <p className="text-h4 text-ir-teal font-mono font-bold">+9.4%</p>
                </div>
              </div>
            </motion.div>

            {/* Floating rent notification */}
            <motion.div initial={{ opacity: 0, y: 30, x: -20 }} animate={{ opacity: 1, y: 0, x: 0 }} transition={{ duration: 0.8, ease: EASE_PREMIUM, delay: 1 }} className="absolute top-4 sm:top-8 lg:top-16 left-0 lg:-left-4 bg-white rounded-xl lg:rounded-2xl p-3 lg:p-4 shadow-[0_14px_40px_rgba(0,0,0,0.14)] lg:shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-ir-border-light w-[200px] sm:w-[220px] lg:w-[240px]">
              <div className="flex items-center gap-2.5 lg:gap-3">
                <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-ir-teal/15 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs lg:text-sm font-bold text-ir-teal">iR</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] lg:text-[10px] text-ir-dark/45 font-medium uppercase tracking-wider">InReal</p>
                  <p className="text-caption lg:text-body-sm text-ir-dark font-medium leading-tight">You've been paid <span className="text-ir-positive font-bold font-mono">$542</span> in rent</p>
                </div>
              </div>
            </motion.div>

            {/* Floating portfolio — hidden on very narrow screens */}
            <motion.div initial={{ opacity: 0, y: 30, x: 20 }} animate={{ opacity: 1, y: 0, x: 0 }} transition={{ duration: 0.8, ease: EASE_PREMIUM, delay: 1.2 }} className="hidden sm:block absolute bottom-0 sm:bottom-2 left-0 lg:left-2 bg-white rounded-xl lg:rounded-2xl p-4 lg:p-5 shadow-[0_14px_40px_rgba(0,0,0,0.14)] lg:shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-ir-border-light w-[220px] lg:w-[260px]">
              <p className="text-caption text-ir-dark/50 uppercase tracking-wider font-medium mb-1">Total Portfolio</p>
              <p className="text-[22px] lg:text-[28px] font-bold text-ir-dark font-mono leading-none">$12,450</p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-caption text-ir-positive font-mono font-bold bg-ir-positive/10 px-2 py-0.5 rounded">+8.2%</span>
                <span className="text-caption text-ir-dark/45">this year</span>
              </div>
              <svg viewBox="0 0 240 50" className="w-full h-8 lg:h-10 mt-2.5 lg:mt-3">
                <defs><linearGradient id="hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#01CED1" stopOpacity="0.3"/><stop offset="100%" stopColor="#01CED1" stopOpacity="0"/></linearGradient></defs>
                <path d="M0,42 L20,38 L40,40 L65,30 L90,32 L115,22 L140,25 L165,15 L190,18 L215,10 L240,6" fill="none" stroke="#01CED1" strokeWidth="2" strokeLinecap="round"/>
                <path d="M0,42 L20,38 L40,40 L65,30 L90,32 L115,22 L140,25 L165,15 L190,18 L215,10 L240,6 L240,50 L0,50 Z" fill="url(#hg)"/>
              </svg>
            </motion.div>
          </div>
        </div>

        <motion.div variants={lineGrow} initial="hidden" animate="visible" className="mt-12 md:mt-16 h-[1px] ir-depth-line origin-left" />

        <motion.div variants={staggerContainer(0.1)} initial="hidden" whileInView="visible" viewport={sectionViewport} className="mt-8 md:mt-10 grid grid-cols-2 md:grid-cols-4 gap-y-7 gap-x-4 justify-center text-center">
          {STATS.map((s, i) => (
            <motion.div key={i} variants={staggerItem} className="group">
              <div className="text-[clamp(1.75rem,7vw,3rem)] font-bold text-ir-teal leading-none tracking-tight font-mono"><AnimatedCounter target={s.value} prefix={s.prefix} suffix={s.suffix} decimals={s.decimals || 0} /></div>
              <p className="mt-2 md:mt-2.5 text-body-sm text-ir-dark font-medium">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}