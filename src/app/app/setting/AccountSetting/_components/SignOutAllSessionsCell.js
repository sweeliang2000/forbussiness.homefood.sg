'use client';
import { useState } from 'react';
import DangerActionCell from '../_views/DangerActionCell';
import { Alert, Dialog, Button } from '@mui/material';
import { IoMdClose } from 'react-icons/io';
import styles from './SignOutAllSessionsCell.module.css';
import { GLOBAL_SIGN_OUT } from '@/utility/apiPaths';
import apiClient from '@/utility/api';
import { useRouter } from 'next/navigation';

const SignOutAllSessionCell = () => {
    const router = useRouter();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isButtonLoading, setIsButtonLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);

    const signoutAllSessionHandler = async () => {
        setIsButtonLoading(true)
        setErrorMessage(null);

        try {
            await apiClient.post(`${GLOBAL_SIGN_OUT}`);
            router.replace('/login');
        } catch (error) {
            const message = error?.response?.data?.message || error.message;
            const code = error?.response?.data?.code || error.code;
            setErrorMessage(`An error occurred. ${message} (Error code: ${code})`);
        }
    };

    return (
        <>
            <Dialog
                open={isDialogOpen}
                onClose={() => { setIsDialogOpen(false) }}
            >
                <div className={styles.card}>
                    <IoMdClose className={styles.close} onClick={() => { setIsDialogOpen(false)}}/>
                    <p className={styles.title}>Sign out all sessions</p>
                    { errorMessage && <Alert severity='error'>{errorMessage}</Alert> }
                    <p className={styles.description}>
                        This will end your active sessions on all devices, including this one. You’ll need 
                        to sign in again to use any of those sessions. Please note that any open sessions 
                        may continue to work until they naturally expire, usually within an hour.
                    </p>
                    <Button
                        className={styles.LoadingButton}
                        fullWidth 
                        variant='contained'
                        onClick={signoutAllSessionHandler}
                        loading={isButtonLoading}
                    >
                        I want to sign out all sessions including this
                    </Button>
                </div>
            </Dialog>
            <DangerActionCell
                title='Sign out all sessions'
                description='This will end your active sessions on all devices including this. You’ll need to sign in again to continue using any of those sessions.'
                buttonTitle={'Sign out all sessions'}
                onClick={() => {
                    setIsDialogOpen(true)
                }}
            />
        </>
    );
}

export default SignOutAllSessionCell;