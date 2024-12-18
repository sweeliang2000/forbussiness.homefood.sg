"use client";
import Image from "next/image";
import styles from "./page.module.css";
import { FaLevelDownAlt } from 'react-icons/fa';
import Link from "next/link";
import { Alert, TextField } from "@mui/material";
import { useState } from "react";
import apiClient from "@/utility/api";
import { LoadingButton } from "@mui/lab";
import { BE_API_AUTH_URL } from "../../../../config/config";
import { useRouter } from "next/navigation";
import withAuthorization from "@/hoc/withAuthorization";

// export const metadata = {
//     title: "Sign up and Start your Loyalty Program | Collbine for Business Singapore",
//     description: "Collbine offers a loyalty system for Singapore merchants. Empower your business with a unique, flexible rewards program that allows customers to earn and redeem points, tailored to your shop’s needs.",
// };

 const Login = () => {
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState(null);
    const [isSubmissionButtonLoading, setIsSubmissionButtonLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage("");
        setIsSubmissionButtonLoading(true);

        if (!isFormVerified) {
            return;
        }

        const payload = {
            'username': email,
            'password': password
        };

        try {
            await apiClient.post(`${BE_API_AUTH_URL}/signIn`, payload);
            router.push('/app')
        } catch (error) {
            const errorStatus = error?.response?.data?.error;

            if (errorStatus === 'Email not verified') {
                router.push('/verify')
                return;
            };

            const message = error?.response?.data?.message || error.message;
            const code = error?.response?.data?.code || error.code;
            setErrorMessage(`${message} (Error code: ${code})`);
            setIsSubmissionButtonLoading(false);
        }

    };

    const isFormVerified = () => {
        setErrorMessage('');

        if (!email.trim() || !password.trim()) {
            setErrorMessage('Both email and password are required.');
            return false;
        }

        return true
    };

    const handleGoogleLogin = () => {
        // Add your Google sign-up logic here
    };

    return (
        <main className={styles.main}>
            {/* [LEFT] First Section: Introduction */}
            <section className={styles.introSection}>
                <div className={styles.titleDiv}>
                    <p className={styles.tagline}>
                        Boost Sales with a Powerful Loyalty System – Manage, Engage, and Grow Your Business in One Platform.
                    </p>
                </div>

                <div>
                    <div className={styles.subTagLineContainer}>
                        <FaLevelDownAlt className={styles.faLevelDownLeft} />
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
                        { errorMessage && <Alert severity="error" className={styles.alert}>{errorMessage}</Alert> }
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


                        <LoadingButton
                            type="submit"
                            variant="contained"
                            color="primary"
                            fullWidth
                            className={styles.loginButton}
                            loading={isSubmissionButtonLoading}
                        >
                            Login
                        </LoadingButton>
                    </form>


                    {/* <div className={styles.orContainer}>
                        <span className={styles.lineText}>or</span>
                        <hr className={styles.line} />
                    </div>

                    <Button
                        variant="contained"
                        startIcon={<FcGoogle />}
                        onClick={handleGoogleLogin}
                        fullWidth
                        className={styles.googleButton}
                    >
                        Login with Google
                    </Button> */}

                    <div>
                        <p className={styles.haveAccountTag}>Don’t have an account yet? <Link href='/signup' className={styles.link}>Sign up</Link></p>
                    </div>
                </div>
            </section>
        </main>
    )
};

export default withAuthorization(Login);