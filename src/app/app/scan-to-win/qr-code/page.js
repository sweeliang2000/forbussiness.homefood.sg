'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import styles from './page.module.css';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import FieldHeader from '@/components/FieldHeader/FieldHeader';
import LoadingPage from '@/components/LoadingPage/LoadingPage';
import ErrorPage from '@/components/ErrorPage/ErrorPage';
import apiClient from '@/utility/api';
import {
  SCAN_TO_WIN_QR_CODES,
  CREATE_SCAN_TO_WIN_QR_CODE,
  DELETE_SCAN_TO_WIN_QR_CODE,
} from '@/utility/apiPaths';

const MAX_QR_CODES = 2;

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

  // Data
  const [qrCodes, setQrCodes] = useState([]);

  // Track download refs
  const qrRefs = useRef({});

  const clearError = () => {
    setIsError(false);
    setErrorMessage('');
  };

  const setError = (message) => {
    setIsError(true);
    setErrorMessage(message);
  };

  // Fetch QR codes on load
  useEffect(() => {
    const fetchQrCodes = async () => {
      try {
        setIsLoading(true);
        // TODO: Replace with actual API call
        // const response = await apiClient.get(SCAN_TO_WIN_QR_CODES);
        // const data = response.data?.data || [];
        const data = [];

        setQrCodes(data);
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          'Failed to load QR codes';
        const code =
          error?.response?.data?.code ||
          error?.code ||
          'UNKNOWN';
        setIsLoadingErrorMessage(`Failed to load QR codes. ${message} (Error code: ${code})`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQrCodes();
  }, []);

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

  const handleGenerate = async () => {
    clearError();
    if (qrCodes.length >= MAX_QR_CODES) {
      setError('You can only have up to 2 QR codes. Please delete one before creating another.');
      return;
    }

    const newId = Date.now().toString();
    const createdAt = new Date().toISOString();
    const name = `QR Code (${formatDate(createdAt)})`;
    const url = buildQrUrl(newId);

    const newQr = {
      ...createDefaultQr(qrCodes.length + 1),
      id: newId,
      name,
      url,
      createdAt,
    };

    try {
      setIsBtnLoading(true);
      // TODO: Replace with actual API call
      // const response = await apiClient.post(CREATE_SCAN_TO_WIN_QR_CODE, {
      //   name,
      //   url,
      // });
      // const savedQr = response.data?.data || newQr;
      const savedQr = newQr;

      setQrCodes((prev) => [...prev, savedQr]);
      setIsSubmissionSuccess(true);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to create QR code';
      const code =
        error?.response?.data?.code ||
        error?.code ||
        'UNKNOWN';
      setError(`Failed to create QR code. ${message} (Error code: ${code})`);
    } finally {
      setIsBtnLoading(false);
    }
  };

  const handleDelete = async (qr) => {
    const confirmed = window.confirm('Are you sure you want to delete this QR code?');
    if (!confirmed) return;

    try {
      // TODO: Replace with actual API call
      // await apiClient.delete(DELETE_SCAN_TO_WIN_QR_CODE, {
      //   data: { id: qr.id },
      // });
      setQrCodes((prev) => prev.filter((code) => code.id !== qr.id));
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to delete QR code';
      const code =
        error?.response?.data?.code ||
        error?.code ||
        'UNKNOWN';
      setError(`Failed to delete QR code. ${message} (Error code: ${code})`);
    }
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

  return (
    <form className={styles.form}>
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
      />

      {isLoading ? (
        <LoadingPage />
      ) : isLoadingErrorMessage !== null ? (
        <ErrorPage />
      ) : (
        <>
          <ContentCard>
            <div className={styles.titleRow}>
              <FieldHeader
                title='QR Codes'
                description='Create up to 2 QR codes. Download and share them with your customers.'
              />
              <button
                type='button'
                className={styles.addButton}
                onClick={handleGenerate}
                disabled={qrCodes.length >= MAX_QR_CODES || isBtnLoading}
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
                        className={styles.secondaryButton}
                        onClick={() => handleDownload(qr)}
                      >
                        Download
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
    </form>
  );
}
