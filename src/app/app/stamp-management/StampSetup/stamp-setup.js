'use client';
import DragDropImageUploader from '@/components/Form Components/DragDropImageUploader/DragDropImageUploader';
import styles from './stamp-setup.module.css';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import { Button, TextField } from '@mui/material';
import Link from 'next/link';
import { useState } from 'react';
import FieldHeader from '@/components/FieldHeader/FieldHeader';
import FormTextField from '@/components/Form Components/FormTextField/FormTextField';

export default function StampSetup() {
  const [defaultStampedIcon, setDefaultStampedIcon] = useState([]);
  const [defaultUnStampedIcon, setDefaultUnStampedIcon] = useState([]);

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
              onChange={(event) => {  }}
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
              onChange={(event) => {  }}
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
              onChange={(event) => {  }}
            />
          </div>
        </ContentCard>

        <ContentCard>
            <FieldHeader
              title='Expiration Settings'
            />

          <div className={styles.fieldsContainer}>
            <FormTextField
              title='Expiration Type'
              subtitle='Once the expiration type are released, any changes require a minimum of 1 month&apos;s notice to ensure customers are informed in advance.'
              placeholder='Your name'
              type='number'
              id='Card Title'
              name='Card Title'
              required
              helperText={''}
              error={false}
              value={''}
              onChange={(event) => {  }}
            />

            <FormTextField
              title='Stamp Expiry Period (Days)'
              placeholder='30'
              type='number'
              id='Card Title'
              name='Card Title'
              required
              helperText={''}
              error={false}
              value={''}
              onChange={(event) => {  }}
            />
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
