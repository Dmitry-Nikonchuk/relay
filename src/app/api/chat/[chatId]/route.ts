import { handleUpdateChatTitle, handleDeleteChat } from '@/features/chat/server/chat';
import { getSessionUserId } from '@/shared/lib/auth/require-user';

export async function PATCH(req: Request, ctx: { params: Promise<{ chatId: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { chatId } = await ctx.params;
  return handleUpdateChatTitle(req, chatId, userId);
}

export async function DELETE(req: Request, ctx: { params: Promise<{ chatId: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { chatId } = await ctx.params;
  return handleDeleteChat(req, chatId, userId);
}
