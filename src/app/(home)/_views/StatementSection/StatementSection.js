import styles from "./StatementSection.module.css";
import Badge from "@/components/Badge";

const StatementSection = () => {
    return (
        <section className={styles.statementSection}>
            <div className={styles.sectionContainer}>
                <div className={styles.statementContainer}>
                    <div className={styles.statementContent}>
                        <Badge variant="blue">Proved by Experts</Badge>
                        <h2>Loyalty Keeps Customers Coming Back. Promotions Drive Discovery and Spending.</h2>
                        <p>
                            Nearly 47% of shoppers buy more or try new brands when redeeming promotions, showing how incentives influence purchase behaviour. That's why effective retail strategies combine promotions that attract customers with loyalty systems that keep them returning. <strong>Collbine does both: scan-to-win to bring them in and drive spend, and loyalty to turn visitors into regulars.</strong>
                        </p>
                    </div>

                    <p>
                        *Source: XCCommerce 2026 Retail Promotions Shopper Study.
                    </p>
                </div>
            </div>
        </section>
    )
};

export default StatementSection;
