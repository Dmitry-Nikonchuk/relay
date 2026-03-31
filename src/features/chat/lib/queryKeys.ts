export const chatQueryKeys = {
  all: ['chat'] as const,
  list: () => [...chatQueryKeys.all, 'list'] as const,
};
