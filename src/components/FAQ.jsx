import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { staggerContainer, staggerItem, sectionViewport, EASE_PREMIUM } from '../animations'

const FAQS = [
  { q: 'What exactly am I buying?', a: 'You acquire a beneficial participation interest in a specific property, held through a BVI Segregated Portfolio Company. This gives you true beneficial ownership rights, including your proportional share of rental income and capital appreciation, protected by BVI corporate law. This is not a token, not a REIT share, and not a revenue-share agreement.' },
  { q: 'What is the minimum investment?', a: 'The minimum investment is $500 per property. There is no maximum. You can invest up to 100% of any property if available. If you acquire 100% ownership, the Sole Beneficial Owner Protocol activates, giving you personal use rights and tenant nomination privileges.' },
  { q: 'How do I earn returns?', a: 'You earn through two channels: rental income distributions (paid monthly from actual tenant rents) and capital appreciation when a property increases in value over time. Target yields vary by market, typically 5.8% to 9.4% annually, depending on location and property type.' },
  { q: 'What are the fees?', a: 'InReal charges a transparent, published fee schedule: a payment processing fee when you invest, an InReal transaction fee, and an ongoing management fee. There are no hidden charges. The full fee schedule is available before you invest, and you can model all fees in our calculator above.' },
  { q: 'How is my investment protected?', a: 'Each property sits in its own isolated portfolio, legally separated so one property\'s liabilities can never affect another. The structure operates under BVI Business Companies Act with an independent registered agent. Anti-encumbrance provisions prevent the platform from pledging your property as collateral.' },
  { q: 'Can I sell my investment?', a: 'InReal is building secondary market functionality to enable peer-to-peer transfers between qualified investors. The platform also has a structured exit mechanism for property dispositions. Detailed liquidity mechanics are outlined in the Beneficial Ownership Agreement you sign when investing.' },
  { q: 'Which countries can invest?', a: 'InReal is available to investors globally, with the exception of US persons (the platform operates under Regulation S, which excludes US investors). We support investors from Southeast Asia, the Middle East, Europe, and beyond. Jurisdiction-specific terms may apply.' },
  { q: 'Are returns guaranteed?', a: 'No. All investments carry risk, including the potential loss of capital. Target yields are estimates based on current rental income and market conditions, not guarantees. InReal is transparent about risk. You can review our full risk disclosure before making any investment.' },
]

function FAQItem({ faq, isOpen, onToggle }) {
  return (
    <motion.div variants={staggerItem} className={`border-b border-ir-border-light last:border-b-0 transition-colors duration-300 ${isOpen ? 'bg-white -mx-4 px-4 md:-mx-6 md:px-6 rounded-ir-lg border border-ir-teal/25 shadow-[0_4px_16px_rgba(1,206,209,0.08)] my-1' : ''}`}>
      <button onClick={onToggle} className="w-full flex items-center justify-between gap-3 md:gap-4 py-4 md:py-5 text-left group" aria-expanded={isOpen}>
        <span className={`text-body md:text-h4 font-medium transition-colors duration-300 ${isOpen ? 'text-ir-teal' : 'text-ir-dark group-hover:text-ir-teal'}`}>{faq.q}</span>
        <motion.div animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.3, ease: EASE_PREMIUM }} className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-ir-teal/10 flex items-center justify-center flex-shrink-0"><svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-ir-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M12 4v16M4 12h16" /></svg></motion.div>
      </button>
      <AnimatePresence mode="wait">{isOpen && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: EASE_PREMIUM }} className="overflow-hidden"><p className="pb-5 text-body-sm md:text-body text-ir-dark/60 leading-relaxed max-w-[680px]">{faq.a}</p></motion.div>)}</AnimatePresence>
    </motion.div>
  )
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0)
  return (
    <section id="faq" className="ir-section bg-ir-white relative">
      <div className="ir-container">
        <motion.div variants={staggerContainer(0.1)} initial="hidden" whileInView="visible" viewport={sectionViewport} className="max-w-[800px] mx-auto">
          <motion.div variants={staggerItem} className="text-center mb-10 md:mb-12">
            <span className="ir-overline block mb-4 md:mb-5">FAQ</span>
            <h2 className="ir-section-title">Questions investors ask</h2>
          </motion.div>
          <motion.div variants={staggerContainer(0.06)} initial="hidden" whileInView="visible" viewport={sectionViewport}>
            {FAQS.map((f, i) => <FAQItem key={i} faq={f} isOpen={openIndex === i} onToggle={() => setOpenIndex(openIndex === i ? -1 : i)} />)}
          </motion.div>
          <motion.p variants={staggerItem} className="mt-10 text-center text-body-sm text-ir-dark/50">
            Have a question not listed here?{' '}
            <a href="mailto:hello@inreal.com" className="text-ir-teal hover:text-ir-teal-muted transition-colors underline underline-offset-2 font-medium">Talk to our investment team</a>
          </motion.p>
        </motion.div>
      </div>
    </section>
  )
}