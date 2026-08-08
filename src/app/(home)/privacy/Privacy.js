import styles from './Privacy.module.css';

// Set this to the date the policy is actually published. It is shown to
// merchants as the effective date, so it should not drift silently.
const EFFECTIVE_DATE = '8 August 2026';

const SECTIONS = [
  { id: 'data-we-collect', title: 'Personal Data We Collect' },
  { id: 'how-we-collect', title: 'How We Collect Data' },
  { id: 'purpose', title: 'Purpose of Collection' },
  { id: 'payment-data', title: 'Payment and Payout Data' },
  { id: 'service-providers', title: 'Third-Party Service Providers' },
  { id: 'disclosure', title: 'Disclosure to Customers' },
  { id: 'cross-border', title: 'Cross-Border Transfers' },
  { id: 'retention', title: 'Data Retention' },
  { id: 'security', title: 'Security Measures' },
  { id: 'your-rights', title: 'Your Rights Under the PDPA' },
  { id: 'withdrawal', title: 'Withdrawal of Consent' },
  { id: 'cookies', title: 'Cookies and Website Technologies' },
  { id: 'updates', title: 'Updates to This Policy' },
  { id: 'contact', title: 'Contact Information' },
];

const Privacy = () => {
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <h1 className={styles.heroTitle}>Privacy Policy</h1>
        <p className={styles.heroDate}>Published and effective on: {EFFECTIVE_DATE}</p>
      </header>

      <div className={styles.layout}>
        {/* Wayfinding for a long document: on desktop this stays in view so a
            merchant can see the shape of the policy and jump to the part that
            concerns them, rather than scrolling blind. */}
        <nav className={styles.toc} aria-label="Sections of this policy">
          <p className={styles.tocTitle}>On this page</p>
          <ol className={styles.tocList}>
            {SECTIONS.map((section, i) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>
                  <span className={styles.tocNumber}>{i + 1}</span>
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className={styles.article}>
          <section className={styles.intro}>
            <h2 className={styles.h2}>About this Privacy Policy</h2>
            <p>
              This Privacy Policy describes how COLLBINE PTE. LTD. (UEN: 202600319E), located at
              254 Ang Mo Kio Avenue 4 #10-143, Kebun Baru View, Singapore 560254
              (&quot;HomeFood&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;),
              collects, uses, discloses, and protects personal data when you use HomeFood for
              Business at{' '}
              <a href="https://business.homefood.sg">https://business.homefood.sg</a> (the
              &quot;Merchant Platform&quot;).
            </p>
            <p>
              This policy covers merchants and their staff. If you are a customer ordering food,
              the policy that applies to you is published at{' '}
              <a href="https://homefood.sg/privacy" target="_blank" rel="noopener noreferrer">
                homefood.sg/privacy
              </a>.
            </p>
            <p>
              We are committed to protecting personal data in accordance with the Personal Data
              Protection Act 2012 (PDPA) of Singapore.
            </p>
          </section>

          <section id="data-we-collect" className={styles.section}>
            <h2 className={styles.h2}>1. Personal Data We Collect</h2>
            <p>
              Account information includes your name, email address, phone number, and the role
              assigned to you within a shop (Owner, Manager, or Operator). Business information
              includes your shop name, business description, collection address, operating and
              ordering hours, menu content, and images you upload. Payout and verification
              information is collected by our payments provider and is described in section 4.
              Technical information includes device type, browser, IP address, and session
              identifiers. Usage information includes sign-in activity, actions taken in the
              dashboard and terminal, order and pre-order records, and an activity log of changes
              made to your shop.
            </p>
          </section>

          <section id="how-we-collect" className={styles.section}>
            <h2 className={styles.h2}>2. How We Collect Data</h2>
            <p>
              We collect personal data when you register a shop, accept an invitation to join a
              shop, sign in, complete onboarding, publish shop details, upload menu or reward
              images, take orders through the terminal, start a subscription, connect a payout
              account, join a waitlist or Founding Seller form, or contact support. Certain
              technical and usage data is collected automatically when you use the Merchant
              Platform.
            </p>
          </section>

          <section id="purpose" className={styles.section}>
            <h2 className={styles.h2}>3. Purpose of Collection</h2>
            <p>
              We use personal data to create and administer merchant accounts, authenticate
              sign-in, control which staff may perform which actions, operate ordering,
              pre-orders, and the collection experience, publish your shop to customers, process
              subscriptions and platform fees, enable payouts, prevent fraud and abuse, provide
              support, maintain an audit trail of changes to a shop, improve reliability and
              performance, and comply with legal and regulatory obligations. We will not use
              personal data for unrelated purposes without your consent unless permitted under
              the PDPA.
            </p>
          </section>

          <section id="payment-data" className={styles.section}>
            <h2 className={styles.h2}>4. Payment and Payout Data</h2>
            <p>
              Payments and subscriptions are processed by Stripe. <strong>We do not receive or
              store full card numbers, CVC codes, or bank credentials.</strong> Card details are
              submitted directly to Stripe and handled under Stripe&apos;s own terms and privacy
              policy.
            </p>
            <p>
              To receive payouts you connect a Stripe account. Stripe collects the identity and
              bank information it requires to meet its regulatory obligations, and may verify
              your identity directly. We receive only the limited information needed to confirm
              your account status and reconcile transfers — for example, a Stripe account
              identifier, onboarding and payout status, and transaction and invoice records.
            </p>
          </section>

          <section id="service-providers" className={styles.section}>
            <h2 className={styles.h2}>5. Third-Party Service Providers</h2>
            <p>
              We engage third-party providers to operate the Merchant Platform. Amazon Web
              Services (AWS) in the Singapore (ap-southeast-1) region hosts our databases, file
              storage, transactional email, and merchant sign-in. Stripe processes payments,
              subscriptions, and payouts. Google Firebase is used for limited form submissions
              and product analytics. Vercel hosts the web application and provides aggregate
              traffic analytics. These providers process personal data on our instructions and
              for the purposes described in this policy. We do not sell personal data.
            </p>
          </section>

          <section id="disclosure" className={styles.section}>
            <h2 className={styles.h2}>6. Disclosure to Customers</h2>
            <p>
              Information you choose to publish — your shop name, description, menu, images,
              collection address, and operating hours — is shown publicly to customers on
              HomeFood. Order-related information is shared with the customer who placed that
              order so they can identify their collection. Consider carefully what you publish:
              your collection address is visible to customers who order from you.
            </p>
          </section>

          <section id="cross-border" className={styles.section}>
            <h2 className={styles.h2}>7. Cross-Border Transfers</h2>
            <p>
              Core infrastructure is hosted in the AWS Singapore region. Certain providers — for
              example Stripe, Firebase, and Vercel — may process data on servers outside
              Singapore. Where personal data is transferred outside Singapore, we take reasonable
              steps to ensure the receiving organisation provides a standard of protection
              comparable to that required under the PDPA.
            </p>
          </section>

          <section id="retention" className={styles.section}>
            <h2 className={styles.h2}>8. Data Retention</h2>
            <p>
              We retain personal data while your shop account remains active, and afterwards
              where necessary for fraud prevention, dispute resolution, tax, accounting, and
              other legal obligations. Transaction, invoice, and payout records are retained for
              the periods required by law. If you close your account, we delete or anonymise
              personal data that we are no longer required to keep.
            </p>
          </section>

          <section id="security" className={styles.section}>
            <h2 className={styles.h2}>9. Security Measures</h2>
            <p>
              We implement reasonable administrative, physical, and technical safeguards. These
              include hosting in the AWS Singapore region, encrypted transmission over HTTPS,
              managed authentication, role-based access controls that limit what each staff
              member can do, and signed verification of payment events received from Stripe. No
              online system is completely secure, and you are responsible for keeping your own
              sign-in credentials confidential.
            </p>
          </section>

          <section id="your-rights" className={styles.section}>
            <h2 className={styles.h2}>10. Your Rights Under the PDPA</h2>
            <p>
              Under Singapore law you may request access to the personal data we hold about you,
              request correction of inaccurate or incomplete data, and withdraw consent, subject
              to legal and contractual limitations. Requests may be sent to{' '}
              <a href="mailto:support@homefood.sg">support@homefood.sg</a>. We may need to verify
              your identity before acting on a request.
            </p>
          </section>

          <section id="withdrawal" className={styles.section}>
            <h2 className={styles.h2}>11. Withdrawal of Consent</h2>
            <p>
              You may withdraw consent for marketing communications at any time. Withdrawing
              consent for data necessary to operate the Merchant Platform — for example account,
              order, or payout data — will mean we can no longer provide the service, and your
              shop may need to be closed.
            </p>
          </section>

          <section id="cookies" className={styles.section}>
            <h2 className={styles.h2}>12. Cookies and Website Technologies</h2>
            <p>
              We use cookies and similar technologies to keep you signed in, maintain session
              state, secure form submissions, and measure aggregate traffic. Sign-in cookies are
              strictly necessary: if you block them, you will not be able to use the Merchant
              Platform. You may manage other cookies through your browser settings.
            </p>
          </section>

          <section id="updates" className={styles.section}>
            <h2 className={styles.h2}>13. Updates to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Revised versions take effect
              on publication to the Merchant Platform, and the effective date at the top of this
              page will be updated. Continued use of the Merchant Platform after publication
              constitutes acceptance of the updated policy.
            </p>
          </section>

          <section id="contact" className={styles.section}>
            <h2 className={styles.h2}>14. Contact Information</h2>
            <p>
              For questions about this Privacy Policy or your personal data, contact COLLBINE
              PTE. LTD. at 254 Ang Mo Kio Avenue 4 #10-143, Kebun Baru View, Singapore 560254, or
              by email at <a href="mailto:support@homefood.sg">support@homefood.sg</a>. Our
              appointed Data Protection Officer may be contacted at the same address.
            </p>
          </section>
        </article>
      </div>
    </main>
  );
};

export default Privacy;
