'use client';
import DragDropImageUploader from '@/components/Form Components/DragDropImageUploader/DragDropImageUploader';
import styles from './stamp-setup.module.css';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import FieldHeader from '@/components/FieldHeader/FieldHeader';
import FormTextField from '@/components/Form Components/FormTextField/FormTextField';
import FullWidthDropdown from '@/components/FullWidthDropdown/FullWidthDropdown';
import { DataGrid } from '@mui/x-data-grid';
import { IconButton, Menu, MenuItem, Switch } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { clamp } from '@/utility/numbers';
import EditStampStep from './_views/EditStampStep';
import StampOnBoarding from '../StampOnboarding/StampOnboarding';
import apiClient from '@/utility/api';
import { STAMP_MANAGEMENT } from '@/utility/apiPaths';
import LoadingPage from '@/components/LoadingPage/LoadingPage';
import ErrorPage from '@/components/ErrorPage/ErrorPage';
import MDEditor, { commands } from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';

// Define custom commands: include bold and bullet points only
// Exclude: headings (title), link, insert code, codeblock, comment, image, table, and open help
const customCommands = [
  commands.bold,
  commands.divider,
  commands.unorderedListCommand,
  commands.orderedListCommand,
];

const NO_EXPIRATION = { value: 'noExpiration', title: 'No Expiration' };
const END_OF_MONTH_EXPIRATION = { value: 'endOfMonth', title: 'End of Month' };
const END_OF_YEAR_EXPIRATION = { value: 'endOfYear', title: 'End of Year' };
const VALID_FOR_DAYS_EXPIRATION = { value: 'validForDays', title: 'Valid for X Days' };
const EXPIRATION_TYPE_OPTIONS = [
  NO_EXPIRATION,
  END_OF_MONTH_EXPIRATION,
  END_OF_YEAR_EXPIRATION,
  VALID_FOR_DAYS_EXPIRATION
];

const DEFAULT_STAMP_STEP = {
  id: 1,
  stampedIcon: 'default',
  // stampedIcon: [{
  //   name: '',
  //   file: '',
  //   url: '',
  // }],
  unStampedIcon: 'default',
  // stampedIcon: [{
  //   name: '',
  //   file: '',
  //   url: '',
  // }],
  // reward: 'No Reward'
}

