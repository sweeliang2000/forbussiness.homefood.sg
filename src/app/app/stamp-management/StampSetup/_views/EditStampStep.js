import FieldHeader from '@/components/FieldHeader/FieldHeader';
import styles from './EditStampStep.module.css';
import { Button, Dialog } from '@mui/material';
import { IoCloseSharp } from 'react-icons/io5';
import { IoMdAdd } from "react-icons/io";
import { IoMdRemove } from "react-icons/io";
import DragDropImageUploader from '@/components/Form Components/DragDropImageUploader/DragDropImageUploader';
import AddNewReward from './AddNewReward';
import { useState } from 'react';
import RewardCard from '@/app/app/redeemable/rewards/_views/RewardCard';

const EditStampStep = ({
    selectedRowId,
    isOpen,
    setIsOpen,
    stampedIcon,
    setStampedIcon,
    unstampIcon,
    setUnstampedIcon,
    reward,
    setReward,
    onSave
}) => {
    const [isAddNewRewardOpen, setIsAddNewRewardOpen] = useState(false);

    const closeHandler = () => {
        setIsOpen(false)
    }

    const onAddNewReward = () => {
        setIsAddNewRewardOpen(true)
    }

    const onNewRewardSaved = (reward) => {
        setReward(reward)
    }

    const onRemoveReward = () => {
        setReward(null)
    }

    return (
        <>
            <Dialog
                open={isOpen}
                onClose={closeHandler}
                fullWidth
            >
                <div className={styles.header}>
                    <h1>Modify stamp step {selectedRowId}</h1>
                    <IoCloseSharp className={styles.closeIcon} onClick={closeHandler} />
                </div>

                <div className={styles.content}>
                    {/* <div className={styles.field}>
                        <FieldHeader
                            title='Stamped Icons'
                            type='h2'
                            hClassName={styles.title}
                        />

                        <DragDropImageUploader
                            images={stampedIcon}
                            setImages={setStampedIcon}
                            noOfImages={1}
                            width={80}
                            height={80}
                            imageClassName={styles.dragdropBannerImage}
                        />
                    </div>

                    <div className={styles.field}>
                        <FieldHeader
                            title='Unstamped Icons'
                            type='h2'
                            hClassName={styles.title}
                        />

                        <DragDropImageUploader
                            images={unstampIcon}
                            setImages={setUnstampedIcon}
                            noOfImages={1}
                            width={80}
                            height={80}
                            imageClassName={styles.dragdropBannerImage}
                        />
                    </div> */}

                    <div className={`${styles.field} ${styles.start}`}>
                        <FieldHeader
                            title='Reward'
                            type='h2'
                            hClassName={styles.title}
                        />

                        <div className={styles.rewardButtons}>
                            <Button variant="outlined" className={styles.addBtn} onClick={onAddNewReward}>
                                {reward === null ? <><IoMdAdd /> New Reward </>: 'Modify'}
                            </Button>
                            
                            {reward && (
                                <Button 
                                    variant="outlined" 
                                    className={styles.removeBtn} 
                                    onClick={onRemoveReward}
                                    color="error"
                                >
                                    <IoMdRemove /> Remove Reward
                                </Button>
                            )}
                        </div>

                        { reward && <div className={styles.rewardDiv}> 
                            <RewardCard 
                                reward={reward}
                                disableTags={true} 
                                onClick={onAddNewReward}/> 
                        </div> }
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
                        onClick={onSave}
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
            />
        </>
    )
};

export default EditStampStep