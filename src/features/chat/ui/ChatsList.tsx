import { useState } from 'react';
import { Chat } from '@/entities/chat';
import { MenuList } from '@/shared/ui/MenuList';
import { Modal } from '@/shared/ui/Modal';
import { CirclePlus } from 'lucide-react';
import { Button } from '@/shared/ui/Button';

export function ChatsList({
  chats,
  onChatClick,
  onCreateChat,
  onDeleteChat,
  selectedChatId,
}: {
  chats: Chat[];
  onChatClick: (chatId: string) => void;
  onCreateChat: () => void;
  onDeleteChat: (chatId: string) => void;
  selectedChatId: string | null;
}) {
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [deleteChatId, setDeleteChatId] = useState<string | null>(null);
  const handleDeleteClick = (chatId: string) => {
    setDeleteChatId(chatId);
    setOpenDeleteConfirm(true);
  };
  const handleConfirmDelete = () => {
    if (deleteChatId) {
      onDeleteChat(deleteChatId);
      setOpenDeleteConfirm(false);
      setDeleteChatId(null);
    }
  };
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
            <MenuList
              items={chats.map((chat) => ({
                id: chat.id,
                label: chat.title,
                onClick: () => onChatClick(chat.id),
              }))}
              activeItemId={selectedChatId}
              onDeleteClick={handleDeleteClick}
            />
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
  return;
}
