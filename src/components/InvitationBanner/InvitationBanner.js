import { Button, TextField, Alert } from '@mui/material';
import { useState } from 'react';
import AlertModal from '../AlertModal/AlertModal';
import styles from './InvitationBanner.module.css';

const InvitationBanner = ({
    invitedby,
    shopname,
    role = 'Viewer'
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
        try {
            // TODO: Implement accept invitation API call
            console.log('Accepting invitation...');
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log('Invitation accepted successfully');
        } catch (error) {
            console.error('Error accepting invitation:', error);
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
            // TODO: Implement decline invitation API call
            console.log('Declining invitation...');
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log('Invitation declined successfully');
        } catch (error) {
            console.error('Error declining invitation:', error);
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
