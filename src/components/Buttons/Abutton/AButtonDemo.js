'use client';
import Abutton from './Abutton';
import styles from './AButtonDemo.module.css';

const AButtonDemo = () => {
    return (
        <div className={styles.demo}>
            <h2>Abutton Component Demo</h2>
            
            <section className={styles.section}>
                <h3>Basic Variants</h3>
                <div className={styles.buttonGrid}>
                    <Abutton variant="primary" size="medium">Primary</Abutton>
                    <Abutton variant="secondary" size="medium">Secondary</Abutton>
                    <Abutton variant="outline" size="medium">Outline</Abutton>
                    <Abutton variant="ghost" size="medium">Ghost</Abutton>
                    <Abutton variant="white" size="medium">White</Abutton>
                </div>
            </section>

            <section className={styles.section}>
                <h3>Outline Variants</h3>
                <div className={styles.buttonGrid}>
                    <Abutton variant="outline-primary" size="medium">Outline Primary</Abutton>
                    <Abutton variant="outline-secondary" size="medium">Outline Secondary</Abutton>
                    <Abutton variant="outline-success" size="medium">Outline Success</Abutton>
                    <Abutton variant="outline-warning" size="medium">Outline Warning</Abutton>
                    <Abutton variant="outline-danger" size="medium">Outline Danger</Abutton>
                </div>
            </section>

            <section className={styles.section}>
                <h3>Thin Outline Variants</h3>
                <div className={styles.buttonGrid}>
                    <Abutton variant="outline-thin" size="medium">Thin Outline</Abutton>
                    <Abutton variant="outline-thin-white" size="medium">Thin White</Abutton>
                </div>
            </section>

            <section className={styles.section}>
                <h3>Dashed Outline Variants</h3>
                <div className={styles.buttonGrid}>
                    <Abutton variant="outline-dashed" size="medium">Dashed Outline</Abutton>
                    <Abutton variant="outline-dashed-secondary" size="medium">Dashed Secondary</Abutton>
                </div>
            </section>

            <section className={styles.section}>
                <h3>Sizes</h3>
                <div className={styles.buttonGrid}>
                    <Abutton variant="outline-primary" size="small">Small</Abutton>
                    <Abutton variant="outline-primary" size="medium">Medium</Abutton>
                    <Abutton variant="outline-primary" size="large">Large</Abutton>
                    <Abutton variant="outline-primary" size="xlarge">X-Large</Abutton>
                </div>
            </section>

            <section className={`${styles.section} ${styles.darkSection}`}>
                <h3>White Outline Variants (Dark Background)</h3>
                <div className={styles.buttonGrid}>
                    <Abutton variant="outline-white" size="medium">White Outline</Abutton>
                    <Abutton variant="outline-thin-white" size="medium">Thin White</Abutton>
                </div>
            </section>
        </div>
    );
};

export default AButtonDemo;
