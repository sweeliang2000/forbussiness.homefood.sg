'use client';
import styles from './CreateRewardPopup.module.css';
import DialogPopup from '@/components/DialogPopup/DialogPopup';
import FieldHeader from '@/components/FieldHeader/FieldHeader';
import DragDropImageUploader from '@/components/Form Components/DragDropImageUploader/DragDropImageUploader';
import FormTextField from '@/components/Form Components/FormTextField/FormTextField';
import FullWidthDropdown from '@/components/FullWidthDropdown/FullWidthDropdown';
import { InputAdornment } from '@mui/material';
import { useState } from 'react';
import Switch from '@mui/material/Switch';

const NEW_JOIN = { value: 'newJoin', title: 'New Join' }
const STAMP_REWARD = { value: 'stampReward', title: 'Stamp Reward' }
const REWARD_TYPES = [
    STAMP_REWARD,
    NEW_JOIN
];

const CreateRewardPopup = ({
    isOpen,
    setIsOpen
}) => {
    const [isRewardImageOpen, setIsRewardImageOpen] = useState(false);
    const [isExpiryOpen, setIsExpiryOpen] = useState(false);
    const [isRewardIdOpen, setRewardIdOpen] = useState(false);
    const [isRewardTagsOpen, setIsRewardTagOpen] = useState(false);

    const [rewardType, setRewardType] = useState('');

    return (
        <DialogPopup
            title='Create New Reward'
            actionTitle='Create'
            isOpen={isOpen}
            setIsOpen={setIsOpen}
        >
            <div className={styles.content}>
                <section>
                    <FieldHeader
                        title='Reward type*'
                        description='There are different reward for different purposes. Click here to understand more.'
                        type='h3'
                    />

                    <FullWidthDropdown
                        options={REWARD_TYPES}
                        labelId='reward_type'
                        id='reward_type'
                        value={rewardType}
                        onChange={(event) => { setRewardType(event.target.value) }}
                    />
                </section>

                <FormTextField
                    title='Reward name*'
                    subtitle='The name of the reward to be shown in-app. Keep it short and clear.'
                    id='reward_name'
                    name='reward_name'
                    helperText={''}
                    error={false}
                //   value={numberOfStamps}
                //   onChange={(event) => { numberOfStampsHandler(event) }}
                />

                <FormTextField
                    title='Description*'
                    subtitle='Provide a details instruction of the reward and what is minimum requirement to use.'
                    id='description'
                    name='description'
                    helperText={''}
                    error={false}
                //   value={numberOfStamps}
                //   onChange={(event) => { numberOfStampsHandler(event) }}
                />

                <section>
                    <div className={styles.withToggleContainer}>
                        <FieldHeader
                            title='Reward image'
                            description='(Optional) An image or icon to display on the in-app. It is useful to identify your reward.'
                            type='h3'
                        />

                        <Switch
                            size='small'
                            checked={isRewardImageOpen}
                            onChange={() => { setIsRewardImageOpen((prev) => !prev) }}
                        />
                    </div>

                    {
                        isRewardImageOpen && <DragDropImageUploader
                            images={[]}
                            // setImages={setDefaultStampedIcon}
                            noOfImages={1}
                            width={100}
                            height={100}
                            imageClassName={styles.dragdropBannerImage}
                        />
                    }
                </section>

                <section>
                    <FieldHeader
                        title='Settings'
                        type='h2'
                    />
                </section>

                <section>
                    <div className={styles.withToggleContainer}>
                        <FieldHeader
                            title='Expiry'
                            description='The period of time the reward voucher should expire after (disappear from the user&#39;s app), calculated from when it is issued to the member. '
                            type='h3'
                        />

                        <Switch
                            size='small'
                            checked={isExpiryOpen}
                            onChange={() => { setIsExpiryOpen((prev) => !prev) }}
                        />
                    </div>

                    {
                        isExpiryOpen && <FormTextField
                            id='reward_name'
                            name='reward_name'
                            helperText={''}
                            error={false}
                            type='number'
                            slotProps={{
                                input: {
                                    endAdornment: <InputAdornment position="end">days</InputAdornment>,
                                },
                            }}
                        //   value={numberOfStamps}
                        //   onChange={(event) => { numberOfStampsHandler(event) }}
                        />
                    }
                </section>

                <section>
                    <div className={styles.withToggleContainer}>
                        <FieldHeader
                            title='Reward ID'
                            description='(Optional) A unique alphanumeric ID that is used for reporting and analytics. After you use a reward ID for one product, it can&#39;t be used again.'
                            type='h3'
                        />

                        <Switch
                            size='small'
                            checked={isRewardIdOpen}
                            onChange={() => { setRewardIdOpen((prev) => !prev) }}
                        />
                    </div>

                    {
                        isRewardIdOpen && <FormTextField
                            id='reward_name'
                            name='reward_name'
                            helperText={''}
                            error={false}
                        //   value={numberOfStamps}
                        //   onChange={(event) => { numberOfStampsHandler(event) }}
                        />
                    }

                </section>

                <section>

                    <div className={styles.withToggleContainer}>
                        <FieldHeader
                            title='Reward Tags'
                            description='(Optional) This tag is used for grouping and useful for your reporting and analytics. It doesn&#39;t need to be unique. Separate each tag by commas.'
                            type='h3'
                        />

                        <Switch
                            size='small'
                            checked={isRewardTagsOpen}
                            onChange={() => { setIsRewardTagOpen((prev) => !prev) }}
                        />
                    </div>

                    {
                        isRewardTagsOpen && <FormTextField
                            id='reward_name'
                            name='reward_name'
                            helperText={''}
                            error={false}
                        //   value={numberOfStamps}
                        //   onChange={(event) => { numberOfStampsHandler(event) }}
                        />
                    }
                </section>
            </div>
        </DialogPopup>
    )
};

export default CreateRewardPopup;