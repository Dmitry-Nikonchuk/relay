export type UserChatModelsResponseDto = {
  availableModels: { id: string; label: string }[];
  selectedModel: string | null;
  deploymentDefault: string;
};
