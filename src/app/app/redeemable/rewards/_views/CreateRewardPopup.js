'use client';
import styles from './CreateRewardPopup.module.css';
import DialogPopup from '@/components/DialogPopup/DialogPopup';
import FieldHeader from '@/components/FieldHeader/FieldHeader';
import DragDropImageUploader from '@/components/Form Components/DragDropImageUploader/DragDropImageUploader';
import FormTextField from '@/components/Form Components/FormTextField/FormTextField';
import FullWidthDropdown from '@/components/FullWidthDropdown/FullWidthDropdown';
import { InputAdornment } from '@mui/material';
import { useEffect, useState } from 'react';
import Switch from '@mui/material/Switch';

const NEW_JOIN = { value: 'newJoin', title: 'New Join' }
const STAMP_REWARD = { value: 'stampReward', title: 'Stamp Reward' }
const REWARD_TYPES = [
    STAMP_REWARD,
    // NEW_JOIN
];
const EXPIRY_TYPE = [
    { value: 'noExpiry', title: 'No Expiry' },
    { value: 'expiryInDays', title: 'Expiry in Days' }
]

const REWARD_ID_KEY = 'id';
const REWARD_TYPE_KEY = 'type';
const REWARD_NAME_KEY = 'name';
const REWARD_DESCRIPTION_KEY = 'description';
const REWARD_IMAGE_KEY = 'image';
const REWARD_EXPIRY_TYPE_KEY = 'expiry_type';
const REWARD_EXPIRY_KEY = 'expiry';
const REWARD_CUSTOM_ID_KEY = 'custom_id';
const REWARD_TAGS_KEY = 'tags'
const REWARD_IS_ACTIVATE = 'is_activate'

const CreateRewardPopup = ({
    isOpen,
    setIsOpen,
    onClose,
    selectedReward,
    onArchive,
    onSubmit
}) => {
    const [isRewardImageOpen, setIsRewardImageOpen] = useState(false);
    const [isExpiryOpen, setIsExpiryOpen] = useState(false);
    const [isRewardIdOpen, setRewardIdOpen] = useState(false);
    const [isRewardTagsOpen, setIsRewardTagOpen] = useState(false);
    const [rewardImage, setRewardImage] = useState([]);

    const [rewardData, setRewardData] = useState({
        [REWARD_ID_KEY]: '',
        [REWARD_TYPE_KEY]: 'stampReward',
        [REWARD_NAME_KEY]: '',
        [REWARD_DESCRIPTION_KEY]: '',
        [REWARD_EXPIRY_TYPE_KEY]: 'expiryInDays',
        [REWARD_CUSTOM_ID_KEY]: '',
        [REWARD_TAGS_KEY]: '',
        [REWARD_IS_ACTIVATE]: false
    });

    const updateValue = (key, value) => {
        setRewardData((prevValue) => ({ ...prevValue, [key]: value }))
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        // Basic validation
        if (!rewardData.name || !rewardData.description) {
            alert('Please fill in all required fields (Reward name and Description)');
            return;
        }

        // Prepare form data with image for both create and update
        const formDataWithImage = {
            ...rewardData,
            image: rewardImage.length > 0 ? rewardImage[0] : null
        };
        
        // Debug: log the image data structure
        console.log('Image data:', rewardImage);
        console.log('Form data with image:', formDataWithImage);
        console.log('Is update mode:', selectedReward !== null);
        
        // Call the parent's onSubmit function with the form data
        if (onSubmit) {
            await onSubmit(formDataWithImage);
        }
        console.log(rewardData)
    }

    useEffect(() => {
        if (selectedReward !== null) {
            setRewardData(prev => ({
                ...prev,
                [REWARD_TYPE_KEY]: selectedReward.type,
                [REWARD_NAME_KEY]: selectedReward.name,
                [REWARD_DESCRIPTION_KEY]: selectedReward.description,
                [REWARD_EXPIRY_KEY]: selectedReward.expiry === undefined ? '' : selectedReward.expiry,
                [REWARD_CUSTOM_ID_KEY]: selectedReward.custom_id === undefined ? '' : selectedReward.custom_id,
                [REWARD_TAGS_KEY]: selectedReward.tags === undefined ? '' : selectedReward.tags,
                [REWARD_IS_ACTIVATE]: selectedReward.is_activate === undefined ? false : selectedReward.is_activate
            }));

            setRewardImage(
                selectedReward.image === undefined ?
                    [] :
                    [{ url: selectedReward.image.url, name: selectedReward.name }]
            )

            setIsExpiryOpen(selectedReward.expiry !== undefined)
            setRewardIdOpen(selectedReward.custom_id !== undefined)
            setIsRewardTagOpen(selectedReward.tags !== undefined)
            setIsRewardImageOpen(true)
        } else {
            setRewardData({
                [REWARD_ID_KEY]: '',
                [REWARD_TYPE_KEY]: 'stampReward',
                [REWARD_NAME_KEY]: '',
                [REWARD_DESCRIPTION_KEY]: '',
                [REWARD_EXPIRY_TYPE_KEY]: 'expiryInDays',
                [REWARD_EXPIRY_KEY]: '',
                [REWARD_CUSTOM_ID_KEY]: '',
                [REWARD_TAGS_KEY]: '',
                [REWARD_IS_ACTIVATE]: false
            })
            setRewardImage([])
            setIsExpiryOpen(false)
            setRewardIdOpen(false)
            setIsRewardTagOpen(false)
            setIsRewardImageOpen(false)
        }
    }, [selectedReward]);


    return (
        <DialogPopup
            title={selectedReward !== null ? 'Modify Reward' : 'Create New Reward'}
            actionTitle={selectedReward !== null ? 'Save' : 'Create'}
            deleteText={'Archive'}
            onDelete={onArchive}
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            PaperProps={{
                sx: {
                    minHeight: '70vh',
                    maxHeight: '70vh',
                },
            }}
            onSubmit={handleSubmit}
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
                        onChange={(event) => { 
                            updateValue(REWARD_TYPE_KEY, event.target.value) 
                        }}
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
                            images={rewardImage}
                            setImages={setRewardImage}
                            noOfImages={1}
                            width={200}
                            height={200}
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
                            isExpiryOpen && <FullWidthDropdown
                                options={EXPIRY_TYPE}
                                labelId='reward_type'
                                id='reward_type'
                                value={rewardData[REWARD_EXPIRY_TYPE_KEY]}
                                onChange={(event) => { updateValue(REWARD_EXPIRY_TYPE_KEY, event.target.value) }}
                                className={styles.field}
                            />
                        }

                        {
                            (isExpiryOpen && rewardData[REWARD_EXPIRY_TYPE_KEY] === 'expiryInDays') && <FormTextField
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