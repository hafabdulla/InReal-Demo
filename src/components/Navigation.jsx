import React from 'react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

export function Navigation() {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);

  const languages = [
    { name: 'English', code: 'en', flag: '🇬🇧' },
    { name: 'Italiano', code: 'it', flag: '🇮🇹' },  // Italian
  ];

  const [selectedLanguage, setSelectedLanguage] = useState(
    languages.find(l => l.code === i18n.language) || languages[0]
  );

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang.code);
    setSelectedLanguage(lang);
    setIsLanguageOpen(false);
  };

  useEffect(() => {
    const currentLang = languages.find(l => l.code === i18n.language);
    if (currentLang) {
      setSelectedLanguage(currentLang);
    }
  }, [i18n.language]);

  const navLinks = [
    { name: t('nav.howItWorks'), href: '#how-it-works' },
    { name: t('nav.properties'), href: '#properties' },
    { name: t('nav.whyInReal'), href: '#comparison' },
    { name: t('nav.faq'), href: '#faq' },
    { name: t('nav.contact'), href: '#contact' },
  ];

  const handleInvestNow = () => {
    toast({
      title: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
    });
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-b border-modern-grey">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-12"
          >
            <a href="#" className="cursor-pointer group">
              <img 
                src="https://horizons-cdn.hostinger.com/9e1f4551-bf70-48a3-a592-c6f31edcad6a/6a44e4eaa4f0d14816b5b75d29e50068.png" 
                alt="InReal Logo" 
                className="h-10 w-auto transition-transform duration-200 group-hover:scale-110"
              />
            </a>
            <div className="hidden nav:flex items-center space-x-8">
              <Button
                onClick={handleInvestNow}
                className="bg-primary-accent hover:bg-steel-blue text-charcoal-black font-bold"
              >
                {t('nav.investNow')}
              </Button>
              {navLinks.map((link, index) => (
                <motion.a
                  key={link.name}
                  href={link.href}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="text-off-white hover:text-primary-accent transition-colors font-medium relative group"
                >
                  {link.name}
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-accent scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                </motion.a>
              ))}
            </div>
          </motion.div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setIsLanguageOpen(!isLanguageOpen)}
                className="hidden nav:flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-modern-grey transition-colors text-off-white"
              >
                <span>{selectedLanguage.flag}</span>
                <span>{selectedLanguage.name}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {isLanguageOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full right-0 mt-2 w-44 bg-black border border-modern-grey rounded-lg shadow-lg z-50"
                  >
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang)}
                        className={`w-full flex items-center gap-2 px-4 py-2 text-off-white hover:bg-modern-grey transition-colors first:rounded-t-lg last:rounded-b-lg ${
                          selectedLanguage.code === lang.code ? 'bg-modern-grey/50' : ''
                        }`}
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Link to="/auth">
              <Button
                variant="outline"
                className="hidden nav:flex border-primary-accent text-[black] hover:bg-primary-accent hover:text-charcoal-black"
              >
                {t('nav.loginSignup')}
              </Button>
            </Link>
            
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="nav:hidden p-2 text-off-white hover:text-primary-accent transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="nav:hidden bg-black border-t border-modern-grey"
          >
            <div className="px-4 py-4 space-y-3">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="block py-2 text-off-white hover:text-primary-accent transition-colors font-medium"
                >
                  {link.name}
                </a>
              ))}
              <Button
                onClick={handleInvestNow}
                className="w-full bg-primary-accent hover:bg-steel-blue text-charcoal-black font-bold"
              >
                {t('nav.investNow')}
              </Button>
              <Link to="/auth" onClick={() => setIsOpen(false)}>
                <Button
                  variant="outline"
                  className="w-full border-primary-accent text-primary-accent hover:bg-primary-accent hover:text-charcoal-black"
                >
                  {t('nav.loginSignup')}
                </Button>
              </Link>
              
              {/* Mobile Language Selector */}
              <div className="pt-2 border-t border-modern-grey mt-2">
                <p className="text-slate-grey text-sm mb-2">{t('nav.language')}</p>
                <div className="flex flex-wrap gap-2">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang)}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedLanguage.code === lang.code
                          ? 'bg-primary-accent text-charcoal-black'
                          : 'bg-modern-grey/30 text-off-white hover:bg-modern-grey/50'
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}