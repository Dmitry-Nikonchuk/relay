'use client';
import { FormEvent, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Textarea } from '@/shared/ui/Textarea';

export function ChatForm({
  onSubmit,
  disabled = false,
}: {
  onSubmit: (inputText: string) => Promise<void>;
  disabled?: boolean;
}) {
  const [inputText, setInputText] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) {
      return;
    }
    setInputText('');
    await onSubmit(text);
  };

  return (
    <form
      className="flex flex-col gap-2 py-3 px-5 border-t border-border bg-gradient-to-t from-slate-50/96 to-slate-50/92"
      onSubmit={handleSubmit}
    >
      <div className="flex gap-2 items-end">
        <Textarea
          className="resize-none min-h-[56px] max-h-[140px] text-sm"
          placeholder="Ask me anything..."
          rows={2}
          value={inputText}
          disabled={disabled}
          onChange={(e) => setInputText(e.target.value)}
        />
        <Button type="submit" variant="primary" size="sm" disabled={!inputText.trim() || disabled}>
          Send
        </Button>
      </div>
    </form>
  );
}
