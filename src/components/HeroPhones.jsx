import React from 'react'
import { motion } from 'framer-motion'
import { EASE_PREMIUM } from '../animations'

// The hero's phone cluster: two device mockups plus two floating cards, showing
// what the InReal app actually does — a portfolio with its value over time, a
// property card, and a rent payment landing.
//
// BUILT IN CSS AND SVG, NOT IMAGES, on purpose. Two reasons:
//   1. The old hero pulled its photograph from images.unsplash.com. The InReal
//      logo already disappeared from the entire platform once because it was
//      loaded from an outside service whose link stopped working — the same
//      fragility, in the most visible position on the site.
//   2. It stays sharp on any display and costs no extra network request.
//
// ON THE NUMBERS: every figure here is illustrative and is labelled as such
// beneath the cluster. They describe the shape of the product, not InReal's
// performance. Keep it that way — an unqualified return figure on a public
// financial page is a compliance matter rather than a copy decision, which is
// why the equivalent tiles were pulled from the login page in July.

function Phone({ className, rotate, delay, children, screenClass = 'bg-white' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotate: rotate * 1.6 }}
      animate={{ opacity: 1, y: 0, rotate }}
      transition={{ duration: 1, ease: EASE_PREMIUM, delay }}
      className={`absolute rounded-[2rem] lg:rounded-[2.5rem] bg-ir-dark p-[6px] lg:p-[8px] shadow-[0_24px_70px_rgba(0,0,0,0.22)] ${className}`}
    >
      <div className={`relative h-full w-full overflow-hidden rounded-[1.6rem] lg:rounded-[2rem] ${screenClass}`}>
        {/* Notch */}
        <div className="absolute left-1/2 top-2 z-20 h-[14px] w-[70px] -translate-x-1/2 rounded-full bg-ir-dark lg:h-[18px] lg:w-[86px]" />
        {children}
      </div>
    </motion.div>
  )
}

const SPARK = 'M0,44 L26,38 L52,41 L78,29 L104,33 L130,21 L156,24 L182,13 L208,17 L234,7 L260,4'

