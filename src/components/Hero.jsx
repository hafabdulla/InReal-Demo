import React from 'react'
import { motion } from 'framer-motion'
import { heroTextReveal, fadeUp, staggerContainer, staggerItem, lineGrow, EASE_PREMIUM, sectionViewport } from '../animations'
import AnimatedCounter from './AnimatedCounter'
import HeroPhones from './HeroPhones'

const PORTAL_URL = '#register'

// Three figures were removed from here on 07 Aug 2026 on the product owner's
// instruction: "1,200+ Registered Users", "$82,500 Property Transactions" and
// "7.6% Avg. APY". None was real — InReal is pre-launch, no transaction has
// settled, and there is no track record to average — and the APY one was an
// unqualified return claim on a public financial page, which is a compliance
// matter rather than a copy decision.
//
// This completes PO-9 (31 July), which took the equivalent tiles off the login
// page: "We will put them back after our pilots." The same applies here — when
// figures return to this slot they must be real and carry risk disclosure.
//
// The minimum is kept because it is true and matches the product and the
// paragraph above it. DO NOT add a figure here that the pilots have not
// actually produced.
const STATS = [
  { value: 500, prefix: '$', suffix: '', label: 'Minimum Investment' },
]

export default function Hero() {
  return (
    <section className="relative lg:min-h-[calc(100vh-56px)] flex flex-col justify-center overflow-hidden bg-ir-white pt-14">
      {/* Background. The previous version was flat white with two blurs at 3–5%
          opacity, which is invisible in practice — the section read as blank.
          This is a gradient mesh: a cool wash top-left so the headline stays
          crisp, teal blooming behind the device cluster, and a warm accent
          bottom-right. The warm note is what stops an all-teal page feeling
          clinical, and it is why the reference site does the same thing. */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(158deg,#ffffff_0%,#f8fdfd_34%,#edfaf8_60%,#fef7ee_100%)]" />
        <div className="absolute -left-[14%] -top-[18%] h-[420px] w-[420px] rounded-full bg-[#cfeeff]/50 blur-[120px] lg:h-[560px] lg:w-[560px]" />
        <div className="absolute -right-[8%] top-[2%] h-[460px] w-[460px] rounded-full bg-ir-teal/[0.16] blur-[130px] lg:h-[640px] lg:w-[640px]" />
        <div className="absolute left-[38%] top-[44%] h-[360px] w-[360px] rounded-full bg-[#7de3d0]/25 blur-[120px] lg:h-[480px] lg:w-[480px]" />
        <div className="absolute -bottom-[12%] right-[6%] h-[320px] w-[320px] rounded-full bg-[#ffd9a3]/45 blur-[110px] lg:h-[440px] lg:w-[440px]" />
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

        {/* One real figure, centred. A lone tile left in a four-column grid
            reads as three that failed to load. */}
        <motion.div variants={staggerContainer(0.1)} initial="hidden" whileInView="visible" viewport={sectionViewport} className="mt-8 md:mt-10 flex flex-wrap items-start justify-center gap-x-14 gap-y-7 text-center">
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
