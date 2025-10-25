'use client';
import styles from './SignoutSection.module.css';
import { SIGN_OUT } from '@/utility/apiPaths';
import { useState } from 'react';
import apiClient from '@/utility/api';
import { useRouter } from 'next/navigation';
import { Button } from '@mui/material';

const SignoutSection = () => {
    const router = useRouter();
    const [isButtonLoading, setIsButtonLoading] = useState(false);

    const signoutHandler = async () => {
        setIsButtonLoading(true);

        try {
            console.log('Signing out...');
            await apiClient.post(`${SIGN_OUT}`);
            router.replace('/login');
        } catch (error) {
            console.log("SIGNOUT")
            const errorData = error?.response?.data;
            const message = errorData?.error?.message || errorData?.message || error?.message || 'An unknown error occurred';
            const code = errorData?.error?.statusCode || errorData?.code || error?.code || 'UNKNOWN';
            console.log(`An error occurred. ${message} (Error code: ${code})`);
        }
    };

    return(
        <div>
            <Button 
                onClick={signoutHandler}
                className={styles.button} 
                loading={isButtonLoading}
                color="error" 
                variant="text" 
                fullWidth>
                Sign out
            </Button>
        </div>
    )
};

export default SignoutSection;