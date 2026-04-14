import type { Metadata } from 'next';

import { LEGAL_LAST_UPDATED, SERVICE_NAME, SERVICE_OPERATOR } from '@/shared/config/legal';
import { LegalPage, LegalSection } from '@/shared/ui/LegalPage';

export const metadata: Metadata = {
  title: 'Relay | Data Policy',
  description: 'How Relay handles prompts, responses, stored records, and operational data.',
};

export default function DataPolicyPage() {
  return (
    <LegalPage
      title="Data Policy"
      eyebrow="Legal"
      description="This page gives a practical, product-level explanation of what data flows through Relay and what that means for users."
      effectiveDate={LEGAL_LAST_UPDATED}
    >
      <LegalSection title="How data moves through Relay">
        <p>
          When you send a prompt in {SERVICE_NAME}, your request is authenticated, checked against
          service guardrails, loaded with relevant chat context, and then sent to an AI provider
          through OpenRouter. The resulting response is streamed back to the app and, if completed
          successfully, stored in the chat history.
        </p>
      </LegalSection>

      <LegalSection title="What Relay stores in its own database">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Account records: name, email, profile image, account identifiers, and subscription tier.
          </li>
          <li>Authentication records: provider account links and database session records.</li>
          <li>Chat records: chats, messages, titles, and chat timestamps.</li>
          <li>Memory records: summary text and structured chat memory used to maintain context.</li>
          <li>
            Guardrail records: daily token usage, rate-limit buckets, and guardrail event history.
          </li>
          <li>
            Recovery records: failed assistant reply state used to support retry after interruption.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="What Relay sends to third parties">
        <p>
          Prompts, recent message context, model selection, and related request metadata are sent to
          OpenRouter so that OpenRouter can route the request to the selected model provider.
        </p>
        <p>
          Because AI requests leave Relay infrastructure, users should assume that prompt and
          response data are also subject to the policies and retention practices of OpenRouter and
          the selected downstream model provider.
        </p>
      </LegalSection>

      <LegalSection title="Prompt and response handling">
        <p>
          Relay stores successful user and assistant messages in the application database so chats
          can be reopened later. During streaming, partial assistant text may be rendered in the UI
          temporarily, but failed partial replies are not meant to be stored as final assistant
          messages.
        </p>
        <p>
          Relay may also generate derivative data such as a short chat title or compact memory
          summary to improve usability and long-running context.
        </p>
      </LegalSection>

      <LegalSection title="Operational metadata">
        <p>
          {SERVICE_NAME} records technical metadata for security, fairness, and reliability,
          including:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>selected model and tier;</li>
          <li>estimated and recorded token usage;</li>
          <li>rate-limit counters and denial events;</li>
          <li>request identifiers and stage-based failure logs;</li>
          <li>timestamps related to chat activity and retry recovery.</li>
        </ul>
        <p>
          By default, operational logs are intended to help operators diagnose failures and monitor
          abuse, not to create a separate content archive.
        </p>
      </LegalSection>

      <LegalSection title="Retention and deletion expectations">
        <p>
          Relay currently behaves like a persistent chat product: account data and chat data remain
          available until removed by product actions, operator maintenance, or data lifecycle rules.
        </p>
        <p>
          If you operate this deployment in production, you should define and publish explicit
          retention periods for chat content, logs, and operational metadata based on your legal and
          business requirements.
        </p>
      </LegalSection>

      <LegalSection title="Sensitive data warning">
        <p>
          Unless {SERVICE_OPERATOR} has published a stronger data handling commitment, users should
          avoid placing regulated, highly confidential, or irrecoverable personal data into prompts.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
