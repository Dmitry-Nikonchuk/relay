'use client';

import type { FC } from 'react';
import { useState, useCallback, useRef, useLayoutEffect, useMemo } from 'react';
import { Chat } from '@/features/chat/model';
import { Modal } from '@/shared/ui/Modal';
import { CirclePlus, Search, X } from 'lucide-react';
import { ClientButton } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { cn } from '@/shared/lib/cn';
import ChatItemDropdownMenu from './ChatItemDropdownMenu';

type Props = {
  chats: Chat[];
  onChatClick: (chatId: string) => void;
  onCreateChat: () => void;
  onDeleteChat: (chatId: string) => void;
  onRenameChat: (chatId: string, title: string) => void;
  selectedChatId: string | null;
};

export const ChatsList: FC<Props> = ({
  chats,
  onChatClick,
  onCreateChat,
  onDeleteChat,
  onRenameChat,
  selectedChatId,
}) => {
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [deleteChatId, setDeleteChatId] = useState<string | null>(null);
  const [renameChatId, setRenameChatId] = useState<string | null>(null);
  const [renameInputValue, setRenameInputValue] = useState<string>('');
  const [searchInputValue, setSearchInputValue] = useState<string>('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const filteredChats = useMemo(
    () => chats.filter((item) => item.title.toLowerCase().includes(searchInputValue.toLowerCase())),
    [chats, searchInputValue],
  );

  useLayoutEffect(() => {
    if (!renameChatId) {
      return;
    }
    const el = renameInputRef.current;
    if (!el) {
      return;
    }
    el.focus();
    const len = el.value.length;
    el.setSelectionRange(len, len);
  }, [renameChatId]);

  const handleDeleteClick = useCallback((chatId: string) => {
    setDeleteChatId(chatId);
    setOpenDeleteConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteChatId) {
      onDeleteChat(deleteChatId);
      setOpenDeleteConfirm(false);
      setDeleteChatId(null);
    }
  }, [deleteChatId, onDeleteChat]);

  const handleRenameChat = useCallback(
    (chatId: string) => {
      setRenameChatId(chatId);
      setRenameInputValue(chats?.find(({ id }) => id === chatId)?.title || '');
    },
    [chats],
  );

  const handleSubmitRename = useCallback(
    async (newText: string) => {
      if (!renameChatId) return;
      if (newText === chats?.find(({ id }) => id === selectedChatId)?.title) {
        setRenameChatId(null);
        setRenameInputValue('');
        return;
      }
      onRenameChat(renameChatId, newText);
      setRenameChatId(null);
      setRenameInputValue('');
    },
    [chats, onRenameChat, renameChatId, selectedChatId],
  );

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">
        {chats.length > 0 ? (
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted">Your chats</div>
              <button className="size-5 text-muted hover:text-slate-900" onClick={onCreateChat}>
                <CirclePlus size={16} />
              </button>
            </div>
            <div className="mt-1 mb-1 flex items-center justify-start border border-border rounded-md">
              <Input
                placeholder="Search chats..."
                className="h-8 text-xs border-none bg-transparent"
                value={searchInputValue}
                onChange={(e) => setSearchInputValue(e.target.value)}
                ref={searchInputRef}
              />
              <div className="w-10 h-8 flex items-center justify-center">
                {searchInputValue ? (
                  <X
                    size={14}
                    className="text-gray-500 cursor-pointer"
                    onClick={() => setSearchInputValue('')}
                  />
                ) : (
                  <Search
                    size={14}
                    className="text-gray-500 cursor-pointer"
                    onClick={() => searchInputRef.current?.focus()}
                  />
                )}
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto rounded-md py-1">
              <div className="flex flex-col gap-1">
                {filteredChats.map((item) => {
                  return (
                    <div
                      className={cn(
                        'group text-left overflow-hidden text-ellipsis whitespace-nowrap px-2 py-2 rounded-md pr-8 relative text-sm text-text/80 hover:bg-primary/5 transition-bg duration-300',
                        selectedChatId === item.id && 'text-text bg-primary/10 hover:bg-primary/10',
                        'cursor-pointer',
                      )}
                      key={item.id}
                      onClick={() => onChatClick?.(item.id)}
                    >
                      {renameChatId === item.id ? (
                        <Input
                          ref={renameInputRef}
                          value={renameInputValue}
                          onChange={(e) => setRenameInputValue(e.target.value)}
                          onBlur={(e) => handleSubmitRename(e.target.value)}
                          onPressEnter={() => handleSubmitRename(renameInputValue)}
                        />
                      ) : (
                        item.title
                      )}
                      <ChatItemDropdownMenu
                        onDelete={() => handleDeleteClick?.(item.id)}
                        onRename={() => handleRenameChat(item.id)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <Modal
        open={openDeleteConfirm}
        onClose={() => setOpenDeleteConfirm(false)}
        title="Delete chat"
        description="Are you sure you want to delete this chat?"
        footer={
          <div className="flex justify-end gap-2">
            <ClientButton variant="secondary" size="sm" onClick={() => setOpenDeleteConfirm(false)}>
              Cancel
            </ClientButton>
            <ClientButton variant="danger" onClick={handleConfirmDelete}>
              Delete
            </ClientButton>
          </div>
        }
      ></Modal>
    </>
  );
};
