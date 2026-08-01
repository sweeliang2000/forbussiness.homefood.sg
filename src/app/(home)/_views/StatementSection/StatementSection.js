import styles from "./StatementSection.module.css";
import Badge from "@/components/Badge";

const StatementSection = () => {
    return (
        <section className={styles.statementSection}>
            <div className={styles.statementInner}>
                <Badge variant="brand">Built for home kitchens</Badge>
                <h2>Great home food is everywhere. It just isn&apos;t easy to find, order, or collect. HomeFood fixes all three.</h2>
                <p>
                    Home-based food businesses in Singapore are booming — but most rely on word of mouth, messy WhatsApp
                    threads, and manual payment tracking.{' '}
                    <strong>
                        HomeFood turns your home kitchen into a proper, discoverable business
                    </strong>{' '}
                    with pre-orders, live status updates, online payments, and a home-pickup flow customers already understand.
                </p>
                <p className={styles.src}>*Designed with and for Singapore home-based food (HBF) sellers.</p>
            </div>
        </section>
    );
};

export default StatementSection;
