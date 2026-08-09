import React from 'react'
import { motion } from 'framer-motion'
import { heroTextReveal, fadeUp, staggerContainer, staggerItem, lineGrow, EASE_PREMIUM, sectionViewport } from '../animations'
import AnimatedCounter from './AnimatedCounter'
import HeroPhones from './HeroPhones'

const PORTAL_URL = '#register'

// ⚠️ THESE FOUR FIGURES ARE NOT ALL REAL, AND THREE OF THEM ARE THE SAME CLASS
// OF CLAIM THE PRODUCT OWNER ORDERED REMOVED FROM THE LOGIN PAGE ON 31 JULY.
//
// PO-9: take down the "$2.5M invested / 750 investors / 15% average returns"
// tiles — "We will put them back after our pilots." The instruction named the
// login page, but the reason was that none of the numbers were real, and that
// reason applies here identically:
//
//   • Minimum Investment $500  — real, matches the product and the copy above.
//   • Registered Users 1,200+  — InReal is pre-launch. Not real.
//   • Property Transactions    — no transaction has been settled. Not real.
//   • Avg. APY 7.6%            — no track record exists to average. Not real,
//                                AND an unqualified return claim on a public
//                                financial page, which is a compliance matter
//                                rather than a copy decision.
//
// Left in place rather than deleted here because the PO has explicitly said
// they want figures in this slot once the pilots produce them — replacing them
// is their call, not a silent edit. Raised for a decision; see the tracker.
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
        <div className="grid lg:grid-cols-[1.05fr,1fr] gap-10 lg:gap-14 items-center">
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

          {/* Product visual — device mockups of the portfolio, a property, and a
              rent payment arriving. */}
          <div>
            <HeroPhones />

            {/* Not decoration. Every figure inside the mockups is invented, and
                on a financial site an unlabelled screenshot of gains reads as a
                claim about what investors have earned. This line is what keeps
                it an illustration of the product. */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.6, duration: 0.5 }}
              className="mt-4 lg:mt-5 text-caption text-ir-dark/40 text-center lg:text-right"
            >
              App illustration. Figures shown are examples, not past performance or a forecast.
            </motion.p>
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
