import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '../animations'
const FOOTER_LINKS = {
  Platform: [{ label: 'How It Works', href: '#how-it-works' }, { label: 'Properties', href: '#properties' }, { label: 'Calculator', href: '#calculator' }, { label: 'FAQ', href: '#faq' }],
  Legal: [{ label: 'Terms of Use', href: '#' }, { label: 'Privacy Policy', href: '#' }, { label: 'Risk Disclosure', href: '#' }, { label: 'Cookie Policy', href: '#' }],
  Company: [{ label: 'About InReal', href: '#' }, { label: 'Team', href: '#' }, { label: 'Partners', href: '#' }, { label: 'Press', href: '#' }],
  Connect: [{ label: 'hello@inreal.com', href: 'mailto:hello@inreal.com' }, { label: 'LinkedIn', href: '#' }, { label: 'Twitter / X', href: '#' }, { label: 'Instagram', href: '#' }],
}
export default function Footer() {
  return (
    <footer className="bg-ir-dark border-t border-ir-border-dark/50">
      <div className="ir-container px-5 md:px-6">
        <motion.div variants={staggerContainer(0.06)} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} className="py-12 md:py-16 grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-10">
          <motion.div variants={staggerItem} className="col-span-2 md:col-span-1"><img src="https://horizons-cdn.hostinger.com/9e1f4551-bf70-48a3-a592-c6f31edcad6a/25979fe1840cf294bcca6defc52c98c7.png" alt="InReal" className="h-7 w-auto mb-4" /><p className="text-body-sm text-ir-text-secondary leading-relaxed">Real estate investment, simplified. Own fractional interests in high-yield properties across global markets.</p></motion.div>
          {Object.entries(FOOTER_LINKS).map(([t, ls]) => (<motion.div key={t} variants={staggerItem}><h4 className="text-caption text-ir-text-secondary/60 uppercase tracking-[0.1em] mb-4">{t}</h4><ul className="space-y-2.5">{ls.map((l) => (<li key={l.label}><a href={l.href} className="text-body-sm text-ir-text-secondary hover:text-ir-teal transition-colors duration-300">{l.label}</a></li>))}</ul></motion.div>))}
        </motion.div>
        <div className="py-6 md:py-8 border-t border-ir-border-dark/30"><div className="max-w-[900px]"><p className="text-caption text-ir-text-secondary/30 leading-relaxed"><strong className="text-ir-text-secondary/50 font-medium">Important Disclosures:</strong> InReal Property Holdings Ltd is a BVI Business Company (No. 2205311) operating as a Segregated Portfolio Company. Investments in real estate carry risk, including the potential loss of capital. Projected returns are estimates based on current rental income and market conditions, and are not guaranteed. Past performance is not indicative of future results. InReal is not available to US persons under Regulation S. Please review our full risk disclosure, terms of use, and beneficial ownership agreement before investing. This website does not constitute financial advice, an offer to sell, or a solicitation to buy securities in any jurisdiction where such offer or solicitation would be unlawful.</p></div></div>
        <div className="py-5 border-t border-ir-border-dark/20 flex flex-col md:flex-row items-center justify-between gap-3"><p className="text-caption text-ir-text-secondary/30 text-center md:text-left">&copy; {new Date().getFullYear()} InReal Property Holdings Ltd. All rights reserved.</p><div className="flex items-center gap-4 text-caption text-ir-text-secondary/30"><a href="#" className="hover:text-ir-text-secondary transition-colors">Terms</a><span>·</span><a href="#" className="hover:text-ir-text-secondary transition-colors">Privacy</a><span>·</span><a href="#" className="hover:text-ir-text-secondary transition-colors">Cookies</a></div></div>
      </div>
    </footer>
  )
}