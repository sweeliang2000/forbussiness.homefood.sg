import styles from "./StatementSection.module.css";

const StatementSection = () => {
    return (
        <section className={styles.statementSection}>
            <div className={styles.sectionContainer}>
                <div className={styles.statementContainer}>
                    <div className={styles.statementContent}>
                        <h2>Get Customers to Come Back. Get Them to Spend More.</h2>
                        <p>
                            Research from Bain & Company shows that <strong>repeat purchasers simply spend 
                            more and generate larger transactions</strong>*. Our system is designed to 
                            create these high-value customers who directly increase your sales.
                        </p>
                    </div>

                    <p>
                        *Source: The Value of Online Customer Loyalty, Bain & Company / Mainspring
                    </p>
                </div>
            </div>
        </section>
    )
};

export default StatementSection;