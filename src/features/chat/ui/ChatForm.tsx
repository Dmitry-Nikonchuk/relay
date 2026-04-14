'use client';

import { ChevronDown, Loader2, Send } from 'lucide-react';
import { FormEvent, useState } from 'react';

import { cn } from '@/shared/lib/cn';
import { DropdownMenu } from '@/shared/ui/DropdownMenu';
import { Textarea } from '@/shared/ui/Textarea';

export type ActiveChatModelInfo = {
  id: string;
  label: string;
};

const formClass = {
  /** Docked under messages: tint + top edge so it reads as a separate strip from `bg-surface`. */
  default:
    'flex w-[95%] mx-auto flex-col gap-1 border border-border/80 rounded-sm bg-bg py-3 px-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]',
  empty:
    'flex w-full flex-col gap-1 rounded-xl border border-border bg-gradient-to-b from-slate-50 to-slate-100/90 px-4 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.06),0_0_0_1px_rgba(148,163,184,0.06)] sm:px-5',
} as const;

const textareaNoChrome =
  'min-h-[72px] max-h-[200px] w-full resize-none border-0 bg-transparent px-0 py-2 text-sm text-text shadow-none outline-none ring-0 ring-offset-0 ' +
  'placeholder:text-muted focus:border-transparent focus:outline-none focus:ring-0 focus:ring-offset-0 ' +
  'hover:border-transparent disabled:opacity-60';

export function ChatForm({
  onSubmit,
  disabled = false,
  isSubmitting = false,
  activeModel,
  isLoadingModel = false,
  availableModels = [],
  onModelChange,
  variant = 'default',
}: {
  onSubmit: (inputText: string) => Promise<void>;
  /** True while the assistant reply is streaming / send in flight. */
  disabled?: boolean;
  isSubmitting?: boolean;
  activeModel?: ActiveChatModelInfo | null;
  isLoadingModel?: boolean;
  availableModels?: { id: string; label: string }[];
  onModelChange?: (modelId: string) => Promise<void>;
  variant?: keyof typeof formClass;
}) {
  const [inputText, setInputText] = useState('');
  const [isSavingModel, setIsSavingModel] = useState(false);

  const canSend = inputText.trim().length > 0 && !disabled;
  const sendBlocked = !canSend;

  const runSubmit = async () => {
    const text = inputText.trim();
    if (!text || disabled) {
      return;
    }
    setInputText('');
    await onSubmit(text);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await runSubmit();
  };

  const handleModelPick = async (modelId: string) => {
    if (!onModelChange || modelId === activeModel?.id) {
      return;
    }
    setIsSavingModel(true);
    try {
      await onModelChange(modelId);
    } finally {
      setIsSavingModel(false);
    }
  };

  return (
    <form className={cn(formClass[variant])} onSubmit={handleSubmit}>
      <Textarea
        className={textareaNoChrome}
        placeholder="Ask me anything..."
        rows={3}
        value={inputText}
        disabled={disabled}
        onChange={(e) => setInputText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            void runSubmit();
          }
        }}
      />

      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="min-w-0 flex-1">
          {isLoadingModel ? (
            <span className="text-xs text-muted">Loading model…</span>
          ) : activeModel && availableModels.length > 0 && onModelChange ? (
            <DropdownMenu
              placement={variant === 'default' ? 'top-start' : 'bottom-start'}
              items={availableModels.map((m) => ({
                id: m.id,
                content: (
                  <span className={cn(m.id === activeModel.id && 'font-medium text-primary')}>
                    {m.label}
                  </span>
                ),
                onAction: () => {
                  void handleModelPick(m.id);
                },
              }))}
              menuClassName="max-h-60 overflow-y-auto"
            >
              <button
                type="button"
                disabled={isSavingModel || disabled}
                className={cn(
                  'flex max-w-full min-w-0 items-center gap-1 rounded-md py-1 pl-0 pr-1 text-left text-xs text-muted transition-colors',
                  'hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
                  (isSavingModel || disabled) && 'cursor-not-allowed opacity-60',
                )}
              >
                <span className="truncate">{activeModel.label}</span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              </button>
            </DropdownMenu>
          ) : activeModel ? (
            <span className="text-xs text-muted">{activeModel.label}</span>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={sendBlocked}
          aria-label={isSubmitting ? 'Sending…' : 'Send'}
          className={cn(
            'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
            'bg-primary text-white shadow-sm hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35',
            'disabled:pointer-events-none disabled:opacity-45',
          )}
        >
          {isSubmitting ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : (
            <Send className="h-5 w-5" aria-hidden />
          )}
        </button>
      </div>
    </form>
  );
}
