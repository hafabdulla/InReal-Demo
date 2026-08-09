import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { EASE_PREMIUM } from '../animations'

// The hero's device cluster: two phones tilted in 3D showing a property and a
// portfolio, with cards floating between them.
//
// WHY IT LOOKS THE WAY IT DOES. The first version drew flat rectangles with a
// gradient where the photograph should be, and read as a wireframe rather than
// a product shot. What actually sells the illusion is a stack of small things:
// real perspective rather than a 2D rotate, a layered bezel with a metallic
// rim, a status bar, a glare sweep across the glass, side buttons, and a real
// photograph inside the screen. Any one of them missing and it reads as a mock.
//
// The photographs are the same Unsplash sources the rest of the site already
// uses, so this adds no new external dependency — and each sits on top of a
// gradient that shows through if the image ever fails, which is the failure the
// missing-logo incident was about.
//
// ON THE NUMBERS: every figure here is invented and is labelled as an
// illustration beneath the cluster. Deliberately none of them is a
// forward-looking return — property value, funded percentage, monthly rent and
// the minimum are all statements about how the product works rather than about
// what an investor will earn.

const IMG_PROPERTY = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=900&fit=crop&q=85'
const IMG_CARD = 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=400&fit=crop&q=85'

/** iOS-style status bar. A strong realism cue for almost no markup. */
function StatusBar({ dark = false }) {
  const tone = dark ? 'bg-white' : 'bg-ir-dark'
  const text = dark ? 'text-white' : 'text-ir-dark'
  return (
    <div className={`relative z-20 flex items-center justify-between px-4 pt-2 lg:px-5 lg:pt-2.5 ${text}`}>
      <span className="text-[8px] font-semibold lg:text-[11px]">9:41</span>
      <div className="flex items-center gap-[3px]">
        {/* signal */}
        <div className="flex items-end gap-[1.5px]">
          {[3, 5, 7, 9].map((h) => (
            <span key={h} className={`w-[2px] rounded-[1px] ${tone}`} style={{ height: h }} />
          ))}
        </div>
        {/* wifi */}
        <svg viewBox="0 0 16 12" className="ml-[2px] h-[8px] w-[11px]" fill="none">
          <path d="M8 10.2 6.2 8.4a2.6 2.6 0 0 1 3.6 0L8 10.2Z" className={dark ? 'fill-white' : 'fill-ir-dark'} />
          <path d="M4.4 6.6a5.1 5.1 0 0 1 7.2 0M1.8 4a8.8 8.8 0 0 1 12.4 0" stroke={dark ? '#fff' : '#121212'} strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        {/* battery */}
        <div className={`ml-[2px] flex h-[8px] w-[15px] items-center rounded-[2.5px] border ${dark ? 'border-white/70' : 'border-ir-dark/70'} p-[1.5px]`}>
          <span className={`h-full w-[70%] rounded-[1px] ${tone}`} />
        </div>
      </div>
    </div>
  )
}

/**
 * A device. The frame is three nested layers — metallic rim, black bezel, then
 * the screen — because a single border reads as a rectangle with a stroke.
 */
