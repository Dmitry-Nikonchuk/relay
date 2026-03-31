import { FC } from 'react';
import { cn } from '@/shared/lib/cn';
import { DropdownMenu } from '@/shared/ui/DropdownMenu';
import { EllipsisVertical, Trash2, Pencil } from 'lucide-react';

type MenuListProps = {
  items: MenuListItem[];
  activeItemId: string | null;
  className?: string;
  onDeleteClick?: (chatId: string) => void;
};

type MenuListItem = {
  id: string;
  label: string;
  onClick?: (item: Omit<MenuListItem, 'onClick'>) => void;
};

export const MenuList: FC<MenuListProps> = ({ items, activeItemId, onDeleteClick }) => {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => {
        const { onClick, ...itemWithoutFuncs } = item;
        return (
          <div
            className={cn(
              'group text-left overflow-hidden text-ellipsis whitespace-nowrap px-2 py-2 rounded-md pr-8 relative',
              activeItemId === item.id && 'text-primary bg-primary/10',
              item.onClick ? 'cursor-pointer' : null,
            )}
            key={item.id}
            onClick={() => onClick?.(itemWithoutFuncs)}
          >
            {item.label}
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
                },
                {
                  content: (
                    <div className="flex items-center gap-2">
                      <Trash2 size={12} /> Delete chat
                    </div>
                  ),
                  onAction: () => onDeleteClick?.(item.id),
                },
              ]}
            >
              <EllipsisVertical size={12} />
            </DropdownMenu>
          </div>
        );
      })}
    </div>
  );
};
