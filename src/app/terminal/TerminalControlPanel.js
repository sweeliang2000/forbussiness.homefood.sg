'use client';
import { useState } from 'react';
import { Button, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { IoAdd, IoRemove, IoBackspace } from 'react-icons/io5';
import styles from './TerminalControlPanel.module.css';

const MODE_STAMP_INCREMENT = 'stamp';
// const MODE_MONEY_SPEND = 'money'; // Disabled for now
const STAMPS_PER_DOLLAR = 5;

const TerminalControlPanel = ({ phoneNumber, shopId, expirationType, numberOfDaysToExpire, onSuccess, performedBy, performedByName, selectedReward, onRewardRedeemed }) => {
    const [mode, setMode] = useState(MODE_STAMP_INCREMENT);
    const [value, setValue] = useState('0');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [notes, setNotes] = useState('');
    const [showNotes, setShowNotes] = useState(false);

    // Mode change disabled - only stamp increment available
    // const handleModeChange = (event, newMode) => {
    //     if (newMode !== null) {
    //         setMode(newMode);
    //         // Reset value when switching modes
    //         setValue('0');
    //     }
    // };

    const handleIncrement = () => {
        const numValue = parseFloat(value) || 0;
        setValue((numValue + 1).toString());
    };

    const handleDecrement = () => {
        const numValue = parseFloat(value) || 0;
        setValue((numValue - 1).toString());
    };

    const handleTextFieldChange = (event) => {
        let inputValue = event.target.value;
        
        // Allow empty string, negative numbers, or valid numbers
        // Pattern: optional minus sign, followed by digits
        if (inputValue === '' || /^-?\d*$/.test(inputValue)) {
            // If empty, set to '0', otherwise use the cleaned value
            setValue(inputValue === '' ? '0' : inputValue);
        }
    };

    const handleNumberPadClick = (digit) => {
        // If value is '0' or empty, replace it with the digit
        if (value === '0' || value === '') {
            setValue(digit);
        } else {
            setValue(value + digit);
        }
    };

    const handleDecimalClick = () => {
        if (!value.includes('.')) {
            setValue(value + '.');
        }
    };

    const handleBackspace = () => {
        if (value.length > 1) {
            setValue(value.slice(0, -1));
        } else {
            setValue('0');
        }
    };

    const handleClear = () => {
        setValue('0');
    };

    const handleConfirm = async () => {
        const numValue = parseFloat(value) || 0;
        const stampChange = Math.floor(numValue);

        console.log('Confirm pressed:', {
            value,
            numValue,
            stampChange,
            phoneNumber,
            shopId,
            expirationType,
            numberOfDaysToExpire
        });

        if (!phoneNumber || !shopId) {
            console.error('Missing required data:', { phoneNumber, shopId });
            setSuccessMessage('Missing phone number or shop ID. Please try again.');
            setShowSuccessAlert(true);
            return;
        }

        setIsSubmitting(true);

        try {
            let stampUpdateSuccess = true;
            let stampResult = null;

            // Only update stamps if stampChange is not 0
            if (stampChange !== 0) {
                const requestBody = {
                    shop_id: shopId,
                    phone_number: phoneNumber,
                    stamp_change: stampChange,
                    expirationType: expirationType,
                    numberOfDaysToExpire: numberOfDaysToExpire,
                    performed_by: performedBy,
                    performed_by_name: performedByName,
                    notes: notes.trim() || null
                };

                console.log('Sending request:', requestBody);

                const response = await fetch('/api/terminal/stamps', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody)
                });

                console.log('Response status:', response.status);

                stampResult = await response.json();
                console.log('Response data:', stampResult);

                if (!response.ok) {
                    console.error('Error updating stamps:', stampResult);
                    setSuccessMessage(`Error: ${stampResult.error || 'Failed to update stamps'}`);
                    setShowSuccessAlert(true);
                    setIsSubmitting(false);
                    return;
                }

                console.log('Stamps updated successfully:', stampResult);
                stampUpdateSuccess = true;
            } else {
                console.log('Skipping stamp update - stampChange is 0');
            }

            // If a reward is selected, update its status to 'Redeemed'
            if (selectedReward && selectedReward.id) {
                try {
                    console.log('Updating selected reward status to Redeemed:', selectedReward.id);
                    const rewardResponse = await fetch('/api/terminal/user-rewards', {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            reward_id: selectedReward.id
                        })
                    });

                    const rewardResult = await rewardResponse.json();
                    
                    if (!rewardResponse.ok) {
                        console.error('Error updating reward status:', rewardResult);
                        // Update error message if reward redemption failed
                        if (stampUpdateSuccess) {
                            setSuccessMessage(`Stamps updated, but failed to redeem reward: ${rewardResult.error || 'Unknown error'}`);
                        } else {
                            setSuccessMessage(`Failed to redeem reward: ${rewardResult.error || 'Unknown error'}`);
                        }
                        setShowSuccessAlert(true);
                        setIsSubmitting(false);
                        return;
                    } else {
                        console.log('Reward status updated to Redeemed successfully:', rewardResult);
                        // Clear selected reward and refresh rewards list
                        if (onRewardRedeemed) {
                            onRewardRedeemed();
                        }
                    }
                } catch (rewardError) {
                    console.error('Error updating reward status:', rewardError);
                    // Update error message if reward redemption failed
                    if (stampUpdateSuccess) {
                        setSuccessMessage(`Stamps updated, but failed to redeem reward: ${rewardError.message}`);
                    } else {
                        setSuccessMessage(`Failed to redeem reward: ${rewardError.message}`);
                    }
                    setShowSuccessAlert(true);
                    setIsSubmitting(false);
                    return;
                }
            }
            
            // Show success alert on screen
            let message = '';
            if (stampChange !== 0 && stampResult) {
                if (stampResult.wasLimited) {
                    if (stampResult.actualChange === 0) {
                        // Cannot redeem - would go below 0
                        message = `Cannot decrease stamps below 0. Customer has insufficient stamps.`;
                    } else {
                        // Partial redemption
                        message = `Stamps decreased by ${Math.abs(stampResult.actualChange)}. Cannot decrease below 0 (requested: ${Math.abs(stampChange)}).`;
                    }
                } else if (stampChange < 0) {
                    message = `${Math.abs(stampResult.actualChange)} stamp${Math.abs(stampResult.actualChange) !== 1 ? 's' : ''} redeemed successfully!`;
                } else {
                    message = 'Stamps given successfully!';
                }
            }
            
            // If reward is selected, add reward redemption message
            if (selectedReward && selectedReward.id) {
                if (message) {
                    message += ' Reward redeemed successfully!';
                } else {
                    message = 'Reward redeemed successfully!';
                }
            } else if (!message) {
                message = 'Operation completed successfully!';
            }
            
            setSuccessMessage(message);
            setShowSuccessAlert(true);
            
            // Reset value and notes after successful submission
            setValue('0');
            setNotes('');
            setShowNotes(false);
        } catch (error) {
            console.error('Error submitting stamps:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack
            });
            setSuccessMessage(`Failed to update stamps: ${error.message}`);
            setShowSuccessAlert(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChangeCustomer = () => {
        setShowSuccessAlert(false);
        setSuccessMessage('');
        if (onSuccess) {
            onSuccess();
        }
    };

    const handleDismissAlert = () => {
        setShowSuccessAlert(false);
        setSuccessMessage('');
    };

    // Calculate stamp change - can be positive (add) or negative (remove)
    const numValue = parseFloat(value) || 0;
    const stampChange = Math.floor(numValue);
    
    // Button is enabled if:
    // - Not submitting
    // - Has phone number and shop ID
    // - Either stamp change is not 0 OR a reward is selected
    const isButtonDisabled = isSubmitting || !phoneNumber || !shopId || (stampChange === 0 && !selectedReward);
    if (process.env.NODE_ENV === 'development') {
        console.log('Button state:', {
            isSubmitting,
            hasPhoneNumber: !!phoneNumber,
            hasShopId: !!shopId,
            stampChange,
            isButtonDisabled
        });
    }

    return (
        <div className={styles.rightSide}>
            {/* Success Alert */}
            {showSuccessAlert && (
                <div className={styles.successAlert}>
                    <div className={styles.alertContent}>
                        <p className={styles.alertMessage}>{successMessage}</p>
                        <p className={styles.alertQuestion}>Do you want to change customer?</p>
                        <div className={styles.alertButtons}>
                            <Button
                                variant="contained"
                                onClick={handleChangeCustomer}
                                className={styles.alertButton}
                            >
                                Yes, Change Customer
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={handleDismissAlert}
                                className={styles.alertButtonOutlined}
                            >
                                No, Continue
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            <div className={styles.rightContent}>
                {/* Mode Selector - Only Stamp Increment available */}
                <div className={styles.modeSelector}>
                    <ToggleButtonGroup
                        value={MODE_STAMP_INCREMENT}
                        exclusive
                        aria-label="mode selection"
                        fullWidth
                    >
                        <ToggleButton value={MODE_STAMP_INCREMENT} aria-label="stamp increment">
                            Stamp Increment
                        </ToggleButton>
                    </ToggleButtonGroup>
                </div>

                {/* Number Display with +/- Controls */}
                <div className={styles.numberDisplay}>
                    {mode === MODE_STAMP_INCREMENT && (
                        <button
                            className={styles.iconButton}
                            onClick={handleDecrement}
                            aria-label="decrement"
                        >
                            <IoRemove />
                        </button>
                    )}
                    <TextField
                        className={styles.numberInput}
                        variant="outlined"
                        value={value}
                        onChange={handleTextFieldChange}
                        inputProps={{
                            style: {
                                textAlign: 'center',
                                fontSize: '2.5rem',
                                fontWeight: 600,
                                padding: '1rem',
                            },
                            inputMode: 'numeric',
                        }}
                    />
                    {mode === MODE_STAMP_INCREMENT && (
                        <button
                            className={styles.iconButton}
                            onClick={handleIncrement}
                            aria-label="increment"
                        >
                            <IoAdd />
                        </button>
                    )}
                </div>

                {/* Number Pad */}
                <div className={styles.numberPad}>
                    <div className={styles.numberPadRow}>
                        <button className={styles.numberPadButton} onClick={() => handleNumberPadClick('7')}>7</button>
                        <button className={styles.numberPadButton} onClick={() => handleNumberPadClick('8')}>8</button>
                        <button className={styles.numberPadButton} onClick={() => handleNumberPadClick('9')}>9</button>
                    </div>
                    <div className={styles.numberPadRow}>
                        <button className={styles.numberPadButton} onClick={() => handleNumberPadClick('4')}>4</button>
                        <button className={styles.numberPadButton} onClick={() => handleNumberPadClick('5')}>5</button>
                        <button className={styles.numberPadButton} onClick={() => handleNumberPadClick('6')}>6</button>
                    </div>
                    <div className={styles.numberPadRow}>
                        <button className={styles.numberPadButton} onClick={() => handleNumberPadClick('1')}>1</button>
                        <button className={styles.numberPadButton} onClick={() => handleNumberPadClick('2')}>2</button>
                        <button className={styles.numberPadButton} onClick={() => handleNumberPadClick('3')}>3</button>
                    </div>
                    <div className={styles.numberPadRow}>
                        <button className={`${styles.numberPadButton} ${styles.operatorButton}`} onClick={handleClear}>C</button>
                        <button className={styles.numberPadButton} onClick={() => handleNumberPadClick('0')}>0</button>
                        {/* Money mode disabled - always show backspace */}
                        <button className={`${styles.numberPadButton} ${styles.operatorButton}`} onClick={handleBackspace}>
                            <IoBackspace />
                        </button>
                    </div>
                </div>

                {/* Display Section */}
                <div className={styles.moneyDisplay}>
                    <div className={styles.stampsInfo}>
                        <span className={styles.label}>
                            {stampChange >= 0 ? 'Stamps to Add:' : 'Stamps to Remove:'}
                        </span>
                        <span className={styles.stamps}>{Math.abs(stampChange)}</span>
                    </div>
                </div>

                {/* Selected Reward Display */}
                {selectedReward && (
                    <div className={styles.selectedRewardSection}>
                        <div className={styles.selectedRewardHeader}>
                            <span className={styles.selectedRewardLabel}>Selected Reward:</span>
                        </div>
                        <div className={styles.selectedRewardContent}>
                            <h4 className={styles.selectedRewardName}>
                                {selectedReward.reward_name || 'Unnamed Reward'}
                            </h4>
                            {selectedReward.expiry_date && (
                                <p className={styles.selectedRewardExpiry}>
                                    Expires: {new Date(selectedReward.expiry_date).toLocaleDateString()}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Notes Section */}
                <div className={styles.notesSection}>
                    <button
                        type="button"
                        className={styles.notesToggle}
                        onClick={() => setShowNotes(!showNotes)}
                    >
                        <span>Notes {showNotes ? '▼' : '▶'}</span>
                    </button>
                    {showNotes && (
                        <div className={styles.notesInputContainer}>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                placeholder="Add notes (optional)"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                variant="outlined"
                                className={styles.notesInput}
                            />
                        </div>
                    )}
                </div>

                {/* Confirm Button */}
                <div className={styles.confirmButton}>
                    <Button
                        type="button"
                        variant="contained"
                        fullWidth
                        size="large"
                        onClick={handleConfirm}
                        disabled={isButtonDisabled}
                        className={styles.button}
                    >
                        {isSubmitting ? 'Processing...' : 'Confirm'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default TerminalControlPanel;

