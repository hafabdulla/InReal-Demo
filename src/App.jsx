
import React from 'react';
import Navbar from './components/Navbar';
import ScrollProgress from './components/ScrollProgress';
import Hero from './components/Hero';
import TrustBar from './components/TrustBar';
import HowItWorks from './components/HowItWorks';
import Properties from './components/Properties';
import Calculator from './components/Calculator';
import WhyInReal from './components/WhyInReal';
import GlobalMarkets from './components/GlobalMarkets';
import FAQ from './components/FAQ';
import FinalCTA from './components/FinalCTA';
import Footer from './components/Footer';
import { Toaster } from '@/components/ui/toaster';

/**
 * Landing Page Component
 * Shows the main marketing website
 */
export default function App() {
  return (
    <>
      <ScrollProgress />
      <Navbar />
      <main>
        <Hero />
        <TrustBar />
        <HowItWorks />
        <Properties />
        <Calculator />
        <WhyInReal />
        <GlobalMarkets />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
      <Toaster />
    </>
  );
}
