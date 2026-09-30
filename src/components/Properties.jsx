import React from 'react';
import { motion } from 'framer-motion';
import { fadeUp, staggerContainer, staggerItem, cardHover } from '@/animations';

const PORTAL_URL = '#register';

// Mobile-friendly viewport settings for animations
const mobileViewport = { 
  once: true, 
  amount: 0.1,
  margin: "0px 0px -100px 0px"
};

// The pilot property, and a placeholder for the next one.
//
// Replaced the three invented properties (Bangkok / Dubai Marina / Orchard
// Studio) on 30 Sep 2026 at the product owner's request — see PO-21. Every
// figure below now comes from the investor collateral for The Base Sukhumvit
// 77 rather than being made up to fill a card:
//
//   property value      THB 2,550,000 ≈ $77,300
//   target annual yield 7–9%
//   annual appreciation 3–5%
//   avg. annual ROI     8.1%   (net of the ~40% all-in cost and fee load)
//   minimum ticket      $3,000
//
// `fundedPct: 0` is deliberate and is the one figure to confirm with the PO
// before this goes in front of prospects. No subscription has settled on the
// platform, so 0% is what is true here; if the raise is partly away offline,
// it is the PO's number to give, not one to guess.
//
// DO NOT put a second named property here until one actually exists. The
// "Coming Soon" card below is a placeholder on purpose — it names no building
// and quotes no figure it cannot support.
const ALL_PROPERTIES = [
  {
    id: 'bkk-base-sukhumvit-77',
    title: 'The Base Sukhumvit 77',
    location: 'On Nut, Bangkok',
    flag: '🇹🇭',
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=900&h=700&fit=crop&q=85',
    targetYield: '7–9%',
    appreciation: '3–5%',
    // Stated rather than derived. See the note on tgtRoi in PropertyCard.
    tgtRoi: '8.1%',
    minInvestment: '$3,000',
    propertyValue: '$77,300',
    fundedPct: 0,
    status: 'Open',
  },
  {
    id: 'bkk-next-property',
    title: 'Next Bangkok Property',
    location: 'Bangkok, Thailand',
    flag: '🇹🇭',
    image: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=900&h=700&fit=crop&q=85',
    targetYield: '7–9%',
    appreciation: '3–5%',
    tgtRoi: '',
    minInvestment: '$3,000',
    propertyValue: 'TBC',
    fundedPct: 0,
    status: 'Coming Soon',
  },
];

const PROPERTIES = ALL_PROPERTIES.slice(0, 3);

