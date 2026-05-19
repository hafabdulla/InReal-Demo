import { motion } from 'framer-motion'
import { fadeUp, staggerContainer, staggerItem, sectionViewport, slideLeft, slideRight } from '../animations'

const PORTAL_URL = '#register'

// --- InReal Dashboard — "My Wallet" / Earn screen ---
function EarnDashboardRender() {
  return (
    <div className="w-full h-full bg-ir-white relative flex">
      {/* Sidebar — hidden on mobile to give content room */}
      <div className="hidden sm:flex w-[140px] bg-ir-dark flex-col py-5 px-4 flex-shrink-0">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-6 h-6 rounded bg-ir-teal flex items-center justify-center"><span className="text-[10px] font-bold text-ir-dark">iR</span></div>
          <span className="text-[13px] text-white font-bold">InReal</span>
        </div>
        <div className="space-y-1">
          {[
            { label: 'Portfolio', active: false },
            { label: 'Properties', active: false },
            { label: 'Wallet', active: true },
            { label: 'Activity', active: false },
            { label: 'Settings', active: false },
          ].map((item, i) => (
            <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded text-[10px] font-medium ${item.active ? 'bg-ir-teal/15 text-ir-teal' : 'text-white/50'}`}>
              <div className={`w-1 h-1 rounded-full ${item.active ? 'bg-ir-teal' : 'bg-white/30'}`} />
              {item.label}
            </div>
          ))}
        </div>
        <div className="mt-auto flex items-center gap-2 pt-3 border-t border-white/10">
          <div className="w-6 h-6 rounded-full bg-white/10" />
          <div>
            <p className="text-[9px] text-white font-medium">Alex Chen</p>
            <p className="text-[7px] text-white/40">Investor</p>
          </div>
        </div>
      </div>
      {/* Main */}
      <div className="flex-1 p-3 sm:p-5 bg-ir-surface-light overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-body text-ir-dark font-bold">My Wallet</p>
            <p className="text-[9px] text-ir-dark/50">Earnings and distributions</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-ir-negative" />
            </div>
            <div className="w-6 h-6 rounded-full bg-ir-teal/15" />
          </div>
        </div>

        {/* Top balance card */}
        <div className="bg-white rounded-lg p-3 mb-2.5 border border-ir-border-light">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[8px] text-ir-dark/50 uppercase tracking-wider font-medium mb-0.5">Available Balance</p>
              <p className="text-[20px] text-ir-dark font-mono font-bold leading-none">$1,847.50</p>
            </div>
            <div className="flex gap-1.5">
              <div className="px-2 py-1 rounded bg-ir-teal text-[8px] text-ir-dark font-semibold">Withdraw</div>
              <div className="px-2 py-1 rounded bg-ir-dark text-[8px] text-white font-semibold">Reinvest</div>
            </div>
          </div>
        </div>

        {/* Rent received notification */}
        <div className="bg-ir-teal/10 border border-ir-teal/25 rounded-lg p-2.5 mb-2.5 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-ir-teal/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-ir-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8m-4-4h8" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] text-ir-dark font-semibold">Rent received</p>
            <p className="text-[7px] text-ir-dark/55 truncate">Sukhumvit 2BR · 3 minutes ago</p>
          </div>
          <p className="text-[11px] text-ir-positive font-mono font-bold flex-shrink-0">+$45.50</p>
        </div>

        {/* Recent payouts list */}
        <div className="bg-white rounded-lg border border-ir-border-light overflow-hidden">
          <div className="px-3 py-2 border-b border-ir-border-light flex items-center justify-between">
            <p className="text-[9px] text-ir-dark font-semibold">Monthly Payouts</p>
            <p className="text-[8px] text-ir-teal font-medium">View All</p>
          </div>
          {[
            { prop: 'Sukhumvit 2BR', loc: 'Bangkok', date: 'Apr 2026', amt: '+$45.50' },
            { prop: 'Dubai Marina 1BR', loc: 'Dubai', date: 'Apr 2026', amt: '+$72.00' },
            { prop: 'Sukhumvit 2BR', loc: 'Bangkok', date: 'Mar 2026', amt: '+$45.50' },
            { prop: 'Dubai Marina 1BR', loc: 'Dubai', date: 'Mar 2026', amt: '+$71.80' },
          ].map((t, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-1.5 border-b border-ir-border-light last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded bg-ir-surface-light flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] text-ir-dark font-medium truncate">{t.prop}</p>
                  <p className="text-[7px] text-ir-dark/45">{t.loc} · {t.date}</p>
                </div>
              </div>
              <p className="text-[10px] text-ir-positive font-mono font-semibold flex-shrink-0 ml-2">{t.amt}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// --- InReal Dashboard — "My Investments" / Grow screen ---
function GrowDashboardRender() {
  return (
    <div className="w-full h-full bg-ir-white relative flex">
      {/* Sidebar — hidden on mobile */}
      <div className="hidden sm:flex w-[140px] bg-ir-dark flex-col py-5 px-4 flex-shrink-0">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-6 h-6 rounded bg-ir-teal flex items-center justify-center"><span className="text-[10px] font-bold text-ir-dark">iR</span></div>
          <span className="text-[13px] text-white font-bold">InReal</span>
        </div>
        <div className="space-y-1">
          {[
            { label: 'Portfolio', active: true },
            { label: 'Properties', active: false },
            { label: 'Wallet', active: false },
            { label: 'Activity', active: false },
            { label: 'Settings', active: false },
          ].map((item, i) => (
            <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded text-[10px] font-medium ${item.active ? 'bg-ir-teal/15 text-ir-teal' : 'text-white/50'}`}>
              <div className={`w-1 h-1 rounded-full ${item.active ? 'bg-ir-teal' : 'bg-white/30'}`} />
              {item.label}
            </div>
          ))}
        </div>
        <div className="mt-auto flex items-center gap-2 pt-3 border-t border-white/10">
          <div className="w-6 h-6 rounded-full bg-white/10" />
          <div>
            <p className="text-[9px] text-white font-medium">Alex Chen</p>
            <p className="text-[7px] text-white/40">Investor</p>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 p-3 sm:p-5 bg-ir-surface-light overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-body text-ir-dark font-bold">My Portfolio</p>
            <p className="text-[9px] text-ir-dark/50">Performance overview</p>
          </div>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {[
            { label: 'Total Invested', val: '$12,450', c: 'text-ir-dark' },
            { label: 'Current Value', val: '$13,605', c: 'text-ir-dark' },
            { label: 'Total Gains', val: '+$1,155', c: 'text-ir-positive' },
            { label: 'Avg. Return', val: '9.3%', c: 'text-ir-teal' },
          ].map((m, i) => (
            <div key={i} className="bg-white rounded-lg p-1.5 border border-ir-border-light">
              <p className="text-[7px] text-ir-dark/50 font-medium mb-0.5 leading-tight">{m.label}</p>
              <p className={`text-[11px] font-mono font-bold ${m.c} leading-none`}>{m.val}</p>
            </div>
          ))}
        </div>

        {/* Main chart */}
        <div className="bg-white rounded-lg p-3 mb-2.5 border border-ir-border-light">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[8px] text-ir-dark/50 uppercase tracking-wider font-medium">Portfolio Growth · 12mo</p>
              <p className="text-[16px] font-bold text-ir-dark font-mono leading-none mt-0.5">$13,605.00</p>
            </div>
            <div className="flex gap-1">
              {['1M', '6M', '1Y', 'All'].map((t, i) => (<span key={i} className={`text-[7px] px-1.5 py-0.5 rounded ${i === 2 ? 'bg-ir-teal/15 text-ir-teal' : 'text-ir-dark/40'}`}>{t}</span>))}
            </div>
          </div>
          <svg viewBox="0 0 320 70" className="w-full h-14">
            <defs><linearGradient id="gdg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#01CED1" stopOpacity="0.3" /><stop offset="100%" stopColor="#01CED1" stopOpacity="0" /></linearGradient></defs>
            <path d="M0,60 L30,55 L55,58 L85,48 L115,50 L145,42 L175,38 L200,30 L225,32 L255,22 L285,14 L320,8" fill="none" stroke="#01CED1" strokeWidth="2" strokeLinecap="round" />
            <path d="M0,60 L30,55 L55,58 L85,48 L115,50 L145,42 L175,38 L200,30 L225,32 L255,22 L285,14 L320,8 L320,70 L0,70 Z" fill="url(#gdg)" />
            <circle cx="320" cy="8" r="2.5" fill="#01CED1" />
          </svg>
          <div className="flex justify-between mt-1 text-[7px] text-ir-dark/30 font-mono">
            <span>May</span><span>Jul</span><span>Sep</span><span>Nov</span><span>Jan</span><span>Mar</span>
          </div>
        </div>

        {/* Holdings */}
        <div className="bg-white rounded-lg border border-ir-border-light overflow-hidden">
          <div className="px-3 py-2 border-b border-ir-border-light">
            <p className="text-[9px] text-ir-dark font-semibold">My Investments</p>
          </div>
          {[
            { p: 'Sukhumvit 2BR', l: 'Bangkok', v: '$4,150', r: '+9.4%' },
            { p: 'Dubai Marina 1BR', l: 'Dubai', v: '$5,800', r: '+7.4%' },
            { p: 'Orchard Studio', l: 'Singapore', v: '$2,500', r: '+5.8%' },
          ].map((h, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-1.5 border-b border-ir-border-light last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded bg-ir-surface-light flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] text-ir-dark font-medium truncate">{h.p}</p>
                  <p className="text-[7px] text-ir-dark/45">{h.l}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <p className="text-[9px] text-ir-dark font-mono font-semibold">{h.v}</p>
                <p className="text-[7px] text-ir-positive font-mono">{h.r}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const STEPS = [
  {
    number: '01',
    label: 'Browse',
    title: 'Access prime real estate across global markets',
    description: 'Sign up in less than 3 minutes and browse our curated collection of high-yield properties, sourced by experts across multiple jurisdictions.',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&h=700&fit=crop&q=85',
    type: 'image',
    badge: '12+ Properties Live',
  },
  {
    number: '02',
    label: 'Invest',
    title: 'Own a piece of the ones you love, from only $500',
    description: 'Skip the hassle. Buy shares in your favorite properties, no matter where you are in the world. Clear terms, transparent fees, real ownership.',
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=900&h=700&fit=crop&q=85',
    type: 'image',
    badge: 'From $500',
  },
  {
    number: '03',
    label: 'Earn',
    title: 'Enjoy regular passive income with zero effort',
    description: 'Sit back and earn consistent rental income from your real estate portfolio. Distributions paid directly to your InReal wallet every month.',
    type: 'render-earn',
    badge: 'Monthly Payouts',
  },
  {
    number: '04',
    label: 'Grow',
    title: 'Watch your wealth compound over time',
    description: 'Track performance in real time through your dashboard. Diversify across markets. Exit when you are ready. Your portfolio, your returns.',
    type: 'render-grow',
    badge: 'Real-Time Tracking',
  },
]

function StepRow({ step, index }) {
  const isReverse = index % 2 === 1
  return (
    <motion.div variants={staggerContainer(0.15)} initial="hidden" whileInView="visible" viewport={sectionViewport} className={`grid lg:grid-cols-2 gap-7 lg:gap-14 items-center ${isReverse ? 'lg:[direction:rtl]' : ''}`}>
      <motion.div variants={isReverse ? slideRight : slideLeft} className="lg:[direction:ltr] relative">
        <div className="relative aspect-[4/3] rounded-[16px] lg:rounded-[20px] overflow-hidden shadow-[0_14px_40px_rgba(0,0,0,0.1)] lg:shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-ir-border-light bg-white">
          {step.type === 'image' && (
            <>
              <img src={step.image} alt={step.title} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-ir-dark/25 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 lg:bottom-5 lg:left-5 bg-white/95 backdrop-blur-md rounded-lg lg:rounded-xl px-3 py-2 lg:px-4 lg:py-2.5 shadow-md flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-ir-teal animate-glow-pulse" />
                <span className="text-caption lg:text-body-sm text-ir-dark font-semibold">{step.badge}</span>
              </div>
            </>
          )}
          {step.type === 'render-earn' && <EarnDashboardRender />}
          {step.type === 'render-grow' && <GrowDashboardRender />}
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="lg:[direction:ltr]">
        <div className="flex items-center gap-3 mb-3 lg:mb-4">
          <div className="ir-accent-bar" />
          <span className="ir-overline">STEP {step.number} · {step.label.toUpperCase()}</span>
        </div>
        <h3 className="text-[clamp(1.5rem,5vw,2.625rem)] font-bold tracking-[-0.02em] text-ir-dark leading-[1.15] mb-3 lg:mb-5">{step.title}</h3>
        <p className="text-body md:text-h4 font-normal text-ir-dark/60 leading-relaxed">{step.description}</p>
      </motion.div>
    </motion.div>
  )
}

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="ir-section bg-ir-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-[30%] w-[700px] h-[400px] rounded-full bg-ir-teal/[0.03] blur-[140px]" />
      </div>
      <div className="ir-container relative z-10">
        <motion.div variants={staggerContainer(0.1)} initial="hidden" whileInView="visible" viewport={sectionViewport} className="text-center max-w-[760px] mx-auto mb-12 md:mb-16 lg:mb-20">
          <motion.span variants={staggerItem} className="ir-overline block mb-4 md:mb-5">HOW IT WORKS</motion.span>
          <motion.h2 variants={staggerItem} className="ir-section-title">Earn rental income.<br /><span className="ir-teal-text">Build real wealth.</span></motion.h2>
          <motion.p variants={staggerItem} className="mt-5 md:mt-6 text-body md:text-h4 font-normal text-ir-dark/55 leading-relaxed">No paperwork. No lawyers. No property management. We handle the complexity so you don't have to.</motion.p>
        </motion.div>

        <div className="space-y-14 md:space-y-20 lg:space-y-28">
          {STEPS.map((step, i) => <StepRow key={step.number} step={step} index={i} />)}
        </div>

        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={sectionViewport} className="mt-14 md:mt-20 text-center">
          <a href={PORTAL_URL} className="ir-btn-primary text-body !px-8 md:!px-10 !py-3.5 md:!py-4 group">Create Your Free Account <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg></a>
        </motion.div>
      </div>
    </section>
  )
}