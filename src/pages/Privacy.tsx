import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/layout/Navbar";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-10">
    <h2 className="text-xl font-heading mb-4">{title}</h2>
    <div className="text-sm text-muted-foreground font-body leading-relaxed space-y-3">{children}</div>
  </section>
);

const Privacy = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main className="pt-28 pb-24 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <p className="text-[11px] tracking-[0.3em] uppercase text-primary mb-3 font-body">Legal</p>
        <h1 className="text-4xl font-heading mb-3">Privacy Policy</h1>
        <p className="text-xs text-muted-foreground font-body mb-12">Last updated: March 2026</p>

        <Section title="1. Who We Are">
          <p>
            Concierge Styled (&quot;we&quot;, &quot;us&quot;) is an AI-powered travel styling service. This policy
            explains what personal data we collect, how we use it, and your rights under UK GDPR
            and applicable data protection law.
          </p>
          <p>
            Contact:{" "}
            <a href="mailto:hello@conciergestyle.com" className="text-primary hover:underline">
              hello@conciergestyle.com
            </a>
          </p>
        </Section>

        <Section title="2. Data We Collect">
          <p>We collect the following categories of data:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-foreground">Account data:</strong> Email address, name, profile
              photo, public handle, home city, nationality, style preferences.
            </li>
            <li>
              <strong className="text-foreground">Trip data:</strong> Destinations, travel dates, trip
              type, events, packing lists, mood board images, notes, and collaborators.
            </li>
            <li>
              <strong className="text-foreground">AI interaction data:</strong> Outfit generation
              requests and outputs, fashion searches, activity queries, destination briefing requests.
              This data is sent to OpenAI to generate responses.
            </li>
            <li>
              <strong className="text-foreground">Billing data:</strong> Subscription status, billing
              period, plan tier. Payment card details are processed and stored by Stripe — we never
              see or store full card numbers.
            </li>
            <li>
              <strong className="text-foreground">Usage data:</strong> Pages visited, features used,
              errors encountered. Collected anonymously via PostHog analytics (with your consent).
            </li>
            <li>
              <strong className="text-foreground">Technical data:</strong> IP address, browser type,
              device type, session tokens. Collected automatically by Supabase infrastructure.
            </li>
          </ul>
        </Section>

        <Section title="3. How We Use Your Data">
          <ul className="list-disc pl-5 space-y-2">
            <li>To provide, personalise, and improve the Service</li>
            <li>To generate AI outfit suggestions and recommendations using your trip context</li>
            <li>To process subscription payments via Stripe</li>
            <li>To send transactional emails (account verification, password reset)</li>
            <li>To analyse usage patterns and improve the product (with consent)</li>
            <li>To comply with legal obligations</li>
          </ul>
          <p>
            We do not sell your data to third parties. We do not use your personal data for
            advertising purposes.
          </p>
        </Section>

        <Section title="4. Third-Party Processors">
          <p>
            We share data with the following sub-processors to deliver the Service. Each has a
            Data Processing Agreement in place with us:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-foreground">Supabase (US)</strong> — Database, authentication,
              file storage, and edge computing infrastructure.
            </li>
            <li>
              <strong className="text-foreground">OpenAI (US)</strong> — AI text generation (GPT-4o)
              and image generation (DALL-E 3). Trip context (destination, dates, trip type) is sent
              to OpenAI to generate outfit suggestions and briefings.
            </li>
            <li>
              <strong className="text-foreground">Stripe (US/UK)</strong> — Payment processing and
              subscription management.
            </li>
            <li>
              <strong className="text-foreground">Google (US)</strong> — Places autocomplete for
              destination and venue search.
            </li>
            <li>
              <strong className="text-foreground">Unsplash (US)</strong> — Destination photography.
              No personal data is shared.
            </li>
            <li>
              <strong className="text-foreground">PostHog (EU)</strong> — Product analytics.
              Only activated with your consent.
            </li>
            <li>
              <strong className="text-foreground">Netlify (US)</strong> — Frontend hosting and
              edge delivery.
            </li>
          </ul>
        </Section>

        <Section title="5. Cookies">
          <p>
            We use two categories of cookies:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-foreground">Essential cookies:</strong> Required for
              authentication and session management. Cannot be disabled.
            </li>
            <li>
              <strong className="text-foreground">Analytics cookies:</strong> Used by PostHog to
              understand how the Service is used. Only set with your explicit consent via the
              cookie banner.
            </li>
          </ul>
          <p>
            You can change your cookie preferences at any time by clearing your browser storage
            and revisiting the site.
          </p>
        </Section>

        <Section title="6. Data Retention">
          <p>
            We retain your personal data for as long as your account is active. When you delete
            your account, all personal data is permanently deleted within 30 days, except where
            we are required by law to retain it longer (e.g. billing records for 7 years under
            UK tax law).
          </p>
        </Section>

        <Section title="7. Your Rights (UK GDPR)">
          <p>You have the following rights regarding your personal data:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong className="text-foreground">Access:</strong> Request a copy of all data we hold about you (via Settings → Export Data).</li>
            <li><strong className="text-foreground">Rectification:</strong> Correct inaccurate data via your Settings page.</li>
            <li><strong className="text-foreground">Erasure:</strong> Delete your account and all associated data (via Settings → Delete Account).</li>
            <li><strong className="text-foreground">Portability:</strong> Download your data as JSON (via Settings → Export Data).</li>
            <li><strong className="text-foreground">Restriction:</strong> Request that we stop processing your data in certain circumstances.</li>
            <li><strong className="text-foreground">Objection:</strong> Object to processing based on legitimate interests.</li>
          </ul>
          <p>
            To exercise your rights, use the self-service tools in your Settings page, or contact
            us at{" "}
            <a href="mailto:hello@conciergestyle.com" className="text-primary hover:underline">
              hello@conciergestyle.com
            </a>
            . We will respond within 30 days.
          </p>
          <p>
            You also have the right to lodge a complaint with the Information Commissioner&apos;s
            Office (ICO) at{" "}
            <a
              href="https://ico.org.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              ico.org.uk
            </a>
            .
          </p>
        </Section>

        <Section title="8. Security">
          <p>
            We implement industry-standard security measures including encrypted connections (TLS),
            row-level security on all database tables, and regular security reviews. No method of
            transmission or storage is 100% secure, but we take your data security seriously.
          </p>
        </Section>

        <Section title="9. Changes to This Policy">
          <p>
            We may update this policy from time to time. We will notify you of material changes
            by email or via an in-app notification. Continued use of the Service after changes
            constitutes acceptance.
          </p>
        </Section>

        <Section title="10. Contact">
          <p>
            Questions about this policy?{" "}
            <a href="mailto:hello@conciergestyle.com" className="text-primary hover:underline">
              hello@conciergestyle.com
            </a>
          </p>
        </Section>
      </motion.div>
    </main>

    <footer className="border-t border-border py-10 px-6 text-center">
      <p className="text-xs text-muted-foreground font-body">
        © 2026 Concierge Styled.{" "}
        <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
        {" · "}
        <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
      </p>
    </footer>
  </div>
);

export default Privacy;
