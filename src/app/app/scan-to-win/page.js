'use client';
import FormTextField from '@/components/Form Components/FormTextField/FormTextField';
import styles from './page.module.css';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import Link from 'next/link';
import { useEffect, useState, useRef, useCallback } from 'react';
import FieldHeader from '@/components/FieldHeader/FieldHeader';
import DragDropImageUploader from '@/components/Form Components/DragDropImageUploader/DragDropImageUploader';
import { DataGrid } from '@mui/x-data-grid';
import { IconButton, Menu, MenuItem, Switch } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditRewardChance from './_views/EditRewardChance';
import ScanToWinOnboarding from './ScanToWinOnboarding/ScanToWinOnboarding';
import LoadingPage from '@/components/LoadingPage/LoadingPage';
import ErrorPage from '@/components/ErrorPage/ErrorPage';
import apiClient from '@/utility/api';
import { REWARDS } from '@/utility/apiPaths';

const DEFAULT_REWARD_CHANCE = {
  id: 1,
  reward: null,
  percentage: 0,
  max: null,
};

export default function ScanToWinPage() {
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

  // Form Data
  const [cardImage, setCardImage] = useState([]);
  const [rewardChances, setRewardChances] = useState([]);
  
  // Track if configuration exists (for POST vs PUT)
  const [hasExistingConfig, setHasExistingConfig] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);

  // Store initial values to compare for unsaved changes
  const initialIsEnabledRef = useRef(false);
  const initialCardImageRef = useRef([]);
  const initialRewardChancesRef = useRef([]);

  // Track if we've pushed a history state for back button handling
  const historyStatePushedRef = useRef(false);

  // Table Related
  const [isEditRewardChanceOpen, setIsEditRewardChanceOpen] = useState(false);
  const paginationModel = { page: 0, pageSize: 20 };
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [currentRewardChance, setCurrentRewardChance] = useState(null);

  // Calculate total percentage
  const totalPercentage = rewardChances.reduce((sum, chance) => sum + (parseFloat(chance.percentage) || 0), 0);
  const hasPercentageError = totalPercentage !== 100;

  // Check if at least one reward chance has no max (max is null or undefined)
  const hasAtLeastOneWithoutMax = rewardChances.length === 0 || rewardChances.some(chance => chance.max === null || chance.max === undefined);
  const hasMaxError = !hasAtLeastOneWithoutMax;

  const handleMenuOpen = (event, rowId) => {
    setAnchorEl(event.currentTarget);
    setSelectedRowId(rowId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRowId(null);
    setIsEditRewardChanceOpen(false);
  };

  const handleEdit = () => {
    const currentChance = rewardChances.find(chance => chance.id === selectedRowId);
    if (currentChance) {
      setCurrentRewardChance({ ...currentChance });
      setIsEditRewardChanceOpen(true);
      // Close the menu but don't close the popup
      setAnchorEl(null);
      setSelectedRowId(null);
    }
  };

  const handleDelete = () => {
    setRewardChances(prev => prev.filter(chance => chance.id !== selectedRowId));
    resetSaving();
    handleMenuClose();
  };

  const handleAddNewChance = () => {
    const newChance = {
      ...DEFAULT_REWARD_CHANCE,
      id: null, // Will be assigned when saving
    };
    setCurrentRewardChance(newChance);
    setIsEditRewardChanceOpen(true);
  };

  const handleSaveRewardChance = (updatedChance) => {
    if (updatedChance.id === null || updatedChance.id === undefined) {
      // New entry - assign ID
      const newId = rewardChances.length > 0 ? Math.max(...rewardChances.map(c => c.id), 0) + 1 : 1;
      updatedChance.id = newId;
      setRewardChances(prev => [...prev, updatedChance]);
    } else {
      // Update existing
      const existingIndex = rewardChances.findIndex(chance => chance.id === updatedChance.id);
      if (existingIndex >= 0) {
        setRewardChances(prev => 
          prev.map(chance => 
            chance.id === updatedChance.id ? updatedChance : chance
          )
        );
      }
    }
    
    resetSaving();
    setIsEditRewardChanceOpen(false);
    setCurrentRewardChance(null);
  };

  const resetSaving = () => {
    setIsSubmissionSuccess(false);
    clearError();
  };

  // Check if there are unsaved changes
  const checkUnsavedChanges = () => {
    if (!isEdit) return false;

    const isEnabledChanged = isEnabled !== initialIsEnabledRef.current;
    
    const normalizeImage = (img) => ({
      url: img?.url || '',
      name: img?.name || '',
      hasFile: !!img?.file
    });
    const cardImageChanged = JSON.stringify(cardImage.map(normalizeImage)) !== 
      JSON.stringify(initialCardImageRef.current.map(normalizeImage)) ||
      cardImage.length !== initialCardImageRef.current.length;

    const rewardChancesChanged = JSON.stringify(rewardChances) !== JSON.stringify(initialRewardChancesRef.current);

    return isEnabledChanged || cardImageChanged || rewardChancesChanged;
  };

  // Update button disabled state based on unsaved changes
  useEffect(() => {
    if (!isEdit) {
      setIsBtnDisabled(true);
      return;
    }
    
    const hasChanges = checkUnsavedChanges();
    setIsBtnDisabled(!hasChanges);
  }, [isEnabled, cardImage, rewardChances, isEdit]);

  const clearError = () => {
    setIsError(false);
    setErrorMessage('');
  };

  const formSubmissionHandler = async (event) => {
    event.preventDefault();
    
    // Validate percentage totals 100%
    if (isEnabled && hasPercentageError) {
      setIsError(true);
      setErrorMessage(`Total percentage must equal 100%. Current total: ${totalPercentage}%`);
      return;
    }

    // Validate at least one reward chance has no max
    if (isEnabled && hasMaxError) {
      setIsError(true);
      setErrorMessage('At least one reward chance must not have a max value.');
      return;
    }

    setIsBtnLoading(true);
    clearError();

    try {
      const formData = new FormData();
      formData.append('isEnabled', isEnabled.toString());
      
      if (cardImage.length > 0 && cardImage[0]?.file) {
        formData.append('cardImage', cardImage[0].file);
      }

      // Serialize full reward object for no-SQL backend (no joins); send all reward info per chance
      const serializeReward = (reward) => {
        if (!reward) return null;
        return {
          id: reward.id,
          rewardType: reward.type ?? 'scanToWinReward',
          rewardName: reward.name ?? '',
          description: reward.description ?? '',
          termsAndConditions: reward.termsAndConditions ?? '',
          rewardImage: typeof reward.image === 'string' ? reward.image : (reward.image?.url ?? ''),
          expiryNumberOfDays: reward.expiry != null ? String(reward.expiry) : '30',
          customRewardId: reward.custom_id ?? '',
          rewardTags: reward.tags ?? '',
          isPublished: reward.isPublished === true || reward.isPublished === 'true',
        };
      };

      // Prepare reward chances with full reward embedded (backend stores as-is, no joins)
      const rewardChancesData = rewardChances.map(chance => ({
        id: chance.id,
        rewardId: chance.reward ? chance.reward.id : null,
        reward: serializeReward(chance.reward),
        percentage: parseFloat(chance.percentage) || 0,
        max: chance.max !== null && chance.max !== undefined ? parseInt(chance.max) : null
      }));

      formData.append('rewardChances', JSON.stringify(rewardChancesData));

      // Log the data that will be sent to backend
      const dataToSend = {
        isEnabled: isEnabled,
        cardImage: cardImage.length > 0 && cardImage[0]?.file 
          ? { name: cardImage[0].file.name, type: cardImage[0].file.type, size: cardImage[0].file.size }
          : cardImage.length > 0 && cardImage[0]?.url 
            ? { url: cardImage[0].url }
            : null,
        rewardChances: rewardChancesData
      };
      
      console.log('Data structure to be sent to backend:', JSON.stringify(dataToSend, null, 2));
      console.log('Reward Chances Details:');
      rewardChancesData.forEach((chance, index) => {
        console.log(`  Chance ${index + 1}:`, {
          id: chance.id,
          rewardId: chance.rewardId,
          percentage: chance.percentage,
          max: chance.max
        });
      });
      
      // Log FormData contents
      console.log('FormData contents:');
      for (const pair of formData.entries()) {
        if (pair[0] === 'cardImage') {
          console.log(`${pair[0]}: [File: ${pair[1]?.name || 'No name'}, Type: ${pair[1]?.type || 'No type'}, Size: ${pair[1]?.size || 0} bytes]`);
        } else if (pair[0] === 'rewardChances') {
          console.log(`${pair[0]}: ${pair[1]}`);
          console.log(`${pair[0]} (parsed):`, JSON.parse(pair[1]));
        } else {
          console.log(`${pair[0]}: ${pair[1]}`);
        }
      }

      // Use POST for first save, PUT for updates
      const endpoint = '/api/data/qrcode/configuration';
      const method = hasExistingConfig ? 'put' : 'post';
      
      await apiClient[method](endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Form submitted successfully');
      console.log('Data sent:', dataToSend);
      setIsSubmissionSuccess(true);
      setIsBtnLoading(false);
      setHasExistingConfig(true); // Mark as existing after first save
      
      // Update initial values after successful save
      initialIsEnabledRef.current = isEnabled;
      initialCardImageRef.current = JSON.parse(JSON.stringify(cardImage));
      initialRewardChancesRef.current = JSON.parse(JSON.stringify(rewardChances));
    } catch (error) {
      const errorData = error?.response?.data;
      const message = errorData?.error?.message || errorData?.message || error?.message || 'An unknown error occurred';
      const code = errorData?.error?.statusCode || errorData?.code || error?.code || 'UNKNOWN';
      console.error(`Form submission error: ${message} (Error code: ${code})`);
      setIsError(true);
      setErrorMessage(`An error occurred. ${message} (Error code: ${code})`);
      setIsBtnLoading(false);
    }
  };

  const fetchScanToWinData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/api/data/qrcode/configuration');
      const apiData = response.data?.data;

      if (apiData) {
        setHasExistingConfig(true);

        const enabled = apiData.isEnabled === 'true' || apiData.isEnabled === true;
        setIsEnabled(enabled);

        if (apiData.cardImage_signedUrl) {
          setCardImage([{
            name: apiData.cardImage_signedUrl,
            file: null,
            url: apiData.cardImage_signedUrl,
          }]);
          initialCardImageRef.current = [{
            name: apiData.cardImage_signedUrl,
            file: null,
            url: apiData.cardImage_signedUrl,
          }];
        } else {
          setCardImage([]);
          initialCardImageRef.current = [];
        }

        let parsedRewardChances = [];
        if (apiData.rewardChances) {
          try {
            if (typeof apiData.rewardChances === 'string') {
              parsedRewardChances = JSON.parse(apiData.rewardChances);
            } else {
              parsedRewardChances = apiData.rewardChances;
            }
          } catch (e) {
            console.error('Error parsing rewardChances:', e);
            parsedRewardChances = [];
          }
        }

        if (parsedRewardChances.length > 0) {
          try {
            const rewardsResponse = await apiClient.get(REWARDS);
            const rewardsData = rewardsResponse.data?.data;
            const apiRewards = rewardsData?.rewards || [];

            const transformedRewards = apiRewards.map(reward => ({
              id: reward.reward_id,
              type: reward.rewardType || 'scanToWinReward',
              name: reward.rewardName || 'Unnamed Reward',
              description: reward.description || 'No description available',
              image: {
                url: reward.rewardImage || '/images/placeholder/reward_placeholder.png'
              },
              expiry: reward.expiryNumberOfDays?.toString() || '30',
              custom_id: reward.customRewardId || '',
              tags: reward.rewardTags || '',
              isCheck: false,
              isPublished: reward.isPublished === 'true' || reward.isPublished === true
            }));

            const scanToWinRewards = transformedRewards.filter(reward => reward.type === 'scanToWinReward');

            const rewardChancesWithRewards = parsedRewardChances.map(chance => {
              const reward = scanToWinRewards.find(r => r.id === chance.rewardId);
              return {
                id: chance.id,
                reward: reward || null,
                percentage: chance.percentage || 0,
                max: chance.max !== null && chance.max !== undefined ? chance.max : null
              };
            });

            setRewardChances(rewardChancesWithRewards);
            initialRewardChancesRef.current = JSON.parse(JSON.stringify(rewardChancesWithRewards));
          } catch (rewardError) {
            console.error('Error fetching rewards:', rewardError);
            const rewardChancesWithoutRewards = parsedRewardChances.map(chance => ({
              id: chance.id,
              reward: null,
              percentage: chance.percentage || 0,
              max: chance.max !== null && chance.max !== undefined ? chance.max : null
            }));
            setRewardChances(rewardChancesWithoutRewards);
            initialRewardChancesRef.current = JSON.parse(JSON.stringify(rewardChancesWithoutRewards));
          }
        } else {
          setRewardChances([]);
          initialRewardChancesRef.current = [];
        }

        initialIsEnabledRef.current = enabled;
      } else {
        setHasExistingConfig(false);
        initialIsEnabledRef.current = false;
        initialCardImageRef.current = [];
        initialRewardChancesRef.current = [];
      }
    } catch (error) {
      if (error?.response?.status === 404) {
        setHasExistingConfig(false);
        initialIsEnabledRef.current = false;
        initialCardImageRef.current = [];
        initialRewardChancesRef.current = [];
      } else {
        const errorData = error?.response?.data;
        const message = errorData?.error?.message || errorData?.message || error?.message || 'Failed to load scan-to-win data';
        const code = errorData?.error?.statusCode || errorData?.code || error?.code || 'UNKNOWN';
        console.error(`Error fetching scan-to-win data: ${message} (Error code: ${code})`);
        setIsError(true);
        setErrorMessage(`Failed to load scan-to-win data. ${message} (Error code: ${code})`);
        setIsLoadingErrorMessage(`Failed to load scan-to-win data. ${message} (Error code: ${code})`);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScanToWinData();
  }, [fetchScanToWinData]);

  const handleGetStarted = async () => {
    setIsEnabling(true);
    clearError();
    try {
      const formData = new FormData();
      formData.append('isEnabled', 'true');
      formData.append('rewardChances', '[]');

      await apiClient.post('/api/data/qrcode/configuration', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setHasExistingConfig(true);
      await fetchScanToWinData();
    } catch (err) {
      const errorData = err?.response?.data;
      const msg = errorData?.error?.message || errorData?.message || err?.message || 'Failed to enable Scan to Win';
      setIsError(true);
      setErrorMessage(msg);
    } finally {
      setIsEnabling(false);
    }
  };

  // Handle browser refresh/close/back button warning
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (checkUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    const handlePopState = (e) => {
      if (checkUnsavedChanges()) {
        const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave? Your changes will be lost.');
        if (!confirmed) {
          window.history.pushState(null, '', window.location.href);
          historyStatePushedRef.current = true;
        } else {
          historyStatePushedRef.current = false;
        }
      }
    };

    const updateHistoryState = () => {
      if (checkUnsavedChanges() && !historyStatePushedRef.current) {
        window.history.pushState({ unsavedChanges: true }, '', window.location.href);
        historyStatePushedRef.current = true;
      } else if (!checkUnsavedChanges() && historyStatePushedRef.current) {
        historyStatePushedRef.current = false;
      }
    };

    const handleLinkClick = (e) => {
      if (checkUnsavedChanges()) {
        const link = e.target.closest('a');
        if (link && link.href) {
          const isInternalLink = link.href.startsWith(window.location.origin) || link.href.startsWith('/');
          const isAnchorLink = link.href.includes('#') && link.href.split('#')[0] === window.location.href.split('#')[0];
          
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

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    document.addEventListener('click', handleLinkClick, true);
    updateHistoryState();

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('click', handleLinkClick, true);
    };
  }, [isEnabled, cardImage, rewardChances, isEdit]);

  const columns = [
    {
      field: 'id',
      headerName: 'No',
      width: 80,
      renderCell: (params) => {
        // Display row number based on position in array
        const rowIndex = rewardChances.findIndex(chance => chance.id === params.row.id);
        return <p>{rowIndex + 1}</p>;
      }
    },
    {
      field: 'reward',
      headerName: 'Reward',
      flex: 2,
      renderCell: (params) => {
        const reward = params.row.reward;
        if (!reward) {
          return <p>No Reward</p>;
        }
        return <p>{reward.name || ''}</p>;
      }
    },
    {
      field: 'percentage',
      headerName: 'Percentage',
      width: 150,
      renderCell: (params) => {
        return <p>{params.row.percentage}%</p>;
      }
    },
    {
      field: 'max',
      headerName: 'Max',
      width: 100,
      renderCell: (params) => {
        const max = params.row.max;
        return <p>{max !== null && max !== undefined ? max : '-'}</p>;
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
            <MenuItem onClick={handleEdit}>Modify</MenuItem>
            <MenuItem onClick={handleDelete} className={styles.deleteBtn}>Delete</MenuItem>
          </Menu>
        </div>
      ),
    },
  ];

  const showOnboarding = !hasExistingConfig && !isLoading && isLoadingErrorMessage === null;

  return (
    <>
      <form
        className={styles.form}
        onSubmit={formSubmissionHandler}
      >
        {!showOnboarding && (
          <HeaderSection
            className={styles.header}
            title='Scan to Win'
            description={
              <p>
                Configure your scan-to-win rewards system. Set up reward chances and card images.
                <Link href='/'>Find out more.</Link>
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

        {isLoading ? (
          <LoadingPage />
        ) : isLoadingErrorMessage !== null ? (
          <ErrorPage />
        ) : showOnboarding ? (
          <ScanToWinOnboarding
            onGetStarted={handleGetStarted}
            isEnabling={isEnabling}
          />
        ) : (
          <>

            {isEnabled && (
              <>
                <ContentCard>
                  <FieldHeader
                    title='Scan to Win Setting'
                  />

                  <div className={styles.fieldsContainer}>
                    <div>
                      <FieldHeader
                        title='Card Image (Optional)'
                        description='Give a card image of your choose when user click before it review.'
                        type='h3'
                        className={styles.headerBtnMargin}
                      />

                      <DragDropImageUploader
                        images={cardImage}
                        setImages={setCardImage}
                        noOfImages={1}
                        resetSaving={resetSaving}
                        width={200}
                        height={200}
                        imageClassName={styles.dragdropBannerImage}
                        disabled={!isEdit}
                      />
                    </div>
                  </div>
                </ContentCard>

                <ContentCard>
                  <div className={styles.rewardChancesHeader}>
                    <div className={styles.rewardChancesTitleRow}>
                      <div>
                        <FieldHeader
                          title='Reward chances'
                        />
                        {hasPercentageError && (
                          <p className={styles.errorMessage}>
                            Total percentage must equal 100%. Current Total: {totalPercentage}%
                          </p>
                        )}
                        {hasMaxError && (
                          <p className={styles.errorMessage}>
                            At least one reward chance must not have a max value.
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        className={styles.addButton}
                        onClick={handleAddNewChance}
                        disabled={!isEdit}
                      >
                        Add Reward Chance
                      </button>
                    </div>
                  </div>

                  <div className={styles.tableContainer}>
                    <DataGrid
                      rows={rewardChances}
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
                </ContentCard>
              </>
            )}
          </>
        )}
      </form>

      <EditRewardChance
        isOpen={isEditRewardChanceOpen}
        setIsOpen={(open) => {
          setIsEditRewardChanceOpen(open);
          if (!open) {
            setCurrentRewardChance(null);
          }
        }}
        rewardChance={currentRewardChance}
        onSave={handleSaveRewardChance}
        isEdit={isEdit}
      />
    </>
  );
}
