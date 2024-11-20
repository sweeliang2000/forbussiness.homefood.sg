"use client"
import Image from "next/image";
import styles from "./page.module.css";
import { FaLevelDownAlt } from 'react-icons/fa';
import Link from "next/link";
import { Button, TextField } from "@mui/material";
import { useState } from "react";
import { IoMdArrowRoundBack } from "react-icons/io";


// export const metadata = {
//     title: "Sign up and Start your Loyalty Program | Collbine for Business Singapore",
//     description: "Collbine offers a loyalty system for Singapore merchants. Empower your business with a unique, flexible rewards program that allows customers to earn and redeem points, tailored to your shop’s needs.",
// };

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            alert('Passwords do not match');
        } else {
            // Handle form submission, like sending data to an API
            console.log('Account created:', { email, password });
        }
    };

    const handleGoogleLogin = () => {
        // Add your Google sign-up logic here
    };

    const handleForgetPasswordClick = () => {
        // Add logic for navigating to the forget password page or opening a modal
        console.log('Redirecting to forget password...');
    };

    return (
        <main className={styles.main}>
            {/* [LEFT] First Section: Introduction */}
            <section className={styles.introSection}>
                <div>
                    <p className={styles.tagline}>
                        Boost Sales with a Powerful Loyalty System – Manage, Engage, and Grow Your Business in One Platform.
                    </p>
                </div>

                <div>
                    <div className={styles.subTagLineContainer}>
                        <p className={styles.subTagLine}>Trusted by leading brands</p>
                        <FaLevelDownAlt className={styles.faLevelDown} />
                    </div>

                    <div className={styles.brands}>
                        <Image
                            src='/images/auth/brands/generation-coffee.png'
                            width='80'
                            height='80'
                            alt=''
                        />
                        <Image
                            src='/images/auth/brands/keens-bagelry.png'
                            width='80'
                            height='80'
                            alt=''
                        />
                    </div>

                </div>
            </section>

            {/* [RIGHT] Second Section: Sign-up Form */}
            <section className={styles.rightSection}>
                <div className={styles.formSection}>
                    <div className={styles.formTitlesSection}>
                        <h2>Collbine For Business</h2>
                        <h1>Reset Password</h1>
                        <p>No worries, we&apos;ll send you reset instructions.</p>
                    </div>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        <TextField
                            variant="standard"
                            label="Email"
                            type="email"
                            fullWidth
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            fullWidth
                            className={styles.resetPwdButton}
                        >
                            Reset Password
                        </Button>
                    </form>



                        <Link
                            href="/login"
                            className={styles.backToLogin}
                        >
                            <IoMdArrowRoundBack/>
                           Back to Login
                        </Link>

                </div>
            </section>
        </main>
    )
};