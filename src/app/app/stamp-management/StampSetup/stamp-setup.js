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
  reward: 'No Reward'
}

export default function StampSetup() {
  const [numberOfStamps, setNumberOfStamps] = useState(6);
  const [defaultStampedIcon, setDefaultStampedIcon] = useState([]);
  const [defaultUnStampedIcon, setDefaultUnStampedIcon] = useState([]);
  const [expirationType, setExpirationType] = useState(VALID_FOR_DAYS_EXPIRATION.value);
  const [cardSteps, setCardSteps] = useState(Array.from({ length: 6 }, (_, index) => ({
    ...DEFAULT_STAMP_STEP,
    id: index + 1
  })))

  const formSubmissionHandler = (event) => {
    event.preventDefault();
    console.log("Stamp Setup saved called");
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
    console.log("DEFAULT STAMPED MODIFIED", defaultStampedIcon)
    setCardSteps(prevValue => {
      const data = prevValue.map((value) => {
        if (value.stampedIcon === 'default' || value.stampedIcon === null || value.stampedIcon.length === 0) {
          return { ...value, stampedIcon: 'default'}
        }

        return { ...value };
      })

      return data
    })
  }, [defaultStampedIcon])

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
  }, [defaultUnStampedIcon])

  // ==== Modify Selection ===
  const [currentStepStampedIcon, setCurrentStepStampedIcon] = useState([]);
  const [currentStepUnstampIcon, setCurrentStepUnstampIcon] = useState([]);

  const modifyStampSaveHandler = () => {
    console.log('Current Modified Row:', selectedRowId);

    setCardSteps(preValue => {
      console.log(preValue)
      preValue[selectedRowId - 1].stampedIcon = currentStepStampedIcon === defaultStampedIcon || currentStepStampedIcon.length === 0 ? 'default' : currentStepStampedIcon;
      preValue[selectedRowId - 1].unStampedIcon = currentStepUnstampIcon === defaultUnStampedIcon || currentStepStampedIcon.length === 0 ? 'default' : currentStepUnstampIcon;
      return preValue
    });

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
      setCurrentStepStampedIcon(defaultStampedIcon);
    } else {
      console.log("SHDSD")
      setCurrentStepStampedIcon(currentStepDetail.stampedIcon);
    }

    if (currentStepDetail.unStampedIcon === 'default') {
      setCurrentStepUnstampIcon(defaultUnStampedIcon);
    } else {
      setCurrentStepUnstampIcon(currentStepDetail.unStampedIcon);
    }

  };

  const handleDelete = () => {
    console.log('Delete location with id:', selectedRowId);
    handleMenuClose();
  };

  const columns = [
    {
      field: 'id',
      headerName: 'Stamp',
      width: 60,
    },
    {
      field: 'stampedIcon',
      headerName: 'Stamped Icon',
      flex: 1,
    },
    {
      field: 'unstampedIcon',
      headerName: 'Unstamped Icon',
      flex: 1,
    },
    {
      field: 'reward',
      headerName: 'Reward',
      flex: 2
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
            <MenuItem onClick={handleDelete}>Delete</MenuItem>
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
              required
              helperText={''}
              error={false}
              value={''}
              onChange={(event) => { }}
            />

            <FormTextField
              title='Card description (Optional)'
              subtitle='A short description of your program. Displays on the front of your the card to customers like BUY 6 COFFEES AND GET ONE FREE!'
              placeholder=''
              id='Card Title'
              name='Card Title'
              required
              helperText={''}
              error={false}
              value={''}
              onChange={(event) => { }}
            />

            <FormTextField
              title='Number of stamps'
              subtitle='Total amount of stamps your stamp card should have. (Maximum of 16)'
              placeholder='6'
              type='number'
              id='Card Title'
              name='Card Title'
              InputProps={{ inputProps: { min: 1, max: 16 } }}
              helperText={''}
              error={false}
              value={numberOfStamps}
              onChange={(event) => { numberOfStampsHandler(event) }}
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
              onChange={(event) => { setExpirationType(event.target.value) }}
            />


            {expirationType === VALID_FOR_DAYS_EXPIRATION.value && <FormTextField
              title='Number of Days to Expire'
              placeholder='30'
              type='number'
              id='Card Title'
              name='Card Title'
              required
              helperText={''}
              error={false}
              value={''}
              onChange={(event) => { numberOfStampsHandler(event) }}
            />}
          </div>
        </ContentCard>

        <ContentCard>

          <div className={styles.fieldsContainer}>
            <div>
              <FieldHeader
                title='Default Design'
                type='h2'
              />

              <FieldHeader
                title='Stamped Icons'
                description='This icon indicates a collected stamp on the loyalty card. It must always be displayed once the stamp is earned. We recommend using a distinct design or color to clearly show that it is stamped.'
                type='h3'
                className={styles.headerBtnMargin}
              />

              <DragDropImageUploader
                images={defaultStampedIcon}
                setImages={setDefaultStampedIcon}
                noOfImages={1}
                width={100}
                height={100}
                imageClassName={styles.dragdropBannerImage}
              />
            </div>

            <div>
              <FieldHeader
                title='Unstamped Icons'
                description='(Optional) This icon is primarily for design, indicating that no stamp is present. It’s recommended to use a lighter color to distinguish it from a stamped icon. If no icon is specified, the area remains empty.'
                type='h3'
                className={styles.headerBtnMargin}
              />

              <DragDropImageUploader
                images={defaultUnStampedIcon}
                setImages={setDefaultUnStampedIcon}
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
        isOpen={isEditStampOpen}
        setIsOpen={setIsEditStampOpen}
        stampedIcon={currentStepStampedIcon}
        setStampedIcon={setCurrentStepStampedIcon}
        unstampIcon={currentStepUnstampIcon}
        setUnstampedIcon={setCurrentStepUnstampIcon}
        onSave={modifyStampSaveHandler}
      />
    </>
  );
}
