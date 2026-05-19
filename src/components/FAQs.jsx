import React from 'react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
export function FAQs() {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState(null);
  const faqs = [{
    question: t('faq.questions.q1.question'),
    answer: t('faq.questions.q1.answer')
  }, {
    question: t('faq.questions.q2.question'),
    answer: t('faq.questions.q2.answer')
  }, {
    question: t('faq.questions.q3.question'),
    answer: t('faq.questions.q3.answer')
  }, {
    question: t('faq.questions.q4.question'),
    answer: t('faq.questions.q4.answer')
  }, {
    question: t('faq.questions.q5.question'),
    answer: t('faq.questions.q5.answer')
  }, {
    question: t('faq.questions.q6.question'),
    answer: t('faq.questions.q6.answer')
  }];
  return <section id="faq" className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 bg-off-white">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} whileInView={{
        opacity: 1,
        y: 0
      }} viewport={{
        once: true
      }} className="text-center mb-16">
          <p className="text-primary-accent font-bold text-sm md:text-base lg:text-xl uppercase mb-4">{t('faq.tagline')}</p>
          <h2 className="text-black font-bold text-4xl md:text-5xl leading-tight normal-case">{t('faq.title')}</h2>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, index) => <motion.div key={index} initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          delay: index * 0.1
        }}>
              <div className="w-full bg-white border border-[rgba(0,0,0,0.06)] rounded-xl p-6 text-left transition-all">
                <button onClick={() => setOpenIndex(openIndex === index ? null : index)} className="w-full flex justify-between items-center">
                  <h3 className="text-lg font-bold pr-8 text-modern-grey normal-case">{faq.question}</h3>
                  <ChevronDown className={`w-6 h-6 text-primary-accent flex-shrink-0 transition-transform ${openIndex === index ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {openIndex === index && <motion.div initial={{
                height: 0,
                opacity: 0
              }} animate={{
                height: 'auto',
                opacity: 1
              }} exit={{
                height: 0,
                opacity: 0
              }} transition={{
                duration: 0.3
              }} className="overflow-hidden">
                      <p className="text-modern-grey mt-4 leading-relaxed">{faq.answer}</p>
                    </motion.div>}
                </AnimatePresence>
              </div>
            </motion.div>)}
        </div>
      </div>
    </section>;
}