'use client';

import { useCallback, useEffect, useState } from 'react';

import { chatApi } from '@/features/chat/lib/chatApi';
import type { UserChatModelsResponseDto } from '@/features/user/model/userChatModels.types';
import { Select } from '@/shared/ui/Select';

export function ProfileChatModelSection() {
  const [data, setData] = useState<UserChatModelsResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await chatApi.fetchUserChatModels();
      setData(res);
    } catch {
      setError('Could not load chat models.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const effectiveValue = data ? (data.selectedModel ?? data.deploymentDefault) : '';

  const onChange = async (nextId: string) => {
    if (!data) return;
    setIsSaving(true);
    setError(null);
    try {
      const updated = await chatApi.patchUserChatModel(nextId);
      setData(updated);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
    } catch {
      setError('Could not save model.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="border-t border-border pt-6">
        <p className="text-sm text-muted">Loading chat model…</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="border-t border-border pt-6">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="border-t border-border pt-6">
      <h2 className="text-base font-semibold text-text">Chat model</h2>
      <p className="mt-1 text-sm text-muted">
        Replies use the model you select. Server default when none is saved:{' '}
        <span className="font-mono text-xs text-text/90">{data.deploymentDefault}</span>
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label htmlFor="profile-chat-model" className="sr-only">
          Chat model
        </label>
        <Select
          id="profile-chat-model"
          className="min-w-[min(100%,280px)]"
          value={effectiveValue}
          disabled={isSaving}
          onChange={(e) => void onChange(e.target.value)}
          options={data.availableModels.map((m) => ({ value: m.id, label: m.label }))}
        />
        {isSaving ? <span className="text-sm text-muted">Saving…</span> : null}
        {savedFlash && !isSaving ? <span className="text-sm text-muted">Saved</span> : null}
      </div>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
