"use client"
import Image from "next/image";
import styles from "./page.module.css";
import { FaLevelDownAlt } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import Link from "next/link";
import { Box, Button, TextField } from "@mui/material";
import { useState } from "react";


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
                        <h1>Login</h1>
                        <p>Welcome. Please enter your details.</p>
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

                        <TextField
                            variant="standard"
                            label="Password"
                            type="password"
                            fullWidth
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        <Link
                            href="/forgot-password"
                            className={styles.forgotPasswordBuuton}
                        >
                            Forget Password?
                        </Link>


                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            fullWidth
                            className={styles.loginButton}
                        >
                            Login
                        </Button>
                    </form>


                    <div className={styles.orContainer}>
                        <span className={styles.lineText}>or</span>
                        <hr className={styles.line} />
                    </div>

                    <Button
                        variant="contained"
                        startIcon={<FcGoogle />} // Using the Google icon from react-icons
                        onClick={handleGoogleLogin}
                        fullWidth
                        className={styles.googleButton}
                    >
                        Login with Google
                    </Button>

                    <div>
                        <p className={styles.haveAccountTag}>Don’t have an account yet? <Link href='/signup' className={styles.link}>Sign up</Link></p>
                    </div>
                </div>
            </section>
        </main>
    )
};