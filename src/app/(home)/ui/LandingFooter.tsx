import { Button } from '@/shared/ui/Button';

export function LandingFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-base font-semibold tracking-tight text-[var(--color-text)]">Relay</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Fast AI chat for focused teams.</p>
        </div>

        <nav aria-label="Footer" className="flex items-center gap-4 text-sm">
          <Button href="/#pricing" variant="footer">
            Pricing
          </Button>
          <Button href="/privacy" variant="footer">
            Privacy
          </Button>
          <Button href="/data-policy" variant="footer">
            Data Policy
          </Button>
          <Button href="/terms" variant="footer">
            Terms
          </Button>
        </nav>
      </div>
    </footer>
  );
}
