import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, sectionViewport, EASE_PREMIUM, fadeUp, slideLeft, slideRight } from '../animations'

const PORTAL_URL = '#register'

const FEATURES = [
  {
    title: 'High-Yield Properties',
    takeaway: 'Only the best properties make the cut.',
    description: 'Every property is vetted for yield potential, tenant quality, and long-term value. Carefully selected assets in high-growth markets.',
    icon: <svg viewBox="0 0 40 40" fill="none" className="w-7 h-7"><rect x="4" y="12" width="32" height="24" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M4 18h32M14 12V8l6-4 6 4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><rect x="16" y="24" width="8" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" /></svg>
  },
  {
    title: 'Real Legal Ownership',
    takeaway: 'Real property rights. Protected by law.',
    description: 'You hold beneficial ownership through regulated corporate structures. Not IOUs, not tokens: real, documented rights to your share of rental income and appreciation.',
    icon: <svg viewBox="0 0 40 40" fill="none" className="w-7 h-7"><path d="M20 4L4 12v4c0 11.2 6.8 18.4 16 22 9.2-3.6 16-10.8 16-22v-4L20 4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M14 20l4 4 8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
  },
  {
    title: 'Isolated Portfolios',
    takeaway: 'One property\'s problems never touch another.',
    description: 'Each property sits in its own segregated portfolio, legally isolated so liabilities and losses are contained. Your investments stay protected, property by property.',
    icon: <svg viewBox="0 0 40 40" fill="none" className="w-7 h-7"><rect x="4" y="4" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" /><rect x="22" y="4" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" /><rect x="4" y="22" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" /><rect x="22" y="22" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" /></svg>
  },
  {
    title: 'Fully Managed',
    takeaway: 'You invest. We operate. You earn.',
    description: 'Tenant sourcing, maintenance, insurance, compliance, all handled. You never call a plumber or chase rent again.',
    icon: <svg viewBox="0 0 40 40" fill="none" className="w-7 h-7"><circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="1.5" /><path d="M20 12v8l6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
  },
  {
    title: 'Transparent Fees',
    takeaway: 'What you see is what you pay.',
    description: 'Published fee schedule. No hidden charges. You know every cost before you invest. Model them all in our calculator above.',
    icon: <svg viewBox="0 0 40 40" fill="none" className="w-7 h-7"><path d="M8 8h24v28H8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M8 8l4-4h24v28l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M14 16h12M14 22h8M14 28h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
  },
  {
    title: 'Global Diversification',
    takeaway: 'Spread your risk across markets.',
    description: 'Split your real estate exposure across multiple high-growth markets in two clicks. Cross-border legal and tax complexity, handled.',
    icon: <svg viewBox="0 0 40 40" fill="none" className="w-7 h-7"><circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="1.5" /><ellipse cx="20" cy="20" rx="8" ry="16" stroke="currentColor" strokeWidth="1.5" /><path d="M4 20h32M6 12h28M6 28h28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
  },
]

