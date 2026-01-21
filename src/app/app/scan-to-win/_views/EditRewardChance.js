'use client';
import FieldHeader from '@/components/FieldHeader/FieldHeader';
import styles from './EditRewardChance.module.css';
import { Button, Dialog, TextField, FormControlLabel, Switch } from '@mui/material';
import { IoCloseSharp } from 'react-icons/io5';
import { IoMdAdd } from "react-icons/io";
import { IoMdRemove } from "react-icons/io";
import AddNewReward from '@/app/app/stamp-management/StampSetup/_views/AddNewReward';
import { useState, useEffect } from 'react';
import RewardCard from '@/app/app/redeemable/rewards/_views/RewardCard';
import FormTextField from '@/components/Form Components/FormTextField/FormTextField';

const DEFAULT_REWARD_CHANCE = {
  id: null,
  reward: null,
  percentage: 0,
  max: null,
};

const EditRewardChance = ({
    isOpen,
    setIsOpen,
    rewardChance,
    onSave,
    isEdit = true
}) => {
    const [isAddNewRewardOpen, setIsAddNewRewardOpen] = useState(false);
    const [reward, setReward] = useState(null);
    const [percentage, setPercentage] = useState(0);
    const [max, setMax] = useState(null);
    const [isMaxEnabled, setIsMaxEnabled] = useState(false);

    useEffect(() => {
        if (rewardChance) {
            setReward(rewardChance.reward || null);
            setPercentage(rewardChance.percentage || 0);
            const maxValue = rewardChance.max !== undefined ? rewardChance.max : null;
            setMax(maxValue);
            setIsMaxEnabled(maxValue !== null && maxValue !== undefined);
        } else {
            // Reset to defaults when opening for new entry
            setReward(null);
            setPercentage(0);
            setMax(null);
            setIsMaxEnabled(false);
        }
    }, [rewardChance, isOpen]);

    const closeHandler = () => {
        setIsOpen(false);
        // Reset form when closing
        setReward(null);
        setPercentage(0);
        setMax(null);
        setIsMaxEnabled(false);
    };

    const handleMaxToggle = (event) => {
        const enabled = event.target.checked;
        setIsMaxEnabled(enabled);
        if (!enabled) {
            setMax(null);
        }
    };

    const onAddNewReward = () => {
        if (!isEdit) return;
        setIsAddNewRewardOpen(true);
    };

    const onNewRewardSaved = (newReward) => {
        setReward(newReward);
    };

    const onRemoveReward = () => {
        if (!isEdit) return;
        setReward(null);
    };

    const handleSave = () => {
        const chanceToSave = rewardChance ? {
            ...rewardChance,
            reward: reward,
            percentage: parseFloat(percentage) || 0,
            max: max,
        } : {
            ...DEFAULT_REWARD_CHANCE,
            id: null, // Will be assigned by parent when saving
            reward: reward,
            percentage: parseFloat(percentage) || 0,
            max: max,
        };
        
        onSave(chanceToSave);
    };

    return (
        <>
            <Dialog
                open={isOpen}
                onClose={closeHandler}
                fullWidth
            >
                <div className={styles.header}>
                    <h1>{rewardChance && rewardChance.id !== null && rewardChance.id !== undefined ? 'Modify Reward Chance' : 'Add Reward Chance'}</h1>
                    <IoCloseSharp className={styles.closeIcon} onClick={closeHandler} />
                </div>

                <div className={styles.content}>
                    <div className={`${styles.field} ${styles.start}`}>
                        <FieldHeader
                            title='Reward'
                            type='h2'
                            hClassName={styles.title}
                        />

                        <div className={styles.rewardButtons}>
                            <Button variant="outlined" className={styles.addBtn} onClick={onAddNewReward} disabled={!isEdit}>
                                {reward === null ? <><IoMdAdd /> New Reward </> : 'Modify'}
                            </Button>
                            
                            {reward && (
                                <Button 
                                    variant="outlined" 
                                    className={styles.removeBtn} 
                                    onClick={onRemoveReward}
                                    color="error"
                                    disabled={!isEdit}
                                >
                                    <IoMdRemove /> Remove Reward
                                </Button>
                            )}
                        </div>

                        {reward && <div className={styles.rewardDiv}> 
                            <RewardCard 
                                reward={reward}
                                disableTags={true} 
                                onClick={onAddNewReward}/> 
                        </div>}
                    </div>

                    <div className={styles.field}>
                        <FormTextField
                            title='Percentage'
                            subtitle='The percentage chance of winning this reward (must total 100% across all chances)'
                            placeholder='0'
                            type='number'
                            id='percentage'
                            name='percentage'
                            helperText={''}
                            error={false}
                            value={percentage}
                            disabled={!isEdit}
                            InputProps={{ inputProps: { min: 0, max: 100, step: 0.01 } }}
                            onChange={(event) => {
                                const value = Math.max(0, Math.min(100, parseFloat(event.target.value) || 0));
                                setPercentage(value);
                            }}
                        />
                    </div>

                    <div className={styles.field}>
                        <div className={styles.maxToggleContainer}>
                            <FieldHeader
                                title='Max (Optional)'
                                description='Maximum number of times this reward can be won. Leave empty for unlimited.'
                                type='h3'
                            />
                            <Switch
                                checked={isMaxEnabled}
                                onChange={handleMaxToggle}
                                disabled={!isEdit}
                                size='small'
                            />
                        </div>
                        {isMaxEnabled && (
                            <FormTextField
                                title=''
                                subtitle=''
                                placeholder=''
                                type='number'
                                id='max'
                                name='max'
                                helperText={''}
                                error={false}
                                value={max !== null && max !== undefined ? max : ''}
                                disabled={!isEdit}
                                InputProps={{ inputProps: { min: 1, step: 1 } }}
                                onChange={(event) => {
                                    const value = event.target.value === '' ? null : Math.max(1, parseInt(event.target.value) || 1);
                                    setMax(value);
                                }}
                            />
                        )}
                    </div>
                </div>

                <div className={styles.footer}>
                    <Button
                        variant='contained'
                        className={`${styles.button} ${styles.cancel}`}
                        onClick={closeHandler}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant='contained'
                        className={styles.button}
                        onClick={handleSave}
                        disabled={!isEdit}
                    >
                        Save
                    </Button>
                </div>
            </Dialog>

            <AddNewReward
                isOpen={isAddNewRewardOpen}
                setIsOpen={setIsAddNewRewardOpen}
                onSave={onNewRewardSaved}
                currentReward={reward}
                restrictToScanToWin={true}
            />
        </>
    );
};

export default EditRewardChance;
