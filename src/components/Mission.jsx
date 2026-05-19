import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export function Mission() {
  const { t } = useTranslation();

  return (
    <section 
      id="mission" 
      className="py-24 md:py-40 px-4 sm:px-6 lg:px-8 bg-off-white relative"
      style={{
        backgroundImage: 'url("https://vemaps.com/uploads/img/wrld-18.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 bg-off-white/85 pointer-events-none"></div>
      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <p className="text-primary-accent font-bold text-sm md:text-base lg:text-xl uppercase mb-4">
            {t('mission.tagline')}
          </p>
          <h2 className="text-black font-bold text-3xl sm:text-4xl md:text-5xl leading-tight mb-4 sm:mb-6 normal-case">
            {t('mission.title')}
          </h2>
          <p className="text-modern-grey text-base sm:text-lg leading-relaxed px-2 sm:px-0">
            {t('mission.description')}
          </p>
        </motion.div>
      </div>
    </section>
  );
}