export default function WhyInReal() {
  return (
    <section id="why-inreal" className="ir-section bg-ir-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none"><div className="absolute bottom-0 left-[20%] w-[700px] h-[400px] rounded-full bg-ir-teal/[0.04] blur-[140px]" /></div>

      <div className="ir-container relative z-10">
        {/* Header */}
        <motion.div variants={staggerContainer(0.1)} initial="hidden" whileInView="visible" viewport={sectionViewport} className="text-center max-w-[760px] mx-auto mb-12 md:mb-16 lg:mb-20">
          <motion.span variants={staggerItem} className="ir-overline block mb-4 md:mb-5">WHY INREAL</motion.span>
          <motion.h2 variants={staggerItem} className="ir-section-title">Built for investors who<br /><span className="ir-teal-text">value security</span></motion.h2>
          <motion.p variants={staggerItem} className="mt-5 md:mt-6 text-body md:text-h4 font-normal text-ir-dark/55">Real structure. Real protections. Full transparency.</motion.p>
        </motion.div>

        {/* Editorial hero block */}
        <div className="grid lg:grid-cols-[1fr,1.1fr] gap-10 md:gap-12 lg:gap-20 items-center mb-16 md:mb-20 lg:mb-24">
          <motion.div variants={slideLeft} initial="hidden" whileInView="visible" viewport={sectionViewport} className="relative mb-6 lg:mb-0">
            <div className="relative aspect-[4/5] sm:aspect-[5/4] lg:aspect-[4/5] rounded-[16px] md:rounded-[20px] overflow-hidden shadow-[0_14px_40px_rgba(0,0,0,0.1)] lg:shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
              <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=900&h=1100&fit=crop&q=85" alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-ir-dark/20 via-transparent to-transparent" />
            </div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.5 }} className="absolute -bottom-6 right-2 md:-right-4 bg-white rounded-xl md:rounded-2xl p-4 md:p-5 shadow-[0_14px_40px_rgba(0,0,0,0.1)] lg:shadow-[0_20px_50px_rgba(0,0,0,0.12)] border border-ir-border-light max-w-[240px] md:max-w-[280px]">
              <div className="flex items-center gap-2.5 md:gap-3 mb-2">
                <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-ir-teal/15 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 md:w-5 md:h-5 text-ir-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
                <div>
                  <p className="text-caption text-ir-dark/50 font-medium">Regulated Structure</p>
                  <p className="text-body-sm text-ir-dark font-bold">BVI Business Company</p>
                </div>
              </div>
              <p className="text-caption text-ir-dark/55 leading-relaxed">Isolated portfolios. Independent custody. Real ownership protection.</p>
            </motion.div>
          </motion.div>

          <motion.div variants={slideRight} initial="hidden" whileInView="visible" viewport={sectionViewport}>
            <h3 className="text-[clamp(1.5rem,5vw,2.625rem)] font-bold tracking-[-0.02em] text-ir-dark leading-[1.15] mb-4 md:mb-6">Your ownership, protected at every layer.</h3>
            <p className="text-body md:text-h4 font-normal text-ir-dark/60 leading-relaxed mb-7 md:mb-8">Every investment on InReal is backed by real legal structure. Properties sit in isolated portfolios, so one underperformer never drags down another. You always know what you own and what you pay.</p>

            <div className="space-y-5">
              {FEATURES.slice(0, 3).map((f) => (
                <motion.div key={f.title} whileHover={{ x: 4 }} transition={{ duration: 0.3 }} className="flex gap-3 md:gap-4">
                  <div className="shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-xl bg-ir-teal/10 text-ir-teal flex items-center justify-center">{f.icon}</div>
                  <div>
                    <h4 className="text-h4 text-ir-dark font-bold mb-1">{f.takeaway}</h4>
                    <p className="text-body-sm text-ir-dark/55 leading-relaxed"><span className="text-ir-dark/75 font-medium">{f.title}.</span> {f.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Remaining 3 features */}
        <motion.div variants={staggerContainer(0.08)} initial="hidden" whileInView="visible" viewport={sectionViewport} className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 py-8 md:py-10 border-y border-ir-border-light">
          {FEATURES.slice(3).map((f) => (
            <motion.div key={f.title} variants={staggerItem} className="flex gap-3 md:gap-4">
              <div className="shrink-0 w-11 h-11 rounded-xl bg-ir-teal/10 text-ir-teal flex items-center justify-center">{f.icon}</div>
              <div>
                <h4 className="text-h4 text-ir-dark font-bold mb-1">{f.takeaway}</h4>
                <p className="text-body-sm text-ir-dark/55 leading-relaxed"><span className="text-ir-dark/75 font-medium">{f.title}.</span> {f.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Dark callout */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={sectionViewport} className="mt-14 md:mt-20 relative overflow-hidden rounded-[16px] md:rounded-[24px] bg-ir-dark p-8 md:p-12 lg:p-14 text-center">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: `radial-gradient(circle at 30% 50%, rgba(1,206,209,0.2), transparent 50%), radial-gradient(circle at 70% 50%, rgba(1,206,209,0.15), transparent 50%)` }} />
          <div className="relative z-10 max-w-[640px] mx-auto">
            <p className="text-[clamp(1.5rem,5vw,2.5rem)] font-bold text-white tracking-[-0.02em] leading-[1.15] mb-4">Full control over every investment decision.</p>
            <p className="text-body md:text-h4 font-normal text-ir-white/65 mb-7 md:mb-8">InReal does not operate like REITs or funds. You choose each property individually, with full control over your portfolio and your returns.</p>
            <a href={PORTAL_URL} className="ir-btn-primary text-body !px-7 md:!px-8 !py-3.5 group">See Available Properties <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg></a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}