export default function HeroPhones() {
  return (
    <div className="relative mt-8 h-[400px] sm:h-[470px] lg:h-[600px] lg:mt-0" aria-hidden="true">
      {/* Soft glow behind the cluster */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ir-teal/[0.10] blur-[120px] lg:h-[460px] lg:w-[460px]" />

      {/* ── Back phone: a property in the portfolio ─────────────────────── */}
      {/* Hidden below `sm`. Two angled phones inside 375px overlap heavily and
          the back one gets clipped by the section's overflow-hidden, which
          reads as a mistake rather than a design. One phone, centred, is the
          better small-screen composition. */}
      <Phone
        rotate={-7}
        delay={0.45}
        className="hidden sm:block sm:left-0 sm:top-6 sm:h-[350px] sm:w-[178px] lg:h-[450px] lg:w-[228px]"
      >
        <div className="flex h-full flex-col">
          {/* Property image stands in as a gradient rather than a stock photo */}
          <div className="relative h-[42%] bg-gradient-to-br from-ir-teal/85 via-ir-teal-muted to-[#0c6d75]">
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,.5), transparent 55%)' }} />
            <span className="absolute left-2.5 top-5 rounded-full bg-white/95 px-2 py-[3px] text-[7px] font-semibold text-ir-dark lg:left-3 lg:top-7 lg:text-[9px]">
              Open for funding
            </span>
          </div>

          <div className="flex-1 px-2.5 pt-2.5 lg:px-3.5 lg:pt-3.5">
            <p className="text-[9px] font-bold leading-tight text-ir-dark lg:text-[12px]">2 Bed · Dubai Marina</p>
            <p className="mt-[2px] text-[7px] text-ir-dark/45 lg:text-[9px]">Residential · Fully managed</p>

            <div className="mt-2.5 space-y-1.5 lg:mt-3.5 lg:space-y-2">
              {[
                ['Property value', '$412,000'],
                ['Funded', '68%'],
                ['Minimum from', '$500'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="text-[7px] text-ir-dark/45 lg:text-[9px]">{k}</span>
                  <span className="font-mono text-[8px] font-semibold text-ir-dark lg:text-[10px]">{v}</span>
                </div>
              ))}
            </div>

            {/* Funding progress */}
            <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-ir-dark/8 lg:mt-3 lg:h-[4px]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '68%' }}
                transition={{ duration: 1.2, ease: EASE_PREMIUM, delay: 1.3 }}
                className="h-full rounded-full bg-ir-teal"
              />
            </div>

            <div className="mt-2.5 rounded-md bg-ir-teal py-[5px] text-center text-[7px] font-semibold text-white lg:mt-3.5 lg:rounded-lg lg:py-2 lg:text-[9px]">
              Invest
            </div>
          </div>
        </div>
      </Phone>

      {/* ── Front phone: the portfolio ──────────────────────────────────── */}
      {/* Centred on mobile via a calc offset rather than -translate-x-1/2:
          framer-motion writes `transform` inline for the rotation, so a
          Tailwind translate utility on the same element would be overwritten. */}
      <Phone
        rotate={5}
        delay={0.25}
        className="left-[calc(50%-86px)] top-0 z-10 h-[340px] w-[172px] sm:left-auto sm:right-0 sm:h-[400px] sm:w-[202px] lg:h-[520px] lg:w-[262px]"
      >
        <div className="flex h-full flex-col bg-[#0F1113] px-3 pt-8 lg:px-4 lg:pt-11">
          <p className="text-[7px] uppercase tracking-[0.14em] text-white/40 lg:text-[9px]">Portfolio value</p>
          <p className="mt-1 font-mono text-[20px] font-bold leading-none text-white lg:text-[28px]">$12,450</p>

          <div className="mt-1.5 flex items-center gap-1.5 lg:mt-2">
            <span className="rounded bg-ir-positive/15 px-1.5 py-[2px] font-mono text-[7px] font-bold text-ir-positive lg:text-[9px]">
              +8.2%
            </span>
            <span className="text-[7px] text-white/40 lg:text-[9px]">since you joined</span>
          </div>

          {/* Value over time */}
          <svg viewBox="0 0 260 50" className="mt-3 h-10 w-full lg:mt-4 lg:h-14" preserveAspectRatio="none">
            <defs>
              <linearGradient id="heroPhoneFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#01CED1" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#01CED1" stopOpacity="0" />
              </linearGradient>
            </defs>
            <motion.path
              d={SPARK}
              fill="none"
              stroke="#01CED1"
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.6, ease: EASE_PREMIUM, delay: 0.9 }}
            />
            <motion.path
              d={`${SPARK} L260,50 L0,50 Z`}
              fill="url(#heroPhoneFill)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.6 }}
            />
          </svg>

          <div className="mt-3 grid grid-cols-2 gap-1.5 lg:mt-4 lg:gap-2">
            {[
              ['Rent received', '$1,284'],
              ['Properties', '3'],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-white/[0.06] p-1.5 lg:p-2.5">
                <p className="text-[6px] text-white/40 lg:text-[8px]">{k}</p>
                <p className="mt-[2px] font-mono text-[10px] font-bold text-white lg:text-[13px]">{v}</p>
              </div>
            ))}
          </div>

          <div className="mt-2.5 space-y-1.5 lg:mt-3.5 lg:space-y-2">
            {[
              ['Dubai Marina', '$5,200'],
              ['Business Bay', '$4,100'],
              ['JVC', '$3,150'],
            ].map(([name, amount]) => (
              <div key={name} className="flex items-center gap-2">
                <div className="h-4 w-4 shrink-0 rounded bg-gradient-to-br from-ir-teal/80 to-ir-teal-muted lg:h-6 lg:w-6" />
                <span className="flex-1 truncate text-[7px] text-white/70 lg:text-[9px]">{name}</span>
                <span className="font-mono text-[7px] font-semibold text-white lg:text-[9px]">{amount}</span>
              </div>
            ))}
          </div>
        </div>
      </Phone>

      {/* ── Floating: rent landing ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 24, x: -16 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{ duration: 0.8, ease: EASE_PREMIUM, delay: 1.15 }}
        className="absolute -left-1 bottom-[64px] z-20 w-[186px] rounded-xl border border-ir-border-light bg-white p-2.5 shadow-[0_16px_44px_rgba(0,0,0,0.16)] sm:w-[210px] lg:bottom-[86px] lg:left-2 lg:w-[248px] lg:rounded-2xl lg:p-3.5"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ir-teal/15 lg:h-10 lg:w-10">
            <span className="text-[10px] font-bold text-ir-teal lg:text-xs">iR</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[8px] font-medium uppercase tracking-wider text-ir-dark/40 lg:text-[10px]">InReal</p>
            <p className="text-[10px] font-medium leading-tight text-ir-dark lg:text-[13px]">
              You've been paid <span className="font-mono font-bold text-ir-positive">$542</span> in rent
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Floating: monthly income ────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20, x: 16 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{ duration: 0.8, ease: EASE_PREMIUM, delay: 1.35 }}
        className="absolute -right-1 top-[38%] z-20 rounded-xl border border-ir-border-light bg-white px-3 py-2 shadow-[0_16px_44px_rgba(0,0,0,0.16)] lg:right-[-14px] lg:rounded-2xl lg:px-4 lg:py-3"
      >
        <p className="text-[7px] uppercase tracking-wider text-ir-dark/40 lg:text-[9px]">This month's rent</p>
        <p className="mt-[1px] font-mono text-[15px] font-bold leading-none text-ir-dark lg:text-[20px]">$542.00</p>
      </motion.div>
    </div>
  )
}
