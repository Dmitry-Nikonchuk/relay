'use client';

import type { FC } from 'react';
import { useState, useCallback, useRef, useLayoutEffect } from 'react';
import { Chat } from '@/entities/chat';
import { Modal } from '@/shared/ui/Modal';
import { CirclePlus } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
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
  const renameInputRef = useRef<HTMLInputElement>(null);

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
      {chats.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="flex align-center justify-between mb-1.5">
            <div className="text-[11px] uppercase tracking-[0.22em] text-muted">Your chats</div>
            <button className="text-muted size-5 hover:text-slate-900" onClick={onCreateChat}>
              <CirclePlus size={16} />
            </button>
          </div>
          <div className="flex flex-col rounded-md bg-surface/60 max-h-[420px] overflow-y-auto gap-1.5 py-1">
            <div className="flex flex-col gap-2">
              {chats.map((item) => {
                return (
                  <div
                    className={cn(
                      'group text-left overflow-hidden text-ellipsis whitespace-nowrap px-2 py-2 rounded-md pr-8 relative',
                      selectedChatId === item.id && 'text-primary bg-primary/10',
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
      <Modal
        open={openDeleteConfirm}
        onClose={() => setOpenDeleteConfirm(false)}
        title="Delete chat"
        description="Are you sure you want to delete this chat?"
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setOpenDeleteConfirm(false)}>Cancel</Button>
            <Button onClick={handleConfirmDelete}>Delete</Button>
          </div>
        }
      ></Modal>
    </>
  );
};
