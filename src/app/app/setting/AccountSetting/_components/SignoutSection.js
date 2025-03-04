'use client';
import { LoadingButton } from '@mui/lab';
import styles from './SignoutSection.module.css';
import { SIGN_OUT } from '@/utility/apiPaths';
import { useState } from 'react';
import apiClient from '@/utility/api';
import { useRouter } from 'next/navigation';

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
            const message = error?.response?.data?.message || error.message;
            const code = error?.response?.data?.code || error.code;
            console.log(`An error occurred. ${message} (Error code: ${code})`);
        }
    };

    return(
        <div>
            <LoadingButton 
                onClick={signoutHandler}
                className={styles.button} 
                loading={isButtonLoading}
                color="error" 
                variant="text" 
                fullWidth>
                Sign out
            </LoadingButton>
        </div>
    )
};

export default SignoutSection;