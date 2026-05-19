import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { fadeUp, staggerContainer, staggerItem, sectionViewport } from '../animations'

const PORTAL_URL = '#register'
const INVESTMENT_PRESETS = [500, 1000, 5000, 10000, 25000]

export default function Calculator() {
  const [investment, setInvestment] = useState(5000)
  const [years, setYears] = useState(5)
  const [rentalYield, setRentalYield] = useState(7.5)
  const [appreciation, setAppreciation] = useState(4.0)
  const [customInput, setCustomInput] = useState('')

  const p = useMemo(() => {
    const yr = rentalYield / 100, ar = appreciation / 100
    const payFee = investment * 0.015, txFee = investment * 0.015
    const net = investment - payFee - txFee
    let pv = net, trg = 0
    for (let y = 1; y <= years; y++) { const r = pv * yr; trg += r; pv *= (1 + ar) }
    const cg = pv - net, ef = Math.max(0, cg * 0.20), of = trg * 0.25, irf = trg * 0.10
    const nr = trg - of - irf, npv = pv - ef, total = nr + npv
    return { inv: investment, payFee, txFee, trg, of, irf, nr, apv: pv, cg, ef, npv, total, ret: total - investment, pct: (((total - investment) / investment) * 100).toFixed(1) }
  }, [investment, years, rentalYield, appreciation])

  const handleCustom = (v) => { setCustomInput(v); const n = parseInt(v.replace(/[^0-9]/g, '')); if (!isNaN(n) && n >= 100) setInvestment(n) }
  const fmt = (n) => '$' + Math.round(n).toLocaleString()

  const sliderClass = "w-full h-1 bg-ir-border-dark rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(1,206,209,0.5)]"

  return (
    <section className="ir-section bg-ir-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none"><div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[1000px] h-[600px] rounded-full bg-ir-teal/[0.05] blur-[180px]" /></div>
      <div className="ir-container relative z-10">
        <motion.div variants={staggerContainer(0.1)} initial="hidden" whileInView="visible" viewport={sectionViewport} className="text-center max-w-[720px] mx-auto mb-10 md:mb-14">
          <motion.span variants={staggerItem} className="ir-overline block mb-4 md:mb-5">INVESTMENT CALCULATOR</motion.span>
          <motion.h2 variants={staggerItem} className="ir-section-title">Model your returns.<br /><span className="ir-teal-text">See the full picture.</span></motion.h2>
          <motion.p variants={staggerItem} className="mt-5 md:mt-6 text-body md:text-h4 font-normal text-ir-dark/55">Configure yield, appreciation, and time horizon. All fees included, no surprises.</motion.p>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={sectionViewport} className="max-w-[1040px] mx-auto">
          {/* Dark calculator card */}
          <div className="relative overflow-hidden rounded-[16px] md:rounded-[20px] bg-ir-dark shadow-[0_18px_50px_rgba(0,0,0,0.16)] md:shadow-[0_30px_80px_rgba(0,0,0,0.2)]">
            {/* Subtle teal radial glows */}
            <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at 20% 30%, rgba(1,206,209,0.15), transparent 50%), radial-gradient(circle at 80% 70%, rgba(1,206,209,0.1), transparent 50%)` }} />

            <div className="relative grid lg:grid-cols-[1fr,1.2fr]">
              {/* Controls */}
              <div className="p-5 md:p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-ir-border-dark">
                <div className="mb-7">
                  <label className="text-caption text-ir-white/50 uppercase tracking-wider mb-3 block font-medium">Investment Amount</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {INVESTMENT_PRESETS.map((pr) => (<button key={pr} onClick={() => { setInvestment(pr); setCustomInput('') }} className={`px-3 py-1.5 rounded-ir text-body-sm font-mono transition-all duration-300 ${investment === pr && !customInput ? 'bg-ir-teal/20 text-ir-teal border border-ir-teal/40' : 'bg-white/5 text-ir-white/55 border border-white/10 hover:border-white/30 hover:text-white'}`}>${pr.toLocaleString()}</button>))}
                  </div>
                  <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-ir-white/40 font-mono">$</span><input type="text" value={customInput} onChange={(e) => handleCustom(e.target.value)} placeholder="Custom amount" className="w-full bg-white/5 border border-white/10 rounded-ir py-2.5 pl-7 pr-3 text-body font-mono text-white placeholder:text-ir-white/30 focus:outline-none focus:border-ir-teal focus:shadow-[0_0_0_3px_rgba(1,206,209,0.15)] transition-all duration-300" /></div>
                </div>
                <div className="mb-7"><label className="text-caption text-ir-white/50 uppercase tracking-wider mb-3 block font-medium">Rental Yield: <span className="text-ir-teal font-mono">{rentalYield.toFixed(1)}%</span></label><input type="range" min="3" max="12" step="0.1" value={rentalYield} onChange={(e) => setRentalYield(parseFloat(e.target.value))} className={`${sliderClass} [&::-webkit-slider-thumb]:bg-ir-teal`} /><div className="flex justify-between mt-1 text-caption text-ir-white/30 font-mono"><span>3%</span><span>12%</span></div></div>
                <div className="mb-7"><label className="text-caption text-ir-white/50 uppercase tracking-wider mb-3 block font-medium">Appreciation: <span className="text-ir-positive font-mono">{appreciation.toFixed(1)}%</span></label><input type="range" min="0" max="8" step="0.1" value={appreciation} onChange={(e) => setAppreciation(parseFloat(e.target.value))} className={`${sliderClass} [&::-webkit-slider-thumb]:bg-ir-positive`} /><div className="flex justify-between mt-1 text-caption text-ir-white/30 font-mono"><span>0%</span><span>8%</span></div></div>
                <div><label className="text-caption text-ir-white/50 uppercase tracking-wider mb-3 block font-medium">Time Horizon: <span className="text-white font-mono">{years} {years === 1 ? 'year' : 'years'}</span></label><input type="range" min="1" max="10" value={years} onChange={(e) => setYears(parseInt(e.target.value))} className={`${sliderClass} [&::-webkit-slider-thumb]:bg-ir-teal`} /><div className="flex justify-between mt-1 text-caption text-ir-white/30 font-mono"><span>1yr</span><span>5yr</span><span>10yr</span></div></div>
              </div>

              {/* Results */}
              <div className="p-5 md:p-6 lg:p-8">
                <div className="mb-6 pb-5 border-b border-ir-border-dark">
                  <p className="text-caption text-ir-white/50 mb-1 uppercase tracking-wider font-medium">Net Portfolio Value after {years} {years === 1 ? 'year' : 'years'}</p>
                  <p className="text-[clamp(2rem,4.5vw,3rem)] font-bold text-white font-mono leading-none">{fmt(p.total)}</p>
                  <div className="flex items-center gap-2 mt-2"><span className="text-body-sm text-ir-positive font-mono font-medium">+{fmt(p.ret)}</span><span className="text-caption text-ir-positive/80">({p.pct}%)</span></div>
                </div>
                <div className="space-y-0">
                  <p className="text-caption text-ir-white/50 uppercase tracking-wider mb-3 font-medium">Full Breakdown</p>
                  {[
                    { l: 'Investment Amount', v: fmt(p.inv), c: 'text-white' },
                    { l: 'Payment Processing Fee (1.5%)', v: `- ${fmt(p.payFee)}`, c: 'text-ir-negative/80' },
                    { l: 'InReal Transaction Fee (1.5%)', v: `- ${fmt(p.txFee)}`, c: 'text-ir-negative/80' },
                    { d: true },
                    { l: `Gross Rental Income (${years}yr)`, v: fmt(p.trg), c: 'text-ir-teal' },
                    { l: 'Operations & Management (25%)', v: `- ${fmt(p.of)}`, c: 'text-ir-negative/80' },
                    { l: 'InReal Fees (10% of rental)', v: `- ${fmt(p.irf)}`, c: 'text-ir-negative/80' },
                    { l: 'Net Rental Income', v: fmt(p.nr), c: 'text-ir-teal', b: true },
                    { d: true },
                    { l: 'Appreciated Property Value', v: fmt(p.apv), c: 'text-ir-positive' },
                    { l: 'Property Exit Fee (20% of gains)', v: `- ${fmt(p.ef)}`, c: 'text-ir-negative/80' },
                    { l: 'Net Property Value', v: fmt(p.npv), c: 'text-ir-positive', b: true },
                    { d: true },
                    { l: 'Net Portfolio Value', v: fmt(p.total), c: 'text-white', b: true, h: true },
                  ].map((r, i) => {
                    if (r.d) return <div key={i} className="border-t border-ir-border-dark/60 my-2" />
                    return (<div key={i} className={`flex items-center justify-between py-1.5 ${r.h ? 'bg-ir-teal/10 border border-ir-teal/25 -mx-3 px-3 rounded-ir mt-1' : ''}`}><span className={`text-body-sm ${r.b ? 'text-white font-medium' : 'text-ir-white/55'}`}>{r.l}</span><span className={`text-body-sm font-mono ${r.b ? 'font-bold' : ''} ${r.c}`}>{r.v}</span></div>)
                  })}
                </div>
                <a href={PORTAL_URL} className="mt-6 ir-btn-primary w-full text-body group">Start with {fmt(investment)} <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg></a>
              </div>
            </div>
          </div>
          <p className="mt-6 text-caption text-ir-dark/35 text-center max-w-[600px] mx-auto">Projections are estimates and are not guaranteed. Actual fees, yields, and appreciation may vary. Capital at risk. Review our full risk disclosure before investing.</p>
        </motion.div>
      </div>
    </section>
  )
}