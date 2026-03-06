'use client';
import { FormEvent, useState } from 'react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';

import { Button } from '@/shared/ui/Button';
import { Textarea } from '@/shared/ui/Textarea';

import { ChatMessage } from '@/domain/chat/chat.types';
import { chatApi } from '@/shared/api/chatApi';
import { cn } from '@/shared/lib/cn';

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!inputText.trim()) {
      return;
    }

    const newMessages = [...messages, { role: 'user', content: inputText } as ChatMessage];

    setMessages(newMessages);
    setInputText('');

    const assistantMessage = await chatApi.sendMessages(newMessages);
    setMessages((old) => [...old, assistantMessage]);
  };

  return (
    <div className="min-h-screen flex justify-center py-6 px-3 bg-bg">
      <div className="w-full max-w-[1120px] flex gap-4 items-stretch">
        <aside className="w-[280px] shrink-0 flex flex-col rounded-lg border border-border bg-gradient-to-br from-white to-[#f4f5ff] p-4 shadow-[0_18px_45px_rgba(15,23,42,0.04),0_0_0_1px_rgba(148,163,184,0.04)]">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-[42px] h-[42px] rounded-lg flex items-center justify-center overflow-hidden">
              <Image src="/logo.png" alt="Relay logo" width={36} height={36} />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-semibold tracking-tight">Relay</span>
              <span className="text-[11px] text-muted">Your gateway to AI</span>
            </div>
          </div>

          <div className="text-[11px] uppercase tracking-widest text-muted mb-1">Recents chats</div>
          <div className="flex flex-col gap-1.5"></div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col rounded-lg border border-border bg-surface shadow-[0_18px_45px_rgba(15,23,42,0.08),0_0_0_1px_rgba(148,163,184,0.08)] overflow-hidden">
          <header className="flex items-center justify-between pt-4 pb-3 px-5 border-b border-border">
            <div className="flex flex-col gap-1">
              <h1 className="m-0 text-xl font-semibold tracking-tight">Relay Chat</h1>
            </div>
          </header>

          <div className="flex-1 p-4 px-5 flex flex-col gap-3 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(139,126,219,0.09),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.09),transparent_55%)]">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  'flex flex-col gap-2',
                  message.role === 'user' ? 'items-end' : 'items-start',
                )}
              >
                <div className="text-sm font-medium">{message.role}</div>
                {message.role === 'assistant' ? (
                  <div className="text-sm prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-sm">{message.content}</div>
                )}
              </div>
            ))}
          </div>

          <form
            className="flex flex-col gap-2 py-3 px-5 border-t border-border bg-gradient-to-t from-slate-50/96 to-slate-50/92"
            onSubmit={handleSubmit}
          >
            <div className="flex gap-2 items-end">
              <Textarea
                className="resize-none min-h-[56px] max-h-[140px] text-sm"
                placeholder="Сформулируйте запрос или вставьте контекст для модели..."
                rows={2}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              <Button type="submit" disabled={!inputText.trim()}>
                Send
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
