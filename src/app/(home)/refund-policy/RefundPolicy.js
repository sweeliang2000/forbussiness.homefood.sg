import styles from './RefundPolicy.module.css';
import {
    FaShieldAlt,
    FaStore,
    FaQrcode,
    FaBolt,
    FaRegCreditCard,
    FaWallet,
    FaExclamationTriangle,
    FaRegClock,
    FaRegLightbulb,
    FaInfoCircle,
    FaCheck,
    FaWhatsapp,
    FaTable,
    FaArrowDown,
} from 'react-icons/fa';

const WHATSAPP_URL =
    'https://api.whatsapp.com/send/?phone=6588678978&text&type=phone_number&app_absent=0';

const LAST_UPDATED = '13 June 2026';

const sections = [
    { id: 'summary', label: 'Refund Summary' },
    { id: 'responsibilities', label: 'Merchant Responsibilities' },
    { id: 'manual-paynow', label: 'Manual PayNow' },
    { id: 'auto-paynow', label: 'Automatic PayNow' },
    { id: 'cards', label: 'Cards, Apple Pay & Google Pay' },
    { id: 'other', label: 'Other Digital Payments' },
    { id: 'rejections', label: 'Repeated Rejections' },
    { id: 'timelines', label: 'Refund Timelines' },
];

const summaryColumns = ['Manual PayNow', 'Automatic PayNow', 'Credit Card', 'Other Digital Payments'];

const summaryRows = [
    {
        scenario: 'Merchant Rejects Before Acceptance',
        cells: [
            'Merchant refunds customer directly',
            'Merchant bears 3% fee',
            'Full refund, no fee charged',
            'Merchant bears fees',
        ],
    },
    {
        scenario: 'Merchant Rejects After Acceptance',
        cells: [
            'Merchant refunds customer directly',
            'Merchant bears fees',
            'Merchant bears fees',
            'Merchant bears fees',
        ],
    },
    {
        scenario: 'Customer Receives Full Refund',
        cells: ['Yes', 'Yes', 'Yes', 'Yes'],
    },
    {
        scenario: 'Non-refundable Processing Fees',
        cells: [
            'N/A',
            'Merchant bears fee',
            'Merchant bears fee after acceptance',
            'Merchant bears fee',
        ],
    },
];

const toneClass = (tone) =>
    tone === 'pos'
        ? styles.pos
        : tone === 'neg'
          ? styles.neg
          : tone === 'muted'
            ? styles.muted
            : '';

const ExampleBox = ({ title = 'Example', icon, items }) => (
    <div className={styles.example}>
        <div className={styles.exampleHead}>
            {icon || <FaRegLightbulb />}
            <span>{title}</span>
        </div>
        <ul className={styles.exampleRows}>
            {items.map((it, i) => (
                <li
                    key={i}
                    className={it.value !== undefined ? styles.exampleRow : styles.exampleNote}
                >
                    {it.value !== undefined ? (
                        <>
                            <span className={styles.exampleKey}>{it.label}</span>
                            <span className={`${styles.exampleVal} ${toneClass(it.tone)}`}>
                                {it.value}
                            </span>
                        </>
                    ) : (
                        <>
                            <span className={`${styles.noteDot} ${toneClass(it.tone)}`} />
                            <span>{it.label}</span>
                        </>
                    )}
                </li>
            ))}
        </ul>
    </div>
);

const Reason = ({ children }) => (
    <div className={styles.reason}>
        <span className={styles.reasonLabel}>Reason</span>
        <p>{children}</p>
    </div>
);

const Callout = ({ tone = 'info', icon, children }) => (
    <div className={`${styles.callout} ${styles[`callout_${tone}`]}`}>
        <span className={styles.calloutIcon}>{icon || <FaInfoCircle />}</span>
        <p>{children}</p>
    </div>
);

