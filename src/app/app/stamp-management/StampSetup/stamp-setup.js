'use client';
import DragDropImageUploader from '@/components/Form Components/DragDropImageUploader/DragDropImageUploader';
import styles from './stamp-setup.module.css';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import FieldHeader from '@/components/FieldHeader/FieldHeader';
import FormTextField from '@/components/Form Components/FormTextField/FormTextField';
import FullWidthDropdown from '@/components/FullWidthDropdown/FullWidthDropdown';
import { DataGrid } from '@mui/x-data-grid';
import { IconButton, Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { clamp } from '@/utility/numbers';
import EditStampStep from './_views/EditStampStep';
import Image from 'next/image';
import apiClient from '@/utility/api';
import { STAMP_MANAGEMENT } from '@/utility/apiPaths';

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
  // For Header Status
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isBtnLoading, setIsBtnLoading] = useState(false);
  const [isBtnDisabled, setIsBtnDisabled] = useState(true);
  const [isSubmissionSuccess, setIsSubmissionSuccess] = useState(false);

  // For Form Data
  const [cardTitle, setCardTitle] = useState('');
  const [cardDescription, setCardDescription] = useState('');
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

  const formSubmissionHandler = async(event) => {
    event.preventDefault();
    setIsBtnLoading(true);

    try {
      const formData = new FormData();

      formData.append('cardTitle', cardTitle);
      formData.append('cardDescription', cardDescription);
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

      // Log FormData contents properly
      console.log("FormData contents:");
      for (const pair of formData.entries()) {
        console.log(pair[0] + ': ' + pair[1]);
      }

      await apiClient.post(STAMP_MANAGEMENT, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Form submitted successfully');
      setIsSubmissionSuccess(true);
      setIsBtnLoading(false);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsBtnLoading(false);
    }
    
  };

  const resetSaving= () => {
    setIsSubmissionSuccess(false);
    setIsBtnDisabled(false);
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

  useEffect(() => {
    console.log("DEFAULT STAMPED MODIFIED", rewardStampIcon)
    setCardSteps(prevValue => {
      const data = prevValue.map((value) => {
        if (value.stampedIcon === 'default' || value.stampedIcon === null || value.stampedIcon.length === 0) {
          return { ...value, stampedIcon: 'default'}
        }

        return { ...value };
      })

      return data
    })
  }, [rewardStampIcon])

  useEffect(() => {
    setCardSteps(prevValue => {
      const data = prevValue.map((value) => {
        if (value.unStampedIcon === null || value.unStampedIcon === 'default' || value.unStampedIcon.length === 0) {
          return { ...value, unStampedIcon: 'default'}
        }

        return { ...value };
      })

      return data
    })
  }, [rewardUnstampedIcon])

  // ==== Modify Selection ===
  const [currentStepStampedIcon, setCurrentStepStampedIcon] = useState([]);
  const [currentStepUnstampIcon, setCurrentStepUnstampIcon] = useState([]);

  const modifyStampSaveHandler = () => {
    console.log('Current Modified Row:', selectedRowId);

    setCardSteps(preValue => {
      console.log(preValue)
      preValue[selectedRowId - 1].stampedIcon = currentStepStampedIcon === rewardStampIcon || currentStepStampedIcon.length === 0 ? 'default' : currentStepStampedIcon;
      preValue[selectedRowId - 1].unStampedIcon = currentStepUnstampIcon === rewardUnstampedIcon || currentStepStampedIcon.length === 0 ? 'default' : currentStepUnstampIcon;
      preValue[selectedRowId - 1].reward = currentReward;
      return preValue
    });

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
        const reward = cardSteps[params.row.id - 1].reward;

        if (reward === undefined) {
          return <p>No Reward</p>
        }

        return (<p>{reward.name}</p>)
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
          isDisabled={isBtnDisabled}
          errorMessage={errorMessage}
        />

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
              onChange={(event) => { 
                resetSaving();
                setCardDescription(event.target.value) 
              }}
            />

            <FormTextField
              title='Number of stamps'
              subtitle='Total amount of stamps your stamp card should have. (Maximum of 16)'
              placeholder='10'
              type='number'
              id='Card Title'
              name='Card Title'
              InputProps={{ inputProps: { min: 1, max: 16 } }}
              helperText={''}
              error={false}
              value={numberOfStamps}
              onChange={(event) => { 
                resetSaving();
                numberOfStampsHandler(event);
              }}
            />
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
              />
            </div>
          </div>
        </ContentCard>

        <ContentCard>
          <FieldHeader
            title='Card Steps Setup'
            description='Create the rewards that your customers will love. This will make to always come back!'
            type='h3'
          />
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
      />
    </>
  );
}
