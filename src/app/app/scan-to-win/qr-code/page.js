'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import styles from './page.module.css';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import FieldHeader from '@/components/FieldHeader/FieldHeader';
import LoadingPage from '@/components/LoadingPage/LoadingPage';
import ErrorPage from '@/components/ErrorPage/ErrorPage';
import FormTextField from '@/components/Form Components/FormTextField/FormTextField';
import DialogPopup from '@/components/DialogPopup/DialogPopup';
import { Alert } from '@mui/material';
import apiClient from '@/utility/api';
import {
  SCAN_TO_WIN_QR_CODES,
  CREATE_SCAN_TO_WIN_QR_CODE,
  DELETE_SCAN_TO_WIN_QR_CODE,
} from '@/utility/apiPaths';
import ScanToWinOnboarding from '../ScanToWinOnboarding/ScanToWinOnboarding';

const MAX_QR_CODES = 4;

const createDefaultQr = (index = 1) => ({
  id: null,
  name: `QR Code ${index}`,
  url: '',
  createdAt: new Date().toISOString(),
  qrCodeId: null,
});

export default function ScanToWinQrCodePage() {
  // Loading / error
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingErrorMessage, setIsLoadingErrorMessage] = useState(null);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmissionSuccess, setIsSubmissionSuccess] = useState(false);
  const [isBtnLoading, setIsBtnLoading] = useState(false);

  // Scan-to-win config: when no config, show onboarding
  const [hasExistingScanToWinConfig, setHasExistingScanToWinConfig] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);

  // Data
  const [qrCodes, setQrCodes] = useState([]);

  // Track download refs
  const qrRefs = useRef({});

  // Popup state
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
  const [qrCodeName, setQrCodeName] = useState('');
  const [qrToEdit, setQrToEdit] = useState(null);
  
  // Delete confirmation state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleteConfirmationError, setDeleteConfirmationError] = useState('');
  const [qrToDelete, setQrToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const clearError = () => {
    setIsError(false);
    setErrorMessage('');
  };

  const setError = (message) => {
    setIsError(true);
    setErrorMessage(message);
  };

  // Fetch QR codes
  const fetchQrCodes = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/data/qrCode');
      const apiData = response.data?.data || [];

      const mappedQrCodes = apiData.map((qr) => ({
        id: qr.qr_code_id,
        name: qr.qr_code_name,
        url: buildQrUrl(qr.qr_code_id),
        createdAt: qr.created_at,
        qrCodeId: qr.qr_code_id,
        shopId: qr.shop_id,
      }));

      setQrCodes(mappedQrCodes);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to load QR codes';
      const code =
        error?.response?.data?.statusCode ||
        error?.response?.data?.code ||
        error?.code ||
        'UNKNOWN';
      setIsLoadingErrorMessage(`Failed to load QR codes. ${message} (Error code: ${code})`);
    }
  }, []);

  // Check scan-to-win config and optionally fetch QR codes
  const fetchInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsLoadingErrorMessage(null);
      let configExists = false;
      try {
        const configRes = await apiClient.get('/api/data/qrcode/configuration');
        configExists = !!(configRes?.data?.data);
      } catch (configErr) {
        if (configErr?.response?.status !== 404) throw configErr;
      }
      setHasExistingScanToWinConfig(configExists);
      if (configExists) {
        await fetchQrCodes();
      }
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to load data';
      const code =
        error?.response?.data?.statusCode ||
        error?.response?.data?.code ||
        error?.code ||
        'UNKNOWN';
      setIsLoadingErrorMessage(`${message} (Error code: ${code})`);
    } finally {
      setIsLoading(false);
    }
  }, [fetchQrCodes]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

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
      setHasExistingScanToWinConfig(true);
      await fetchQrCodes();
    } catch (err) {
      const errorData = err?.response?.data;
      const msg = errorData?.error?.message || errorData?.message || err?.message || 'Failed to enable Scan to Win';
      setError(msg);
    } finally {
      setIsEnabling(false);
    }
  };

  // Generate QR code URL (deep link to app)
  const buildQrUrl = (id) => {
    // This can be adjusted to your deep link scheme
    return `https://collbine.com/scan-to-win?code=${id}`;
  };

  const formatDate = (isoString) => {
    try {
      return new Date(isoString).toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  const handleGenerateClick = () => {
    clearError();
    setQrToEdit(null);
    setQrCodeName('');
    setIsNameDialogOpen(true);
  };

  const handleNameDialogSubmit = async (event) => {
    event.preventDefault();
    
    if (!qrCodeName.trim()) {
      setError('QR code name is required.');
      return;
    }

    const trimmedName = qrCodeName.trim();
    setIsNameDialogOpen(false);

    if (qrToEdit) {
      await handleRename(qrToEdit, trimmedName);
    } else {
      await handleGenerate(trimmedName);
    }
    
    setQrToEdit(null);
  };

  const handleGenerate = async (name) => {
    clearError();
    
    // If we already know we've reached the max number of QR codes,
    // show a friendly error immediately without hitting the API.
    if (qrCodes.length >= MAX_QR_CODES) {
      setError(
        `Max number of QR can be generated is ${MAX_QR_CODES}. Please delete unused one.`
      );
      return;
    }

    try {
      setIsBtnLoading(true);
      
      // Call API to create QR code
      const response = await apiClient.post('/api/data/qrCode', {
        qr_code_name: name,
      });
      
      // Get the QR code data from response
      const qrCodeData = response.data?.data || response.data;
      
      // Map API response to component state structure
      const savedQr = {
        id: qrCodeData.qr_code_id,
        name: qrCodeData.qr_code_name || name,
        url: buildQrUrl(qrCodeData.qr_code_id),
        createdAt: qrCodeData.created_at || new Date().toISOString(),
        qrCodeId: qrCodeData.qr_code_id,
        shopId: qrCodeData.shop_id,
      };

      setQrCodes((prev) => [...prev, savedQr]);
      setIsSubmissionSuccess(true);
      setQrCodeName('');
    } catch (error) {
      const status = error?.response?.status;
      const backendMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error?.message;

      // Show a friendly message when max QR limit is hit (backend returns 400 / bad request)
      if (status === 400 || error?.code === 'ERR_BAD_REQUEST') {
        setError(
          backendMessage ||
            `Max number of QR can be generated is ${MAX_QR_CODES}. Please delete unused one.`
        );
      } else {
        const message =
          backendMessage ||
          error?.message ||
          'Failed to create QR code';
        const code =
          error?.response?.data?.statusCode ||
          error?.response?.data?.code ||
          error?.code ||
          'UNKNOWN';
        setError(`Failed to create QR code. ${message} (Error code: ${code})`);
      }
    } finally {
      setIsBtnLoading(false);
    }
  };

  const handleRename = async (qr, name) => {
    clearError();
    
    try {
      setIsBtnLoading(true);
      
      // Call API to update QR code name
      await apiClient.put('/api/data/qrCode', {
        qr_code_id: qr.qrCodeId || qr.id,
        qr_code_name: name,
      });

      // Refresh list after successful update
      await fetchQrCodes();
      setIsSubmissionSuccess(true);
      setQrCodeName('');
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to update QR code';
      const code =
        error?.response?.data?.statusCode ||
        error?.response?.data?.code ||
        error?.code ||
        'UNKNOWN';
      setError(`Failed to update QR code. ${message} (Error code: ${code})`);
    } finally {
      setIsBtnLoading(false);
    }
  };

  const handleDelete = (qr) => {
    setQrToDelete(qr);
    setDeleteConfirmationText('');
    setDeleteConfirmationError('');
    setIsDeleteDialogOpen(true);
  };

  const handleEditName = (qr) => {
    clearError();
    setQrToEdit(qr);
    setQrCodeName(qr.name || '');
    setIsNameDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmationText.toLowerCase() !== 'confirm') {
      setDeleteConfirmationError('Please type "confirm" to proceed');
      return;
    }

    if (isDeleting || !qrToDelete) return;

    setDeleteConfirmationError('');
    setIsDeleting(true);

    try {
      await apiClient.delete('/api/data/qrCode', {
        data: { qr_code_id: qrToDelete.qrCodeId || qrToDelete.id },
      });
      setQrCodes((prev) => prev.filter((code) => code.id !== qrToDelete.id));
      setIsSubmissionSuccess(true);
      setIsDeleteDialogOpen(false);
      setQrToDelete(null);
      setDeleteConfirmationText('');
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to delete QR code';
      const code =
        error?.response?.data?.statusCode ||
        error?.response?.data?.code ||
        error?.code ||
        'UNKNOWN';
      setDeleteConfirmationError(`Failed to delete QR code. ${message} (Error code: ${code})`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteDialogClose = () => {
    setIsDeleteDialogOpen(false);
    setQrToDelete(null);
    setDeleteConfirmationText('');
    setDeleteConfirmationError('');
  };

  const handleDownload = (qr) => {
    const container = qrRefs.current[qr.id];
    if (!container) return;

    const svg = container.querySelector('svg');
    if (!svg) return;

    const serializer = new XMLSerializer();
    const svgData = serializer.serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0);
      URL.revokeObjectURL(url);

      const pngData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngData;
      link.download = `${qr.name || 'qr-code'}.png`;
      link.click();
    };
    image.src = url;
  };

  const showOnboarding = !hasExistingScanToWinConfig && !isLoading && isLoadingErrorMessage === null;

  return (
    <form className={styles.form}>
      {!showOnboarding && (
        <HeaderSection
          className={styles.header}
          title='QR Code Management'
          description={
            <p>
              Generate and manage QR codes for your Scan to Win program. QR codes open your app when scanned by customers.
              <Link href='/'> Find out more.</Link>
            </p>
          }
          loading={isBtnLoading}
          isSuccess={isSubmissionSuccess}
          isError={isError}
          isDisabled={isBtnLoading}
          errorMessage={errorMessage}
          showButton={false}
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
          <ContentCard>
            <div className={styles.titleRow}>
              <FieldHeader
                title='QR Codes'
                description={`Create up to ${MAX_QR_CODES} QR codes. Download and share them with your customers.`}
              />
              <button
                type='button'
                className={styles.addButton}
                onClick={handleGenerateClick}
                disabled={isBtnLoading}
              >
                Generate QR Code
              </button>
            </div>

            {qrCodes.length === 0 ? (
              <p className={styles.emptyState}>No QR codes yet. Generate your first QR code.</p>
            ) : (
              <div className={styles.grid}>
                {qrCodes.map((qr, index) => (
                  <div className={styles.qrCard} key={qr.id || index}>
                    <div
                      className={styles.qrPreview}
                      ref={(el) => (qrRefs.current[qr.id] = el)}
                    >
                      <QRCode
                        value={qr.url}
                        size={160}
                        bgColor='#FFFFFF'
                        fgColor='#000000'
                      />
                    </div>
                    <div className={styles.qrDetails}>
                      <p className={styles.qrName}>
                        {qr.name || `QR Code (${formatDate(qr.createdAt)})`}
                      </p>
                      <p className={styles.qrMeta}>
                        Created: {qr.createdAt ? new Date(qr.createdAt).toLocaleString() : 'N/A'}
                      </p>
                      <p className={styles.qrUrl}>{qr.url}</p>
                    </div>
                    <div className={styles.qrActions}>
                      <button
                        type='button'
                        className={`${styles.secondaryButton} ${styles.downloadButton}`}
                        onClick={() => handleDownload(qr)}
                      >
                        Download
                      </button>
                      <button
                        type='button'
                        className={styles.secondaryButton}
                        onClick={() => handleEditName(qr)}
                      >
                        Edit Name
                      </button>
                      <button
                        type='button'
                        className={styles.deleteButton}
                        onClick={() => handleDelete(qr)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ContentCard>
        </>
      )}

      <DialogPopup
        title={qrToEdit ? 'Update QR Code Name' : 'Generate QR Code'}
        actionTitle={qrToEdit ? 'Update' : 'Generate'}
        isOpen={isNameDialogOpen}
        setIsOpen={setIsNameDialogOpen}
        onSubmit={handleNameDialogSubmit}
        PaperProps={{
          sx: {
            width: '80%',
            maxWidth: '540px',
          },
        }}
      >
        <div className={styles.dialogContent}>
          <FormTextField
            title='QR Code Name'
            subtitle='This name is for your internal tracking only and will not be shown to users.'
            placeholder='New Year Instant Win'
            id='qr_code_name'
            name='qr_code_name'
            helperText=''
            error={false}
            value={qrCodeName}
            onChange={(event) => setQrCodeName(event.target.value)}
          />
        </div>
      </DialogPopup>

      <DialogPopup
        title='Delete QR Code'
        actionTitle={isDeleting ? 'Deleting...' : 'Delete'}
        isOpen={isDeleteDialogOpen}
        setIsOpen={setIsDeleteDialogOpen}
        onSubmit={(e) => {
          e.preventDefault();
          handleConfirmDelete();
        }}
        onClose={handleDeleteDialogClose}
        PaperProps={{
          sx: {
            width: '80%',
            maxWidth: '540px',
          },
        }}
      >
        <div className={styles.dialogContent}>
          {deleteConfirmationError && (
            <Alert severity="error" sx={{ marginBottom: '16px' }}>
              {deleteConfirmationError}
            </Alert>
          )}
          
          <p style={{ marginBottom: '16px' }}>
            Are you sure you want to delete this QR code?
          </p>
          <p style={{ marginBottom: '16px', fontWeight: 'bold', color: '#d32f2f' }}>
            Once deleted, this QR code cannot be used.
          </p>
          
          <FormTextField
            title='Type "confirm" to proceed'
            subtitle=''
            placeholder='Type "confirm" here'
            id='delete_confirmation'
            name='delete_confirmation'
            helperText=''
            error={!!deleteConfirmationError}
            value={deleteConfirmationText}
            onChange={(event) => {
              setDeleteConfirmationText(event.target.value);
              setDeleteConfirmationError('');
            }}
          />
        </div>
      </DialogPopup>
    </form>
  );
}
