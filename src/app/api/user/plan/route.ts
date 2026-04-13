import { getUserPlanAndUsageSummary } from '@/features/user/server/chatModels.service';
import type { UserPlanAndUsageResponseDto } from '@/features/user/model/userPlanAndUsage.types';
import { ApiError, apiErrorResponse, unauthorizedResponse } from '@/shared/lib/api/errors';
import { getSessionUserId } from '@/shared/lib/auth/require-user';

export async function GET(): Promise<Response> {
  const userId = await getSessionUserId();
  if (!userId) {
    return unauthorizedResponse();
  }

  const payload = await getUserPlanAndUsageSummary(userId);
  if (!payload) {
    return apiErrorResponse(
      new ApiError('User not found', {
        status: 404,
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      }),
    );
  }

  return Response.json(payload satisfies UserPlanAndUsageResponseDto);
}
