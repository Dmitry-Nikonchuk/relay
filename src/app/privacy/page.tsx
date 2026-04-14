import type { Metadata } from 'next';

import { LEGAL_LAST_UPDATED, SERVICE_NAME, SERVICE_OPERATOR } from '@/shared/config/legal';
import { LegalPage, LegalSection } from '@/shared/ui/LegalPage';

export const metadata: Metadata = {
  title: 'Relay | Privacy Policy',
  description: 'How Relay collects, uses, stores, and shares personal data.',
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      eyebrow="Legal"
      description="This page explains what personal information Relay processes, why it is processed, and how that information is shared and protected."
      effectiveDate={LEGAL_LAST_UPDATED}
    >
      <LegalSection title="Who this policy covers">
        <p>
          This Privacy Policy applies to {SERVICE_NAME}, including the marketing site, sign-in flow,
          chat workspace, and related API endpoints for this deployment.
        </p>
        <p>
          For this deployment, the data controller is {SERVICE_OPERATOR}. If this project is
          self-hosted or white-labeled, the operator of that deployment is responsible for providing
          any legally required entity and contact details.
        </p>
      </LegalSection>

      <LegalSection title="Information Relay collects">
        <p>{SERVICE_NAME} processes the following categories of data:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Account data such as your name, email address, profile image, and sign-in provider.
          </li>
          <li>Session data needed to keep you signed in through secure HTTP-only cookies.</li>
          <li>
            Chat data such as chat titles, user messages, assistant responses, summaries, and chat
            memory.
          </li>
          <li>
            Usage and operational metadata such as selected model, token counts, daily usage
            counters, rate-limit buckets, and guardrail events.
          </li>
          <li>
            Reliability data such as failed-reply records, request identifiers, and structured error
            logs.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="How information is collected">
        <ul className="list-disc space-y-2 pl-5">
          <li>You provide account information when you sign in with Google.</li>
          <li>You provide chat content when you use the product.</li>
          <li>
            The service generates technical metadata when requests are processed, guardrails are
            applied, or reliability events are logged.
          </li>
          <li>
            Essential cookies are set to maintain authenticated sessions. Relay does not currently
            describe advertising cookies or optional analytics cookies on this deployment.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Why Relay uses this information">
        <ul className="list-disc space-y-2 pl-5">
          <li>To authenticate users and protect access to private chats and profile data.</li>
          <li>To store, retrieve, and render chat history and account settings.</li>
          <li>To send prompts to AI providers and return model outputs.</li>
          <li>
            To generate chat titles, maintain memory summaries, and support reliability recovery
            flows.
          </li>
          <li>
            To enforce product limits, prevent abuse, debug failures, and improve service
            operations.
          </li>
          <li>To comply with law, enforce product terms, and protect users and the service.</li>
        </ul>
      </LegalSection>

      <LegalSection title="How Relay shares data">
        <p>
          Relay does not sell personal information. Data is shared only as needed to operate the
          service or comply with legal obligations.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Authentication data is processed through Google and Auth.js / NextAuth as part of the
            sign-in flow.
          </li>
          <li>
            Prompts and model outputs are sent to OpenRouter and, through OpenRouter, to the model
            provider selected for the request.
          </li>
          <li>
            Infrastructure and persistence data are processed through Cloudflare services used by
            this application, including D1 and Cloudflare runtime logging.
          </li>
          <li>
            Information may also be disclosed when required by law or reasonably necessary to
            protect rights, users, or the service.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Cookies and session handling">
        <p>
          Relay uses essential cookies to keep you authenticated. These cookies are required for the
          private chat workspace to function and are not described as optional marketing cookies.
        </p>
        <p>
          Sessions are managed with database-backed Auth.js sessions. Access tokens are not intended
          to be stored in browser local storage by this application.
        </p>
      </LegalSection>

      <LegalSection title="Data retention">
        <p>
          Relay stores account, chat, and operational data for as long as it is needed to provide
          the service, maintain security, or satisfy legal and operational obligations.
        </p>
        <p>
          Some data categories are coupled to your account or chats and are removed if related
          records are deleted from the database. This deployment should add more specific retention
          schedules if local law or internal policy requires them.
        </p>
      </LegalSection>

      <LegalSection title="Your choices and rights">
        <p>
          Depending on your location, you may have rights to request access, correction, deletion,
          or restriction of certain personal data. Relay does not currently expose a full self-serve
          privacy request workflow in the product UI.
        </p>
        <p>
          Privacy and account requests must be handled by {SERVICE_OPERATOR}. If you operate this
          deployment publicly, you should publish a working privacy contact method before launch.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>
          Relay is not designed for children under 13, and this deployment should not knowingly
          collect personal information from children under 13 without appropriate legal basis and
          disclosures.
        </p>
      </LegalSection>

      <LegalSection title="Security">
        <p>
          Relay uses authentication, access control, and server-side persistence to protect account
          and chat data. No system can guarantee absolute security, and users should avoid entering
          highly sensitive information unless the operator has explicitly documented support for
          that use case.
        </p>
      </LegalSection>

      <LegalSection title="Changes to this policy">
        <p>
          This Privacy Policy may be updated as the product, infrastructure, or legal obligations
          change. Updated versions should be posted on this page with a revised effective date.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
