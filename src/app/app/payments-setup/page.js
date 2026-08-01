'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Button,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControlLabel,
  Alert,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { FaCheck } from 'react-icons/fa';
import styles from './page.module.css';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import LoadingPage from '@/components/LoadingPage/LoadingPage';
import apiClient from '@/utility/api';
import { PAYMENT_SETTINGS, PUBLISH_PAYMENT_SETTINGS_UPDATE, OFFICIAL_BUSINESS_INFORMATION } from '@/utility/apiPaths';
import { normalizeMobile } from '@/utility/paynow';
import ManualPayNowSection from './_views/ManualPayNowSection';
import AutomaticPaymentsSection from './_views/AutomaticPaymentsSection';

// Only the persistent PayNow identity is saved. Amount / reference / expiry are
// test-only values entered in the section and are never persisted.
const DEFAULT_FORM = {
  proxyType: 'UEN',
  uen: '',
  companyName: '',
  mobile: '',
};

// Stored (API) shape -> form (UI) shape
const toForm = (paynow = {}) => ({
  proxyType: paynow.proxyType === 'MOBILE' ? 'MOBILE' : 'UEN',
  uen: paynow.uen || '',
  companyName: paynow.companyName || '',
  // Stored as the local 8-digit number; the +65 prefix is fixed in the UI.
  mobile: normalizeMobile(paynow.mobile || ''),
});

// Form (UI) shape -> stored (API) shape. The amount is always fixed (Editable
// Amount = No); the actual amount comes from the order at checkout.
const toStored = (form) => ({
  proxyType: form.proxyType,
  uen: form.uen.trim(),
  companyName: form.companyName.trim(),
  mobile: form.mobile.trim(),
  editableAmount: false,
});

