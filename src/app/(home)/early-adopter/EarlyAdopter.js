'use client';
import { useState } from 'react';
import Link from 'next/link';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/utility/firebaseClient';
import styles from './EarlyAdopter.module.css';

const EarlyAdopter = () => {
    const [form, setForm] = useState({ name: '', phone: '', email: '' });
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await addDoc(collection(db, 'early_adopters'), {
                name: form.name.trim(),
                phone: form.phone.trim(),
                email: form.email.trim().toLowerCase(),
                createdAt: serverTimestamp(),
            });
            setSubmitted(true);
        } catch (err) {
            console.error('[EarlyAdopter] Firestore error:', err);
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className={styles.page}>
                <div className={styles.card}>
                    <div className={styles.successIcon}>🎉</div>
                    <h1 className={styles.successTitle}>You&apos;re on the list!</h1>
                    <p className={styles.successSub}>
                        We&apos;ll reach out as soon as we&apos;re ready to set you up on HomeFood. Stay tuned!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.layout}>
                <section className={styles.offerPanel}>
                    <span className={styles.badge}>Limited-time Founding Seller offer</span>
                    <h1 className={styles.offerTitle}>Founding Seller benefits. Free membership for life.</h1>
                    <p className={styles.offerSub}>
                        Eligible Founding Sellers receive the S$39.90/month Pro plan with a S$0 monthly
                        platform subscription—forever. Payment transaction fees still apply.
                    </p>

                    <div className={styles.offerPrice}>
                        <span className={styles.wasPrice}>Yearly rate S$39.90/month</span>
                        <div>
                            <strong>S$0.00</strong>
                            <span>/ month for life</span>
                        </div>
                    </div>

                    <ul className={styles.benefits}>
                        <li><span aria-hidden="true">✓</span> PayNow &amp; PayLah! at 3%</li>
                        <li><span aria-hidden="true">✓</span> Visa &amp; Mastercard at 6% + S$0.50</li>
                        <li><span aria-hidden="true">✓</span> An ad-free public shop-details page</li>
                        <li><span aria-hidden="true">✓</span> Eligibility for Homebase Verified</li>
                        <li><span aria-hidden="true">✓</span> A permanent Founding Seller badge</li>
                    </ul>

                    <p className={styles.verificationNote}>
                        The Founding Seller badge is permanent. Homebase Verified is a separate badge awarded
                        only after identity and business checks, plus an anonymous purchase and food sample.
                    </p>

                    <Link href="/founding-sellers" className={styles.pricingLink}>
                        Read all Founding Seller benefits <span aria-hidden="true">→</span>
                    </Link>
                </section>

                <section className={styles.card}>
                <div className={styles.header}>
                    <span className={styles.formEyebrow}>Founding Seller application</span>
                    <h2 className={styles.title}>Apply as a Founding Seller</h2>
                    <p className={styles.sub}>
                        Tell us where to reach you. We&apos;ll contact you when your home kitchen is ready for onboarding.
                    </p>
                </div>
                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="ea-name">Name</label>
                        <input
                            id="ea-name"
                            className={styles.input}
                            type="text"
                            name="name"
                            placeholder="Your full name"
                            value={form.name}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="ea-phone">Phone number</label>
                        <input
                            id="ea-phone"
                            className={styles.input}
                            type="tel"
                            name="phone"
                            placeholder="+65 9123 4567"
                            value={form.phone}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="ea-email">Email address</label>
                        <input
                            id="ea-email"
                            className={styles.input}
                            type="email"
                            name="email"
                            placeholder="you@example.com"
                            value={form.email}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    {error && <p className={styles.error}>{error}</p>}
                    <button
                        type="submit"
                        className={styles.submit}
                        disabled={loading}
                    >
                        {loading ? 'Submitting…' : 'Apply as a Founding Seller →'}
                    </button>
                </form>
                </section>
            </div>
        </div>
    );
};

export default EarlyAdopter;
