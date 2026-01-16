'use client';
import styles from './CreateRewardPopup.module.css';
import DialogPopup from '@/components/DialogPopup/DialogPopup';
import FieldHeader from '@/components/FieldHeader/FieldHeader';
import DragDropImageUploader from '@/components/Form Components/DragDropImageUploader/DragDropImageUploader';
import FormTextField from '@/components/Form Components/FormTextField/FormTextField';
import FullWidthDropdown from '@/components/FullWidthDropdown/FullWidthDropdown';
import { InputAdornment } from '@mui/material';
import { useEffect, useState, useRef } from 'react';
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

    // Store initial values to compare for unsaved changes
    const initialRewardDataRef = useRef(null);
    const initialRewardImageRef = useRef(null);
    const initialIsExpiryOpenRef = useRef(null);
    const initialIsRewardIdOpenRef = useRef(null);
    const initialIsRewardTagsOpenRef = useRef(null);
    const initialIsRewardImageOpenRef = useRef(null);

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
            
            // Update initial values after successful save (normalized)
            initialRewardDataRef.current = normalizeRewardData(rewardData);
            initialRewardImageRef.current = JSON.parse(JSON.stringify(rewardImage));
            initialIsExpiryOpenRef.current = isExpiryOpen;
            initialIsRewardIdOpenRef.current = isRewardIdOpen;
            initialIsRewardTagsOpenRef.current = isRewardTagsOpen;
            initialIsRewardImageOpenRef.current = isRewardImageOpen;
        }
        console.log(rewardData)
    }

    // Normalize reward data for comparison (ensure consistent structure)
    const normalizeRewardData = (data) => {
        if (!data) return null;
        return {
            [REWARD_ID_KEY]: data[REWARD_ID_KEY] || '',
            [REWARD_TYPE_KEY]: data[REWARD_TYPE_KEY] || 'stampReward',
            [REWARD_NAME_KEY]: data[REWARD_NAME_KEY] || '',
            [REWARD_DESCRIPTION_KEY]: data[REWARD_DESCRIPTION_KEY] || '',
            [REWARD_EXPIRY_TYPE_KEY]: data[REWARD_EXPIRY_TYPE_KEY] || 'expiryInDays',
            [REWARD_EXPIRY_KEY]: data[REWARD_EXPIRY_KEY] === undefined ? '' : (data[REWARD_EXPIRY_KEY] || ''),
            [REWARD_CUSTOM_ID_KEY]: data[REWARD_CUSTOM_ID_KEY] === undefined ? '' : (data[REWARD_CUSTOM_ID_KEY] || ''),
            [REWARD_TAGS_KEY]: data[REWARD_TAGS_KEY] === undefined ? '' : (data[REWARD_TAGS_KEY] || ''),
            [REWARD_IS_ACTIVATE]: data[REWARD_IS_ACTIVATE] === undefined ? false : data[REWARD_IS_ACTIVATE]
        };
    };

    // Check if there are unsaved changes
    const checkUnsavedChanges = () => {
        if (initialRewardDataRef.current === null) return false; // Not initialized yet
        
        // Normalize and compare reward data
        const normalizedCurrent = normalizeRewardData(rewardData);
        const normalizedInitial = normalizeRewardData(initialRewardDataRef.current);
        const dataChanged = JSON.stringify(normalizedCurrent) !== JSON.stringify(normalizedInitial);
        
        // Check reward image (compare by URL, name, or file presence)
        const normalizeImage = (img) => ({
            url: img?.url || '',
            name: img?.name || '',
            hasFile: !!img?.file
        });
        const imageChanged = JSON.stringify(rewardImage.map(normalizeImage)) !== 
            JSON.stringify((initialRewardImageRef.current || []).map(normalizeImage)) ||
            rewardImage.length !== (initialRewardImageRef.current || []).length;
        
        // Check toggle states
        const togglesChanged = (
            isExpiryOpen !== initialIsExpiryOpenRef.current ||
            isRewardIdOpen !== initialIsRewardIdOpenRef.current ||
            isRewardTagsOpen !== initialIsRewardTagsOpenRef.current ||
            isRewardImageOpen !== initialIsRewardImageOpenRef.current
        );
        
        return dataChanged || imageChanged || togglesChanged;
    };

    // Handle popup close with unsaved changes check
    const handleClose = (value) => {
        if (checkUnsavedChanges()) {
            const confirmed = window.confirm('You have unsaved changes. Are you sure you want to close? Your changes will be lost.');
            if (!confirmed) {
                return; // Don't close if user cancels
            }
        }
        setIsOpen(value);
    };

    useEffect(() => {
        if (!isOpen) return; // Only initialize when popup opens

        if (selectedReward !== null) {
            const loadedData = {
                [REWARD_ID_KEY]: selectedReward.id || '',
                [REWARD_TYPE_KEY]: selectedReward.type || 'stampReward',
                [REWARD_NAME_KEY]: selectedReward.name || '',
                [REWARD_DESCRIPTION_KEY]: selectedReward.description || '',
                [REWARD_EXPIRY_TYPE_KEY]: selectedReward.expiry_type || 'expiryInDays',
                [REWARD_EXPIRY_KEY]: selectedReward.expiry === undefined ? '' : selectedReward.expiry,
                [REWARD_CUSTOM_ID_KEY]: selectedReward.custom_id === undefined ? '' : selectedReward.custom_id,
                [REWARD_TAGS_KEY]: selectedReward.tags === undefined ? '' : selectedReward.tags,
                [REWARD_IS_ACTIVATE]: selectedReward.is_activate === undefined ? false : selectedReward.is_activate
            };
            
            // Set state directly (not merging) to ensure consistent structure
            setRewardData(loadedData);

            const loadedImage = selectedReward.image === undefined ?
                [] :
                [{ url: selectedReward.image.url, name: selectedReward.name, file: null }];
            setRewardImage(loadedImage);

            const loadedIsExpiryOpen = selectedReward.expiry !== undefined;
            const loadedIsRewardIdOpen = selectedReward.custom_id !== undefined;
            const loadedIsRewardTagsOpen = selectedReward.tags !== undefined;
            const loadedIsRewardImageOpen = true;

            setIsExpiryOpen(loadedIsExpiryOpen);
            setRewardIdOpen(loadedIsRewardIdOpen);
            setIsRewardTagOpen(loadedIsRewardTagsOpen);
            setIsRewardImageOpen(loadedIsRewardImageOpen);

            // Store initial values for comparison (normalized)
            initialRewardDataRef.current = normalizeRewardData(loadedData);
            initialRewardImageRef.current = JSON.parse(JSON.stringify(loadedImage));
            initialIsExpiryOpenRef.current = loadedIsExpiryOpen;
            initialIsRewardIdOpenRef.current = loadedIsRewardIdOpen;
            initialIsRewardTagsOpenRef.current = loadedIsRewardTagsOpen;
            initialIsRewardImageOpenRef.current = loadedIsRewardImageOpen;
        } else {
            const defaultData = {
                [REWARD_ID_KEY]: '',
                [REWARD_TYPE_KEY]: 'stampReward',
                [REWARD_NAME_KEY]: '',
                [REWARD_DESCRIPTION_KEY]: '',
                [REWARD_EXPIRY_TYPE_KEY]: 'expiryInDays',
                [REWARD_EXPIRY_KEY]: '',
                [REWARD_CUSTOM_ID_KEY]: '',
                [REWARD_TAGS_KEY]: '',
                [REWARD_IS_ACTIVATE]: false
            };
            
            setRewardData(defaultData);
            setRewardImage([]);
            setIsExpiryOpen(false);
            setRewardIdOpen(false);
            setIsRewardTagOpen(false);
            setIsRewardImageOpen(false);

            // Store initial values for comparison (normalized)
            initialRewardDataRef.current = normalizeRewardData(defaultData);
            initialRewardImageRef.current = [];
            initialIsExpiryOpenRef.current = false;
            initialIsRewardIdOpenRef.current = false;
            initialIsRewardTagsOpenRef.current = false;
            initialIsRewardImageOpenRef.current = false;
        }
    }, [selectedReward, isOpen]);

    // Handle browser refresh/close/back button warning when popup is open
    useEffect(() => {
        if (!isOpen) return; // Only track when popup is open

        const handleBeforeUnload = (e) => {
            if (checkUnsavedChanges()) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                return e.returnValue;
            }
        };

        // Handle browser back/forward button using history manipulation
        const handlePopState = (e) => {
            if (checkUnsavedChanges()) {
                const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave? Your changes will be lost.');
                if (!confirmed) {
                    window.history.pushState(null, '', window.location.href);
                }
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('popstate', handlePopState);
        };
    }, [isOpen, rewardData, rewardImage, isExpiryOpen, isRewardIdOpen, isRewardTagsOpen, isRewardImageOpen]);


    return (
        <DialogPopup
            title={selectedReward !== null ? 'Modify Reward' : 'Create New Reward'}
            actionTitle={selectedReward !== null ? 'Save' : 'Create'}
            deleteText={'Archive'}
            onDelete={onArchive}
            isOpen={isOpen}
            setIsOpen={handleClose}
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