export default function PaymentsSetupPage() {
  const [isLoading, setIsLoading] = useState(true);

  const [paymentMethod, setPaymentMethod] = useState(null);
  const [paynow, setPaynow] = useState(DEFAULT_FORM);

  // Which section is expanded (accordion-style: only one open at a time).
  const [expanded, setExpanded] = useState('manual');

  const [isEdit, setIsEdit] = useState(true);
  const [releaseStatus, setReleaseStatus] = useState(null);

  // Menu-builder style state machine
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false); // local edits not yet saved
  const [hasChanges, setHasChanges] = useState(false); // saved but not yet published
  const [isSaving, setIsSaving] = useState(false);
  const [isSaveSuccess, setIsSaveSuccess] = useState(false);
  const [isPublishLoading, setIsPublishLoading] = useState(false);
  const [isPublishSuccess, setIsPublishSuccess] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  // Merchant must acknowledge that their PayNow details are correct before publishing.
  const [ackPaynow, setAckPaynow] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get(PAYMENT_SETTINGS);
        const data = res.data?.data ?? res.data ?? {};
        setPaymentMethod(data.paymentMethod ?? null);
        // Auto-open the active method (default to Manual when none is set).
        setExpanded(data.paymentMethod ?? 'manual');
        let form = toForm(data.paynow);

        // Best-effort prefill of UEN / company from saved business info.
        if (!form.uen && !form.companyName) {
          try {
            const biz = await apiClient.get(OFFICIAL_BUSINESS_INFORMATION);
            const b = biz.data?.data ?? biz.data ?? {};
            form = { ...form, uen: form.uen || b.uen || '', companyName: form.companyName || b.businessName || '' };
          } catch {
            /* prefill is optional */
          }
        }

        setPaynow(form);
        setHasChanges(!!data.isChanges);
        if (data.isEdit !== undefined) setIsEdit(data.isEdit);
        if (data.releaseStatus !== undefined) setReleaseStatus(data.releaseStatus);
      } catch {
        // Resilient: still render the generator so the merchant can test it out.
        setPaynow(DEFAULT_FORM);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const markChanged = () => {
    setHasUnsavedEdits(true);
    setIsSaveSuccess(false);
  };

  const setField = (field, value) => {
    setPaynow((prev) => ({ ...prev, [field]: value }));
    markChanged();
  };

  const handleManualToggle = (checked) => {
    setPaymentMethod((prev) => (checked ? 'manual' : prev === 'manual' ? null : prev));
    if (checked) setExpanded('manual'); // turning one on opens it (and collapses the other)
    markChanged();
  };

  const handleAutomaticToggle = (checked) => {
    setPaymentMethod((prev) => (checked ? 'automatic' : prev === 'automatic' ? null : prev));
    if (checked) setExpanded('automatic');
    markChanged();
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError('');
    try {
      await apiClient.put(PAYMENT_SETTINGS, {
        paymentMethod,
        paynow: toStored(paynow),
      });
      setHasChanges(true);
      setHasUnsavedEdits(false);
      setIsSaveSuccess(true);
      setIsPublishSuccess(false);
    } catch (err) {
      setSaveError(err?.response?.data?.message ?? 'Failed to save payment settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmPublish = async () => {
    setShowPublishConfirm(false);
    setAckPaynow(false);
    setIsPublishLoading(true);
    setIsPublishSuccess(false);
    try {
      await apiClient.post(PUBLISH_PAYMENT_SETTINGS_UPDATE);
      setIsPublishSuccess(true);
      setHasChanges(false);
    } catch (err) {
      setSaveError(err?.response?.data?.message ?? 'Failed to publish payment settings update.');
    } finally {
      setIsPublishLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <div className={styles.root}>
      <div>
        <HeaderSection
          className={styles.header}
          title="Payments Setup"
          description={
            <p>
              Choose how you accept payment. Compare options on the{' '}
              <Link href="/payment-types-and-fees">payment types &amp; fees</Link> page.
            </p>
          }
          showButton={false}
          isSuccess={releaseStatus === 'approved_scheduled'}
          successMessage={
            !isEdit && releaseStatus === 'approved_scheduled' ? (
              <>
                Your release has been approved. It will be released on the date you stated on{' '}
                <Link href="/app/release/submission">Release Submission Page</Link>. If you wish to
                change the date, cancel and re-send for approval. For any enquiry or urgent release,
                please email support@homefood.sg.
              </>
            ) : null
          }
          infoMessage={
            !isEdit && releaseStatus !== 'approved_scheduled'
              ? 'The information has been submitted for release and is currently under review. To make any changes, please cancel it under Release Submission.'
              : null
          }
          rightActions={
            <>
              <LoadingButton
                size="small"
                variant="contained"
                loading={isSaving}
                loadingPosition="start"
                startIcon={isSaveSuccess ? <FaCheck /> : undefined}
                disabled={!isEdit || !hasUnsavedEdits}
                onClick={handleSave}
                sx={{ textTransform: 'none' }}
              >
                {isSaveSuccess ? 'Saved' : 'Save'}
              </LoadingButton>
              {releaseStatus === 'Released' && (
                <LoadingButton
                  size="small"
                  variant="outlined"
                  color="primary"
                  loading={isPublishLoading}
                  loadingPosition="start"
                  startIcon={isPublishSuccess ? <FaCheck /> : undefined}
                  disabled={isPublishSuccess || !hasChanges || hasUnsavedEdits}
                  onClick={() => { setAckPaynow(false); setShowPublishConfirm(true); }}
                  sx={{ textTransform: 'none' }}
                >
                  {isPublishSuccess ? 'Update Published' : 'Publish Update'}
                </LoadingButton>
              )}
            </>
          }
        />
        {saveError && (
          <ContentCard>
            <Alert severity="error" onClose={() => setSaveError('')} sx={{ mt: 1 }}>
              {saveError}
            </Alert>
          </ContentCard>
        )}
      </div>

      <ContentCard>
        <ManualPayNowSection
          paynow={paynow}
          setField={setField}
          disabled={!isEdit}
          checked={paymentMethod === 'manual'}
          onToggle={handleManualToggle}
          expanded={expanded === 'manual'}
          onToggleExpand={() => setExpanded((e) => (e === 'manual' ? null : 'manual'))}
        />
      </ContentCard>

      <ContentCard>
        <AutomaticPaymentsSection
          checked={paymentMethod === 'automatic'}
          disabled={!isEdit}
          onToggle={handleAutomaticToggle}
          expanded={expanded === 'automatic'}
          onToggleExpand={() => setExpanded((e) => (e === 'automatic' ? null : 'automatic'))}
        />
      </ContentCard>

      <Dialog open={showPublishConfirm} onClose={() => setShowPublishConfirm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Publish Payment Settings Update</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: paymentMethod === 'manual' ? 2 : 0 }}>
            Are you sure you want to publish your payment settings? This will make your latest payment
            configuration live for customers immediately.
          </DialogContentText>

          {paymentMethod === 'manual' && (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Please double-check your PayNow details below. HomeFood cannot verify them — if the{' '}
                {paynow.proxyType === 'MOBILE' ? 'mobile number' : 'UEN'} is incorrect, customer payments
                may go to the wrong account, and any resulting issues are your responsibility.
              </Alert>

              <div className={styles.confirmDetails}>
                {paynow.proxyType === 'MOBILE' ? (
                  <div><strong>PayNow mobile:</strong> +65 {paynow.mobile || '—'}</div>
                ) : (
                  <>
                    <div><strong>PayNow UEN:</strong> {paynow.uen || '—'}</div>
                    {paynow.companyName ? <div><strong>Company:</strong> {paynow.companyName}</div> : null}
                  </>
                )}
              </div>

              <FormControlLabel
                sx={{ mt: 1.5, alignItems: 'flex-start' }}
                control={<Checkbox checked={ackPaynow} onChange={(e) => setAckPaynow(e.target.checked)} sx={{ pt: 0 }} />}
                label={`I confirm my PayNow ${paynow.proxyType === 'MOBILE' ? 'mobile number' : 'UEN'} above is correct and accept responsibility for it.`}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPublishConfirm(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmPublish}
            variant="contained"
            disabled={paymentMethod === 'manual' && !ackPaynow}
            sx={{ textTransform: 'none', backgroundColor: 'var(--accent-color)', boxShadow: 'none', '&:hover': { backgroundColor: '#C2410C', boxShadow: 'none' } }}
          >
            Publish
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