function Phone({ className, style, delay, children, screenClass = 'bg-white' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.1, ease: EASE_PREMIUM, delay }}
      style={{ transformPerspective: 1600, ...style }}
      className={`absolute rounded-[2.1rem] bg-gradient-to-br from-[#4a4e55] via-[#15171a] to-[#33373d] p-[2px] shadow-[0_45px_90px_-25px_rgba(10,20,30,0.45),0_25px_50px_-30px_rgba(10,20,30,0.4)] lg:rounded-[2.8rem] ${className}`}
    >
      {/* Black bezel */}
      <div className="relative h-full w-full rounded-[2rem] bg-[#0a0b0d] p-[5px] lg:rounded-[2.65rem] lg:p-[8px]">
        {/* Side buttons */}
        <span className="absolute -left-[2px] top-[19%] h-[26px] w-[2px] rounded-l bg-[#2c3037] lg:h-[34px]" />
        <span className="absolute -left-[2px] top-[30%] h-[40px] w-[2px] rounded-l bg-[#2c3037] lg:h-[52px]" />
        <span className="absolute -right-[2px] top-[26%] h-[46px] w-[2px] rounded-r bg-[#2c3037] lg:h-[60px]" />

        <div className={`relative h-full w-full overflow-hidden rounded-[1.7rem] lg:rounded-[2.25rem] ${screenClass}`}>
          {/* Dynamic Island */}
          <div className="absolute left-1/2 top-[6px] z-30 h-[13px] w-[46px] -translate-x-1/2 rounded-full bg-black lg:top-[9px] lg:h-[19px] lg:w-[66px]" />
          {children}
          {/* Glass glare — the single biggest cue that this is a screen and not
              a card. Non-interactive so it never eats a click. */}
          <div className="pointer-events-none absolute inset-0 z-40 bg-gradient-to-br from-white/[0.16] via-white/[0.02] to-transparent" />
          <div
            className="pointer-events-none absolute -left-[30%] top-0 z-40 h-full w-[55%] opacity-[0.13]"
            style={{ background: 'linear-gradient(105deg, transparent, #fff 45%, transparent)', transform: 'skewX(-14deg)' }}
          />
        </div>
      </div>
    </motion.div>
  )
}

/** Photo that falls back to whatever gradient sits behind it. */
function Photo({ src, className }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return <img src={src} alt="" loading="eager" onError={() => setFailed(true)} className={className} />
}

const SPARK = 'M0,45 L24,39 L48,42 L72,30 L96,34 L120,22 L144,26 L168,14 L192,18 L216,8 L240,4'

