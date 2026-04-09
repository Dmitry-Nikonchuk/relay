import { ZodError, treeifyError, z } from 'zod';

import {
  getChatModelsApiPayload,
  getUserChatModelRow,
  getAvailableChatModelsForUser,
  setUserPreferredChatModel,
} from '@/features/user/server/chatModels.service';
import type { UserChatModelsResponseDto } from '@/features/user/model/userChatModels.types';
import { getSessionUserId } from '@/shared/lib/auth/require-user';

const PatchChatModelSchema = z.object({
  model: z.string().min(1),
});

export async function GET(): Promise<Response> {
  const userId = await getSessionUserId();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const row = await getUserChatModelRow(userId);
  if (!row) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  const payload: UserChatModelsResponseDto = getChatModelsApiPayload(row);
  return Response.json(payload);
}

export async function PATCH(req: Request): Promise<Response> {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { model } = PatchChatModelSchema.parse(body);

    const row = await getUserChatModelRow(userId);
    if (!row) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const allowed = getAvailableChatModelsForUser(row);
    if (!allowed.some((m) => m.id === model)) {
      return Response.json({ error: 'Model not allowed for your account' }, { status: 400 });
    }

    await setUserPreferredChatModel(userId, model);

    const updated = await getUserChatModelRow(userId);
    if (!updated) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const payload: UserChatModelsResponseDto = getChatModelsApiPayload(updated);
    return Response.json(payload);
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: 'Invalid payload', details: treeifyError(error) },
        { status: 400 },
      );
    }
    console.error(error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
