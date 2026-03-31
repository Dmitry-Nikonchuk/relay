'use client';

import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/shared/lib/cn';

export type DropdownMenuItem = {
  /** Stable key for list rendering. */
  id?: string | number;
  disabled?: boolean;
  /** Called when the item is activated (click / Enter / Space). Menu closes after. */
  onAction?: () => void;
  /** Row content: text, icon + text, or any React node. */
  content: ReactNode;
};

/** Where the menu panel anchors to the trigger (viewport / LTR). */
export type DropdownMenuPlacement =
  | 'bottom-start' // слева внизу: нижний край триггера, выравнивание по левому краю
  | 'bottom-end' // справа внизу
  | 'top-start' // слева вверху
  | 'top-end'; // справа вверху

export type DropdownMenuProps = {
  items: DropdownMenuItem[];
  /** Trigger element (e.g. button). Receives aria-expanded / aria-haspopup / aria-controls. */
  children: ReactElement<{ onClick?: (e: MouseEvent) => void }>;
  className?: string;
  /** Panel classes (positioned under the trigger). */
  menuClassName?: string;
  /** Menu position relative to the trigger. Default: bottom-start. */
  placement?: DropdownMenuPlacement;
};

const MENU_GAP_PX = 4;
const Z_INDEX = 1000;

function useMenuPosition(
  open: boolean,
  triggerRef: React.RefObject<HTMLElement | null>,
  placement: DropdownMenuPlacement,
) {
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    transform?: string;
  } | null>(null);

  const update = useCallback(() => {
    const el = triggerRef.current;
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    switch (placement) {
      case 'bottom-start':
        setCoords({
          top: rect.bottom + MENU_GAP_PX,
          left: rect.left,
        });
        break;
      case 'bottom-end':
        setCoords({
          top: rect.bottom + MENU_GAP_PX,
          left: rect.right,
          transform: 'translateX(-100%)',
        });
        break;
      case 'top-start':
        setCoords({
          top: rect.top - MENU_GAP_PX,
          left: rect.left,
          transform: 'translateY(-100%)',
        });
        break;
      case 'top-end':
        setCoords({
          top: rect.top - MENU_GAP_PX,
          left: rect.right,
          transform: 'translate(-100%, -100%)',
        });
        break;
    }
  }, [triggerRef, placement]);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    update();
  }, [open, update]);

  useEffect(() => {
    if (!open) {
      return;
    }
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, update]);

  return coords;
}

function useClickOutside(
  triggerRef: React.RefObject<HTMLElement | null>,
  menuRef: React.RefObject<HTMLElement | null>,
  onOutside: () => void,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const handle = (e: globalThis.MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) {
        return;
      }
      if (menuRef.current?.contains(t)) {
        return;
      }
      onOutside();
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [triggerRef, menuRef, onOutside, enabled]);
}

export function DropdownMenu({
  items,
  children,
  className,
  menuClassName,
  placement = 'bottom-start',
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const menuId = useId();

  const close = useCallback(() => setOpen(false), []);
  const coords = useMenuPosition(open, triggerRef, placement);
  useClickOutside(triggerRef, menuRef, close, open);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  const triggerProps = {
    'aria-expanded': open,
    'aria-haspopup': 'menu' as const,
    'aria-controls': menuId,
    onClick: (e: MouseEvent) => {
      children.props.onClick?.(e);
      e.stopPropagation();
      if (e.defaultPrevented) {
        return;
      }
      setOpen((v) => !v);
    },
  };

  const triggerNode = isValidElement(children) ? cloneElement(children, triggerProps) : children;

  const menu =
    open && coords ? (
      <ul
        ref={menuRef}
        id={menuId}
        role="menu"
        aria-orientation="vertical"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: coords.top,
          left: coords.left,
          transform: coords.transform,
          zIndex: Z_INDEX,
        }}
        className={cn(
          'min-w-[10rem] max-w-[min(100vw-2rem,20rem)] rounded-md border border-border bg-surface py-1 shadow-[0_12px_40px_rgba(15,23,42,0.12),0_0_0_1px_rgba(148,163,184,0.06)]',
          menuClassName,
        )}
      >
        {items.map((item, index) => {
          const key = item.id ?? index;
          return (
            <li key={key} role="presentation">
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                tabIndex={item.disabled ? -1 : 0}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text transition-colors',
                  item.disabled
                    ? 'cursor-not-allowed opacity-50'
                    : 'cursor-pointer hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-300',
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  if (item.disabled) {
                    return;
                  }
                  item.onAction?.();
                  close();
                }}
                onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
                  if (item.disabled) {
                    return;
                  }
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    item.onAction?.();
                    close();
                  }
                }}
              >
                {item.content}
              </button>
            </li>
          );
        })}
      </ul>
    ) : null;

  return (
    <>
      <div
        ref={triggerRef}
        className={cn('inline-flex', className)}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {triggerNode}
      </div>
      {typeof document !== 'undefined' && menu ? createPortal(menu, document.body) : null}
    </>
  );
}
