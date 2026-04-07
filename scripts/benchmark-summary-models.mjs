#!/usr/bin/env node
/* global process, console, fetch, AbortController, setTimeout, clearTimeout */

import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const ChatMemoryJsonSchema = z
  .object({
    user_preferences: z.array(z.string().min(1)),
    facts: z.array(z.string().min(1)),
    decisions: z.array(z.string().min(1)),
    open_questions: z.array(z.string().min(1)),
    active_goals: z.array(z.string().min(1)),
    summary_text: z.string(),
  })
  .strict();

function loadEnvFileIfPresent(filename) {
  const fullPath = path.resolve(process.cwd(), filename);
  if (!fs.existsSync(fullPath)) return;

  const raw = fs.readFileSync(fullPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;

    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function getArgValue(flag, fallback) {
  const idx = process.argv.indexOf(flag);
  if (idx < 0 || idx + 1 >= process.argv.length) return fallback;
  return process.argv[idx + 1];
}

function parseModels() {
  const fromArg = getArgValue('--models', '').trim();
  const fromEnv = (process.env.OPENROUTER_SUMMARY_BENCH_MODELS ?? '').trim();
  const raw = fromArg || fromEnv || 'openrouter/free';
  return raw
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
}

function numberFromFlag(flag, defaultValue) {
  const raw = getArgValue(flag, '');
  const num = Number.parseInt(raw, 10);
  if (Number.isNaN(num) || num < 1) return defaultValue;
  return num;
}

function sampleDeltaMessage(seed, role) {
  const variants = [
    'User prefers concise step-by-step answers without emojis.',
    'Decision: use a message-count threshold for incremental summarization.',
    'Open question: whether to add embeddings in v2.',
    'Constraint: full history must remain in DB for audit and UI pagination.',
    'Active goal: reduce LLM context size and avoid full-history prompts.',
    'Fact: summary updates should be best-effort and non-blocking.',
  ];

  const text = variants[seed % variants.length];
  return {
    role,
    content: `${text} [case=${seed}]`,
    createdAt: new Date(Date.now() - seed * 31_000).toISOString(),
  };
}

function buildCase(caseIndex) {
  const previousSummary = {
    user_preferences: ['Concise replies'],
    facts: ['Chat persists full message history'],
    decisions: ['Incremental summary only'],
    open_questions: [],
    active_goals: ['Keep context bounded'],
    summary_text: 'Compact memory exists and should be updated from deltas only.',
  };

  const deltaMessages = [];
  const turns = 4 + (caseIndex % 5);
  for (let i = 0; i < turns; i++) {
    deltaMessages.push(sampleDeltaMessage(caseIndex + i, i % 2 === 0 ? 'user' : 'assistant'));
  }

  return { previousSummary, deltaMessages };
}

function buildPrompt(previousSummary, deltaMessages) {
  const systemPrompt = [
    'You maintain compact working memory for a long-running chat.',
    'You receive the existing memory and only new messages (delta).',
    'Update memory for future responses.',
    '',
    'Keep only durable and useful information:',
    '- user preferences',
    '- important facts',
    '- decisions and constraints',
    '- unresolved questions',
    '- active goals/tasks',
    '',
    'Remove noise:',
    '- greetings and filler',
    '- repetitive confirmations',
    '- temporary wording and irrelevant chatter',
    '',
    'Rules:',
    '- Deduplicate aggressively.',
    '- Keep entries short and specific.',
    '- Return strict JSON only.',
    '- Do not include markdown fences.',
  ].join('\n');

  const formattedDelta = deltaMessages
    .map((message) => `[${message.createdAt}] ${message.role}: ${message.content}`)
    .join('\n');

  const userPrompt = [
    'PREVIOUS_MEMORY_JSON:',
    JSON.stringify(previousSummary),
    '',
    'DELTA_MESSAGES:',
    formattedDelta,
    '',
    'Return updated JSON with exactly these keys and value types:',
    '{',
    '  "user_preferences": string[],',
    '  "facts": string[],',
    '  "decisions": string[],',
    '  "open_questions": string[],',
    '  "active_goals": string[],',
    '  "summary_text": string',
    '}',
  ].join('\n');

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

function extractJsonCandidate(raw) {
  const trimmed = raw.trim();

  if (trimmed.startsWith('```')) {
    const firstNewline = trimmed.indexOf('\n');
    const lastFence = trimmed.lastIndexOf('```');
    if (firstNewline > -1 && lastFence > firstNewline) {
      return trimmed.slice(firstNewline + 1, lastFence).trim();
    }
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1).trim();
  }

  return trimmed;
}

async function runOneCall({ apiKey, baseUrl, model, prompt, maxTokens, requestTimeoutMs }) {
  const start = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);

  let res;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL ?? 'http://localhost:3000',
        'X-Title': 'Relay Summary Benchmark',
      },
      body: JSON.stringify({
        model,
        messages: prompt,
        temperature: 0,
        max_tokens: maxTokens,
        stream: false,
      }),
    });
  } catch (error) {
    clearTimeout(timeoutId);
    const elapsedMs = Date.now() - start;
    return {
      ok: false,
      elapsedMs,
      status: undefined,
      error: error instanceof Error ? error.message : 'fetch failed',
    };
  }
  clearTimeout(timeoutId);

  const elapsedMs = Date.now() - start;
  const text = await res.text();
  if (!res.ok) {
    return {
      ok: false,
      elapsedMs,
      status: res.status,
      error: text.slice(0, 500),
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      ok: false,
      elapsedMs,
      status: 200,
      error: 'Invalid API JSON response',
    };
  }

  const content = parsed?.choices?.[0]?.message?.content ?? '';
  return {
    ok: true,
    elapsedMs,
    modelResolved: parsed?.model,
    content: String(content),
  };
}

