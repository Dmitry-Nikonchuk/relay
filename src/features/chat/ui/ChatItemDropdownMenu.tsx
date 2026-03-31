import { FC } from 'react';

import { DropdownMenu } from '@/shared/ui/DropdownMenu';
import { EllipsisVertical, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

type Props = {
  onDelete: () => void;
  onRename: () => void;
};

const ChatItemDropdownMenu: FC<Props> = ({ onDelete, onRename }) => {
  return (
    <DropdownMenu
      placement="bottom-end"
      className={cn(
        'w-4 h-4 cursor-pointer absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center',
        'group-hover:flex hidden',
      )}
      items={[
        {
          content: (
            <div className="flex items-center gap-2">
              <Pencil size={12} /> Rename
            </div>
          ),
          onAction: onRename,
        },
        {
          content: (
            <div className="flex items-center gap-2">
              <Trash2 size={12} /> Delete chat
            </div>
          ),
          onAction: onDelete,
        },
      ]}
    >
      <EllipsisVertical size={12} />
    </DropdownMenu>
  );
};

export default ChatItemDropdownMenu;
