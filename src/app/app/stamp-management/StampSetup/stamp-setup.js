'use client';
import DragDropImageUploader from '@/components/Form Components/DragDropImageUploader/DragDropImageUploader';
import styles from './stamp-setup.module.css';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import Link from 'next/link';
import { useState } from 'react';
import FieldHeader from '@/components/FieldHeader/FieldHeader';
import FormTextField from '@/components/Form Components/FormTextField/FormTextField';
import FullWidthDropdown from '@/components/FullWidthDropdown/FullWidthDropdown';

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

export default function StampSetup() {
  const [defaultStampedIcon, setDefaultStampedIcon] = useState([]);
  const [defaultUnStampedIcon, setDefaultUnStampedIcon] = useState([]);
  const [expirationType, setExpirationType] = useState(VALID_FOR_DAYS_EXPIRATION.value);

  const formSubmissionHandler = (event) => {
    event.preventDefault();
    console.log("Stamp Setup saved called");
  };

  return (

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
            inputProps={{
              min: 0,
              max: 16,
            }}
            helperText={''}
            error={false}
            value={''}
            onChange={(event) => { }}
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


          { expirationType === VALID_FOR_DAYS_EXPIRATION.value && <FormTextField
            title='Number of Days to Expire'
            placeholder='30'
            type='number'
            id='Card Title'
            name='Card Title'
            required
            helperText={''}
            error={false}
            value={''}
            onChange={(event) => { }}
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
        <div>
          <h2>Card Steps Setup</h2>
          <p className={styles.description}>
            Create the rewards that your customers will love. This will make to always come back!
          </p>



        </div>
      </ContentCard>
    </form>
  );
}
