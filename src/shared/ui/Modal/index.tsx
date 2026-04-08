'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/Button';
import { X } from 'lucide-react';

const Z_INDEX = 1100;

const sizeClass: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  /** Main content between optional title/description and footer. */
  children?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  /** Close control in the header (next to title). */
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  overlayClassName?: string;
  size?: 'sm' | 'md' | 'lg';
};

export function Modal({
  open,
  onClose,
  children,
  title,
  description,
  footer,
  showCloseButton = false,
  closeOnBackdrop = true,
  closeOnEscape = true,
  className,
  overlayClassName,
  size = 'md',
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !closeOnEscape) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, closeOnEscape, onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const el = panelRef.current;
    if (!el) {
      return;
    }
    el.focus();
  }, [open]);

  const onBackdropPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!closeOnBackdrop) {
        return;
      }
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [closeOnBackdrop, onClose],
  );

  const stopPanelPointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
  }, []);

  if (!open || typeof document === 'undefined') {
    return null;
  }

  const hasHeader = title != null || description != null || showCloseButton;

  const content = (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: Z_INDEX }}
      role="presentation"
    >
      <div
        className={cn('absolute inset-0 bg-slate-900/40', overlayClassName)}
        aria-hidden
        onPointerDown={onBackdropPointerDown}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title != null ? titleId : undefined}
        aria-describedby={description != null ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'relative w-full rounded-lg border border-border bg-surface shadow-[0_24px_80px_rgba(15,23,42,0.18)] outline-none',
          sizeClass[size],
          className,
        )}
        onPointerDown={stopPanelPointerDown}
      >
        {hasHeader ? (
          <div className="flex gap-3 border-b border-border px-5 py-4">
            <div className="min-w-0 flex-1">
              {title != null ? (
                <h2 id={titleId} className="text-base font-semibold text-text">
                  {title}
                </h2>
              ) : null}
              {description != null ? (
                <p id={descriptionId} className="mt-1 text-sm text-muted">
                  {description}
                </p>
              ) : null}
            </div>
            {showCloseButton ? (
              <button
                type="button"
                className="shrink-0 rounded-md p-1 text-muted transition-colors hover:bg-slate-100 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                onClick={onClose}
                aria-label="Close"
              >
                <X className="size-5" strokeWidth={1.75} />
              </button>
            ) : null}
          </div>
        ) : null}

        {children != null ? (
          <div className={cn(hasHeader ? 'px-5 py-4' : 'p-5')}>{children}</div>
        ) : null}

        {footer != null ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

export type ModalConfirmProps = {
  open: boolean;
  onClose: () => void;
  /** Called when user confirms; modal closes after the returned promise settles. */
  onConfirm: () => void | Promise<void>;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  loading?: boolean;
  /** For destructive actions, backdrop click often should not dismiss. Default: false. */
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
};

export function ModalConfirm({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  loading: loadingProp = false,
  closeOnBackdrop = false,
  closeOnEscape = true,
}: ModalConfirmProps) {
  const [pending, setPending] = useState(false);
  const loading = loadingProp || pending;

  const handleConfirm = useCallback(async () => {
    setPending(true);
    try {
      await Promise.resolve(onConfirm());
      onClose();
    } catch {
      // Caller handles errors; keep modal open
    } finally {
      setPending(false);
    }
  }, [onConfirm, onClose]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      closeOnBackdrop={closeOnBackdrop}
      closeOnEscape={closeOnEscape}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          {confirmVariant === 'danger' ? (
            <Button
              variant="danger"
              type="button"
              onClick={() => void handleConfirm()}
              disabled={loading}
            >
              {confirmLabel}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              type="button"
              onClick={() => void handleConfirm()}
              disabled={loading}
            >
              {confirmLabel}
            </Button>
          )}
        </>
      }
    />
  );
}
