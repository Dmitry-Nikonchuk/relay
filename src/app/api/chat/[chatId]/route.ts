import { handleUpdateChatTitle, handleDeleteChat } from '@/features/chat/server/chat';

export async function PATCH(req: Request, ctx: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await ctx.params;
  return handleUpdateChatTitle(req, chatId);
}

export async function DELETE(req: Request, ctx: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await ctx.params;
  return handleDeleteChat(req, chatId);
}
