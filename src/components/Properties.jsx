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

// Inline properties data
const ALL_PROPERTIES = [
  {
    id: 'bkk-sukhumvit-2br',
    title: 'Sukhumvit 2BR',
    location: 'Bangkok, Thailand',
    flag: '🇹🇭',
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=900&h=700&fit=crop&q=85',
    targetYield: '9.4%',
    appreciation: '4.0%',
    minInvestment: '$500',
    propertyValue: '$285,000',
    fundedPct: 47,
    status: 'Open',
  },
  {
    id: 'dxb-marina-1br',
    title: 'Dubai Marina 1BR',
    location: 'Dubai, UAE',
    flag: '🇦🇪',
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=900&h=700&fit=crop&q=85',
    targetYield: '7.4%',
    appreciation: '5.2%',
    minInvestment: '$500',
    propertyValue: '$420,000',
    fundedPct: 68,
    status: 'Open',
  },
  {
    id: 'sgp-orchard-studio',
    title: 'Orchard Studio',
    location: 'Singapore',
    flag: '🇸🇬',
    image: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=900&h=700&fit=crop&q=85',
    targetYield: '5.8%',
    appreciation: '3.5%',
    minInvestment: '$500',
    propertyValue: '$580,000',
    fundedPct: 0,
    status: 'Coming Soon',
  },
];

const PROPERTIES = ALL_PROPERTIES.slice(0, 3);

function PropertyCard({ property: p }) {
  const isOpen = p.status === 'Open';
  const tgtAPY = (parseFloat(p.targetYield) + parseFloat(p.appreciation)).toFixed(1);
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
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-ir bg-white/95 backdrop-blur-sm text-caption text-ir-dark font-semibold shadow-sm">
            {tgtAPY}% Tgt. APY
          </div>
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
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 w-full"
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