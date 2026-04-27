'use client';
import { useState } from 'react';
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
                        We&apos;ll reach out as soon as we&apos;re ready to set you up on Collbine. Stay tuned!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <span className={styles.badge}>Early Access</span>
                    <h1 className={styles.title}>Join early adopters</h1>
                    <p className={styles.sub}>
                        Be among the first to get set up on Collbine. Fill in your details and we&apos;ll reach out once we&apos;re ready for you.
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
                        {loading ? 'Submitting…' : 'Join the waitlist →'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default EarlyAdopter;
