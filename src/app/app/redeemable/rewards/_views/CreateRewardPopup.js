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
import MDEditor, { commands } from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';

// Define custom commands: include bold, headings (title), and bullet points
// Exclude: Link, Insert code, codeblock, comment, image, table, and open help
const customCommands = [
  commands.bold,
  commands.divider,
  commands.group(
    [
      commands.title1,
      commands.title2,
      commands.title3,
      commands.title4,
      commands.title5,
      commands.title6,
    ],
    {
      name: 'title',
      groupName: 'title',
      buttonProps: { 'aria-label': 'Title' },
    }
  ),
  commands.divider,
  commands.unorderedListCommand,
  commands.orderedListCommand,
];

const NEW_JOIN = { value: 'newJoin', title: 'New Join' }
const STAMP_REWARD = { value: 'stampReward', title: 'Stamp Reward' }
const SCAN_TO_WIN_REWARD = { value: 'scanToWinReward', title: 'Scan to Win Reward' }
const REWARD_TYPES = [
    STAMP_REWARD,
    SCAN_TO_WIN_REWARD
];
const EXPIRY_TYPE = [
    { value: 'noExpiry', title: 'No Expiry' },
    { value: 'expiryInDays', title: 'Expiry in Days' }
]

const REWARD_ID_KEY = 'id';
const REWARD_TYPE_KEY = 'type';
const REWARD_NAME_KEY = 'name';
const REWARD_DESCRIPTION_KEY = 'description';
// Use camelCase for consistency with other APIs (e.g. StampSetup)
const REWARD_TERMS_KEY = 'termsAndConditions';
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
    onSubmit,
    allowedRewardTypes = null // If provided, only show these reward types
}) => {
    const [isRewardImageOpen, setIsRewardImageOpen] = useState(false);
    const [isRewardIdOpen, setRewardIdOpen] = useState(false);
    const [isRewardTagsOpen, setIsRewardTagOpen] = useState(false);
    const [rewardImage, setRewardImage] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');

    // Store initial values to compare for unsaved changes
    const initialRewardDataRef = useRef(null);
    const initialRewardImageRef = useRef(null);
    const initialIsRewardIdOpenRef = useRef(null);
    const initialIsRewardTagsOpenRef = useRef(null);
    const initialIsRewardImageOpenRef = useRef(null);
    const errorMessageRef = useRef(null);
    const contentRef = useRef(null);
    const hasErrorRef = useRef(false);

    // Determine available reward types based on prop
    const availableRewardTypes = allowedRewardTypes || REWARD_TYPES;
    const defaultRewardType = allowedRewardTypes && allowedRewardTypes.length > 0 
        ? allowedRewardTypes[0].value 
        : 'stampReward';

    const [rewardData, setRewardData] = useState(() => ({
        [REWARD_ID_KEY]: '',
        [REWARD_TYPE_KEY]: defaultRewardType,
        [REWARD_NAME_KEY]: '',
        [REWARD_DESCRIPTION_KEY]: '',
        [REWARD_TERMS_KEY]: '',
        [REWARD_EXPIRY_TYPE_KEY]: 'expiryInDays',
        [REWARD_CUSTOM_ID_KEY]: '',
        [REWARD_TAGS_KEY]: '',
        [REWARD_IS_ACTIVATE]: false
    }));

    const updateValue = (key, value) => {
        setRewardData((prevValue) => ({ ...prevValue, [key]: value }))
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        event.stopPropagation(); // Prevent event bubbling

        // Basic validation
        if (!rewardData.name || !rewardData.description) {
            hasErrorRef.current = true;
            setErrorMessage('Please fill in all required fields (Reward name and Description)');
            return;
        }

        // Clear error message on successful validation
        hasErrorRef.current = false;
        setErrorMessage('');

        // Prepare form data with image for both create and update
        // If toggles are off, send empty strings for Reward ID and Tags
        const formDataWithImage = {
            ...rewardData,
            [REWARD_CUSTOM_ID_KEY]: isRewardIdOpen ? rewardData[REWARD_CUSTOM_ID_KEY] : '',
            [REWARD_TAGS_KEY]: isRewardTagsOpen ? rewardData[REWARD_TAGS_KEY] : '',
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
            [REWARD_TYPE_KEY]: data[REWARD_TYPE_KEY] || (allowedRewardTypes && allowedRewardTypes.length > 0 ? allowedRewardTypes[0].value : 'stampReward'),
            [REWARD_NAME_KEY]: data[REWARD_NAME_KEY] || '',
            [REWARD_DESCRIPTION_KEY]: data[REWARD_DESCRIPTION_KEY] || '',
            // Support both camelCase and snake_case shapes if present
            [REWARD_TERMS_KEY]: data[REWARD_TERMS_KEY] === undefined
                ? (data.terms_and_conditions || '')
                : (data[REWARD_TERMS_KEY] || ''),
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
            isRewardIdOpen !== initialIsRewardIdOpenRef.current ||
            isRewardTagsOpen !== initialIsRewardTagsOpenRef.current ||
            isRewardImageOpen !== initialIsRewardImageOpenRef.current
        );
        
        return dataChanged || imageChanged || togglesChanged;
    };

    // Handle popup close with unsaved changes check
    const handleClose = (value) => {
        // Clear error when user explicitly closes
        if (hasErrorRef.current || errorMessage) {
            hasErrorRef.current = false;
            setErrorMessage('');
        }
        
        if (checkUnsavedChanges()) {
            const confirmed = window.confirm('You have unsaved changes. Are you sure you want to close? Your changes will be lost.');
            if (!confirmed) {
                return false; // Don't close if user cancels
            }
        }
        setIsOpen(value);
        return true; // Allow closing
    };

    // Custom onClose handler for Dialog component (called on backdrop click, ESC key, etc.)
    const handleDialogClose = () => {
        // Clear error when user explicitly closes
        if (hasErrorRef.current || errorMessage) {
            hasErrorRef.current = false;
            setErrorMessage('');
        }
        
        if (checkUnsavedChanges()) {
            const confirmed = window.confirm('You have unsaved changes. Are you sure you want to close? Your changes will be lost.');
            if (!confirmed) {
                return false; // Don't close if user cancels
            }
        }
        setIsOpen(false);
        return true; // Allow closing
    };

    useEffect(() => {
        if (!isOpen) return; // Only initialize when popup opens

        // Recalculate default reward type when popup opens
        const currentDefaultRewardType = allowedRewardTypes && allowedRewardTypes.length > 0 
            ? allowedRewardTypes[0].value 
            : 'stampReward';

        if (selectedReward !== null) {
            const loadedData = {
                [REWARD_ID_KEY]: selectedReward.id || '',
                [REWARD_TYPE_KEY]: selectedReward.type || currentDefaultRewardType,
                [REWARD_NAME_KEY]: selectedReward.name || '',
                [REWARD_DESCRIPTION_KEY]: selectedReward.description || '',
                // Prefer camelCase, but gracefully fall back to snake_case if present
                [REWARD_TERMS_KEY]:
                    selectedReward.termsAndConditions !== undefined
                        ? (selectedReward.termsAndConditions || '')
                        : (selectedReward.terms_and_conditions || ''),
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

            const loadedIsRewardIdOpen = selectedReward.custom_id !== undefined && selectedReward.custom_id !== '' && selectedReward.custom_id.trim() !== '';
            const loadedIsRewardTagsOpen = selectedReward.tags !== undefined && selectedReward.tags !== '' && selectedReward.tags.trim() !== '';
            const loadedIsRewardImageOpen = true;

            setRewardIdOpen(loadedIsRewardIdOpen);
            setIsRewardTagOpen(loadedIsRewardTagsOpen);
            setIsRewardImageOpen(loadedIsRewardImageOpen);

            // Store initial values for comparison (normalized)
            initialRewardDataRef.current = normalizeRewardData(loadedData);
            initialRewardImageRef.current = JSON.parse(JSON.stringify(loadedImage));
            initialIsRewardIdOpenRef.current = loadedIsRewardIdOpen;
            initialIsRewardTagsOpenRef.current = loadedIsRewardTagsOpen;
            initialIsRewardImageOpenRef.current = loadedIsRewardImageOpen;
        } else {
            const defaultData = {
                [REWARD_ID_KEY]: '',
                [REWARD_TYPE_KEY]: currentDefaultRewardType,
                [REWARD_NAME_KEY]: '',
                [REWARD_DESCRIPTION_KEY]: '',
                [REWARD_TERMS_KEY]: '',
                [REWARD_EXPIRY_TYPE_KEY]: 'expiryInDays',
                [REWARD_EXPIRY_KEY]: '',
                [REWARD_CUSTOM_ID_KEY]: '',
                [REWARD_TAGS_KEY]: '',
                [REWARD_IS_ACTIVATE]: false
            };
            
            setRewardData(defaultData);
            setRewardImage([]);
            setRewardIdOpen(false);
            setIsRewardTagOpen(false);
            setIsRewardImageOpen(false);

            // Store initial values for comparison (normalized)
            initialRewardDataRef.current = normalizeRewardData(defaultData);
            initialRewardImageRef.current = [];
            initialIsRewardIdOpenRef.current = false;
            initialIsRewardTagsOpenRef.current = false;
            initialIsRewardImageOpenRef.current = false;
        }
    }, [selectedReward, isOpen, allowedRewardTypes]);

    // Automatically turn off toggles when values become empty
    useEffect(() => {
        if (!isOpen) return;

        // Turn off Reward ID toggle if value is empty
        if (isRewardIdOpen && (!rewardData[REWARD_CUSTOM_ID_KEY] || rewardData[REWARD_CUSTOM_ID_KEY].trim() === '')) {
            setRewardIdOpen(false);
        }

        // Turn off Tags toggle if value is empty
        if (isRewardTagsOpen && (!rewardData[REWARD_TAGS_KEY] || rewardData[REWARD_TAGS_KEY].trim() === '')) {
            setIsRewardTagOpen(false);
        }
    }, [rewardData[REWARD_CUSTOM_ID_KEY], rewardData[REWARD_TAGS_KEY], isOpen, isRewardIdOpen, isRewardTagsOpen]);

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
    }, [isOpen, rewardData, rewardImage, isRewardIdOpen, isRewardTagsOpen, isRewardImageOpen]);

    // Scroll to top when error message appears
    useEffect(() => {
        if (errorMessage && contentRef.current) {
            // Small delay to ensure DOM is updated
            setTimeout(() => {
                // Find the scrollable parent container by traversing up the DOM
                let element = contentRef.current;
                
                while (element && element.parentElement) {
                    const parent = element.parentElement;
                    const style = window.getComputedStyle(parent);
                    
                    // Check if this element is scrollable
                    const isScrollable = 
                        (style.overflow === 'auto' || 
                         style.overflow === 'scroll' || 
                         style.overflowY === 'auto' || 
                         style.overflowY === 'scroll') &&
                        parent.scrollHeight > parent.clientHeight;
                    
                    if (isScrollable) {
                        parent.scrollTo({ top: 0, behavior: 'smooth' });
                        return;
                    }
                    
                    // Also check for MUI Dialog Paper (common scrollable container)
                    if (parent.classList.contains('MuiPaper-root') || 
                        parent.classList.contains('MuiDialog-paper')) {
                        parent.scrollTo({ top: 0, behavior: 'smooth' });
                        return;
                    }
                    
                    // Stop at dialog boundary
                    if (parent.getAttribute('role') === 'dialog') {
                        // Try to find and scroll the form element inside dialog
                        const form = parent.querySelector('form');
                        if (form && form.scrollHeight > form.clientHeight) {
                            form.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                        return;
                    }
                    
                    element = parent;
                }
            }, 150);
        }
    }, [errorMessage]);

    // Clear error message when popup closes or when user starts typing
    useEffect(() => {
        if (!isOpen) {
            hasErrorRef.current = false;
            setErrorMessage('');
        }
    }, [isOpen]);


    return (
        <DialogPopup
            title={selectedReward !== null ? 'Modify Reward' : 'Create New Reward'}
            actionTitle={selectedReward !== null ? 'Save' : 'Create'}
            deleteText={'Archive'}
            onDelete={onArchive}
            isOpen={isOpen}
            setIsOpen={handleClose}
            onClose={handleDialogClose}
            PaperProps={{
                sx: {
                    minHeight: '70vh',
                    maxHeight: '70vh',
                },
            }}
            onSubmit={handleSubmit}
        >
            <div className={styles.content} ref={contentRef}>
                {errorMessage && (
                    <div className={styles.errorMessage} ref={errorMessageRef}>
                        {errorMessage}
                    </div>
                )}
                <section>
                    <FieldHeader
                        title='Reward type*'
                        description='There are different reward for different purposes. Click here to understand more.'
                        type='h2'
                        hClassName={styles.h2}
                    />

                    <FullWidthDropdown
                        options={availableRewardTypes}
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
                    onChange={(event) => { 
                        updateValue(REWARD_NAME_KEY, event.target.value);
                        if (errorMessage) {
                            hasErrorRef.current = false;
                            setErrorMessage('');
                        }
                    }}
                />

                <section>
                    <FieldHeader
                        title='Description*'
                        description='Provide a details instruction of the reward and what is minimum requirement to use. Supports markdown formatting (bold, lists, etc.).'
                        type='h2'
                        hClassName={styles.h2}
                    />
                    <div className={styles.markdownEditorSmall}>
                        <MDEditor
                            value={rewardData[REWARD_DESCRIPTION_KEY] || ''}
                            onChange={(value) => { 
                                updateValue(REWARD_DESCRIPTION_KEY, value || '');
                                if (errorMessage) {
                                    hasErrorRef.current = false;
                                    setErrorMessage('');
                                }
                            }}
                            preview='edit'
                            hideToolbar={false}
                            data-color-mode="light"
                            height={120}
                            commands={customCommands}
                        />
                    </div>
                </section>

                <section>
                    <FieldHeader
                        title='Terms and Conditions'
                        description='(Optional) Additional terms and conditions for this reward. Supports markdown formatting (bold, lists, etc.).'
                        type='h2'
                        hClassName={styles.h2}
                    />
                    <div className={styles.markdownEditor}>
                        <MDEditor
                            value={rewardData[REWARD_TERMS_KEY] || ''}
                            onChange={(value) => { updateValue(REWARD_TERMS_KEY, value || '') }}
                            preview='edit'
                            hideToolbar={false}
                            data-color-mode="light"
                            commands={customCommands}
                        />
                    </div>
                </section>

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
                        <FieldHeader
                            title='Expiry'
                            description='The period of time the reward voucher should expire after (disappear from the user&#39;s app), calculated from when it is issued to the member. '
                            type='h2'
                            hClassName={styles.h2}
                        />

                        <FullWidthDropdown
                            options={EXPIRY_TYPE}
                            labelId='reward_type'
                            id='reward_type'
                            value={rewardData[REWARD_EXPIRY_TYPE_KEY]}
                            onChange={(event) => { updateValue(REWARD_EXPIRY_TYPE_KEY, event.target.value) }}
                            className={styles.field}
                        />

                        {
                            rewardData[REWARD_EXPIRY_TYPE_KEY] === 'expiryInDays' && <FormTextField
                                id={REWARD_EXPIRY_KEY}
                                name={REWARD_EXPIRY_KEY}
                                style={{ marginTop: '12px' }}
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

                    {/* TODO: Include some advance analytics to include this features */}
                    {/* <div className={styles.settingContainer}>
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
                                disabled={selectedReward !== null && (!rewardData[REWARD_CUSTOM_ID_KEY] || rewardData[REWARD_CUSTOM_ID_KEY].trim() === '')}
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
                                disabled={selectedReward !== null && (!rewardData[REWARD_TAGS_KEY] || rewardData[REWARD_TAGS_KEY].trim() === '')}
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
                    </div> */}

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