'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Radio,
  RadioGroup,
  FormControlLabel,
  Button,
  Alert,
  InputAdornment,
} from '@mui/material';
import SectionToggle from '@/components/App/SectionToggle/SectionToggle';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { FaQrcode, FaLock } from 'react-icons/fa';
import FormTextField from '@/components/Form Components/FormTextField/FormTextField';
import {
  buildPayNowPayload,
  toPayNowMobile,
  validateUEN,
  validateMobile,
  validateReference,
  validateAmount,
  validateExpiry,
} from '@/utility/paynow';
import PayNowQrPreview from './PayNowQrPreview';
import styles from '../page.module.css';

export default function ManualPayNowSection({ paynow, setField, disabled, isPro, checked, onToggle, expanded, onToggleExpand }) {
  const [touched, setTouched] = useState({});
  const touch = (name) => setTouched((t) => ({ ...t, [name]: true }));

  const isUEN = paynow.proxyType === 'UEN';
  const proxyError = isUEN ? validateUEN(paynow.uen) : validateMobile(paynow.mobile);

  // --- Test-only fields (NOT saved) ---
  const [testAmount, setTestAmount] = useState('');
  const [testReference, setTestReference] = useState('');
  const [testExpiry, setTestExpiry] = useState(null);
  const [testPayload, setTestPayload] = useState('');
  const [validTill, setValidTill] = useState('');
  const [testError, setTestError] = useState('');

  // The QR only reflects the last "Generate" press: clear it whenever any input
  // (saved identity or test value) changes, forcing an explicit re-generate.
  useEffect(() => {
    setTestPayload('');
    setTestError('');
  }, [paynow.proxyType, paynow.uen, paynow.mobile, paynow.companyName, testAmount, testReference, testExpiry]);

  const handleGenerateTest = () => {
    // Amount is always required because the QR amount is fixed (Editable Amount = No).
    const pErr = proxyError;
    const aErr = validateAmount(testAmount, { required: true });
    const rErr = validateReference(testReference);
    const eErr = validateExpiry(testExpiry ? testExpiry.toISOString() : '');

    touch(isUEN ? 'uen' : 'mobile');

    const firstError = pErr || aErr || rErr || eErr;
    if (firstError) {
      setTestPayload('');
      setTestError(firstError);
      return;
    }

    setTestError('');
    setTestPayload(
      buildPayNowPayload({
        proxyType: paynow.proxyType,
        proxyValue: isUEN ? paynow.uen.trim().toUpperCase() : toPayNowMobile(paynow.mobile),
        editable: false,
        amount: testAmount,
        merchantName: isUEN ? paynow.companyName : '',
        reference: testReference,
        expiry: testExpiry ? testExpiry.format('YYYYMMDD') : '',
      })
    );
    setValidTill(testExpiry ? testExpiry.format('D MMM YYYY') : '');
  };

  const amountLabel = testAmount && Number(testAmount) > 0 ? `SGD ${Number(testAmount).toFixed(2)}` : '';

  return (
    <SectionToggle
        title="Manual PayNow"
        summary="Your own PayNow QR — customers upload a screenshot, AI verifies it."
        badges={
          <>
            <span className={`${styles.feeBadge} ${styles.feeBadgeGreen}`}>0% fee</span>
            {/* The lock states the rule up front, rather than letting someone
                fill in the form and discover it on save. */}
            {!isPro && (
              <span className={styles.proBadge}>
                <FaLock size={9} /> Pro
              </span>
            )}
          </>
        }
        checked={checked}
        onToggle={onToggle}
        switchDisabled={disabled || !isPro}
        switchTooltip={isPro ? '' : 'Available on Pro'}
        switchAriaLabel="Enable Manual PayNow"
        showActivePill={isPro}
        expanded={expanded}
        onToggleExpand={onToggleExpand}
      >
          {/* Picks up where the collapsed summary leaves off instead of
              repeating it. */}
          <p className={styles.sectionDesc}>
            Money goes straight into your own account, so you confirm the funds have arrived and
            handle any refunds yourself.
          </p>

          {/*
            A shop that was on manual and then lapsed keeps the selection, but
            it can't be published any more. Say so here rather than letting it
            fail at the publish step.
          */}
          {!isPro && checked && (
            <Alert severity="warning">
              Manual PayNow is still selected from a previous Pro subscription, but it can no longer
              be saved or published. Renew Pro to keep using it, or switch to Automatic Payments.
            </Alert>
          )}

          {!isPro ? (
            <div className={styles.proGate}>
              <div className={styles.proGateIcon}>
                <FaLock size={17} />
              </div>
              <div className={styles.proGateBody}>
                <p className={styles.proGateTitle}>Manual PayNow is part of Pro</p>
                <p className={styles.proGateText}>
                  Take PayNow straight into your own account at a 0% fee, with AI checking each
                  payment screenshot for you. On Free you can still accept payments through
                  Automatic Payments below.
                </p>
                <div className={styles.proGateActions}>
                  <Button variant="contained" size="small" component={Link} href="/app/subscription">
                    Upgrade to Pro
                  </Button>
                  <Button variant="text" size="small" component={Link} href="/payment-types-and-fees">
                    Compare fees
                  </Button>
                </div>
              </div>
            </div>
          ) : (
          <div className={styles.manualBody}>
            {/* LEFT: saved PayNow identity */}
            <div className={styles.formColumn}>
              <div className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Type</span>
                <RadioGroup row value={paynow.proxyType} onChange={(e) => setField('proxyType', e.target.value)}>
                  <FormControlLabel value="UEN" control={<Radio size="small" disabled={disabled} />} label="UEN (Company)" />
                  <FormControlLabel value="MOBILE" control={<Radio size="small" disabled={disabled} />} label="Mobile (Personal)" />
                </RadioGroup>
              </div>

              {isUEN ? (
                <>
                  <FormTextField
                    title="UEN"
                    placeholder="e.g. 201912345A"
                    value={paynow.uen}
                    disabled={disabled}
                    onChange={(e) => setField('uen', e.target.value.toUpperCase())}
                    onBlur={() => touch('uen')}
                    error={!!(touched.uen && proxyError)}
                    helperText={touched.uen ? proxyError : ''}
                  />
                  <FormTextField
                    title="Company Name"
                    placeholder="Company Name"
                    value={paynow.companyName}
                    disabled={disabled}
                    onChange={(e) => setField('companyName', e.target.value)}
                  />
                </>
              ) : (
                <FormTextField
                  title="Mobile No"
                  placeholder="9XXX XXXX"
                  value={paynow.mobile}
                  disabled={disabled}
                  onChange={(e) =>
                    setField(
                      'mobile',
                      e.target.value.replace(/\D/g, '').replace(/^65(\d{8})$/, '$1').slice(0, 8)
                    )
                  }
                  onBlur={() => touch('mobile')}
                  error={!!(touched.mobile && proxyError)}
                  helperText={touched.mobile ? proxyError : ''}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">+65</InputAdornment>,
                  }}
                />
              )}
            </div>

            {/* RIGHT: test-only panel */}
            <div className={styles.testPanel}>
              <div className={styles.testPanelHead}>
                <span className={styles.testPanelTitle}>
                  <FaQrcode size={13} /> Test your QR code
                </span>
                <span className={styles.fieldHint}>These values are for testing only and are not saved.</span>
              </div>

              <FormTextField
                title="Amount (SGD)"
                placeholder="0.00"
                value={testAmount}
                onChange={(e) => setTestAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              />

              <FormTextField
                title="Reference Number"
                subtitle="Only letters and numbers (a-z, A-Z, 0-9), no spaces or special characters. Max 25 characters."
                placeholder="e.g. INV001"
                value={testReference}
                onChange={(e) => setTestReference(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 25))}
              />

              <div className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Expiry Date (Optional)</span>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DateTimePicker
                    value={testExpiry}
                    disablePast
                    onChange={(v) => setTestExpiry(v)}
                    slotProps={{
                      textField: { fullWidth: true, size: 'small', variant: 'outlined' },
                      field: { clearable: true },
                    }}
                  />
                </LocalizationProvider>
                <span className={styles.fieldHint}>Must be later than the current date and time.</span>
              </div>

              <Button
                className={styles.generateBtn}
                variant="contained"
                size="small"
                startIcon={<FaQrcode />}
                onClick={handleGenerateTest}
              >
                Generate Test QR Code
              </Button>

              {testError && (
                <Alert severity="error" onClose={() => setTestError('')}>
                  {testError}
                </Alert>
              )}

              <PayNowQrPreview
                payload={testPayload}
                validTill={validTill}
                merchantName={isUEN ? paynow.companyName : ''}
                amountLabel={amountLabel}
                reference={testReference}
                fileName={`paynow-${(isUEN ? paynow.uen : paynow.mobile) || 'qr'}`}
              />
            </div>
          </div>
      )}
    </SectionToggle>
  );
}
