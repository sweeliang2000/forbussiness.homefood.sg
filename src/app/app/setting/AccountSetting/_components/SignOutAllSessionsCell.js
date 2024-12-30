'use client';
import { useState } from "react";
import DangerActionCell from "../_views/DangerActionCell";
import { Dialog } from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { IoMdClose } from "react-icons/io";
import styles from "./SignOutAllSessionsCell.module.css";
import { GLOBAL_SIGN_OUT } from "@/utility/apiPaths";

const SignOutAllSessionCell = () => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isButtonLoading, setIsButtonLoading] = useState(false);

    const signoutAllSessionHandler = async () => {
        setIsButtonLoading(true)

        try {
            await apiClient.post(`${GLOBAL_SIGN_OUT}`, payload);
            setIsAtRestPasswordStage(true);
            setSuccessMessage("An OTP values had been sent to your email. Enter your new password and OTP to reset.")
        } catch (error) {
            const message = error?.response?.data?.message || error.message;
            const code = error?.response?.data?.code || error.code;
            setIsSubmissionButtonLoading(false);
            setErrorMessage(`${message} (Error code: ${code})`);
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
                    <p className={styles.description}>This will end your active sessions on all devices including this. You’ll need to sign in again to continue using any of those sessions.</p>
                    <LoadingButton
                        className={styles.LoadingButton}
                        fullWidth 
                        variant="contained"
                        onClick={signoutAllSessionHandler}
                        loading={isButtonLoading}
                    >
                        I want to sign out all sessions including this
                    </LoadingButton>
                </div>
            </Dialog>
            <DangerActionCell
                title="Sign out all sessions"
                description="This will end your active sessions on all devices including this. You’ll need to sign in again to continue using any of those sessions."
                buttonTitle={"Sign out all sessions"}
                onClick={() => {
                    setIsDialogOpen(true)
                }}
            />
        </>
    );
}

export default SignOutAllSessionCell;