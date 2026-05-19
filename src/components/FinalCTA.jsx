import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, sectionViewport, lineGrow } from '../animations'

const PORTAL_URL = '#register'

export default function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-ir-dark">
      <div className="absolute inset-0">
        <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1800&h=1200&fit=crop&q=85" alt="" className="w-full h-full object-cover opacity-[0.12]" />
        <div className="absolute inset-0 bg-gradient-to-b from-ir-dark/80 via-ir-dark/90 to-ir-dark" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1400px] h-[700px] rounded-full bg-ir-teal/[0.1] blur-[200px]" />
      </div>

      <div className="relative z-10 py-16 md:py-24 lg:py-32 px-5 md:px-6">
        <div className="ir-container">
          <motion.div variants={staggerContainer(0.12)} initial="hidden" whileInView="visible" viewport={sectionViewport} className="text-center max-w-[800px] mx-auto">
            <motion.div variants={lineGrow} className="w-10 md:w-12 h-[3px] bg-ir-teal mx-auto mb-6 md:mb-8 rounded-full origin-center" />
            <motion.h2 variants={staggerItem} className="text-[clamp(2rem,7vw,4.5rem)] font-bold tracking-[-0.03em] text-white leading-[1.05]">Your first investment starts with <span className="ir-teal-text">$500</span></motion.h2>
            <motion.p variants={staggerItem} className="mt-5 md:mt-6 text-body md:text-h4 font-normal text-ir-white/65 max-w-[480px] mx-auto leading-relaxed">2 minutes to sign up. No credit card required.</motion.p>
            <motion.div variants={staggerItem} className="mt-7 md:mt-9"><a href={PORTAL_URL} className="ir-btn-primary text-body !px-8 md:!px-10 !py-3.5 md:!py-4 group">Create Your Free Account <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg></a></motion.div>
            <motion.div variants={staggerItem} className="mt-8 md:mt-10 flex flex-wrap items-center justify-center gap-4 md:gap-6 text-caption text-ir-white/55">
              <span className="flex items-center gap-2"><svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-ir-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>BVI-regulated structure</span>
              <span className="flex items-center gap-2"><svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-ir-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" /></svg>Isolated portfolios</span>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}