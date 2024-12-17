'use client';
import DangerActionCell from '../_views/DangerActionCell';
import styles from './DeleteAccount.module.css';

const DeleteAccount = () => {
    return(
        <>
            <DangerActionCell
                title="Delete Account"
                description="Permanently remove your account and all associated data. This action cannot be undone."
                buttonTitle={"Delete Account"}
                onClick={() => {
                    // setIsDialogOpen(true)
                }}
                last={true}
            />
        </>
    )
};

export default DeleteAccount;