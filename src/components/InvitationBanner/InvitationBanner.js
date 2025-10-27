import { Button, TextField, Alert } from '@mui/material';
import { useState } from 'react';
import AlertModal from '../AlertModal/AlertModal';
import apiClient from '@/utility/api';
import { ACCEPT_INVITATION, REJECT_INVITATION } from '@/utility/apiPaths';
import styles from './InvitationBanner.module.css';

const InvitationBanner = ({
    invitedby,
    shopname,
    role = 'Viewer',
    email,
    shop_id
}) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmationText, setConfirmationText] = useState('');
    const [confirmationError, setConfirmationError] = useState('');

    const handleAcceptClick = () => {
        setShowConfirmModal(true);
    };

    const handleConfirmAccept = async () => {
        if (confirmationText.toLowerCase() !== 'confirm') {
            setConfirmationError('Please type "confirm" to proceed');
            return;
        }
        
        setConfirmationError(''); // Clear any previous errors
        setShowConfirmModal(false);
        setIsProcessing(true);
        
        try {
            console.log('Accepting invitation...');
            
            // TODO: Accept invitation logic not implemented yet
            // const payload = {
            //     email: email,
            //     shop_id: shop_id
            // };
            
            // const response = await apiClient.post(ACCEPT_INVITATION, payload);
            
            // if (response.data.success) {
            //     console.log('Invitation accepted successfully:', response.data);
            //     // TODO: Handle success (e.g., show success message, refresh page, etc.)
            //     // You might want to call a callback function passed from parent component
            // } else {
            //     console.error('Failed to accept invitation:', response.data.message);
            //     // TODO: Handle error (e.g., show error message)
            // }
            
            // Simulate API call for now
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log('Invitation accepted successfully (simulated)');
        } catch (error) {
            console.error('Error accepting invitation:', error);
            // TODO: Handle error (e.g., show error message)
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCancelConfirm = () => {
        setShowConfirmModal(false);
        setConfirmationText('');
        setConfirmationError('');
    };

    const handleDecline = async () => {
        setIsProcessing(true);
        try {
            console.log('Declining invitation...');
            
            const payload = {
                email: email,
                shop_id: shop_id
            };
            
            const response = await apiClient.post(REJECT_INVITATION, payload);
            
            if (response.data.success) {
                console.log('Invitation declined successfully:', response.data);
                // TODO: Handle success (e.g., show success message, refresh page, etc.)
                // You might want to call a callback function passed from parent component
            } else {
                console.error('Failed to decline invitation:', response.data.message);
                // TODO: Handle error (e.g., show error message)
            }
        } catch (error) {
            console.error('Error declining invitation:', error);
            // TODO: Handle error (e.g., show error message)
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <>
            <div className={styles.invitationBanner}>
                <div className={styles.bannerContent}>
                    <div className={styles.bannerText}>
                        <p>{invitedby} invited you to <span>{shopname}</span> shop as a <span>{role}</span>.</p>
                    </div>
                    <div className={styles.bannerActions}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleAcceptClick}
                            disabled={isProcessing}
                            className={styles.acceptButton}
                        >
                            {isProcessing ? 'Processing...' : 'Accept Invitation'}
                        </Button>
                        <Button
                            variant="outlined"
                            color="error"
                            onClick={handleDecline}
                            disabled={isProcessing}
                            className={styles.declineButton}
                        >
                            {isProcessing ? 'Processing...' : 'Decline'}
                        </Button>
                    </div>
                </div>
            </div>

            <AlertModal
                open={showConfirmModal}
                onClose={handleCancelConfirm}
                title="Role Invitation Warning"
                description={
                    <div>
                        {confirmationError && (
                            <Alert 
                                severity="error" 
                                sx={{ marginBottom: '16px' }}
                            >
                                {confirmationError}
                            </Alert>
                        )}

                        <p style={{ marginBottom: '16px' }}>
                            When you accept this invitation, all the information you have set up for this shop or merchant will be deleted.
                        </p>
                        <p style={{ marginBottom: '16px' }}>
                            This includes all your stamp system, rewards, settings, and any data associated with your current account for this business.
                        </p>
                        <p style={{ marginBottom: '16px', fontWeight: 'bold' }}>
                            This action cannot be undone.
                        </p>

                        <TextField
                            fullWidth
                            label="Type 'confirm' to proceed"
                            value={confirmationText}
                            onChange={(e) => {
                                setConfirmationText(e.target.value);
                                setConfirmationError(''); // Clear error when user types
                            }}
                            variant="outlined"
                            size="small"
                            placeholder="Type 'confirm' here"
                            error={!!confirmationError}
                        />
                    </div>
                }
                onAction={handleConfirmAccept}
                actionButtonText="Accept Invitation"
                type="error"
            />
        </>
    );
};

export default InvitationBanner;
