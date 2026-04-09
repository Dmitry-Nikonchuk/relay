'use client';

import { Button } from '@/shared/ui/Button';

type Props = {
  message: string;
  onResend: () => void;
  disabled?: boolean;
};

export function ChatSendError({ message, onResend, disabled = false }: Props) {
  return (
    <div
      className="mb-4 rounded-lg border border-red-200/90 bg-red-50/95 px-4 py-3 text-sm text-red-950 shadow-sm"
      role="alert"
    >
      <p className="leading-relaxed">{message}</p>
      <div className="mt-3">
        <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={onResend}>
          Resend message
        </Button>
      </div>
    </div>
  );
}
