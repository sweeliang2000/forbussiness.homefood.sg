'use client';
import FormTextField from '@/components/Form Components/FormTextField/FormTextField';
import styles from './page.module.css';
import { ContentCard } from "@/components/ContentCard/ContentCard";
import { HeaderSection } from "@/components/HeaderSection/HeaderSection";
import { TextField } from '@mui/material';
import Link from "next/link";
import { useState } from 'react';

const BUSINESS_NAME = 'businessName';
const UEN = 'uen';
const UNIT_NUMBER = 'unitNumber';
const BUILDING_NAME = 'buildingName';
const STREET_ADDRESS = 'streetAddress';
const POSTAL_CODE = 'postalCode';
const NAME = 'name';
const ROLE = 'role';
const PHONE_NUMBER = 'phoneNumber';

export default function StampSetup() {
  const [isBtnLoading, setIsBtnLoading] = useState(false);
  const [enteredValues, setEnteredValues] = useState({
    [BUSINESS_NAME]: '',
    [UEN]: '',
    [UNIT_NUMBER]: '',
    [BUILDING_NAME]: '',
    [STREET_ADDRESS]: '',
    [POSTAL_CODE]: '',
    [NAME]: '',
    [ROLE]: '',
    [PHONE_NUMBER]: '',
  });
  
  const [textfieldError, setTextfieldError] = useState({
    [BUSINESS_NAME]: false,
    [UEN]: false,
    [UNIT_NUMBER]: false,
    [BUILDING_NAME]: false,
    [STREET_ADDRESS]: false,
    [POSTAL_CODE]: false,
    [NAME]: false,
    [ROLE]: false,
    [PHONE_NUMBER]: false,
  });

  const [helperText, setHelperText] = useState({
    [BUSINESS_NAME]: '',
    [UEN]: '',
    [UNIT_NUMBER]: '',
    [BUILDING_NAME]: '',
    [STREET_ADDRESS]: '',
    [POSTAL_CODE]: '',
    [NAME]: '',
    [ROLE]: '',
    [PHONE_NUMBER]: '',
  });

  const inputChangeHandler = (key, value) => {
    setEnteredValues((prevValues) => ({
      ...prevValues,
      [key]: value
    }))
  };

  const textfieldErrorHandler = (key, value) => {
    setTextfieldError((preValues) => ({
      ...preValues,
      [key]: value
    }))
  };

  const helperTextHandler = (key, value) => {
    setHelperText((preValues) => ({
      ...preValues,
      [key]: value
    }))
  };

  const formSubmissionHandler = (event) => {
    event.preventDefault();
    console.log(enteredValues);
  };


  return (
    <div className={styles.container}>
      <form
        className={styles.form}
        onSubmit={formSubmissionHandler}
      >
        <HeaderSection
          className={styles.header}
          title="Your Business"
          description={
            <p>
              This information is used to verify your business.
              The details will not be visible to your customers. <Link href='/'>Find out more.</Link>
            </p>

          }
          loading={isBtnLoading}
        />
        <ContentCard className={styles.content}>
          <div>
            <h2>Official information</h2>

            <FormTextField
              title='Business name*'
              subtitle='The official business name registered with ACRA. For example, McDonald&apos;s Corporation.'
              placeholder="McDonald's Corporation."
              id={BUSINESS_NAME}
              name={BUSINESS_NAME}
              required
              helperText={helperText.buildingName}
              error={textfieldError.buildingName}
              value={enteredValues.buildingName}
              onChange={(event) => { inputChangeHandler(BUSINESS_NAME, event.target.value) }}
            />
          </div>

          <div>
            <FormTextField
              title='Unique Entity Number (UEN)*'
              subtitle='The Unique Entity Number (UEN) is a 9- or 10-digit number issued by the Accounting and Corporate Regulatory Authority (ACRA) for registered businesses in Singapore.'
              placeholder="McDonalds"
              type="number"
              id={UEN}
              name={UEN}
              required
              helperText={helperText.uen}
              value={enteredValues.uen}
              error={textfieldError.uen}
              onChange={(event) => { inputChangeHandler(UEN, event.target.value) }}
            />
          </div>

          <div>
            <h3>Registered Business Address</h3>
            <p className={styles.description}>
              This is the name that customers will see in the app for example, McDonalds.
            </p>

            <div className={styles.addressFields}>
              <TextField
                label="Unit Number"
                variant="outlined"
                placeholder="#05-23"
                fullWidth
                id={UNIT_NUMBER}
                name={UNIT_NUMBER}
                required
                helperText={helperText.unitNumber}
                value={enteredValues.unitNumber}
                error={textfieldError.unitNumber}
                onChange={(event) => { inputChangeHandler(UNIT_NUMBER, event.target.value) }}
              />

              <TextField
                label="Building Name"
                variant="outlined"
                placeholder="International Plaza"
                fullWidth
                id={BUILDING_NAME}
                name={BUILDING_NAME}
                helperText={helperText.buildingName}
                error={textfieldError.buildingName}
                value={enteredValues.buildingName}
                onChange={(event) => { inputChangeHandler(BUILDING_NAME, event.target.value) }}
              />

              <TextField
                label="Street Address"
                variant="outlined"
                placeholder="10 Anson Road"
                fullWidth
                id={STREET_ADDRESS}
                name={STREET_ADDRESS}
                required
                helperText={helperText.streetAddress}
                error={textfieldError.streetAddress}
                value={enteredValues.streetAddress}
                onChange={(event) => { inputChangeHandler(STREET_ADDRESS, event.target.value) }}
              />

              <TextField
                label="Postal Code"
                variant="outlined"
                placeholder="079903"
                fullWidth
                type="number"
                slotProps={{
                  input: {
                    maxLength: 6,
                  },
                }}
                id={POSTAL_CODE}
                name={POSTAL_CODE}
                required
                helperText={helperText.postalCode}
                error={textfieldError.postalCode}
                value={enteredValues.postalCode}
                onChange={(event) => { inputChangeHandler(POSTAL_CODE, event.target.value) }}
              />
            </div>
          </div>
        </ContentCard>

        <ContentCard className={styles.content}>
          <div>
            <h2>Representative Contact Details</h2>

            <FormTextField
              title='Name*'
              placeholder='Your name'
              id={NAME}
              name={NAME}
              required
              helperText={helperText.name}
              error={textfieldError.name}
              value={enteredValues.name}
              onChange={(event) => { inputChangeHandler(NAME, event.target.value) }}
            />
          </div>

          <FormTextField
            title='Role*'
            placeholder='Accounts Manager'
            id={ROLE}
            name={ROLE}
            helperText={helperText.role}
            error={textfieldError.role}
            value={enteredValues.role}
            onChange={(event) => { inputChangeHandler(ROLE, event.target.value) }}
          />

          <FormTextField
            title='Phone Number*'
            placeholder='+6591234567'
            id={PHONE_NUMBER}
            name={PHONE_NUMBER}
            type="tel"
            required
            helperText={helperText.phoneNumber}
            error={textfieldError.phoneNumber}
            value={enteredValues.phoneNumber}
            onChange={(event) => { inputChangeHandler(PHONE_NUMBER, event.target.value) }}
          />
        </ContentCard>
      </form>
    </div>
  );
}