export default function StampSetup() {
  // For Initial Loading
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingErrorMessage, setIsLoadingErrorMessage] = useState(null);

  // For Header Status
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isBtnLoading, setIsBtnLoading] = useState(false);
  const [isBtnDisabled, setIsBtnDisabled] = useState(true);
  const [isSubmissionSuccess, setIsSubmissionSuccess] = useState(false);
  const [isEdit, setIsEdit] = useState(true);

  // Toggle state
  const [isEnabled, setIsEnabled] = useState(false);

  // For Form Data
  const [cardTitle, setCardTitle] = useState('');
  const [cardDescription, setCardDescription] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [numberOfStamps, setNumberOfStamps] = useState(6);
  const [rewardStampIcon, setRewardStampIcon] = useState([]);
  const [rewardUnstampedIcon, setRewardUnstampedIcon] = useState([]);
  const [currentReward, setCurrentReward] = useState(null)
  const [expirationType, setExpirationType] = useState(VALID_FOR_DAYS_EXPIRATION.value);
  const [numberOfDaysToExpire, setNumberOfDaysToExpire] = useState(30);
  const [cardSteps, setCardSteps] = useState(Array.from({ length: 6 }, (_, index) => ({
    ...DEFAULT_STAMP_STEP,
    id: index + 1
  })))
  const [hasExistingData, setHasExistingData] = useState(false);
  const [isDefaultStampedIconDeleted, setIsDefaultStampedIconDeleted] = useState(false);
  const [isDefaultUnStampedIconDeleted, setIsDefaultUnStampedIconDeleted] = useState(false);

  // Store initial values to compare for unsaved changes
  const initialIsEnabledRef = useRef(false);
  const initialCardTitleRef = useRef('');
  const initialCardDescriptionRef = useRef('');
  const initialTermsAndConditionsRef = useRef('');
  const initialNumberOfStampsRef = useRef(6);
  const initialRewardStampIconRef = useRef([]);
  const initialRewardUnstampedIconRef = useRef([]);
  const initialExpirationTypeRef = useRef(VALID_FOR_DAYS_EXPIRATION.value);
  const initialNumberOfDaysToExpireRef = useRef(30);
  const initialCardStepsRef = useRef([]);
  
  // Track if we've pushed a history state for back button handling
  const historyStatePushedRef = useRef(false);

  // Fetch stamp management data when component loads
  useEffect(() => {
    const fetchStampManagementData = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.get(STAMP_MANAGEMENT);
        const data = response.data.data;
        console.log('Stamp management data:', data);

        if (data) {

          // Extract isEdit from API response
          const isEditValue = data.isEdit;
          setIsEdit(isEditValue !== undefined ? isEditValue : true);

          // Parse isEnabled (might be string "true"/"false")
          const enabled = data.isEnabled === 'true' || data.isEnabled === true;
          setIsEnabled(enabled);
          initialIsEnabledRef.current = enabled;

          // Check if we have existing data (not empty, null, or empty array)
          const hasData = data && 
            (data.cardTitle || 
             data.cardDescription || 
             data.termsAndConditions ||
             data.numberOfStamps || 
             data.expirationType || 
             data.numberOfDaysToExpire ||
             data.defaultStampedUrl_Presign ||
             data.defaultUnStampedUrl_Presign ||
             (data.cardStepDetails && data.cardStepDetails !== '[]'));

          setHasExistingData(hasData);

          // Update state with fetched data
          const loadedCardTitle = data.cardTitle || '';
          const loadedCardDescription = data.cardDescription || '';
          const loadedTermsAndConditions = data.termsAndConditions || '';
          const loadedNumberOfStamps = data.numberOfStamps || 6;
          const loadedExpirationType = data.expirationType || VALID_FOR_DAYS_EXPIRATION.value;
          const loadedNumberOfDaysToExpire = data.numberOfDaysToExpire || 30;

          setCardTitle(loadedCardTitle);
          setCardDescription(loadedCardDescription);
          setTermsAndConditions(loadedTermsAndConditions);
          setNumberOfStamps(loadedNumberOfStamps);
          setExpirationType(loadedExpirationType);
          setNumberOfDaysToExpire(loadedNumberOfDaysToExpire);

          // Store initial values for comparison
          initialCardTitleRef.current = loadedCardTitle;
          initialCardDescriptionRef.current = loadedCardDescription;
          initialTermsAndConditionsRef.current = loadedTermsAndConditions;
          initialNumberOfStampsRef.current = loadedNumberOfStamps;
          initialExpirationTypeRef.current = loadedExpirationType;
          initialNumberOfDaysToExpireRef.current = loadedNumberOfDaysToExpire;

          // Handle stamp icons if they exist
          const loadedStampIcon = data.defaultStampedUrl_Presign ? [{
            name: data.defaultStampedUrl_Presign,
            file: null,
            url: data.defaultStampedUrl_Presign
          }] : [];
          setRewardStampIcon(loadedStampIcon);
          initialRewardStampIconRef.current = JSON.parse(JSON.stringify(loadedStampIcon));

          const loadedUnstampedIcon = data.defaultUnStampedUrl_Presign ? [{
            name: data.defaultUnStampedUrl_Presign,
            file: null,
            url: data.defaultUnStampedUrl_Presign
          }] : [];
          setRewardUnstampedIcon(loadedUnstampedIcon);
          initialRewardUnstampedIconRef.current = JSON.parse(JSON.stringify(loadedUnstampedIcon));

          // Handle card steps: use loadedNumberOfStamps when API returns none or empty
          const defaultStepsFromCount = (count) =>
            Array.from({ length: count }, (_, index) => ({
              ...DEFAULT_STAMP_STEP,
              id: index + 1
            }));

          let loadedCardSteps = defaultStepsFromCount(loadedNumberOfStamps);

          if (data.cardStepDetails) {
            try {
              const parsedCardSteps = typeof data.cardStepDetails === 'string'
                ? JSON.parse(data.cardStepDetails)
                : data.cardStepDetails;

              if (Array.isArray(parsedCardSteps) && parsedCardSteps.length > 0) {
                loadedCardSteps = parsedCardSteps;
                setCardSteps(parsedCardSteps);
              } else {
                // Empty or invalid: generate steps from numberOfStamps with no reward
                loadedCardSteps = defaultStepsFromCount(loadedNumberOfStamps);
                setCardSteps(loadedCardSteps);
              }
            } catch (parseError) {
              console.error('Error parsing cardStepDetails:', parseError);
              loadedCardSteps = defaultStepsFromCount(loadedNumberOfStamps);
              setCardSteps(loadedCardSteps);
            }
          } else {
            setCardSteps(loadedCardSteps);
          }

          initialCardStepsRef.current = JSON.parse(JSON.stringify(loadedCardSteps));
        } else {
          // Initialize with default values
          initialIsEnabledRef.current = false;
          initialCardTitleRef.current = '';
          initialCardDescriptionRef.current = '';
          initialTermsAndConditionsRef.current = '';
          initialNumberOfStampsRef.current = 6;
          initialRewardStampIconRef.current = [];
          initialRewardUnstampedIconRef.current = [];
          initialExpirationTypeRef.current = VALID_FOR_DAYS_EXPIRATION.value;
          initialNumberOfDaysToExpireRef.current = 30;
          initialCardStepsRef.current = JSON.parse(JSON.stringify(Array.from({ length: 6 }, (_, index) => ({
            ...DEFAULT_STAMP_STEP,
            id: index + 1
          }))));
        }
      } catch (error) {
        const errorData = error?.response?.data;
        const message = errorData?.error?.message || errorData?.message || error?.message || 'Failed to load stamp management data';
        const code = errorData?.error?.statusCode || errorData?.code || error?.code || 'UNKNOWN';
        console.error(`Error fetching stamp management data: ${message} (Error code: ${code})`);
        setIsError(true);
        setErrorMessage(`Failed to load stamp management data. ${message} (Error code: ${code})`);
        setIsLoadingErrorMessage(`Failed to load stamp management data. ${message} (Error code: ${code})`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStampManagementData();
  }, []);

  // Check if there are unsaved changes
  const checkUnsavedChanges = () => {
    if (!isEdit) return false; // No unsaved changes if not in edit mode
    
    // Check isEnabled
    const isEnabledChanged = isEnabled !== initialIsEnabledRef.current;
    
    // Check form fields
    const formFieldsChanged = (
      cardTitle !== initialCardTitleRef.current ||
      cardDescription !== initialCardDescriptionRef.current ||
      termsAndConditions !== initialTermsAndConditionsRef.current ||
      numberOfStamps !== initialNumberOfStampsRef.current ||
      expirationType !== initialExpirationTypeRef.current ||
      numberOfDaysToExpire !== initialNumberOfDaysToExpireRef.current
    );
    
    // Check stamp icons (compare by URL, name, or file presence)
    const normalizeImage = (img) => ({
      url: img?.url || '',
      name: img?.name || '',
      hasFile: !!img?.file
    });
    const stampIconChanged = JSON.stringify(rewardStampIcon.map(normalizeImage)) !== 
      JSON.stringify(initialRewardStampIconRef.current.map(normalizeImage)) ||
      rewardStampIcon.length !== initialRewardStampIconRef.current.length;
    
    const unstampedIconChanged = JSON.stringify(rewardUnstampedIcon.map(normalizeImage)) !== 
      JSON.stringify(initialRewardUnstampedIconRef.current.map(normalizeImage)) ||
      rewardUnstampedIcon.length !== initialRewardUnstampedIconRef.current.length;
    
    // Check card steps
    const cardStepsChanged = JSON.stringify(cardSteps) !== JSON.stringify(initialCardStepsRef.current);
    
    return isEnabledChanged || formFieldsChanged || stampIconChanged || unstampedIconChanged || cardStepsChanged;
  };

  // Update button disabled state based on unsaved changes
  useEffect(() => {
    if (!isEdit) {
      setIsBtnDisabled(true);
      return;
    }
    
    const hasChanges = checkUnsavedChanges();
    setIsBtnDisabled(!hasChanges);
  }, [isEnabled, cardTitle, cardDescription, termsAndConditions, numberOfStamps, expirationType, numberOfDaysToExpire, rewardStampIcon, rewardUnstampedIcon, cardSteps, isEdit]);

  const formSubmissionHandler = async (event) => {
    event.preventDefault();
    setIsBtnLoading(true);

    try {
      const formData = new FormData();

      formData.append('isEnabled', isEnabled.toString());
      formData.append('cardTitle', cardTitle);
      formData.append('cardDescription', cardDescription);
      formData.append('termsAndConditions', termsAndConditions);
      formData.append('numberOfStamps', numberOfStamps);
      formData.append('expirationType', expirationType);
      formData.append('numberOfDaysToExpire', numberOfDaysToExpire);
      formData.append('cardStepDetails', JSON.stringify(cardSteps));

      if (rewardStampIcon.length > 0 && rewardStampIcon[0] !== null) {
        // TODO: Change defaultStampedIcon to rewardStampIcon
        formData.append('defaultStampedIcon', rewardStampIcon[0].file);
      };

      if (rewardUnstampedIcon.length > 0 && rewardUnstampedIcon[0] !== null) {
        formData.append('defaultUnStampedIcon', rewardUnstampedIcon[0].file);
      };

      // Add deletion flags for PUT requests
      if (hasExistingData && isDefaultStampedIconDeleted) {
        formData.append('isDefaultStampedIconDeleted', 'true');
      }
      
      if (hasExistingData && isDefaultUnStampedIconDeleted) {
        formData.append('isDefaultUnStampedIconDeleted', 'true');
      }

      // Log FormData contents properly
      console.log("FormData contents:");
      const formDataObject = {};
      for (const pair of formData.entries()) {
        console.log(pair[0] + ': ' + pair[1]);
        // Build object representation for easier reading
        if (pair[0] === 'defaultStampedIcon' || pair[0] === 'defaultUnStampedIcon') {
          formDataObject[pair[0]] = `[File: ${pair[1]?.name || 'No name'}]`;
        } else {
          formDataObject[pair[0]] = pair[1];
        }
      }
      
      // Log complete body object including Terms and Conditions
      console.log("Complete request body to be sent to backend:", {
        isEnabled: formDataObject.isEnabled,
        cardTitle: formDataObject.cardTitle,
        cardDescription: formDataObject.cardDescription,
        termsAndConditions: formDataObject.termsAndConditions,
        numberOfStamps: formDataObject.numberOfStamps,
        expirationType: formDataObject.expirationType,
        numberOfDaysToExpire: formDataObject.numberOfDaysToExpire,
        cardStepDetails: formDataObject.cardStepDetails,
        defaultStampedIcon: formDataObject.defaultStampedIcon,
        defaultUnStampedIcon: formDataObject.defaultUnStampedIcon,
        isDefaultStampedIconDeleted: formDataObject.isDefaultStampedIconDeleted,
        isDefaultUnStampedIconDeleted: formDataObject.isDefaultUnStampedIconDeleted,
      });

      // Use POST for new data, PUT for updates
      const httpMethod = hasExistingData ? 'put' : 'post';
      console.log(`Using ${httpMethod.toUpperCase()} method for submission`);

      await apiClient[httpMethod](STAMP_MANAGEMENT, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Form submitted successfully');
      setIsSubmissionSuccess(true);
      setIsBtnLoading(false);
      
      // Update initial values after successful save
      initialIsEnabledRef.current = isEnabled;
      initialCardTitleRef.current = cardTitle;
      initialCardDescriptionRef.current = cardDescription;
      initialTermsAndConditionsRef.current = termsAndConditions;
      initialNumberOfStampsRef.current = numberOfStamps;
      initialExpirationTypeRef.current = expirationType;
      initialNumberOfDaysToExpireRef.current = numberOfDaysToExpire;
      initialRewardStampIconRef.current = JSON.parse(JSON.stringify(rewardStampIcon));
      initialRewardUnstampedIconRef.current = JSON.parse(JSON.stringify(rewardUnstampedIcon));
      initialCardStepsRef.current = JSON.parse(JSON.stringify(cardSteps));
    } catch (error) {
      const errorData = error?.response?.data;
      const message = errorData?.error?.message || errorData?.message || error?.message || 'An unknown error occurred';
      const code = errorData?.error?.statusCode || errorData?.code || error?.code || 'UNKNOWN';
      console.error(`Form submission error: ${message} (Error code: ${code})`);
    } finally {
      setIsBtnLoading(false);
    }

  };

  const resetSaving = () => {
    setIsSubmissionSuccess(false);
  };

  const numberOfStampsHandler = (event) => {
    const preValue = numberOfStamps;
    const value = clamp(Number(event.target.value), 1, 16);

    setCardSteps((preStep) => {
      if (value == 0) {
        return []
      } else if (value > preValue) {
        const arrayOfCopies = Array.from({ length: (value - preValue) }, (_, index) => ({
          ...DEFAULT_STAMP_STEP,
          id: index + 1 + preValue
        }))

        return [...preStep, ...arrayOfCopies]
      } else {
        return preStep.slice(0, value)
      }
    });

    setNumberOfStamps(value);
  }

  // Track default stamped icon deletion
  useEffect(() => {
    if (hasExistingData) {
      console.log('Default stamped icon changed:', {
        hasExistingData,
        rewardStampIconLength: rewardStampIcon.length,
        rewardStampIcon: rewardStampIcon
      });
      
      // If we had an existing stamped icon loaded from server and now it's deleted
      if (rewardStampIcon.length === 0) {
        console.log('DELETED - default stamped icon was deleted');
        setIsDefaultStampedIconDeleted(true);
      } else if (rewardStampIcon.length > 0) {
        console.log('NOT DELETED - default stamped icon exists or was added');
        setIsDefaultStampedIconDeleted(false);
      }
      
      // Call resetSaving when stamped icon changes
      resetSaving();
    }
  }, [rewardStampIcon, hasExistingData]);

  useEffect(() => {
    console.log("DEFAULT STAMPED MODIFIED", rewardStampIcon)
    setCardSteps(prevValue => {
      const data = prevValue.map((value) => {
        if (value.stampedIcon === 'default' || value.stampedIcon === null || value.stampedIcon.length === 0) {
          return { ...value, stampedIcon: 'default' }
        }

        return { ...value };
      })

      return data
    })
  }, [rewardStampIcon])

  // Track default unstamped icon deletion
  useEffect(() => {
    if (hasExistingData) {
      console.log('Default unstamped icon changed:', {
        hasExistingData,
        rewardUnstampedIconLength: rewardUnstampedIcon.length,
        rewardUnstampedIcon: rewardUnstampedIcon
      });
      
      // If we had an existing unstamped icon loaded from server and now it's deleted
      if (rewardUnstampedIcon.length === 0) {
        console.log('DELETED - default unstamped icon was deleted');
        setIsDefaultUnStampedIconDeleted(true);
      } else if (rewardUnstampedIcon.length > 0) {
        console.log('NOT DELETED - default unstamped icon exists or was added');
        setIsDefaultUnStampedIconDeleted(false);
      }
      
      // Call resetSaving when unstamped icon changes
      resetSaving();
    }
  }, [rewardUnstampedIcon, hasExistingData]);

  useEffect(() => {
    setCardSteps(prevValue => {
      const data = prevValue.map((value) => {
        if (value.unStampedIcon === null || value.unStampedIcon === 'default' || value.unStampedIcon.length === 0) {
          return { ...value, unStampedIcon: 'default' }
        }

        return { ...value };
      })

      return data
    })
  }, [rewardUnstampedIcon])

  // Handle browser refresh/close/back button warning
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (checkUnsavedChanges()) {
        e.preventDefault();
        // Modern browsers ignore custom messages, but we can still show a generic warning
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    // Handle browser back/forward button using history manipulation
    const handlePopState = (e) => {
      if (checkUnsavedChanges()) {
        const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave? Your changes will be lost.');
        if (!confirmed) {
          // Push state back to prevent navigation
          window.history.pushState(null, '', window.location.href);
          historyStatePushedRef.current = true;
        } else {
          // User confirmed, allow navigation
          historyStatePushedRef.current = false;
        }
      }
    };

    // Push a state to history when there are unsaved changes to intercept back button
    const updateHistoryState = () => {
      if (checkUnsavedChanges() && !historyStatePushedRef.current) {
        window.history.pushState({ unsavedChanges: true }, '', window.location.href);
        historyStatePushedRef.current = true;
      } else if (!checkUnsavedChanges() && historyStatePushedRef.current) {
        // If changes are saved, reset the flag
        historyStatePushedRef.current = false;
      }
    };

    // Intercept clicks on links to show confirmation
    const handleLinkClick = (e) => {
      if (checkUnsavedChanges()) {
        // Check if it's a link that navigates away
        const link = e.target.closest('a');
        if (link && link.href) {
          // Check if it's an internal link (same origin) or external
          const isInternalLink = link.href.startsWith(window.location.origin) || link.href.startsWith('/');
          const isAnchorLink = link.href.includes('#') && link.href.split('#')[0] === window.location.href.split('#')[0];
          
          // Only intercept if it's navigating away (not anchor links)
          if (isInternalLink && !isAnchorLink) {
            const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave? Your changes will be lost.');
            if (!confirmed) {
              e.preventDefault();
              e.stopPropagation();
              return false;
            }
          }
        }
      }
    };

    // Add beforeunload event listener for browser refresh/close/back button
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Add popstate listener for back/forward button
    window.addEventListener('popstate', handlePopState);

    // Add click listener to intercept link clicks
    document.addEventListener('click', handleLinkClick, true);

    // Update history state when values change
    updateHistoryState();

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('click', handleLinkClick, true);
    };
  }, [isEnabled, cardTitle, cardDescription, termsAndConditions, numberOfStamps, expirationType, numberOfDaysToExpire, rewardStampIcon, rewardUnstampedIcon, cardSteps, isEdit]);

  // ==== Modify Selection ===
  const [currentStepStampedIcon, setCurrentStepStampedIcon] = useState([]);
  const [currentStepUnstampIcon, setCurrentStepUnstampIcon] = useState([]);

  const modifyStampSaveHandler = () => {
    console.log('Current Modified Row:', selectedRowId);

    const newStampedIcon = currentStepStampedIcon === rewardStampIcon || currentStepStampedIcon.length === 0 ? 'default' : currentStepStampedIcon;
    const newUnstampedIcon = currentStepUnstampIcon === rewardUnstampedIcon || currentStepUnstampIcon.length === 0 ? 'default' : currentStepUnstampIcon;

    setCardSteps(preValue => preValue.map((step, index) =>
      index === selectedRowId - 1
        ? { ...step, stampedIcon: newStampedIcon, unStampedIcon: newUnstampedIcon, reward: currentReward }
        : { ...step }
    ));

    setCurrentReward(null);
    resetSaving();

    handleMenuClose();
  }
  // ==== End ===

  // ==== Table Related ====
  const [isEditStampOpen, setIsEditStampOpen] = useState(false);
  const paginationModel = { page: 0, pageSize: 20 };
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRowId, setSelectedRowId] = useState(null);

  const handleMenuOpen = (event, rowId) => {
    setAnchorEl(event.currentTarget);
    setSelectedRowId(rowId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRowId(null);
    setIsEditStampOpen(false);
  };

  const handleEdit = () => {
    console.log('Edit location with id:', selectedRowId);
    setIsEditStampOpen(true);

    const currentStepDetail = cardSteps[selectedRowId - 1];

    if (currentStepDetail.stampedIcon === 'default') {
      setCurrentStepStampedIcon(rewardStampIcon);
    } else {
      console.log("SHDSD")
      setCurrentStepStampedIcon(currentStepDetail.stampedIcon);
    }

    if (currentStepDetail.unStampedIcon === 'default') {
      setCurrentStepUnstampIcon(rewardUnstampedIcon);
    } else {
      setCurrentStepUnstampIcon(currentStepDetail.unStampedIcon);
    }

    setCurrentReward(currentStepDetail.reward === undefined ? null : currentStepDetail.reward)
  };

  const handleDelete = () => {
    console.log('Delete location with id:', selectedRowId);
    handleMenuClose();
  };

  const columns = [
    {
      field: 'id',
      headerName: 'Stamp',
      width: 80,
    },
    // {
    //   field: 'stampedIcon',
    //   headerName: 'Stamped Icon',
    //   flex: 1,
    //   renderCell: (params) => {
    //     const isDefaultAndNotEmpty = cardSteps[params.row.id - 1].stampedIcon === 'default' && rewardStampIcon[0] !== undefined;
    //     const isNotDefault = cardSteps[params.row.id - 1].stampedIcon !== 'default';

    //     if (isDefaultAndNotEmpty) {
    //       return (
    //           <Image
    //             src={rewardStampIcon[0].url}
    //             width={50}
    //             height={50}
    //             alt='Stamp icon'
    //           />
    //       )
    //     } else if (isNotDefault) {
    //       console.log(cardSteps[params.row.id - 1].stampedIcon)
    //       return (
    //         <Image
    //           src={cardSteps[params.row.id - 1].stampedIcon[0].url}
    //           width={50}
    //           height={50}
    //           alt='Stamp icon'
    //         />
    //       )
    //     } else {
    //       return <p>Empty</p>
    //     }
    //   }
    // },
    // {
    //   field: 'unStampedIcon',
    //   headerName: 'Unstamped Icon',
    //   flex: 1,
    //   renderCell: (params) => {
    //     const isDefaultAndNotEmpty = cardSteps[params.row.id - 1].unStampedIcon === 'default' && defaultUnStampedIcon[0] !== undefined;
    //     const isNotDefault = cardSteps[params.row.id - 1].unStampedIcon !== 'default';

    //     if (isDefaultAndNotEmpty) {
    //       return (
    //           <Image
    //             src={defaultUnStampedIcon[0].url}
    //             width={50}
    //             height={50}
    //             alt='Stamp icon'
    //           />
    //       )
    //     } else if (isNotDefault) {
    //       console.log(cardSteps[params.row.id - 1].unStampedIcon)
    //       return (
    //         <Image
    //           src={cardSteps[params.row.id - 1].unStampedIcon[0].url}
    //           width={50}
    //           height={50}
    //           alt='Stamp icon'
    //         />
    //       )
    //     } else {
    //       return <p>Empty</p>
    //     }
    //   }
    // },
    {
      field: 'reward',
      headerName: 'Reward',
      flex: 2,
      renderCell: (params) => {
        const reward = cardSteps[params.row.id - 1]?.reward || null;

        if (!reward) {
          return <p>No Reward</p>
        }

        return (<p>{reward.name || ""}</p>)
      }
    },
    {
      field: 'actions',
      headerName: '',
      width: 50,
      sortable: false,
      align: 'right',
      renderCell: (params) => (
        <div>
          <IconButton onClick={(event) => handleMenuOpen(event, params.row.id)}>
            <MoreVertIcon />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl) && selectedRowId === params.row.id}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleEdit}>Edit</MenuItem>
            {/* <MenuItem onClick={handleDelete} className={styles.deleteBtn}>Delete</MenuItem> */}
          </Menu>
        </div>
      ),
    },
  ];
  // ==== End of Table Related ====

  return (

    <>
      <form
        className={styles.form}
        onSubmit={formSubmissionHandler}
      >
        {!(isLoading === false && isLoadingErrorMessage === null && !isEnabled) && (
          <HeaderSection
            className={styles.header}
            title='Stamp Management'
            description={
              <p>
                Create and design your stamp card and the rewards to be given when
                customers hit a certain goal. <Link href='/'>Find out more.</Link>
              </p>
            }
            loading={isBtnLoading}
            isSuccess={isSubmissionSuccess}
            isError={isError}
            isDisabled={isBtnDisabled || !isEdit}
            errorMessage={errorMessage}
            infoMessage={!isEdit ? 'The information has been submitted for release and is currently under review. To make any changes, please cancel it under Release Submission.' : null}
          />
        )}

        {
          isLoading ?
            <LoadingPage /> :
            isLoadingErrorMessage !== null ?
              <ErrorPage /> :
              !isEnabled ? (
                <StampOnBoarding />
              ) : (
              <>

                {isEnabled && (
                  <>
                    <ContentCard>
                      <FieldHeader
                        title='Card Setup'
                      />

                  <div className={styles.fieldsContainer}>
                    <FormTextField
                      title='Card title (Optional)'
                      subtitle='A name for your stamp card. For example, BUY 6 COFFEES AND GET ONE FREE!'
                      placeholder=''
                      id='Card Title'
                      name='Card Title'
                      helperText={''}
                      error={false}
                      value={cardTitle}
                      disabled={!isEdit}
                      onChange={(event) => {
                        resetSaving();
                        setCardTitle(event.target.value)
                      }}
                    />

                    <FormTextField
                      title='Card description (Optional)'
                      subtitle='A short description of your program. Displays on the front of your the card to customers like BUY 6 COFFEES AND GET ONE FREE!'
                      placeholder=''
                      id='Card Description'
                      name='Card Description'
                      helperText={''}
                      error={false}
                      value={cardDescription}
                      disabled={!isEdit}
                      onChange={(event) => {
                        resetSaving();
                        setCardDescription(event.target.value)
                      }}
                    />

                    <div>
                      <FieldHeader
                        title='Terms and Conditions'
                        description='(Optional) Additional terms and conditions for this stamp card. Supports markdown formatting (bold, lists, etc.).'
                        type='h3'
                      />
                      <div className={styles.markdownEditor}>
                        <MDEditor
                          value={termsAndConditions || ''}
                          onChange={(value) => { 
                            // value is in Markdown format (e.g., "# Heading", "**bold**")
                            if (!isEdit) return;
                            resetSaving();
                            setTermsAndConditions(value || '');
                          }}
                          hideToolbar={!isEdit}
                          data-color-mode="light"
                          commands={customCommands}
                        />
                      </div>
                    </div>
                  </div>
                </ContentCard>

                <ContentCard>
                  <FieldHeader
                    title='Card&apos;s Expiration Settings'
                  />

                  <div className={styles.fieldsContainer}>
                    <FieldHeader
                      title='Expiration Type'
                      description='Once the expiration type are released, any changes require a minimum of 1 month&apos;s notice to ensure customers are informed in advance.'
                      type='h3'
                    />

                    <FullWidthDropdown
                      options={EXPIRATION_TYPE_OPTIONS}
                      labelId='expiration_type'
                      id='expiration_type'
                      value={expirationType}
                      disabled={!isEdit}
                      onChange={(event) => {
                        resetSaving();
                        setExpirationType(event.target.value);
                      }}
                    />


                    {expirationType === VALID_FOR_DAYS_EXPIRATION.value && <FormTextField
                      title='Number of Days to Expire'
                      placeholder='30'
                      type='number'
                      id='Card Title'
                      name='Card Title'
                      helperText={''}
                      error={false}
                      value={numberOfDaysToExpire}
                      disabled={!isEdit}
                      onChange={(event) => {
                        resetSaving();
                        setNumberOfDaysToExpire(event.target.value);
                      }}
                    />}
                  </div>
                </ContentCard>

                <ContentCard>

                  <div className={styles.fieldsContainer}>
                    <div>
                      <FieldHeader
                        title='Default Reward Stamp Design'
                        type='h2'
                      />

                      <FieldHeader
                        title='Reward Stamp Icons'
                        description='(Optional) This icon indicates a collected stamp on the loyalty card. It must always be displayed once the stamp is earned. We recommend using a distinct design or color to clearly show that it is stamped.'
                        type='h3'
                        className={styles.headerBtnMargin}
                      />

                      <DragDropImageUploader
                        images={rewardStampIcon}
                        setImages={setRewardStampIcon}
                        noOfImages={1}
                        resetSaving={resetSaving}
                        width={100}
                        height={100}
                        imageClassName={styles.dragdropBannerImage}
                        disabled={!isEdit}
                      />
                    </div>

                    <div>
                      <FieldHeader
                        title='Reward Unstamped Icons'
                        description='(Optional) This icon is primarily for design, indicating that no stamp is present. It&apos;s recommended to use a lighter color to distinguish it from a stamped icon. If no icon is specified, the area remains empty.'
                        type='h3'
                        className={styles.headerBtnMargin}
                      />

                      <DragDropImageUploader
                        images={rewardUnstampedIcon}
                        setImages={setRewardUnstampedIcon}
                        resetSaving={resetSaving}
                        noOfImages={1}
                        width={100}
                        height={100}
                        imageClassName={styles.dragdropBannerImage}
                        disabled={!isEdit}
                      />
                    </div>
                  </div>
                </ContentCard>

                <ContentCard>
                  <FieldHeader
                    title='Card Steps Setup'
                    description='Create the rewards that your customers will love. This will make to always come back!'
                    type='h2'
                  />
                  
                  <div className={styles.fieldsContainer}>
                    <FormTextField
                      title='Number of stamps'
                      subtitle='Total amount of stamps your stamp card should have. (Maximum of 16)'
                      placeholder='10'
                      type='number'
                      id='Number of stamps'
                      name='Number of stamps'
                      InputProps={{ inputProps: { min: 1, max: 16 } }}
                      helperText={''}
                      error={false}
                      value={numberOfStamps}
                      disabled={!isEdit}
                      onChange={(event) => {
                        resetSaving();
                        numberOfStampsHandler(event);
                      }}
                    />
                  </div>
                </ContentCard>

                <div className={styles.tableContainer}>
                  <DataGrid
                    rows={cardSteps}
                    columns={columns}
                    initialState={{ pagination: { paginationModel } }}
                    disableColumnFilter
                    disableColumnMenu
                    disableRowSelectionOnClick
                    pageSizeOptions={[20]}
                    disableSelectionOnClick
                    getRowHeight={() => 'auto'}
                    style={{ width: '100%', borderRadius: 12 }}
                    pagination
                  />
                </div>
                  </>
                )}
              </>
              )
        }
      </form>

      <EditStampStep
        selectedRowId={selectedRowId}
        isOpen={isEditStampOpen}
        setIsOpen={setIsEditStampOpen}
        stampedIcon={currentStepStampedIcon}
        setStampedIcon={setCurrentStepStampedIcon}
        unstampIcon={currentStepUnstampIcon}
        setUnstampedIcon={setCurrentStepUnstampIcon}
        reward={currentReward}
        setReward={setCurrentReward}
        onSave={modifyStampSaveHandler}
        isEdit={isEdit}
      />
    </>
  );
}