'use client';

import { ChevronDown } from 'lucide-react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/shared/lib/cn';

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

const MENU_GAP_PX = 4;
const Z_INDEX = 1000;

const triggerSurface =
  'flex w-full items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2 text-left text-sm text-text ' +
  'focus:outline-none focus:border-primary ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

export type SelectProps = {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (e: ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
  className?: string;
  'aria-label'?: string;
  autoFocus?: boolean;
};

function emitChange(value: string, onChange: SelectProps['onChange']): void {
  const synthetic = {
    target: { value } as EventTarget & HTMLSelectElement,
    currentTarget: { value } as EventTarget & HTMLSelectElement,
  } as ChangeEvent<HTMLSelectElement>;
  onChange?.(synthetic);
}

function useSelectPosition(
  open: boolean,
  triggerRef: React.RefObject<HTMLElement | null>,
): { top: number; left: number; width: number } | null {
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null);

  const update = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setBox({
      top: rect.bottom + MENU_GAP_PX,
      left: rect.left,
      width: rect.width,
    });
  }, [triggerRef]);

  useLayoutEffect(() => {
    if (!open) {
      setBox(null);
      return;
    }
    update();
  }, [open, update]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, update]);

  return box;
}

function useClickOutside(
  triggerRef: React.RefObject<HTMLElement | null>,
  panelRef: React.RefObject<HTMLElement | null>,
  onOutside: () => void,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;
    const handle = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      onOutside();
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [triggerRef, panelRef, onOutside, enabled]);
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  {
    options,
    value: valueProp,
    defaultValue,
    onChange,
    disabled,
    id,
    name,
    className,
    'aria-label': ariaLabel,
    autoFocus,
  },
  ref,
) {
  const isControlled = valueProp !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? '');
  const value = isControlled ? valueProp! : uncontrolledValue;

  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();
  const coords = useSelectPosition(open, triggerRef);

  const close = useCallback(() => setOpen(false), []);

  useClickOutside(triggerRef, panelRef, close, open);

  const selectedOption = options.find((o) => o.value === value);
  const labelShown = selectedOption?.label ?? value ?? '—';

  const firstEnabledIndex = useCallback(() => {
    const i = options.findIndex((o) => !o.disabled);
    return i >= 0 ? i : 0;
  }, [options]);

  const moveHighlight = useCallback(
    (delta: number) => {
      setHighlightedIndex((prev) => {
        if (options.length === 0) return prev;
        let i = prev;
        for (let step = 0; step < options.length; step++) {
          i = (i + delta + options.length) % options.length;
          if (!options[i]?.disabled) {
            return i;
          }
        }
        return prev;
      });
    },
    [options],
  );

  useEffect(() => {
    if (!open) return;
    const idx = options.findIndex((o) => o.value === value && !o.disabled);
    setHighlightedIndex(idx >= 0 ? idx : firstEnabledIndex());
  }, [open, value, options, firstEnabledIndex]);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const el = document.getElementById(`${listboxId}-opt-${highlightedIndex}`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, open, listboxId]);

  const selectValue = (next: string) => {
    if (!isControlled) {
      setUncontrolledValue(next);
    }
    emitChange(next, onChange);
    close();
    triggerRef.current?.focus();
  };

  const onTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      close();
      return;
    }
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !open) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveHighlight(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveHighlight(-1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const o = options[highlightedIndex];
      if (o && !o.disabled) {
        selectValue(o.value);
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      setHighlightedIndex(firstEnabledIndex());
    } else if (e.key === 'End') {
      e.preventDefault();
      for (let i = options.length - 1; i >= 0; i--) {
        if (!options[i]?.disabled) {
          setHighlightedIndex(i);
          break;
        }
      }
    }
  };

  const panel =
    open && coords && typeof document !== 'undefined' ? (
      <ul
        ref={panelRef}
        id={listboxId}
        role="listbox"
        aria-activedescendant={
          options[highlightedIndex] ? `${listboxId}-opt-${highlightedIndex}` : undefined
        }
        style={{
          position: 'fixed',
          top: coords.top,
          left: coords.left,
          width: coords.width,
          zIndex: Z_INDEX,
        }}
        className={cn(
          'max-h-60 overflow-auto rounded-md border border-border bg-surface py-1',
          'shadow-[0_12px_40px_rgba(15,23,42,0.12),0_0_0_1px_rgba(148,163,184,0.06)]',
        )}
      >
        {options.map((o, index) => {
          const isSelected = o.value === value;
          const isHighlighted = index === highlightedIndex;
          return (
            <li
              key={o.value}
              id={`${listboxId}-opt-${index}`}
              role="option"
              aria-selected={isSelected}
              aria-disabled={o.disabled || undefined}
              className={cn(
                'cursor-pointer px-3 py-2 text-sm text-text transition-colors',
                o.disabled && 'cursor-not-allowed opacity-50',
                !o.disabled && isHighlighted && 'bg-slate-100',
                !o.disabled && !isHighlighted && 'hover:bg-slate-50',
              )}
              onMouseEnter={() => !o.disabled && setHighlightedIndex(index)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => !o.disabled && selectValue(o.value)}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {isSelected ? (
                  <span className="shrink-0 text-xs font-medium text-primary" aria-hidden>
                    ✓
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    ) : null;

  return (
    <div className={cn('relative w-full', className)}>
      {name ? <input type="hidden" name={name} value={value ?? ''} readOnly /> : null}
      <button
        ref={(node) => {
          triggerRef.current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        type="button"
        id={id}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        className={cn(triggerSurface, !disabled && 'cursor-pointer')}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="min-w-0 flex-1 truncate">{labelShown}</span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-muted transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>
      {typeof document !== 'undefined' && panel ? createPortal(panel, document.body) : null}
    </div>
  );
});

Select.displayName = 'Select';
