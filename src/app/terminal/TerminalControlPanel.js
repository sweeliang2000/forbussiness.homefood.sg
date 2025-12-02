'use client';
import { useState } from 'react';
import { Button, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { IoAdd, IoRemove, IoBackspace } from 'react-icons/io5';
import styles from './TerminalControlPanel.module.css';

const MODE_STAMP_INCREMENT = 'stamp';
const MODE_MONEY_SPEND = 'money';
const STAMPS_PER_DOLLAR = 5;

const TerminalControlPanel = () => {
    const [mode, setMode] = useState(MODE_STAMP_INCREMENT);
    const [value, setValue] = useState('0');

    const handleModeChange = (event, newMode) => {
        if (newMode !== null) {
            setMode(newMode);
            // Reset value when switching modes
            setValue('0');
        }
    };

    const handleIncrement = () => {
        const numValue = parseFloat(value) || 0;
        setValue((numValue + 1).toString());
    };

    const handleDecrement = () => {
        const numValue = parseFloat(value) || 0;
        setValue(Math.max(0, numValue - 1).toString());
    };

    const handleTextFieldChange = (event) => {
        let inputValue = event.target.value;
        
        // Remove $ and spaces if in money mode
        if (mode === MODE_MONEY_SPEND) {
            inputValue = inputValue.replace(/[$,\s]/g, '');
        }
        
        // Allow empty string or valid numbers
        if (inputValue === '' || /^\d*\.?\d*$/.test(inputValue)) {
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

    const handleConfirm = () => {
        // TODO: Implement confirm logic
        const numValue = parseFloat(value) || 0;
        console.log('Mode:', mode);
        console.log('Value:', numValue);
        if (mode === MODE_MONEY_SPEND) {
            console.log('Money Spent:', numValue);
            console.log('Stamps to give:', Math.floor(numValue / STAMPS_PER_DOLLAR));
        } else {
            console.log('Stamps to add:', Math.floor(numValue));
        }
    };

    // Calculate stamps and money display
    const numValue = parseFloat(value) || 0;
    const moneyAmount = mode === MODE_MONEY_SPEND ? numValue : 0;
    // In Money Spend mode: calculate stamps from money, in Stamp Increment mode: use the value directly
    const stampsToGive = mode === MODE_MONEY_SPEND 
        ? Math.floor(numValue / STAMPS_PER_DOLLAR) 
        : Math.floor(numValue);

    return (
        <div className={styles.rightSide}>
            <div className={styles.rightContent}>
                {/* Mode Selector */}
                <div className={styles.modeSelector}>
                    <ToggleButtonGroup
                        value={mode}
                        exclusive
                        onChange={handleModeChange}
                        aria-label="mode selection"
                        fullWidth
                    >
                        <ToggleButton value={MODE_STAMP_INCREMENT} aria-label="stamp increment">
                            Stamp Increment
                        </ToggleButton>
                        <ToggleButton value={MODE_MONEY_SPEND} aria-label="money spend">
                            Money Spend
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
                        value={mode === MODE_MONEY_SPEND ? (value === '0' ? '$0' : `$${value}`) : value}
                        onChange={handleTextFieldChange}
                        inputProps={{
                            style: {
                                textAlign: 'center',
                                fontSize: '2.5rem',
                                fontWeight: 600,
                                padding: '1rem',
                            },
                            inputMode: 'decimal',
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
                        {mode === MODE_MONEY_SPEND ? (
                            <button className={`${styles.numberPadButton} ${styles.operatorButton}`} onClick={handleDecimalClick}>.</button>
                        ) : (
                            <button className={`${styles.numberPadButton} ${styles.operatorButton}`} onClick={handleBackspace}>
                                <IoBackspace />
                            </button>
                        )}
                    </div>
                </div>

                {/* Display Section */}
                <div className={styles.moneyDisplay}>
                    {mode === MODE_MONEY_SPEND && (
                        <div className={styles.moneyInfo}>
                            <span className={styles.label}>Money Spent:</span>
                            <span className={styles.amount}>${moneyAmount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className={styles.stampsInfo}>
                        <span className={styles.label}>Stamps to Give:</span>
                        <span className={styles.stamps}>{stampsToGive}</span>
                    </div>
                </div>

                {/* Confirm Button */}
                <div className={styles.confirmButton}>
                    <Button
                        variant="contained"
                        fullWidth
                        size="large"
                        onClick={handleConfirm}
                        className={styles.button}
                    >
                        Confirm
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default TerminalControlPanel;

