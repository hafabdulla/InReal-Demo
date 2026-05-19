import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
export function ComparisonTable() {
  const { t } = useTranslation();
  const features = [{
    name: t('comparison.features.minInvestment'),
    inreal: '$250',
    traditional: '$50,000+'
  }, {
    name: t('comparison.features.propertySelection'),
    inreal: t('comparison.inreal.propertySelection'),
    traditional: t('comparison.traditional.propertySelection')
  }, {
    name: t('comparison.features.management'),
    inreal: t('comparison.inreal.management'),
    traditional: t('comparison.traditional.management')
  }, {
    name: t('comparison.features.legalProtection'),
    inreal: t('comparison.inreal.legalProtection'),
    traditional: t('comparison.traditional.legalProtection')
  }, {
    name: t('comparison.features.liquidity'),
    inreal: t('comparison.inreal.liquidity'),
    traditional: t('comparison.traditional.liquidity')
  }, {
    name: t('comparison.features.returns'),
    inreal: '10-14%',
    traditional: '5-8%'
  }, {
    name: t('comparison.features.globalAccess'),
    inreal: t('comparison.inreal.globalAccess'),
    traditional: false
  }];
  return <section id="comparison" className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 bg-off-white">
    <div className="max-w-7xl mx-auto">
      <motion.div initial={{
        opacity: 0,
        y: 20
      }} whileInView={{
        opacity: 1,
        y: 0
      }} viewport={{
        once: true
      }} className="text-center mb-8 md:mb-16">
        <p className="text-primary-accent font-bold text-sm md:text-base lg:text-xl uppercase mb-4">{t('comparison.tagline')}</p>
        <h2 className="text-black font-bold text-4xl md:text-5xl leading-tight normal-case">
          {t('comparison.title')}
        </h2>
      </motion.div>

      <motion.div initial={{
        opacity: 0,
        y: 20
      }} whileInView={{
        opacity: 1,
        y: 0
      }} viewport={{
        once: true
      }} className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[640px] border-collapse bg-white rounded-2xl overflow-hidden border border-[rgba(0,0,0,0.06)]">
          <colgroup>
            <col className="w-[30%]" />
            <col className="w-[35%]" />
            <col className="w-[35%]" />
          </colgroup>
          <thead>
            <tr className="bg-primary-accent/90">
              <th className="px-6 py-4 text-left text-charcoal-black font-bold uppercase"></th>
              <th className="px-6 py-4 text-center text-charcoal-black font-bold uppercase">InReal</th>
              <th className="px-6 py-4 text-center text-charcoal-black font-bold uppercase">{t('comparison.traditional.header')}</th>
            </tr>
          </thead>
          <tbody>
            {features.map((feature, index) => <tr key={feature.name} className={`border-b border-[rgba(0,0,0,0.06)] last:border-b-0 hover:bg-primary-accent/10 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-off-white/50'}`}>
              <td className="px-6 py-4 font-semibold text-modern-grey">{feature.name}</td>
              <td className="px-6 py-4 text-center">
                {typeof feature.inreal === 'boolean' ? feature.inreal ? <Check className="w-6 h-6 text-primary-accent mx-auto" /> : <X className="w-6 h-6 text-slate-grey mx-auto" /> : <span className="font-semibold text-primary-accent">{feature.inreal}</span>}
              </td>
              <td className="px-6 py-4 text-center">
                {typeof feature.traditional === 'boolean' ? feature.traditional ? <Check className="w-6 h-6 text-modern-grey mx-auto" /> : <X className="w-6 h-6 text-slate-grey mx-auto" /> : <span className="text-modern-grey">{feature.traditional}</span>}
              </td>
            </tr>)}
          </tbody>
        </table>
      </motion.div>
    </div>
  </section>;
}