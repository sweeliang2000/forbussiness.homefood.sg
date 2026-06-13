import styles from '../refund-policy/RefundPolicy.module.css';
import {
    FaBolt,
    FaCheck,
    FaExclamationTriangle,
    FaInfoCircle,
    FaQrcode,
    FaRegCreditCard,
    FaRegLightbulb,
    FaShieldAlt,
    FaTable,
    FaWallet,
    FaWhatsapp,
} from 'react-icons/fa';

const WHATSAPP_URL =
    'https://api.whatsapp.com/send/?phone=6588678978&text&type=phone_number&app_absent=0';

const LAST_UPDATED = '13 June 2026';

const sections = [
    { id: 'options', label: 'Payment Options' },
    { id: 'manual-paynow', label: 'Manual PayNow' },
    { id: 'auto-paynow', label: 'Automatic PayNow' },
    { id: 'cards', label: 'Credit Cards' },
    { id: 'other', label: 'Other Digital Payments' },
    { id: 'choosing', label: 'Choosing an Option' },
];

const paymentOptions = [
    ['Manual PayNow (Screenshot Verification)', '0%'],
    ['Automatic PayNow', '3%'],
    ['Credit Card (Visa, Mastercard, AMEX and supported cards)', '6%'],
    ['Other Digital Payments (Apple Pay, Google Pay, GrabPay and supported wallets)', '6%'],
];

const comparisonRows = [
    ['Processing Fee', '0%', '3%', '6%', '6%'],
    ['Screenshot Upload Required', 'Yes', 'No', 'No', 'No'],
    ['Automatic Payment Confirmation', 'No', 'Yes', 'Yes', 'Yes'],
    ['Merchant Manual Verification', 'Recommended', 'No', 'No', 'No'],
    ['Platform Managed Refunds', 'No', 'Yes', 'Yes', 'Yes'],
    ['Full Refund Before Merchant Acceptance', 'No', 'No', 'Yes', 'No'],
    ['Merchant Direct Refund Handling', 'Yes', 'No', 'No', 'No'],
    ['Best For', 'Lowest Cost', 'Automated PayNow', 'Card Users', 'Wallet Users'],
];

const Callout = ({ tone = 'info', icon, children }) => (
    <div className={`${styles.callout} ${styles[`callout_${tone}`]}`}>
        <span className={styles.calloutIcon}>{icon || <FaInfoCircle />}</span>
        <p>{children}</p>
    </div>
);

const Reason = ({ children }) => (
    <div className={styles.reason}>
        <span className={styles.reasonLabel}>Reason</span>
        <p>{children}</p>
    </div>
);

