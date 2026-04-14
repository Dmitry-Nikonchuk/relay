import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/shared/ui/Button';

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)]/70 bg-[var(--color-bg)]/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="group inline-flex items-center gap-2.5">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_8px_24px_rgba(20,20,40,0.08)] transition-transform duration-300 group-hover:scale-105">
            <Image
              src="/logo.png"
              alt="Relay logo"
              width={48}
              height={45}
              className="w-full max-w-[30px]"
            />
          </span>
          <span className="text-base font-semibold tracking-tight text-[var(--color-text)] sm:text-lg">
            Relay
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-2 sm:flex">
          <Button href="#features" variant="nav">
            Features
          </Button>
          <Button href="#pricing" variant="nav">
            Pricing
          </Button>
          <Button href="#how-it-works" variant="nav">
            How it works
          </Button>
          <Button href="#demo" variant="nav">
            Demo
          </Button>
        </nav>

        <Button href="/auth" variant="primary" size="sm">
          Open Relay
        </Button>
      </div>
    </header>
  );
}
