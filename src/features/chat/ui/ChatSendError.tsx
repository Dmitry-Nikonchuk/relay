'use client';

import { Button } from '@/shared/ui/Button';

type Props = {
  message: string;
  onResend: () => void;
  disabled?: boolean;
  canRetry?: boolean;
};

export function ChatSendError({ message, onResend, disabled = false, canRetry = true }: Props) {
  return (
    <div
      className="mb-4 rounded-lg border border-red-200/90 bg-red-50/95 px-4 py-3 text-sm text-red-950 shadow-sm"
      role="alert"
    >
      <p className="leading-relaxed">{message}</p>
      {canRetry ? (
        <div className="mt-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={onResend}
          >
            Resend message
          </Button>
        </div>
      ) : null}
    </div>
  );
}
