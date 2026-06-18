'use client';

import dayjs from 'dayjs';
import { Button, CircularProgress } from '@mui/material';
import { FaCheck } from 'react-icons/fa';
import styles from './OrderCard.module.css';

// Display meta for the order (fulfilment) status. Stripe sets pending/sent/expired;
// the merchant moves orders through preparing → ready → completed (or cancelled).
export const STATUS_META = {
  pending: { label: 'New', cls: 'stNew' },
  sent: { label: 'New', cls: 'stNew' },
  preparing: { label: 'Preparing', cls: 'stPreparing' },
  ready: { label: 'Ready', cls: 'stReady' },
  completed: { label: 'Completed', cls: 'stCompleted' },
  cancelled: { label: 'Cancelled', cls: 'stCancelled' },
  expired: { label: 'Expired', cls: 'stCancelled' },
};

export const PAYMENT_META = {
  unpaid: { label: 'Unpaid', cls: 'pyPending' },
  processing: { label: 'Processing', cls: 'pyPending' },
  paid: { label: 'Paid', cls: 'pyPaid' },
  failed: { label: 'Payment failed', cls: 'pyFailed' },
  screenshot_uploaded: { label: 'Screenshot uploaded', cls: 'pyPending' },
};

export const STATUS_FILTERS = [
  { key: 'all', label: 'All statuses' },
  { key: 'new', label: 'New', match: (s) => s === 'pending' || s === 'sent' },
  { key: 'preparing', label: 'Preparing', match: (s) => s === 'preparing' },
  { key: 'ready', label: 'Ready', match: (s) => s === 'ready' },
  { key: 'completed', label: 'Completed', match: (s) => s === 'completed' },
  { key: 'cancelled', label: 'Cancelled', match: (s) => s === 'cancelled' || s === 'expired' },
];

export const isActive = (status) => !['completed', 'cancelled', 'expired'].includes(status);

export function nextStep(status) {
  if (status === 'pending' || status === 'sent') return { to: 'preparing', label: 'Start preparing' };
  if (status === 'preparing') return { to: 'ready', label: 'Mark ready' };
  if (status === 'ready') return { to: 'completed', label: 'Complete' };
  return null;
}

export const orderRef = (id) => `#${String(id || '').replace(/-/g, '').slice(0, 8).toUpperCase()}`;

const methodLabel = (m) =>
  m === 'manual' ? 'Manual PayNow' : m === 'walkin' ? 'Walk-in · in-store' : 'Online payment';

export function OrderCard({ order, busy, onSetStatus, onConfirmPayment, onViewScreenshot }) {
  const meta = STATUS_META[order.status] || { label: order.status, cls: 'stNew' };
  const pay = PAYMENT_META[order.payment_status] || { label: order.payment_status, cls: 'pyPending' };
  const items = Array.isArray(order.items) ? order.items : [];
  const time = order.created_at ? dayjs(order.created_at).format('h:mm A') : '';
  const step = nextStep(order.status);
  const active = isActive(order.status);
  const isManual = order.payment_method === 'manual';

  return (
    <div className={styles.orderCard}>
      <div className={styles.cardHead}>
        <div>
          <span className={styles.orderRef}>{orderRef(order.id)}</span>
          <span className={styles.orderTime}>{time}</span>
        </div>
        <div className={styles.badges}>
          <span className={`${styles.badge} ${styles[meta.cls]}`}>{meta.label}</span>
          <span className={`${styles.badge} ${styles.typeBadge}`}>
            {order.order_type === 'dine-in' ? 'Dine-in' : 'Takeaway'}
          </span>
        </div>
      </div>

      <div className={styles.items}>
        {items.map((it, i) => (
          <div key={i} className={styles.itemRow}>
            <span className={styles.itemName}>
              {it.quantity}× {it.name}
              {Array.isArray(it.options) && it.options.length > 0 && (
                <span className={styles.itemOptions}> ({it.options.join(', ')})</span>
              )}
            </span>
            <span className={styles.itemPrice}>${(Number(it.unitPrice || 0) * Number(it.quantity || 1)).toFixed(2)}</span>
          </div>
        ))}
      </div>

      {order.notes && <p className={styles.notes}>Note: {order.notes}</p>}

      <div className={styles.payRow}>
        <span className={styles.payMethod}>{methodLabel(order.payment_method)}</span>
        <span className={`${styles.payBadge} ${styles[pay.cls]}`}>{pay.label}</span>
        {isManual && order.payment_status === 'screenshot_uploaded' && (
          <>
            <button type="button" className={styles.linkBtn} onClick={() => onViewScreenshot(order)}>
              View screenshot
            </button>
            <Button
              size="small"
              variant="contained"
              color="success"
              disabled={busy}
              onClick={() => onConfirmPayment(order)}
              startIcon={busy ? <CircularProgress size={12} color="inherit" /> : <FaCheck />}
              sx={{ textTransform: 'none', marginLeft: 'auto' }}
            >
              Confirm payment
            </Button>
          </>
        )}
        {isManual && order.payment_status === 'unpaid' && (
          <span className={styles.mutedNote}>Awaiting customer payment</span>
        )}
      </div>

      <div className={styles.cardFoot}>
        <span className={styles.total}>${Number(order.total ?? 0).toFixed(2)}</span>
        <div className={styles.actions}>
          {active ? (
            <>
              {step && (
                <Button size="small" variant="contained" disabled={busy} onClick={() => onSetStatus(order, step.to)} sx={{ textTransform: 'none' }}>
                  {step.label}
                </Button>
              )}
              {step && step.to !== 'completed' && (
                <Button size="small" variant="outlined" disabled={busy} onClick={() => onSetStatus(order, 'completed')} sx={{ textTransform: 'none' }}>
                  Complete
                </Button>
              )}
              <Button size="small" variant="text" color="error" disabled={busy} onClick={() => onSetStatus(order, 'cancelled')} sx={{ textTransform: 'none' }}>
                Cancel
              </Button>
            </>
          ) : (
            <span className={styles.mutedNote}>{meta.label}</span>
          )}
        </div>
      </div>
    </div>
  );
}