const PaymentTypesAndFees = () => {
    return (
        <div className={styles.page}>
            <header className={styles.hero}>
                <div className={styles.heroInner}>
                    <span className={styles.heroBadge}>
                        <FaShieldAlt /> Merchant Guide
                    </span>
                    <h1 className={styles.title}>Payment Types &amp; Fees</h1>
                    <p className={styles.subtitle}>
                        Compare Collbine payment methods, fees, verification flows and refund
                        responsibilities before choosing how customers pay your shop.
                    </p>
                    <p className={styles.updated}>Last updated {LAST_UPDATED}</p>
                </div>
            </header>

            <div className={styles.content}>
                <nav className={styles.toc} aria-label="On this page">
                    <span className={styles.tocTitle}>On this page</span>
                    <div className={styles.tocList}>
                        {sections.map((section) => (
                            <a key={section.id} href={`#${section.id}`} className={styles.tocLink}>
                                {section.label}
                            </a>
                        ))}
                    </div>
                </nav>

                <section id="options" className={styles.section}>
                    <div className={styles.sectionHead}>
                        <span className={styles.sectionIcon}>
                            <FaTable />
                        </span>
                        <h2 className={styles.sectionTitle}>Payment Options</h2>
                    </div>
                    <div className={styles.body}>
                        <p>Collbine offers four payment options for merchants.</p>
                        <div className={styles.tableWrap}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Payment Method</th>
                                        <th>Fee</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paymentOptions.map(([method, fee]) => (
                                        <tr key={method}>
                                            <td>{method}</td>
                                            <td>{fee}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Callout tone="info" icon={<FaInfoCircle />}>
                            Merchants can choose either Manual PayNow or Automatic Payment. Automatic
                            Payment includes Automatic PayNow, credit cards and other supported
                            digital payment methods. Manual PayNow and Automatic Payment cannot be
                            used together.
                        </Callout>
                    </div>
                </section>

                <section id="manual-paynow" className={styles.section}>
                    <div className={styles.sectionHead}>
                        <span className={styles.sectionIcon}>
                            <FaQrcode />
                        </span>
                        <h2 className={styles.sectionTitle}>
                            Manual PayNow
                            <span className={styles.titleSub}>Screenshot Verification</span>
                        </h2>
                        <span className={`${styles.feeBadge} ${styles.fee0}`}>0% fee</span>
                    </div>
                    <div className={styles.body}>
                        <p>
                            Manual PayNow is designed for merchants who want to accept PayNow
                            payments without payment processing fees.
                        </p>
                        <Callout tone="info" icon={<FaInfoCircle />}>
                            Using Manual PayNow will result in ads being shown on the merchant&apos;s
                            shop page.
                        </Callout>

                        <h3 className={styles.subhead}>How It Works</h3>
                        <ul className={styles.noteList}>
                            {[
                                'Customer places an order.',
                                "Customer scans the merchant's PayNow QR code.",
                                'Customer completes payment using their banking application.',
                                'Customer takes a screenshot of the successful payment.',
                                'Customer uploads the screenshot to Collbine.',
                                'Collbine AI reviews the screenshot and compares payment amount, merchant information when available, order details and potential mismatches.',
                            ].map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>

                        <h3 className={styles.subhead}>AI Verification Results</h3>
                        <div className={styles.tableWrap}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Result</th>
                                        <th>Meaning</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Likely Paid</td>
                                        <td>
                                            The uploaded screenshot appears to match the expected
                                            order amount and details.
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Attention Needed</td>
                                        <td>
                                            Customer paid too little, paid too much, uploaded an
                                            unclear screenshot, or AI cannot confidently verify the
                                            payment details.
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <Callout tone="info" icon={<FaRegLightbulb />}>
                            The AI only checks whether the uploaded screenshot appears to match the
                            order details. It does not verify whether the screenshot is genuine,
                            authentic, edited or fraudulent.
                        </Callout>
                        <Callout tone="info" icon={<FaExclamationTriangle />}>
                            Merchants remain responsible for verifying that payment has actually
                            been received in their bank account before preparing or fulfilling an
                            order.
                        </Callout>

                        <h3 className={styles.subhead}>Refunds</h3>
                        <ul className={styles.noteList}>
                            <li>Customers pay merchants directly.</li>
                            <li>Merchants are responsible for issuing refunds directly to customers.</li>
                            <li>Collbine does not process refunds for Manual PayNow transactions.</li>
                        </ul>
                    </div>
                </section>

                <section id="auto-paynow" className={styles.section}>
                    <div className={styles.sectionHead}>
                        <span className={styles.sectionIcon}>
                            <FaBolt />
                        </span>
                        <h2 className={styles.sectionTitle}>Automatic PayNow</h2>
                        <span className={`${styles.feeBadge} ${styles.fee3}`}>3% fee</span>
                    </div>
                    <div className={styles.body}>
                        <p>
                            Automatic PayNow is designed for merchants who want payment verification
                            to be handled automatically.
                        </p>

                        <h3 className={styles.subhead}>How It Works</h3>
                        <ul className={styles.noteList}>
                            {[
                                'Customer places an order.',
                                'Customer scans the PayNow QR code.',
                                'Customer completes payment using their banking application.',
                                'No screenshot upload is required.',
                                'Payment is automatically verified by the payment provider.',
                                'Order status is automatically updated to Payment Confirmed.',
                            ].map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                        <p>The merchant may then accept or reject the order.</p>

                        <h3 className={styles.subhead}>Benefits</h3>
                        <ul className={styles.list}>
                            {[
                                'No screenshot uploads required',
                                'Automatic payment confirmation',
                                'Faster checkout process',
                                'Reduced merchant workload',
                            ].map((item) => (
                                <li key={item} className={styles.listItem}>
                                    <FaCheck className={styles.listIcon} />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>

                        <h3 className={styles.subhead}>Refunds</h3>
                        <ul className={styles.noteList}>
                            <li>Refunds are processed through the platform.</li>
                            <li>Processing fees are generally non-refundable.</li>
                            <li>
                                Merchant-caused cancellations may result in the merchant bearing the
                                processing fees.
                            </li>
                        </ul>
                    </div>
                </section>

                <section id="cards" className={styles.section}>
                    <div className={styles.sectionHead}>
                        <span className={styles.sectionIcon}>
                            <FaRegCreditCard />
                        </span>
                        <h2 className={styles.sectionTitle}>Credit Card Payments</h2>
                        <span className={`${styles.feeBadge} ${styles.fee6}`}>6% fee</span>
                    </div>
                    <div className={styles.body}>
                        <p>
                            Supported methods may include Visa, Mastercard, American Express and
                            other supported card networks.
                        </p>

                        <h3 className={styles.subhead}>How It Works</h3>
                        <ul className={styles.noteList}>
                            <li>Customer places an order.</li>
                            <li>Customer enters card details.</li>
                            <li>The customer&apos;s card is authorized.</li>
                            <li>The merchant reviews the order.</li>
                        </ul>
                        <p>
                            If the merchant accepts, payment is captured and the order proceeds
                            normally. If the merchant rejects before acceptance, the payment
                            authorization is released and the customer receives a full refund or
                            authorization reversal.
                        </p>

                        <h3 className={styles.subhead}>Benefits</h3>
                        <ul className={styles.list}>
                            {[
                                'Automatic payment confirmation',
                                'No screenshot uploads',
                                'Fast checkout experience',
                                'Reduced refund costs for merchant rejections before acceptance',
                            ].map((item) => (
                                <li key={item} className={styles.listItem}>
                                    <FaCheck className={styles.listIcon} />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>

                        <h3 className={styles.subhead}>Refunds</h3>
                        <div className={styles.tableWrap}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Scenario</th>
                                        <th>Outcome</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Merchant Rejects Before Acceptance</td>
                                        <td>
                                            Customer receives a full refund or authorization reversal.
                                            Merchant receives $0.00 and bears $0.00.
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Merchant Rejects After Acceptance</td>
                                        <td>
                                            Customer receives a full refund. Merchant bears any
                                            non-refundable payment processing fees.
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <Reason>
                            Once a merchant accepts an order, the merchant has committed to
                            fulfilling it.
                        </Reason>
                    </div>
                </section>

                <section id="other" className={styles.section}>
                    <div className={styles.sectionHead}>
                        <span className={styles.sectionIcon}>
                            <FaWallet />
                        </span>
                        <h2 className={styles.sectionTitle}>Other Digital Payments</h2>
                        <span className={`${styles.feeBadge} ${styles.fee6}`}>6% fee</span>
                    </div>
                    <div className={styles.body}>
                        <p>
                            Supported methods may include Apple Pay, Google Pay, GrabPay and other
                            supported digital wallets.
                        </p>

                        <h3 className={styles.subhead}>How It Works</h3>
                        <ul className={styles.noteList}>
                            <li>Customer places an order.</li>
                            <li>Customer selects their preferred digital payment method.</li>
                            <li>Customer completes payment.</li>
                            <li>Payment is automatically verified.</li>
                            <li>Order status is updated to Payment Confirmed.</li>
                        </ul>
                        <p>The merchant may then accept or reject the order.</p>

                        <h3 className={styles.subhead}>Benefits</h3>
                        <ul className={styles.list}>
                            {[
                                'Fast checkout experience',
                                'Automatic payment confirmation',
                                'No screenshot uploads',
                                'Popular payment options for customers',
                            ].map((item) => (
                                <li key={item} className={styles.listItem}>
                                    <FaCheck className={styles.listIcon} />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>

                        <h3 className={styles.subhead}>Refunds</h3>
                        <p>
                            If the merchant rejects or cancels an order due to merchant-related
                            reasons, the customer will receive a refund. Any non-refundable payment
                            processing fees will be borne by the merchant.
                        </p>
                        <Reason>
                            The merchant is responsible for maintaining accurate Ordering Hours,
                            Operating Hours, Operating Days and inventory availability.
                        </Reason>
                    </div>
                </section>

                <section id="choosing" className={styles.section}>
                    <div className={styles.sectionHead}>
                        <span className={styles.sectionIcon}>
                            <FaTable />
                        </span>
                        <h2 className={styles.sectionTitle}>Choosing the Right Payment Option</h2>
                    </div>
                    <div className={styles.body}>
                        <Callout tone="info" icon={<FaInfoCircle />}>
                            Merchants must choose one payment setup: Manual PayNow, or Automatic
                            Payment. Automatic Payment includes Automatic PayNow, credit card and
                            other supported digital payment methods.
                        </Callout>
                        <div className={styles.summaryWrap}>
                            <table className={styles.summaryTable}>
                                <thead>
                                    <tr>
                                        <th>Feature</th>
                                        <th>Manual PayNow</th>
                                        <th>Automatic PayNow</th>
                                        <th>Credit Card</th>
                                        <th>Other Digital Payments</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {comparisonRows.map((row) => (
                                        <tr key={row[0]}>
                                            <th scope="row">{row[0]}</th>
                                            {row.slice(1).map((cell, index) => (
                                                <td key={`${row[0]}-${index}`}>{cell}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                <div className={styles.contact}>
                    <div>
                        <h2 className={styles.contactTitle}>Need help choosing?</h2>
                        <p>
                            We can walk you through which payment setup fits your shop operations.
                        </p>
                    </div>
                    <a
                        href={WHATSAPP_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.contactBtn}
                    >
                        <FaWhatsapp /> Chat with us
                    </a>
                </div>
            </div>
        </div>
    );
};

export default PaymentTypesAndFees;
