import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Star, Quote } from 'lucide-react';

export function Testimonials() {
  const { t } = useTranslation();

  const testimonials = [
    // A sixth testimonial was removed on 18 September 2026: an invented
    // first-time investor saying she "started with just $500" and was "already
    // seeing returns". Both halves were wrong — $500 has not been the minimum
    // since 17 September, and InReal is pre-launch with no settled transaction
    // behind any return claim.
    //
    // The four below are invented too, and three of them make return claims of
    // their own. See the note at the end of this file.
    {
      name: 'Michael Chen',
      role: 'Portfolio Diversifier',
      rating: 5,
      text: "The perfect way to diversify into real estate without the huge capital requirements. The SPV structure gives me peace of mind.",
    },
    {
      name: 'Emma Rodriguez',
      role: 'Global Investor',
      rating: 5,
      text: "I love that I can invest in Bangkok properties from anywhere in the world. The returns exceed my expectations!",
    },
    {
      name: 'David Thompson',
      role: 'Retired Professional',
      rating: 5,
      text: "Finally, a way to invest in premium real estate without managing properties myself. The passive income is exactly what I needed.",
    },
    {
      name: 'Priya Sharma',
      role: 'Tech Entrepreneur',
      rating: 5,
      text: "As a busy founder, I needed hands-off investments. InReal delivers consistent returns with zero hassle. Brilliant platform!",
    },
  ];

  const TestimonialCard = ({ testimonial }) => (
    <div className="flex-shrink-0 w-[320px] md:w-[400px] mx-3">
      <div className="bg-deep-graphite rounded-2xl p-6 shadow-lg h-full relative border border-modern-grey">
        <Quote className="absolute top-4 right-4 w-8 h-8 text-primary-accent/20" />
        
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 rounded-full bg-primary-accent/20 flex items-center justify-center mr-3">
            <span className="text-primary-accent font-bold text-lg">
              {testimonial.name.charAt(0)}
            </span>
          </div>
          <div>
            <p className="font-bold text-off-white text-sm">{testimonial.name}</p>
            <p className="text-xs text-slate-grey">{testimonial.role}</p>
          </div>
        </div>

        <div className="flex mb-3">
          {[...Array(testimonial.rating)].map((_, i) => (
            <Star key={i} className="w-4 h-4 fill-primary-accent text-primary-accent" />
          ))}
        </div>

        <p className="text-off-white text-sm leading-relaxed italic">"{testimonial.text}"</p>
      </div>
    </div>
  );

  const ScrollingRow = ({ testimonials, direction = 'left', duration = 30 }) => {
    const duplicatedTestimonials = [...testimonials, ...testimonials];
    
    return (
      <div className="relative overflow-hidden py-4">
        {/* Gradient overlays for smooth fade effect */}
        <div className="absolute left-0 top-0 bottom-0 w-20 md:w-40 bg-gradient-to-r from-charcoal-black to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-20 md:w-40 bg-gradient-to-l from-charcoal-black to-transparent z-10" />
        
        <div
          className="flex"
          style={{
            animation: `${direction === 'left' ? 'scrollLeft' : 'scrollRight'} ${duration}s linear infinite`,
            width: 'fit-content',
          }}
        >
          {duplicatedTestimonials.map((testimonial, index) => (
            <TestimonialCard key={`${testimonial.name}-${index}`} testimonial={testimonial} />
          ))}
        </div>
        
        <style>{`
          @keyframes scrollLeft {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          @keyframes scrollRight {
            0% { transform: translateX(-50%); }
            100% { transform: translateX(0); }
          }
        `}</style>
      </div>
    );
  };

  return (
    <section className="py-12 md:py-20 bg-charcoal-black overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-primary-accent font-bold text-sm md:text-base lg:text-xl uppercase mb-4">
            {t('testimonials.tagline')}
          </p>
          <h2 className="text-white font-bold text-4xl md:text-5xl leading-tight normal-case mb-6">
            {t('testimonials.title')}
          </h2>
        </motion.div>
      </div>

      {/* Scrolling Testimonials */}
      <div>
        <ScrollingRow 
          testimonials={testimonials} 
          direction="left" 
          duration={40} 
        />
      </div>
    </section>
  );
}

// ⚠️ THIS COMPONENT IS NOT RENDERED ANYWHERE, AND SHOULD NOT BE UNTIL ITS
// CONTENT IS REAL.
//
// Nothing imports it, and none of these strings appear in the deployed bundle
// (checked against the live site, 18 September 2026). That is the only reason
// the copy below has never been a live problem.
//
// All four remaining testimonials are invented, attributed to invented people,
// each with a five-star rating. Three of them make claims about money: "the
// returns exceed my expectations", "consistent returns with zero hassle",
// "the passive income is exactly what I needed". InReal is pre-launch — no
// transaction has settled and there is no return to report — which is exactly
// why PO-9 had the "$2.5M invested / 750 investors / 15% average returns"
// tiles taken off the login page on 31 July, and why the same figures were
// removed from the homepage hero on 07 August. An unqualified return claim on
// a public financial page is a compliance matter, not a copy decision.
//
// So: rendering this file as it stands would undo two product-owner decisions
// at once. If a testimonials section is wanted, it needs real investors who
// have agreed to be quoted, and whatever risk disclosure counsel requires.