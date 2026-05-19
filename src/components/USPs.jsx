import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { DollarSign, Shield, TrendingUp, CheckCircle } from 'lucide-react';

export function USPs() {
  const { t } = useTranslation();

  const usps = [
    {
      icon: DollarSign,
      title: t('usps.lowEntry.title'),
      description: t('usps.lowEntry.description'),
    },
    {
      icon: CheckCircle,
      title: t('usps.fullyManaged.title'),
      description: t('usps.fullyManaged.description'),
    },
    {
      icon: Shield,
      title: t('usps.spvBacked.title'),
      description: t('usps.spvBacked.description'),
    },
    {
      icon: TrendingUp,
      title: t('usps.transparentReturns.title'),
      description: t('usps.transparentReturns.description'),
    },
  ];

  return (
    <section className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-charcoal-black">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
          {usps.map((usp, index) => (
            <motion.div
              key={usp.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center"
            >
              <div className="flex justify-center mb-3 sm:mb-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary-accent/20 flex items-center justify-center">
                  <usp.icon className="w-6 h-6 sm:w-8 sm:h-8 text-primary-accent" />
                </div>
              </div>
              <h3 className="font-bold mb-1 sm:mb-2 text-off-white normal-case text-lg sm:text-xl md:text-2xl">{usp.title}</h3>
              <p className="text-slate-grey text-sm sm:text-base">{usp.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}