async function benchmarkModel({ apiKey, baseUrl, model, trials, maxTokens, requestTimeoutMs }) {
  let valid = 0;
  let invalidJson = 0;
  let apiErrors = 0;
  let totalMs = 0;
  const errorSamples = [];
  const resolvedModels = new Map();

  for (let i = 0; i < trials; i++) {
    const testCase = buildCase(i + 1);
    const prompt = buildPrompt(testCase.previousSummary, testCase.deltaMessages);
    const result = await runOneCall({
      apiKey,
      baseUrl,
      model,
      prompt,
      maxTokens,
      requestTimeoutMs,
    });
    totalMs += result.elapsedMs;

    if (!result.ok) {
      apiErrors += 1;
      if (errorSamples.length < 3) {
        errorSamples.push(`api_error status=${result.status ?? 'n/a'} ${result.error ?? ''}`);
      }
      continue;
    }

    if (result.modelResolved) {
      resolvedModels.set(result.modelResolved, (resolvedModels.get(result.modelResolved) ?? 0) + 1);
    }

    try {
      const candidate = extractJsonCandidate(result.content);
      const asJson = JSON.parse(candidate);
      ChatMemoryJsonSchema.parse(asJson);
      valid += 1;
    } catch (error) {
      invalidJson += 1;
      if (errorSamples.length < 3) {
        errorSamples.push(
          `invalid_json ${error instanceof Error ? error.message.slice(0, 180) : 'unknown'}`,
        );
      }
    }
  }

  return {
    model,
    trials,
    valid,
    invalidJson,
    apiErrors,
    validRate: valid / trials,
    avgLatencyMs: Math.round(totalMs / trials),
    resolvedModels: [...resolvedModels.entries()].sort((a, b) => b[1] - a[1]),
    errorSamples,
  };
}

function printResults(results) {
  const sorted = [...results].sort((a, b) => {
    if (b.validRate !== a.validRate) return b.validRate - a.validRate;
    return a.avgLatencyMs - b.avgLatencyMs;
  });

  console.log('\nSummary JSON Reliability Benchmark');
  console.log('================================');
  console.log(
    'model'.padEnd(34) +
      'valid%'.padEnd(10) +
      'valid'.padEnd(8) +
      'invalid'.padEnd(10) +
      'api_err'.padEnd(9) +
      'avg_ms',
  );

  for (const item of sorted) {
    const validPercent = `${(item.validRate * 100).toFixed(1)}%`;
    console.log(
      item.model.slice(0, 33).padEnd(34) +
        validPercent.padEnd(10) +
        String(item.valid).padEnd(8) +
        String(item.invalidJson).padEnd(10) +
        String(item.apiErrors).padEnd(9) +
        String(item.avgLatencyMs),
    );
  }

  for (const item of sorted) {
    console.log(`\n[${item.model}]`);
    if (item.resolvedModels.length > 0) {
      console.log(
        'resolved models: ' +
          item.resolvedModels.map(([name, count]) => `${name}(${count})`).join(', '),
      );
    }
    if (item.errorSamples.length > 0) {
      console.log('sample errors:');
      for (const sample of item.errorSamples) {
        console.log(`- ${sample}`);
      }
    }
  }
}

async function main() {
  loadEnvFileIfPresent('.env.local');
  loadEnvFileIfPresent('.env');

  const apiKey = process.env.OPENROUTER_API_KEY ?? '';
  if (!apiKey) {
    console.error('Missing OPENROUTER_API_KEY. Set it in .env.local or environment.');
    process.exit(1);
  }

  const baseUrl = process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1';
  const models = parseModels();
  const trials = numberFromFlag('--trials', 30);
  const maxTokens = numberFromFlag('--max-tokens', 800);
  const requestTimeoutMs = numberFromFlag('--request-timeout-ms', 60_000);

  console.log(`Running benchmark with ${trials} trials/model`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Models: ${models.join(', ')}`);

  const results = [];
  for (const model of models) {
    console.log(`\nBenchmarking ${model} ...`);
    const result = await benchmarkModel({
      apiKey,
      baseUrl,
      model,
      trials,
      maxTokens,
      requestTimeoutMs,
    });
    results.push(result);
  }

  printResults(results);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Unknown benchmark error');
  process.exit(1);
});
