import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, sectionViewport } from '../animations'

const PRESS_LOGOS = [
  { name: 'Bloomberg', size: 24 },
  { name: 'Forbes', size: 22 },
  { name: 'TechCrunch', size: 22 },
  { name: 'Reuters', size: 22 },
  { name: 'CNBC', size: 20 },
  { name: 'The Economist', size: 20 },
]

export default function TrustBar() {
  return (
    <section className="relative py-10 md:py-14 lg:py-16 px-5 md:px-6 border-y border-ir-border-light bg-ir-white">
      <div className="max-w-[1400px] mx-auto">
        <motion.div variants={staggerContainer(0.08)} initial="hidden" whileInView="visible" viewport={sectionViewport} className="flex flex-col items-center">
          <motion.p variants={staggerItem} className="text-caption text-ir-dark/40 uppercase tracking-[0.14em] mb-7 md:mb-10 font-medium">As Featured In</motion.p>
          <motion.div variants={staggerContainer(0.06)} className="w-full flex flex-wrap items-center justify-center md:justify-between gap-y-5 gap-x-5 md:gap-x-6 px-2 md:px-12">
            {PRESS_LOGOS.map((l) => (
              <motion.div key={l.name} variants={staggerItem} className="text-ir-dark/35 hover:text-ir-dark transition-colors duration-500 select-none">
                <span className="font-ubuntu font-bold tracking-tight whitespace-nowrap" style={{ fontSize: `clamp(14px, 3vw, ${l.size}px)` }}>{l.name}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}