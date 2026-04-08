import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';

import {
  BenefitsSection,
  CTASection,
  DemoPreviewSection,
  FeaturesSection,
  HeroSection,
  HowItWorksSection,
  LandingFooter,
  LandingHeader,
} from './ui';

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Relay | AI Chat That Moves Fast',
  description:
    'Relay is a modern AI chat app with model flexibility, clean design, and context-aware conversations.',
  openGraph: {
    title: 'Relay | AI Chat That Moves Fast',
    description:
      'Fast, clean, context-aware AI chat. Choose your model. Keep every conversation focused.',
    type: 'website',
    url: '/',
  },
};

export default function HomePage() {
  return (
    <div className={`${manrope.className} landing-bg min-h-screen text-[var(--color-text)]`}>
      <LandingHeader />

      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <DemoPreviewSection />
        <BenefitsSection />
        <CTASection />
      </main>

      <LandingFooter />
    </div>
  );
}
