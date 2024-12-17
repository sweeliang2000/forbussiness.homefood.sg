'use client';
import { useState } from "react";
import DangerActionCell from "../_views/DangerActionCell";
import { Dialog } from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { IoMdClose } from "react-icons/io";
import styles from "./SignOutAllSessionsCell.module.css";

const SignOutAllSessionCell = () => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isButtonLoading, setIsButtonLoading] = useState(false);

    const signoutAllSessionHandler = async () => {
        setIsButtonLoading(true)
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