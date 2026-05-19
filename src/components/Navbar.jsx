
import React from 'react';
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { EASE_PREMIUM } from '../animations';

const NAV_LINKS = [
  { label: 'HOW IT WORKS', href: '#how-it-works' },
  { label: 'PROPERTIES', href: '#properties' },
  { label: 'WHY INREAL', href: '#why-inreal' },
  { label: 'FAQ', href: '#faq' },
];

export default function Navbar() {
  const location = useLocation();
  const [hidden, setHidden] = useState(false);
  const [lastY, setLastY] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Logo path updated to Hostinger CDN
  const logoPath = 'https://horizons-cdn.hostinger.com/9e1f4551-bf70-48a3-a592-c6f31edcad6a/25979fe1840cf294bcca6defc52c98c7.png';

  useEffect(() => {
    const h = () => { const y = window.scrollY; setHidden(y > 400 && y > lastY); setLastY(y) }
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [lastY])

  useEffect(() => { document.body.style.overflow = mobileOpen ? 'hidden' : ''; return () => { document.body.style.overflow = '' } }, [mobileOpen])

  return (
    <>
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: hidden ? -100 : 0, opacity: hidden ? 0 : 1 }}
        transition={{ duration: 0.4, ease: EASE_PREMIUM }}
        className="fixed top-0 left-0 right-0 z-50 bg-ir-dark"
      >
        <div className="max-w-[1440px] mx-auto flex items-center h-14 px-5 md:px-8 lg:px-12">
          <Link to="/" className="relative z-10 flex-shrink-0">
            <img src={logoPath} alt="InReal" className="h-6 w-auto" />
          </Link>
          <div className="hidden md:flex items-center gap-8 flex-1 justify-center">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="text-caption text-ir-white/70 hover:text-white transition-colors duration-300 relative group font-medium tracking-[0.08em]">
                {l.label}
                <span className="absolute -bottom-1.5 left-0 w-0 h-[1.5px] bg-ir-teal transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-4 ml-auto">
            <Link to="/auth" className="text-caption tracking-[0.08em] font-medium text-ir-white/70 hover:text-white transition-colors duration-300">SIGN IN</Link>
            <Link to="/portal" className="ir-btn-primary text-body-sm !py-2 !px-4">Portal</Link>
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden relative z-10 w-9 h-9 flex flex-col items-center justify-center gap-1" aria-label={mobileOpen ? 'Close menu' : 'Open menu'}>
            <motion.span animate={mobileOpen ? { rotate: 45, y: 5 } : { rotate: 0, y: 0 }} className="block w-5 h-[1.5px] origin-center bg-white" />
            <motion.span animate={mobileOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }} className="block w-5 h-[1.5px] bg-white" />
            <motion.span animate={mobileOpen ? { rotate: -45, y: -5 } : { rotate: 0, y: 0 }} className="block w-5 h-[1.5px] origin-center bg-white" />
          </button>
        </div>
      </motion.nav>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="fixed inset-0 z-40 bg-ir-dark/98 backdrop-blur-2xl flex flex-col items-center justify-center px-5">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.4, ease: EASE_PREMIUM, delay: 0.1 }} className="flex flex-col items-center gap-7">
              {NAV_LINKS.map((l, i) => (<motion.a key={l.href} href={l.href} onClick={() => setMobileOpen(false)} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.08, duration: 0.4, ease: EASE_PREMIUM }} className="text-h2 text-white hover:text-ir-teal transition-colors font-bold tracking-[0.05em]">{l.label}</motion.a>))}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-6 flex flex-col items-center gap-4">
                <Link to="/portal" className="ir-btn-primary text-h4 !px-10 !py-4" onClick={() => setMobileOpen(false)}>Portal</Link>
                <Link to="/auth" className="text-caption tracking-[0.08em] font-medium text-ir-text-secondary hover:text-white transition-colors" onClick={() => setMobileOpen(false)}>SIGN IN</Link>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
