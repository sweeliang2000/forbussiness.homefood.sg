'use client';

import { useEffect, useState } from 'react';
import {
  Switch,
  Radio,
  RadioGroup,
  FormControlLabel,
  Button,
  Alert,
  Collapse,
  InputAdornment,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { FaCheckCircle, FaQrcode } from 'react-icons/fa';
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

export default function ManualPayNowSection({ paynow, setField, disabled, checked, onToggle, expanded, onToggleExpand }) {
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
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={onToggleExpand} role="button" tabIndex={0}>
        <Switch
          checked={checked}
          disabled={disabled}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onToggle(e.target.checked)}
        />
        <div className={styles.sectionHeaderText}>
          <div className={styles.sectionTitleRow}>
            <span className={styles.sectionTitle}>Manual PayNow</span>
            <span className={`${styles.feeBadge} ${styles.feeBadgeGreen}`}>0% fee</span>
            {checked && (
              <span className={styles.activePill}>
                <FaCheckCircle size={12} /> Active
              </span>
            )}
          </div>
        </div>
        <ExpandMoreIcon className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`} />
      </div>

      <Collapse in={expanded}>
        <div className={styles.collapseInner}>
          <p className={styles.sectionDesc}>
            Show customers your own PayNow QR. They pay and upload a payment screenshot, which
            Collbine&apos;s AI verifies. You confirm funds and handle any refunds.
          </p>

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
                sx={{ textTransform: 'none' }}
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
        </div>
      </Collapse>
    </div>
  );
}
