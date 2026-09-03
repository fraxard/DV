import React, { useEffect } from 'react';
import Nav from '../components/landing/Nav';
import Hero from '../components/landing/Hero';
import Problem from '../components/landing/Problem';
import HowItWorks from '../components/landing/HowItWorks';
import Categories from '../components/landing/Categories';
import ProductPreview from '../components/landing/ProductPreview';
import Security from '../components/landing/Security';
import Nominees from '../components/landing/Nominees';
import Pricing from '../components/landing/Pricing';
import CTA from '../components/landing/CTA';
import Footer from '../components/landing/Footer';

export default function Landing() {
  // Scroll reveal
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    if (!els.length) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -48px 0px' }
    );

    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <Categories />
        <ProductPreview />
        <Security />
        <Nominees />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </>
  );
}