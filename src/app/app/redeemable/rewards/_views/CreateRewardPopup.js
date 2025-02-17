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

const REWARD_ID_KEY = 'id';
const REWARD_TYPE_KEY = 'type';
const REWARD_NAME_KEY = 'name';
const REWARD_DESCRIPTION_KEY = 'description';
const REWARD_IMAGE_KEY = 'image';
const REWARD_EXPIRY_KEY = 'expiry';
const REWARD_CUSTOM_ID_KEY = 'custom_id';
const REWARD_TAGS_KEY = 'tags'
const REWARD_IS_ACTIVATE = 'is_activate'

const CreateRewardPopup = ({
    isOpen,
    setIsOpen
}) => {
    const [isRewardImageOpen, setIsRewardImageOpen] = useState(false);
    const [isExpiryOpen, setIsExpiryOpen] = useState(false);
    const [isRewardIdOpen, setRewardIdOpen] = useState(false);
    const [isRewardTagsOpen, setIsRewardTagOpen] = useState(false);

    const [rewardData, setRewardData] = useState({
        [REWARD_ID_KEY]: '',
        [REWARD_TYPE_KEY]: '',
        [REWARD_NAME_KEY]: '',
        [REWARD_DESCRIPTION_KEY]: '',
        [REWARD_IMAGE_KEY]: '',
        [REWARD_EXPIRY_KEY]: '',
        [REWARD_CUSTOM_ID_KEY]: '',
        [REWARD_TAGS_KEY]: '',
        [REWARD_IS_ACTIVATE]: false
    });

    const updateValue = (key, value) => {
        setRewardData((prevValue) => ({ ...prevValue, [key]: value}))
    };

    const onSubmit = (event) => {
        event.preventDefault();
        console.log('Submit Form. Data:')
        console.log(rewardData)
    }

    return (
        <DialogPopup
            title='Create New Reward'
            actionTitle='Create'
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            PaperProps={{
                sx: {
                    minHeight: '70vh',
                    maxHeight: '70vh',
                },
            }}
            onSubmit={onSubmit}
        >
            <div className={styles.content}>
                <section>
                    <FieldHeader
                        title='Reward type*'
                        description='There are different reward for different purposes. Click here to understand more.'
                        type='h2'
                        hClassName={styles.h2}
                    />

                    <FullWidthDropdown
                        options={REWARD_TYPES}
                        labelId='reward_type'
                        id='reward_type'
                        value={rewardData[REWARD_TYPE_KEY]}
                        onChange={(event) => { updateValue(REWARD_TYPE_KEY, event.target.value) }}
                    />
                </section>

                <FormTextField
                    title='Reward name*'
                    subtitle='The name of the reward to be shown in-app. Keep it short and clear.'
                    id='reward_name'
                    name='reward_name'
                    helperText={''}
                    error={false}
                    value={rewardData[REWARD_NAME_KEY]}
                    onChange={(event) => { updateValue(REWARD_NAME_KEY, event.target.value) }}
                />

                <FormTextField
                    title='Description*'
                    subtitle='Provide a details instruction of the reward and what is minimum requirement to use.'
                    id='description'
                    name='description'
                    helperText={''}
                    error={false}
                    value={rewardData[REWARD_DESCRIPTION_KEY]}
                    onChange={(event) => { updateValue(REWARD_DESCRIPTION_KEY, event.target.value) }}
                />

                <section>
                    <div className={styles.withToggleContainer}>
                        <FieldHeader
                            title='Reward image'
                            description='(Optional) An image or icon to display on the in-app. It is useful to identify your reward.'
                            type='h2'
                            hClassName={styles.h2}
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

                <section className={styles.settingSection}>
                    <FieldHeader
                        title='Settings'
                        type='h2'
                    />

                    <div>
                        <div className={styles.withToggleContainer}>
                            <FieldHeader
                                title='Expiry'
                                description='The period of time the reward voucher should expire after (disappear from the user&#39;s app), calculated from when it is issued to the member. '
                                type='h2'
                                hClassName={styles.h2}
                            />

                            <Switch
                                size='small'
                                checked={isExpiryOpen}
                                onChange={() => { setIsExpiryOpen((prev) => !prev) }}
                            />
                        </div>

                        {
                            isExpiryOpen && <FormTextField
                                id={REWARD_EXPIRY_KEY}
                                name={REWARD_EXPIRY_KEY}
                                helperText={''}
                                error={false}
                                type='number'
                                slotProps={{
                                    input: {
                                        endAdornment: <InputAdornment position="end">days</InputAdornment>,
                                    },
                                }}
                                className={styles.field}
                                value={rewardData[REWARD_EXPIRY_KEY]}
                                onChange={(event) => { updateValue(REWARD_EXPIRY_KEY, event.target.value) }}
                            />
                        }
                    </div>

                    <div className={styles.settingContainer}>
                        <div className={styles.withToggleContainer}>
                            <FieldHeader
                                title='Reward ID'
                                description='(Optional) A unique alphanumeric ID that is used for reporting and analytics. After you use a reward ID for one product, it can&#39;t be used again.'
                                type='h2'
                                hClassName={styles.h2}
                            />

                            <Switch
                                size='small'
                                checked={isRewardIdOpen}
                                onChange={() => { setRewardIdOpen((prev) => !prev) }}
                            />
                        </div>

                        {
                            isRewardIdOpen && <FormTextField
                                id={REWARD_CUSTOM_ID_KEY}
                                name={REWARD_CUSTOM_ID_KEY}
                                helperText={''}
                                error={false}
                                className={styles.field}
                                value={rewardData[REWARD_CUSTOM_ID_KEY]}
                                onChange={(event) => { updateValue(REWARD_CUSTOM_ID_KEY, event.target.value) }}
                            />
                        }

                    </div>

                    <div className={styles.settingContainer}>
                        <div className={styles.withToggleContainer}>
                            <FieldHeader
                                title='Reward Tags'
                                description='(Optional) This tag is used for grouping and useful for your reporting and analytics. It doesn&#39;t need to be unique. Separate each tag by commas.'
                                type='h2'
                                hClassName={styles.h2}
                            />

                            <Switch
                                size='small'
                                checked={isRewardTagsOpen}
                                onChange={() => { setIsRewardTagOpen((prev) => !prev) }}
                            />
                        </div>

                        {
                            isRewardTagsOpen && <FormTextField
                                id={REWARD_TAGS_KEY}
                                name={REWARD_TAGS_KEY}
                                helperText={''}
                                error={false}
                                className={styles.field}
                                value={rewardData[REWARD_TAGS_KEY]}
                                onChange={(event) => { updateValue(REWARD_TAGS_KEY, event.target.value) }}
                            />
                        }
                    </div>

                    { 
                        rewardData[REWARD_TYPE_KEY] === NEW_JOIN.value && <div className={`${styles.withToggleContainer} ${styles.settingContainer}`}>
                            <FieldHeader
                                title='Activate*'
                                description='For event trigger rewards like new join or birthday, you need to activate it. Once it is activated and published, user are able to get rewarded.'
                                type='h2'
                                hClassName={styles.h2}
                            />

                            <Switch
                                size='small'
                                checked={rewardData[REWARD_IS_ACTIVATE]}
                                onChange={(_, checked) => { updateValue(REWARD_IS_ACTIVATE, checked) }}
                            />
                        </div> 
                    }
                </section>
            </div>
        </DialogPopup>
    )
};

export default CreateRewardPopup;