function PropertyCard({ property: p }) {
  const isOpen = p.status === 'Open';
  // This badge used to be target yield + target appreciation, presented as an
  // APY. That is not an APY: both inputs are gross, and the collateral's own
  // headline for The Base 77 is 8.1% a year *after* the ~40% cost and fee
  // load. Summing the two tiles would have put 12%+ on the card for the same
  // property the deck describes as 8.1% — an overstatement on a financial
  // page, and about a real property rather than a generic one.
  //
  // So a property may state its own figure, and one with nothing to state
  // shows no badge at all rather than a number derived from the wrong parts.
  const tgtRoi = p.tgtRoi !== undefined
    ? p.tgtRoi
    : `${(parseFloat(p.targetYield) + parseFloat(p.appreciation)).toFixed(1)}%`;
  return (
    <motion.div 
      variants={staggerItem} 
      whileHover="hover" 
      initial="rest" 
      animate="rest" 
      className="group w-full"
    >
      <motion.div variants={cardHover} className="ir-card-elevated !p-5 h-full flex flex-col w-full">
        <div className="relative aspect-[16/10] rounded-ir overflow-hidden mb-5 w-full">
          <img src={p.image} alt={p.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
          <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-ir text-caption font-semibold ${isOpen ? 'bg-ir-teal text-ir-dark shadow-sm' : 'bg-ir-caution text-white shadow-sm'}`}>
            {isOpen ? `${p.fundedPct}% Funded` : 'Coming Soon'}
          </div>
          {tgtRoi && (
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-ir bg-white/95 backdrop-blur-sm text-caption text-ir-dark font-semibold shadow-sm">
              {tgtRoi} Tgt. Annual ROI
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col w-full">
          <h3 className="text-h4 text-ir-dark font-bold leading-snug mb-1">{p.title}</h3>
          <p className="text-body-sm text-ir-dark/50 flex items-center gap-1.5 mb-5"><span className="text-caption font-medium px-1.5 py-0.5 rounded bg-ir-surface-light text-ir-dark/60">{p.flag}</span>{p.location}</p>

          <div className="grid grid-cols-2 gap-2.5 mb-5 w-full">
            <div className="bg-white border border-ir-border-light rounded-ir p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <p className="text-caption text-ir-dark/50 mb-1 font-medium">Tgt. Rental Yield</p>
              <p className="text-h4 text-ir-teal font-mono font-bold leading-none">{p.targetYield}</p>
            </div>
            <div className="bg-white border border-ir-border-light rounded-ir p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <p className="text-caption text-ir-dark/50 mb-1 font-medium">Min. Investment</p>
              <p className="text-h4 text-ir-dark font-mono font-bold leading-none">{p.minInvestment}</p>
            </div>
            <div className="bg-white border border-ir-border-light rounded-ir p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <p className="text-caption text-ir-dark/50 mb-1 font-medium">Property Value</p>
              <p className="text-body text-ir-dark font-mono font-bold leading-none">{p.propertyValue}</p>
            </div>
            <div className="bg-white border border-ir-border-light rounded-ir p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <p className="text-caption text-ir-dark/50 mb-1 font-medium">Tgt. Appreciation</p>
              <p className="text-body text-ir-positive font-mono font-bold leading-none">{p.appreciation}</p>
            </div>
          </div>

          {/* Only for a property actually open for subscription. On a "Coming
              Soon" card this rendered "0% Funded / 100% Available", which
              reads as an open raise on a property that does not exist yet. */}
          {isOpen && (
          <div className="mb-5 w-full">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-caption text-ir-dark/60 font-semibold">{p.fundedPct}% Funded</p>
              <p className="text-caption text-ir-teal font-mono font-bold">{100 - p.fundedPct}% Available</p>
            </div>
            <div className="h-1.5 bg-ir-border-light rounded-full overflow-hidden w-full">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${p.fundedPct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                className="h-full bg-ir-teal rounded-full"
              />
            </div>
          </div>
          )}

          <a href={PORTAL_URL} className="mt-auto w-full ir-btn-dark text-body-sm !py-3 group/btn">
            View Property Details
            <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover/btn:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Properties() {
  return (
    <section id="properties" className="ir-section ir-section-alt relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden"><div className="absolute -top-[10%] right-[10%] w-[600px] h-[600px] rounded-full bg-ir-teal/[0.04] blur-[140px]" /></div>
      <div className="ir-container relative z-10">
        <motion.div 
          variants={staggerContainer(0.1)} 
          initial="hidden" 
          whileInView="visible" 
          viewport={mobileViewport} 
          className="flex flex-col md:flex-row md:items-end justify-between gap-5 md:gap-6 mb-10 md:mb-14"
        >
          <div>
            <motion.span variants={staggerItem} className="ir-overline block mb-4 md:mb-5">FEATURED PROPERTIES</motion.span>
            <motion.h2 variants={staggerItem} className="ir-section-title">Own real estate.<br className="hidden md:block" /> <span className="ir-teal-text">Share by share.</span></motion.h2>
          </div>
          <motion.div variants={staggerItem}>
            <a href={PORTAL_URL} className="inline-flex items-center gap-2 text-body text-ir-dark hover:text-ir-teal transition-colors group font-medium">
              View All Properties
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </a>
          </motion.div>
        </motion.div>

        <motion.div 
          variants={staggerContainer(0.12)} 
          initial="hidden" 
          whileInView="visible" 
          viewport={mobileViewport}
          // Three columns only when there are three to fill them. The list is
          // down to the pilot property plus a placeholder, and a third empty
          // column read as a card that had failed to load rather than as a
          // deliberate two. Goes back to three the moment a third is added.
          className={`grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 w-full ${PROPERTIES.length > 2 ? 'lg:grid-cols-3' : 'lg:max-w-[880px] lg:mx-auto'}`}
        >
          {PROPERTIES.map((p) => <PropertyCard key={p.id} property={p} />)}
        </motion.div>

        <motion.p 
          variants={fadeUp} 
          initial="hidden" 
          whileInView="visible" 
          viewport={mobileViewport} 
          className="mt-10 text-caption text-ir-dark/35 text-center max-w-[700px] mx-auto"
        >
          Target yields and appreciation are estimates based on current market conditions, and are not guaranteed. Past performance is not indicative of future results. Capital at risk.
        </motion.p>
      </div>
    </section>
  );
}