const RefundPolicy = () => {
    return (
        <div className={styles.page}>
            {/* Hero */}
            <header className={styles.hero}>
                <div className={styles.heroInner}>
                    <span className={styles.heroBadge}>
                        <FaShieldAlt /> Merchant Policy
                    </span>
                    <h1 className={styles.title}>Refund &amp; Payment Policy</h1>
                    <p className={styles.subtitle}>
                        How refunds and payment processing fees are handled across each payment
                        method on HomeFood — and what merchants are responsible for.
                    </p>
                    <p className={styles.updated}>Last updated {LAST_UPDATED}</p>
                </div>
            </header>

            <div className={styles.content}>
                {/* On this page */}
                <nav className={styles.toc} aria-label="On this page">
                    <span className={styles.tocTitle}>On this page</span>
                    <div className={styles.tocList}>
                        {sections.map((s) => (
                            <a key={s.id} href={`#${s.id}`} className={styles.tocLink}>
                                {s.label}
                            </a>
                        ))}
                    </div>
                </nav>

                {/* Refund Summary */}
                <section id="summary" className={styles.section}>
                    <div className={styles.sectionHead}>
                        <span className={styles.sectionIcon}>
                            <FaTable />
                        </span>
                        <h2 className={styles.sectionTitle}>Refund Summary</h2>
                        <a href="#timelines" className={styles.jumpLink}>
                            <FaRegClock /> Click here to find out about refund duration
                        </a>
                    </div>
                    <div className={styles.body}>
                        <p>
                            At-a-glance overview of who bears the cost in each scenario. Full details
                            for every payment method are explained below.
                        </p>
                        <div className={styles.summaryWrap}>
                            <table className={styles.summaryTable}>
                                <thead>
                                    <tr>
                                        <th>Scenario</th>
                                        {summaryColumns.map((col) => (
                                            <th key={col}>{col}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {summaryRows.map((row) => (
                                        <tr key={row.scenario}>
                                            <th scope="row">{row.scenario}</th>
                                            {row.cells.map((cell, i) => (
                                                <td
                                                    key={i}
                                                    className={
                                                        cell === 'Yes'
                                                            ? styles.cellYes
                                                            : cell === 'N/A'
                                                              ? styles.cellNa
                                                              : ''
                                                    }
                                                >
                                                    {cell}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* 1. Merchant Responsibilities */}
                <section id="responsibilities" className={styles.section}>
                    <div className={styles.sectionHead}>
                        <span className={styles.sectionIcon}>
                            <FaStore />
                        </span>
                        <h2 className={styles.sectionTitle}>Merchant Responsibilities</h2>
                    </div>
                    <div className={styles.body}>
                        <p>Merchants are responsible for configuring and maintaining:</p>
                        <ul className={styles.list}>
                            {[
                                'Ordering Hours',
                                'Operating Hours',
                                'Operating Days',
                                'Closed Days and Holidays',
                                'Pre-order Settings',
                                'Item Availability and Inventory',
                            ].map((item) => (
                                <li key={item} className={styles.listItem}>
                                    <FaCheck className={styles.listIcon} />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>

                        <h3 className={styles.subhead}>
                            <FaRegClock /> Ordering Hours vs Operating Hours
                        </h3>
                        <p>
                            <strong>Ordering Hours</strong> refer to the time periods during which
                            customers are allowed to place and pay for orders through the platform.
                        </p>
                        <p>
                            <strong>Operating Hours</strong> refer to the actual opening and closing
                            times of the business.
                        </p>
                        <p>These settings may be different.</p>

                        <ExampleBox
                            items={[
                                { label: 'Ordering Hours', value: '8:00 AM – 5:00 PM' },
                                { label: 'Operating Hours', value: '9:00 AM – 6:00 PM' },
                            ]}
                        />

                        <p>
                            This allows merchants to stop accepting new orders before the business
                            closes, giving sufficient time to prepare and fulfil existing orders.
                        </p>
                        <p>
                            Merchants must ensure that their Ordering Hours accurately reflect when
                            they are able to accept and fulfil orders.
                        </p>

                        <Callout tone="info" icon={<FaInfoCircle />}>
                            Any payment processing fees incurred due to merchant error — including
                            incorrect Ordering Hours, incorrect Operating Hours, incorrect Operating
                            Days, unavailable inventory, store closure, or inability to fulfil an
                            order — shall be borne by the merchant.
                        </Callout>
                        <Callout tone="success" icon={<FaInfoCircle />}>
                            Only fees resulting directly from a platform error caused by HomeFood
                            will be refunded by HomeFood.
                        </Callout>
                    </div>
                </section>

                {/* 2. Manual Payment - PayNow */}
                <section id="manual-paynow" className={styles.section}>
                    <div className={styles.sectionHead}>
                        <span className={styles.sectionIcon}>
                            <FaQrcode />
                        </span>
                        <h2 className={styles.sectionTitle}>
                            Manual Payment
                            <span className={styles.titleSub}>PayNow Screenshot Verification</span>
                        </h2>
                        <span className={`${styles.feeBadge} ${styles.fee0}`}>0% platform fee</span>
                    </div>
                    <div className={styles.body}>
                        <p>
                            Customers pay merchants directly via PayNow and upload a payment
                            screenshot for verification.
                        </p>
                        <p>
                            If an order is rejected, the merchant is fully responsible for refunding
                            the customer directly.
                        </p>
                        <ExampleBox
                            title="Fee breakdown"
                            items={[
                                { label: 'Order amount', value: '$20.00' },
                                { label: 'Processing fee', value: '$0.00', tone: 'muted' },
                                { label: 'Merchant receives', value: '$20.00', tone: 'pos' },
                            ]}
                        />

                        <h3 className={styles.subhead}>Merchant Rejects Order</h3>
                        <ExampleBox
                            items={[
                                { label: 'Customer pays', value: '$20.00' },
                                { label: 'Merchant rejects order' },
                            ]}
                        />
                        <ExampleBox
                            title="Outcome"
                            icon={<FaInfoCircle />}
                            items={[
                                { label: 'Customer receives', value: '$20.00 refund', tone: 'pos' },
                                { label: 'Merchant receives', value: '$0.00', tone: 'muted' },
                                { label: 'Non-refundable fee', value: 'N/A', tone: 'muted' },
                            ]}
                        />
                        <Reason>
                            The payment was made directly to the merchant. The merchant is therefore
                            responsible for issuing the refund.
                        </Reason>
                    </div>
                </section>

                {/* 3. Automatic Payment - PayNow */}
                <section id="auto-paynow" className={styles.section}>
                    <div className={styles.sectionHead}>
                        <span className={styles.sectionIcon}>
                            <FaBolt />
                        </span>
                        <h2 className={styles.sectionTitle}>Automatic Payment — PayNow</h2>
                        <span className={`${styles.feeBadge} ${styles.fee3}`}>3% platform fee</span>
                    </div>
                    <div className={styles.body}>
                        <ExampleBox
                            title="Fee breakdown"
                            items={[
                                { label: 'Order amount', value: '$20.00' },
                                { label: 'Processing fee', value: '$0.60', tone: 'muted' },
                                { label: 'Merchant receives', value: '$19.40', tone: 'pos' },
                            ]}
                        />

                        <h3 className={styles.subhead}>Merchant Rejects Order</h3>
                        <ExampleBox
                            items={[
                                { label: 'Customer pays', value: '$20.00' },
                                { label: 'Merchant rejects because the shop is closed' },
                            ]}
                        />
                        <ExampleBox
                            title="Outcome"
                            icon={<FaInfoCircle />}
                            items={[
                                { label: 'Customer receives', value: '$20.00 refund', tone: 'pos' },
                                { label: 'Merchant receives', value: '$0.00', tone: 'muted' },
                                {
                                    label: 'Merchant bears',
                                    value: '$0.60 processing fee',
                                    tone: 'muted',
                                },
                            ]}
                        />
                        <Reason>
                            The merchant is responsible for ensuring that Ordering Hours, Operating
                            Hours, Operating Days and inventory availability are configured
                            correctly. Since the order was accepted by the platform based on the
                            merchant&apos;s settings, any non-refundable processing fees resulting
                            from merchant rejection shall be borne by the merchant.
                        </Reason>
                    </div>
                </section>

                {/* 4. Cards / Apple Pay / Google Pay */}
                <section id="cards" className={styles.section}>
                    <div className={styles.sectionHead}>
                        <span className={styles.sectionIcon}>
                            <FaRegCreditCard />
                        </span>
                        <h2 className={styles.sectionTitle}>
                            Automatic Payment — Credit Card, Apple Pay &amp; Google Pay
                        </h2>
                        <span className={`${styles.feeBadge} ${styles.fee6}`}>6% platform fee</span>
                    </div>
                    <div className={styles.body}>
                        <p>
                            Payments are authorized first and only captured after merchant
                            acceptance.
                        </p>
                        <ExampleBox
                            title="Fee breakdown"
                            items={[
                                { label: 'Order amount', value: '$20.00' },
                                { label: 'Processing fee', value: '$1.20', tone: 'muted' },
                                { label: 'Merchant receives', value: '$18.80', tone: 'pos' },
                            ]}
                        />

                        <h3 className={styles.subhead}>Merchant Rejects Before Acceptance</h3>
                        <ExampleBox
                            items={[
                                { label: 'Customer places order for', value: '$20.00' },
                                { label: 'Merchant rejects before acceptance' },
                            ]}
                        />
                        <ExampleBox
                            title="Outcome"
                            icon={<FaInfoCircle />}
                            items={[
                                { label: 'Customer receives', value: '$20.00 refund', tone: 'pos' },
                                { label: 'Merchant receives', value: '$0.00', tone: 'muted' },
                                { label: 'Merchant bears', value: '$0.00', tone: 'muted' },
                            ]}
                        />
                        <Reason>
                            No payment has been captured from the customer. Therefore, no refund
                            processing fee is incurred.
                        </Reason>

                        <h3 className={styles.subhead}>Merchant Rejects After Acceptance</h3>
                        <ExampleBox
                            items={[
                                { label: 'Customer places order for', value: '$20.00' },
                                { label: 'Merchant accepts order' },
                                { label: 'Merchant subsequently cancels order' },
                            ]}
                        />
                        <ExampleBox
                            title="Outcome"
                            icon={<FaInfoCircle />}
                            items={[
                                { label: 'Customer receives', value: '$20.00 refund', tone: 'pos' },
                                { label: 'Merchant receives', value: '$0.00', tone: 'muted' },
                                {
                                    label: 'Merchant bears',
                                    value: '$1.20 in processing fees',
                                    tone: 'muted',
                                },
                            ]}
                        />
                        <Callout tone="info" icon={<FaInfoCircle />}>
                            Unlike a rejection before acceptance, the payment has already been
                            captured — so the customer is refunded in full, but the platform and
                            payment processing fees are <strong>not returned</strong>. The merchant
                            is responsible for these fees on the cancelled order.
                        </Callout>
                        <Reason>
                            Once an order has been accepted, the merchant has committed to fulfilling
                            the order. Any cancellation after acceptance that is caused by the
                            merchant shall result in the merchant bearing the associated payment
                            processing costs.
                        </Reason>
                    </div>
                </section>

                {/* 5. Other Digital Payment Methods */}
                <section id="other" className={styles.section}>
                    <div className={styles.sectionHead}>
                        <span className={styles.sectionIcon}>
                            <FaWallet />
                        </span>
                        <h2 className={styles.sectionTitle}>Other Digital Payment Methods</h2>
                        <span className={`${styles.feeBadge} ${styles.fee6}`}>6% platform fee</span>
                    </div>
                    <div className={styles.body}>
                        <p>Including but not limited to:</p>
                        <ul className={styles.list}>
                            {['GrabPay', 'Digital Wallets', 'Future supported payment methods'].map(
                                (item) => (
                                    <li key={item} className={styles.listItem}>
                                        <FaCheck className={styles.listIcon} />
                                        <span>{item}</span>
                                    </li>
                                )
                            )}
                        </ul>
                        <p>
                            These methods are processed automatically and charge a 6% platform fee.
                            If an order is cancelled or rejected due to merchant-related reasons, any
                            non-refundable payment processing fees shall be borne by the merchant.
                        </p>
                        <ExampleBox
                            title="Fee breakdown"
                            items={[
                                { label: 'Order amount', value: '$20.00' },
                                { label: 'Processing fee', value: '$1.20', tone: 'muted' },
                                { label: 'Merchant receives', value: '$18.80', tone: 'pos' },
                            ]}
                        />

                        <h3 className={styles.subhead}>Merchant Rejects Order</h3>
                        <ExampleBox
                            items={[
                                { label: 'Customer pays', value: '$20.00' },
                                { label: 'Merchant rejects order' },
                            ]}
                        />
                        <ExampleBox
                            title="Outcome"
                            icon={<FaInfoCircle />}
                            items={[
                                { label: 'Customer receives', value: '$20.00 refund', tone: 'pos' },
                                { label: 'Merchant receives', value: '$0.00', tone: 'muted' },
                                {
                                    label: 'Merchant bears',
                                    value: '$1.20 in processing fees',
                                    tone: 'muted',
                                },
                            ]}
                        />
                        <Reason>
                            The merchant is responsible for maintaining accurate Ordering Hours,
                            Operating Hours, Operating Days and inventory availability.
                        </Reason>
                    </div>
                </section>

                {/* 6. Repeated Merchant Rejections */}
                <section id="rejections" className={styles.section}>
                    <div className={styles.sectionHead}>
                        <span className={`${styles.sectionIcon} ${styles.sectionIconWarn}`}>
                            <FaExclamationTriangle />
                        </span>
                        <h2 className={styles.sectionTitle}>Repeated Merchant Rejections</h2>
                    </div>
                    <div className={styles.body}>
                        <p>Merchants who repeatedly:</p>
                        <ul className={styles.list}>
                            {[
                                'Configure incorrect Ordering Hours',
                                'Configure incorrect Operating Hours',
                                'Configure incorrect Operating Days',
                                'Leave unavailable items listed',
                                'Reject orders due to avoidable reasons',
                            ].map((item) => (
                                <li key={item} className={styles.listItem}>
                                    <FaExclamationTriangle
                                        className={`${styles.listIcon} ${styles.listIconWarn}`}
                                    />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p>may be subject to:</p>
                        <ul className={styles.consequenceList}>
                            {[
                                'Reduced search visibility',
                                'Lower ranking',
                                'Temporary suspension',
                                'Permanent removal from the platform',
                            ].map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                        <Callout tone="info" icon={<FaInfoCircle />}>
                            Merchants are encouraged to keep their store settings accurate to avoid
                            unnecessary refunds, customer dissatisfaction and payment processing
                            costs.
                        </Callout>
                    </div>
                </section>

                {/* 7. Refund Processing Timelines */}
                <section id="timelines" className={styles.section}>
                    <div className={styles.sectionHead}>
                        <span className={styles.sectionIcon}>
                            <FaRegClock />
                        </span>
                        <h2 className={styles.sectionTitle}>Refund Processing Timelines</h2>
                    </div>
                    <div className={styles.body}>
                        <p>
                            The following timelines are estimates and may vary depending on the
                            customer&apos;s bank or payment provider.
                        </p>
                        <div className={styles.tableWrap}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Payment Method</th>
                                        <th>Estimated Refund Processing Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        ['GrabPay', 'Typically within 5 minutes'],
                                        ['PayNow', 'Within 1 business day'],
                                        ['Credit Card', '5 to 10 business days'],
                                        [
                                            'Apple Pay',
                                            '5 to 10 business days (depending on the linked card issuer)',
                                        ],
                                        [
                                            'Google Pay',
                                            '5 to 10 business days (depending on the linked card issuer)',
                                        ],
                                    ].map(([method, time]) => (
                                        <tr key={method}>
                                            <td>{method}</td>
                                            <td>{time}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <h3 className={styles.subhead}>Important</h3>
                        <ul className={styles.noteList}>
                            <li>
                                Refund processing times are determined by the payment provider and
                                the customer&apos;s financial institution.
                            </li>
                            <li>
                                Once a refund has been successfully initiated by HomeFood or the
                                merchant, the actual time taken for the funds to appear in the
                                customer&apos;s account is outside of HomeFood&apos;s control.
                            </li>
                            <li>
                                Customers who do not receive their refund within the stated
                                timeframe should contact their bank, card issuer, or payment
                                provider before contacting HomeFood support.
                            </li>
                        </ul>
                    </div>
                </section>

                {/* Contact */}
                <div className={styles.contact}>
                    <div>
                        <h2 className={styles.contactTitle}>Still have questions?</h2>
                        <p>
                            We&apos;re happy to walk you through how refunds and fees work for your
                            store.
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

export default RefundPolicy;
