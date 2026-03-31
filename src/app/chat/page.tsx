'use client';
import Image from 'next/image';
import { ChatForm, MessagesStack, ChatsList, useChat } from '@/features/chat';

export default function ChatPage() {
  const {
    messages,
    chatTitle,
    sendMessage,
    chats,
    setSelectedChatId,
    selectedChatId,
    startNewChat,
    isAssistantLoading,
    messagesScrollEpoch,
    deleteChat,
    renameChat,
  } = useChat();

  return (
    <div className="min-h-screen max-h-screen overflow-hidden flex justify-center py-6 px-3 bg-bg">
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

          <ChatsList
            chats={chats}
            onChatClick={setSelectedChatId}
            onCreateChat={startNewChat}
            onDeleteChat={deleteChat}
            onRenameChat={renameChat}
            selectedChatId={selectedChatId}
          />
        </aside>

        <div className="flex-1 min-w-0 flex flex-col rounded-lg border border-border bg-surface shadow-[0_18px_45px_rgba(15,23,42,0.08),0_0_0_1px_rgba(148,163,184,0.08)] overflow-hidden pb-4">
          <header className="flex items-center justify-between pt-4 pb-3 px-5 border-b border-border">
            <div className="flex flex-col gap-1">
              <h1 className="m-0 text-xl font-semibold tracking-tight">{chatTitle}</h1>
            </div>
          </header>
          <div className="flex-1 overflow-hidden overflow-y-auto">
            <MessagesStack
              messages={messages}
              isAssistantLoading={isAssistantLoading}
              messagesScrollEpoch={messagesScrollEpoch}
            />
          </div>

          <ChatForm onSubmit={sendMessage} disabled={isAssistantLoading} />
        </div>
      </div>
    </div>
  );
}