export default function HeroPhones() {
  return (
    <div className="relative mt-6 h-[420px] sm:h-[520px] lg:h-[640px] lg:mt-0" aria-hidden="true">
      {/* ── Back phone: a property ──────────────────────────────────────── */}
      <Phone
        delay={0.45}
        style={{ rotateX: 3, rotateY: 16, rotateZ: -7 }}
        className="hidden sm:block sm:left-[2%] sm:top-[9%] sm:h-[360px] sm:w-[186px] lg:left-0 lg:h-[468px] lg:w-[240px]"
      >
        <div className="flex h-full flex-col">
          <StatusBar />

          {/* Photograph, on a gradient that shows through if it fails */}
          <div className="relative mt-1 h-[38%] w-full overflow-hidden bg-gradient-to-br from-ir-teal/80 to-[#0b5f66]">
            <Photo src={IMG_PROPERTY} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
            <span className="absolute left-2.5 top-2.5 rounded-full bg-white/95 px-2 py-[3px] text-[7px] font-bold text-ir-dark lg:text-[9px]">
              Open for funding
            </span>
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-[3px]">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={`h-[3px] rounded-full ${i === 0 ? 'w-[9px] bg-white' : 'w-[3px] bg-white/55'}`} />
              ))}
            </div>
          </div>

          <div className="flex-1 px-3 pt-2.5 lg:px-4 lg:pt-3">
            <p className="text-[9.5px] font-bold leading-tight text-ir-dark lg:text-[12.5px]">2 Bed · Dubai Marina</p>
            <p className="mt-[1px] text-[7px] text-ir-dark/45 lg:text-[9px]">Residential · Fully managed</p>

            <p className="mt-2 font-mono text-[13px] font-bold text-ir-dark lg:mt-2.5 lg:text-[17px]">$412,000</p>

            <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-ir-dark/10 lg:h-[4px]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '68%' }}
                transition={{ duration: 1.3, ease: EASE_PREMIUM, delay: 1.4 }}
                className="h-full rounded-full bg-ir-teal"
              />
            </div>
            <p className="mt-1 text-[6.5px] text-ir-dark/45 lg:text-[8.5px]">68% funded · 41 investors</p>

            <div className="mt-2.5 space-y-[5px] border-t border-ir-dark/[0.07] pt-2 lg:mt-3 lg:space-y-[7px] lg:pt-2.5">
              {[
                ['Monthly rent', '$2,340'],
                ['Ownership from', '$500'],
                ['Managed by', 'InReal'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="text-[7px] text-ir-dark/45 lg:text-[9px]">{k}</span>
                  <span className="font-mono text-[7.5px] font-semibold text-ir-dark lg:text-[9.5px]">{v}</span>
                </div>
              ))}
            </div>

            <div className="mt-2.5 rounded-lg bg-ir-teal py-[6px] text-center text-[7.5px] font-bold text-white shadow-[0_4px_12px_rgba(1,206,209,0.35)] lg:mt-3.5 lg:py-2.5 lg:text-[10px]">
              Invest now
            </div>
          </div>
        </div>
      </Phone>

      {/* ── Front phone: the portfolio ──────────────────────────────────── */}
      <Phone
        delay={0.25}
        style={{ rotateX: 2, rotateY: -13, rotateZ: 5 }}
        screenClass="bg-[#0d0f12]"
        className="left-[calc(50%-97px)] top-[3%] z-10 h-[380px] w-[194px] sm:left-auto sm:right-[3%] sm:h-[430px] sm:w-[218px] lg:right-[2%] lg:h-[540px] lg:w-[276px]"
      >
        <div className="flex h-full flex-col">
          <StatusBar dark />

          <div className="px-3.5 pt-3 lg:px-4.5 lg:pt-4">
            <div className="flex items-center justify-between">
              <p className="text-[7.5px] uppercase tracking-[0.13em] text-white/40 lg:text-[9.5px]">Portfolio value</p>
              <span className="rounded-full bg-white/10 px-1.5 py-[2px] text-[6.5px] font-semibold text-white/70 lg:text-[8px]">USD</span>
            </div>
            <p className="mt-1.5 font-mono text-[24px] font-bold leading-none text-white lg:text-[33px]">$12,450</p>

            <div className="mt-2 flex items-center gap-1.5">
              <span className="rounded bg-ir-positive/20 px-1.5 py-[2px] font-mono text-[7px] font-bold text-ir-positive lg:text-[9px]">+8.2%</span>
              <span className="text-[7px] text-white/40 lg:text-[9px]">since you joined</span>
            </div>

            <svg viewBox="0 0 240 50" className="mt-3 h-11 w-full lg:mt-4 lg:h-16" preserveAspectRatio="none">
              <defs>
                <linearGradient id="heroPhoneFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#01CED1" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#01CED1" stopOpacity="0" />
                </linearGradient>
              </defs>
              <motion.path
                d={`${SPARK} L240,50 L0,50 Z`} fill="url(#heroPhoneFill)"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9, delay: 1.7 }}
              />
              <motion.path
                d={SPARK} fill="none" stroke="#01CED1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.7, ease: EASE_PREMIUM, delay: 1 }}
              />
            </svg>

            <div className="mt-3 grid grid-cols-2 gap-1.5 lg:mt-4 lg:gap-2">
              {[['Rent received', '$1,284'], ['Properties', '3']].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-white/[0.07] p-1.5 lg:rounded-xl lg:p-2.5">
                  <p className="text-[6px] text-white/40 lg:text-[8px]">{k}</p>
                  <p className="mt-[2px] font-mono text-[10.5px] font-bold text-white lg:text-[14px]">{v}</p>
                </div>
              ))}
            </div>

            <p className="mt-3 text-[6.5px] uppercase tracking-[0.12em] text-white/35 lg:mt-4 lg:text-[8.5px]">My properties</p>
            <div className="mt-1.5 space-y-1.5 lg:mt-2 lg:space-y-2.5">
              {[
                ['Dubai Marina', '$5,200', 'from-[#0fb6bd] to-[#0a7f86]'],
                ['Business Bay', '$4,100', 'from-[#26c6a6] to-[#12806c]'],
                ['JVC', '$3,150', 'from-[#4aa3d8] to-[#1f6ea3]'],
              ].map(([name, amount, grad]) => (
                <div key={name} className="flex items-center gap-2">
                  <div className={`h-5 w-5 shrink-0 rounded-md bg-gradient-to-br lg:h-7 lg:w-7 lg:rounded-lg ${grad}`} />
                  <span className="flex-1 truncate text-[7.5px] text-white/75 lg:text-[9.5px]">{name}</span>
                  <span className="font-mono text-[7.5px] font-semibold text-white lg:text-[9.5px]">{amount}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tab bar */}
          <div className="mt-auto flex items-center justify-around border-t border-white/[0.07] px-2 pb-2.5 pt-2 lg:pb-3.5 lg:pt-2.5">
            {['Explore', 'Portfolio', 'Wallet', 'Profile'].map((label, i) => (
              <div key={label} className="flex flex-col items-center gap-[3px]">
                <div className={`h-[9px] w-[9px] rounded-[2px] lg:h-3 lg:w-3 ${i === 1 ? 'bg-ir-teal' : 'bg-white/25'}`} />
                <span className={`text-[5px] lg:text-[7px] ${i === 1 ? 'text-ir-teal' : 'text-white/35'}`}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </Phone>

      {/* ── Floating: a property card between the two phones ────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE_PREMIUM, delay: 1.05 }}
        className="absolute left-[26%] top-[13%] z-20 hidden w-[128px] rounded-xl bg-white p-1.5 shadow-[0_22px_45px_-12px_rgba(10,20,30,0.35)] sm:block lg:left-[30%] lg:top-[15%] lg:w-[162px] lg:rounded-2xl lg:p-2"
        style={{ transformPerspective: 1200, rotateZ: -3 }}
      >
        <div className="relative h-[52px] w-full overflow-hidden rounded-lg bg-gradient-to-br from-[#1b6f8f] to-[#0d3f52] lg:h-[68px] lg:rounded-xl">
          <Photo src={IMG_CARD} className="h-full w-full object-cover" />
        </div>
        <p className="mt-1.5 px-0.5 text-[8px] font-bold leading-tight text-ir-dark lg:text-[10px]">Business Bay Tower</p>
        <div className="mt-[3px] flex items-center justify-between px-0.5 pb-0.5">
          <span className="text-[6.5px] text-ir-dark/45 lg:text-[8px]">Downtown Dubai</span>
          <span className="font-mono text-[7px] font-bold text-ir-positive lg:text-[9px]">Funded</span>
        </div>
      </motion.div>

      {/* ── Floating: rent landing ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 26, x: -18 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{ duration: 0.85, ease: EASE_PREMIUM, delay: 1.3 }}
        className="absolute bottom-[3%] left-0 z-30 w-[196px] rounded-xl border border-black/[0.04] bg-white/95 p-2.5 shadow-[0_22px_50px_-12px_rgba(10,20,30,0.3)] backdrop-blur-sm sm:w-[216px] lg:bottom-[6%] lg:left-[4%] lg:w-[262px] lg:rounded-2xl lg:p-3.5"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ir-teal/15 lg:h-10 lg:w-10">
            <span className="text-[10px] font-bold text-ir-teal lg:text-xs">iR</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[8px] font-semibold uppercase tracking-wider text-ir-dark/40 lg:text-[10px]">InReal</p>
            <p className="text-[10px] font-medium leading-tight text-ir-dark lg:text-[13px]">
              You've been paid <span className="font-mono font-bold text-ir-positive">$542</span> in rent
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Floating: this month's rent ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 18, x: 18 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{ duration: 0.85, ease: EASE_PREMIUM, delay: 1.5 }}
        className="absolute right-0 top-[44%] z-30 rounded-xl border border-black/[0.04] bg-white/95 px-3 py-2 shadow-[0_20px_45px_-12px_rgba(10,20,30,0.3)] backdrop-blur-sm lg:right-[-2%] lg:rounded-2xl lg:px-4 lg:py-3"
      >
        <p className="text-[7px] uppercase tracking-wider text-ir-dark/40 lg:text-[9px]">This month's rent</p>
        <p className="mt-[1px] font-mono text-[15px] font-bold leading-none text-ir-dark lg:text-[21px]">$542.00</p>
      </motion.div>
    </div>
  )
}
