import { useEffect } from 'react';
import './styles.css';

import TopBar from './TopBar';
import Nav from './Nav';
import Hero from './Hero';
import Concept from './Concept';
import HowItWorks from './HowItWorks';
import BoxGrid from './BoxGrid';
import FlowerGrid from './FlowerGrid';
import FloristPicks from './FloristPicks';
import Addons from './Addons';
import CartPreview from './CartPreview';
import FAQ from './FAQ';
import FinalCTA from './FinalCTA';
import Footer from './Footer';
import FloatConsult from './FloatConsult';

/**
 * Хук reveal-on-scroll. Применяется к элементам с классом .reveal.
 * Для production советуем заменить на framer-motion.
 */
function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/** Smooth scroll для якорных ссылок */
function useSmoothScroll() {
  useEffect(() => {
    const handler = (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (id.length > 1) {
        const t = document.querySelector(id);
        if (t) {
          e.preventDefault();
          t.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);
}

export default function App() {
  useReveal();
  useSmoothScroll();

  // Пример обработчика для Box Selection — связывайте с глобальным cart-стейтом
  const handleBoxSelect = (box) => {
    // navigate(`/box/${box.id}`)
    console.log('Selected box:', box);
  };

  return (
    <>
      <TopBar />
      <Nav />
      <Hero />
      <Concept />
      <HowItWorks />
      <BoxGrid onSelect={handleBoxSelect} />
      <FlowerGrid />
      <FloristPicks />
      <Addons />
      <CartPreview />
      <FAQ />
      <FinalCTA />
      <Footer />
      <FloatConsult />
    </>
  );
}
