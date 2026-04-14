import type { Metadata } from 'next';

import { LEGAL_LAST_UPDATED, SERVICE_NAME, SERVICE_OPERATOR } from '@/shared/config/legal';
import { LegalPage, LegalSection } from '@/shared/ui/LegalPage';

export const metadata: Metadata = {
  title: 'Relay | Terms of Use',
  description: 'Terms governing access to and use of Relay.',
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      eyebrow="Legal"
      description="These terms describe the basic rules for using Relay and the responsibilities of both users and operators."
      effectiveDate={LEGAL_LAST_UPDATED}
    >
      <LegalSection title="Acceptance of these terms">
        <p>
          By accessing or using {SERVICE_NAME}, you agree to these Terms of Use. If you do not
          agree, do not use the service.
        </p>
      </LegalSection>

      <LegalSection title="Who may use Relay">
        <p>
          You must be legally able to enter into these terms and use the service in compliance with
          applicable law. If you use Relay on behalf of a company or organization, you represent
          that you have authority to bind that organization.
        </p>
      </LegalSection>

      <LegalSection title="Accounts and access">
        <p>
          Relay currently uses Google sign-in for account access. You are responsible for
          maintaining the security of your account and for activity that occurs under your session.
        </p>
        <p>
          The operator may suspend or restrict access to protect the service, comply with law, or
          respond to abuse, fraud, or security incidents.
        </p>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p>You may not use Relay to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>break the law or violate the rights of others;</li>
          <li>attempt unauthorized access, scraping, abuse, or interference with the service;</li>
          <li>circumvent rate limits, guardrails, or plan restrictions;</li>
          <li>submit malicious code, malware, or harmful automated traffic;</li>
          <li>use the service in a way that creates unreasonable operational or security risk.</li>
        </ul>
      </LegalSection>

      <LegalSection title="AI outputs and user responsibility">
        <p>
          AI output can be incorrect, incomplete, or inappropriate. You are responsible for
          reviewing outputs and deciding whether they are suitable for your use case.
        </p>
        <p>
          Relay is not a substitute for legal, medical, financial, or other licensed professional
          advice unless the operator has explicitly documented that scope and responsibility.
        </p>
      </LegalSection>

      <LegalSection title="Plans, models, and availability">
        <p>
          Access to models and product limits may vary by plan, deployment configuration, and third
          party provider availability. Free plans may be limited to free models, while paid plans
          may include access to premium models.
        </p>
        <p>
          The operator may change available models, quotas, rate limits, or product features as the
          service evolves.
        </p>
      </LegalSection>

      <LegalSection title="Third-party services">
        <p>
          Relay depends on third-party providers, including Google for authentication, OpenRouter
          and downstream model providers for AI processing, and Cloudflare infrastructure for
          hosting and persistence. Availability and performance may depend on those providers.
        </p>
      </LegalSection>

      <LegalSection title="Intellectual property and content">
        <p>
          Relay and its software, branding, and interface remain the property of their respective
          owners. You retain rights you have in your own prompts and content, subject to the rights
          needed to operate the service and the policies of relevant third-party providers.
        </p>
      </LegalSection>

      <LegalSection title="Disclaimers and liability">
        <p>
          Relay is provided on an &quot;as is&quot; and &quot;as available&quot; basis to the
          fullest extent permitted by law. The operator does not guarantee uninterrupted
          availability, complete accuracy of AI outputs, or fitness for every purpose.
        </p>
        <p>
          To the fullest extent permitted by law, {SERVICE_OPERATOR} is not liable for indirect,
          incidental, special, consequential, or punitive damages arising from use of the service.
        </p>
      </LegalSection>

      <LegalSection title="Changes to these terms">
        <p>
          These Terms may be updated as the product and legal requirements evolve. Continued use of
          the service after an update means you accept the revised terms.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
