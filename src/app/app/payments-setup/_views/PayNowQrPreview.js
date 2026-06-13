'use client';

import { useRef } from 'react';
import QRCode from 'react-qr-code';
import { Button } from '@mui/material';
import { FaDownload } from 'react-icons/fa';
import styles from '../page.module.css';

const PAYNOW_PURPLE = '#7A2D8E';
const QR_SIZE = 220;
const LOGO_SRC = '/images/payments/Paynow.png';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Renders a genuine PayNow QR (purple, with the centered PayNow logo) from a
// pre-built EMVCo payload, styled like the official PayNow QR. The PNG export
// composites the logo + "Valid till" caption so the download matches the preview.
export default function PayNowQrPreview({ payload, validTill, merchantName, amountLabel, reference, fileName = 'paynow-qr' }) {
  const qrRef = useRef(null);

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgUrl = URL.createObjectURL(new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' }));

    const qrImg = new Image();
    qrImg.onload = () => {
      const pad = 28;
      const captionH = validTill ? 34 : 14;
      const canvas = document.createElement('canvas');
      canvas.width = QR_SIZE + pad * 2;
      canvas.height = QR_SIZE + pad * 2 + captionH;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(qrImg, pad, pad, QR_SIZE, QR_SIZE);
      URL.revokeObjectURL(svgUrl);

      const logo = new Image();
      logo.onload = () => {
        // The PAY/NOW mark's opaque content within the 128x128 PNG.
        const SRC = { x: 12, y: 32, w: 104, h: 64 };
        const boxW = QR_SIZE * 0.18;
        const boxH = (boxW * SRC.h) / SRC.w;
        const bx = pad + QR_SIZE / 2 - boxW / 2;
        const by = pad + QR_SIZE / 2 - boxH / 2;
        ctx.fillStyle = '#FFFFFF';
        roundRect(ctx, bx, by, boxW, boxH, 4);
        ctx.fill();
        // Draw only the cropped content (no transparent padding) to fill the box.
        ctx.drawImage(logo, SRC.x, SRC.y, SRC.w, SRC.h, bx, by, boxW, boxH);

        if (validTill) {
          ctx.fillStyle = PAYNOW_PURPLE;
          ctx.font = '600 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`Valid till ${validTill}`, canvas.width / 2, QR_SIZE + pad * 2 + 20);
        }

        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `${fileName}.png`;
        link.click();
      };
      logo.src = LOGO_SRC;
    };
    qrImg.src = svgUrl;
  };

  if (!payload) {
    return (
      <div className={styles.qrCard}>
        <div className={styles.qrPlaceholder}>
          <p>Enter the test details and press <strong>Generate Test QR Code</strong> to preview a PayNow QR. Do a test before you submit for review.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.qrCard}>
        <div className={styles.qrCodeWrap} ref={qrRef}>
          <div className={styles.qrInner}>
            <QRCode value={payload} size={QR_SIZE} level="H" bgColor="#FFFFFF" fgColor={PAYNOW_PURPLE} />
            <div className={styles.qrLogoOverlay}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={encodeURI(LOGO_SRC)} alt="PayNow" />
            </div>
          </div>
        </div>

        {validTill ? <p className={styles.qrValidTill}>Valid till {validTill}</p> : null}

        <div className={styles.qrInfo}>
          {merchantName ? <p className={styles.qrMerchant}>{merchantName}</p> : null}
          {amountLabel ? <p className={styles.qrAmount}>{amountLabel}</p> : null}
          {reference ? <p className={styles.qrMeta}>Ref: {reference}</p> : null}
        </div>
      </div>

      {/* <Button
        className={styles.downloadBtn}
        variant="outlined"
        size="small"
        startIcon={<FaDownload />}
        onClick={handleDownload}
        sx={{ textTransform: 'none' }}
      >
        Download QR (PNG)
      </Button> */}
    </div>
  );
}
