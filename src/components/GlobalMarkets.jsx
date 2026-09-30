import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, sectionViewport, EASE_PREMIUM } from '../animations'

// Four cards, all presented as places you could already invest, until 30 Sep
// 2026. One property exists and it is in Bangkok, so three of the four were
// claims the platform could not meet. Each card now carries its real status.
//
// The United States card was removed outright rather than relabelled. PO-6
// excludes US persons from Phase 1 with no exceptions, and the footer carries
// the Regulation S line — so the one market InReal will not serve was being
// advertised as "the deepest and most liquid real estate market globally",
// directly to the readers it has to turn away.
//
// `status: 'Planned'` on Dubai and Singapore is the assumption to check. It
// asserts intent, and nobody has confirmed either is actually on the roadmap.
// If they are not, this section should be Bangkok alone.
const MARKETS = [
  {
    code: 'TH',
    region: 'Southeast Asia',
    city: 'Bangkok',
    status: 'Live',
    highlight: 'High rental yields in one of Asia\'s fastest-growing economies',
    // Mahanakhon tower / Bangkok CBD skyline with high-rise towers
    image: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=900&h=1200&fit=crop&q=90',
  },
  {
    code: 'AE',
    region: 'Middle East',
    city: 'Dubai',
    status: 'Planned',
    highlight: 'Zero property tax jurisdiction with strong capital appreciation',
    // Dubai Marina — iconic residential high-rise cluster
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=900&h=1200&fit=crop&q=90',
  },
  {
    code: 'SG',
    region: 'Asia-Pacific',
    city: 'Singapore',
    status: 'Planned',
    highlight: 'World-class legal protections and a stable, mature market',
    // Singapore CBD skyline with premium residential/commercial towers
    image: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=900&h=1200&fit=crop&q=90',
  },
]

export default function GlobalMarkets() {
  return (
    <section className="ir-section ir-section-alt relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none"><div className="absolute top-[30%] right-[10%] w-[500px] h-[500px] rounded-full bg-ir-teal/[0.04] blur-[140px]" /></div>

      <div className="ir-container relative z-10">
        <motion.div variants={staggerContainer(0.1)} initial="hidden" whileInView="visible" viewport={sectionViewport} className="text-center max-w-[760px] mx-auto mb-10 md:mb-14">
          <motion.span variants={staggerItem} className="ir-overline block mb-4 md:mb-5">GLOBAL ACCESS</motion.span>
          <motion.h2 variants={staggerItem} className="ir-section-title">One platform for all your <span className="ir-teal-text">real estate investments</span></motion.h2>
          <motion.p variants={staggerItem} className="mt-5 md:mt-6 text-body md:text-h4 font-normal text-ir-dark/55">Our pilot property is in Bangkok. As InReal opens new markets, every one of them sits behind a single login and one dashboard.</motion.p>
        </motion.div>

        <motion.div variants={staggerContainer(0.1)} initial="hidden" whileInView="visible" viewport={sectionViewport} className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
          {MARKETS.map((m) => (
            <motion.div key={m.region} variants={staggerItem} whileHover={{ y: -6, transition: { duration: 0.3, ease: EASE_PREMIUM } }} className="group cursor-pointer">
              <div className="relative aspect-[3/4] rounded-[12px] md:rounded-[16px] overflow-hidden shadow-[0_6px_20px_rgba(0,0,0,0.08)] md:shadow-[0_8px_24px_rgba(0,0,0,0.1)] transition-shadow duration-500 group-hover:shadow-[0_20px_50px_rgba(1,206,209,0.15)]">
                <img src={m.image} alt={m.city} onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=900&h=1200&fit=crop&q=90' }} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-ir-dark via-ir-dark/40 to-transparent" />
                <div className="absolute top-3 left-3 md:top-4 md:left-4 px-2 md:px-2.5 py-0.5 md:py-1 rounded-md bg-white/95 backdrop-blur-sm text-[9px] md:text-[10px] text-ir-dark font-bold tracking-wider shadow-sm">
                  {m.code}
                </div>
                {/* Without this a planned market is indistinguishable from the
                    one you can actually invest in today. */}
                <div className={`absolute top-3 right-3 md:top-4 md:right-4 px-2 md:px-2.5 py-0.5 md:py-1 rounded-md text-[9px] md:text-[10px] font-bold tracking-wider shadow-sm ${m.status === 'Live' ? 'bg-ir-teal text-ir-dark' : 'bg-ir-dark/70 backdrop-blur-sm text-white/85'}`}>
                  {m.status}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3 md:p-5">
                  <p className="text-[9px] md:text-caption text-ir-teal font-bold uppercase tracking-wider mb-0.5 md:mb-1">{m.region}</p>
                  <h3 className="text-h4 md:text-h3 text-white font-bold mb-1 md:mb-2">{m.city}</h3>
                  <p className="text-caption md:text-body-sm text-white/85 leading-snug">{m.highlight}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}