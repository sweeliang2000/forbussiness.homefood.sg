'use client';

import { useState } from 'react';
import dayjs from 'dayjs';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
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

// Statuses that can be stepped back one stage (matches the backend's UNDO_TARGET).
export const canUndoStatus = (status) => ['preparing', 'ready', 'completed', 'cancelled'].includes(status);

export const orderRef = (id) => `#${String(id || '').replace(/-/g, '').slice(0, 8).toUpperCase()}`;

const PAYMENT_METHOD_LABELS = {
  manual: 'Manual PayNow',
  walkin: 'Walk-in · payment not recorded',
  credit_card: 'Manual Credit Card',
  paynow: 'PayNow',
  cash: 'Cash',
  other: 'Other payment',
  automatic: 'Online payment',
};

const methodLabel = (method) => PAYMENT_METHOD_LABELS[method] ?? 'Online payment';

export function OrderCard({ order, busy, queueNumber, onSetStatus, onConfirmPayment, onViewScreenshot, onUndoStatus, onEditEta, onCancel }) {
  const meta = STATUS_META[order.status] || { label: order.status, cls: 'stNew' };
  const pay = PAYMENT_META[order.payment_status] || { label: order.payment_status, cls: 'pyPending' };
  const items = Array.isArray(order.items) ? order.items : [];
  const time = order.created_at ? dayjs(order.created_at).format('h:mm A') : '';
  const step = nextStep(order.status);
  const active = isActive(order.status);
  const isManual = order.payment_method === 'manual';
  const isWalkin = ['walkin', 'credit_card', 'paynow', 'cash', 'other'].includes(order.payment_method);

  const eta = order.estimated_ready_at ? dayjs(order.estimated_ready_at) : null;
  const etaOverdue = active && eta && eta.isBefore(dayjs());
  const scheduled = order.scheduled_for ? dayjs(order.scheduled_for) : null;
  const undoable = !!onUndoStatus && canUndoStatus(order.status);

  return (
    <div className={styles.orderCard}>
      <div className={styles.cardHead}>
        <div>
          {queueNumber != null && <span className={styles.queueNo}>Q{queueNumber}</span>}
          <span className={styles.orderRef}>{orderRef(order.id)}</span>
          <span className={styles.orderTime}>{time}</span>
        </div>
        <div className={styles.badges}>
          <span className={`${styles.badge} ${styles[meta.cls]}`}>{meta.label}</span>
          <span className={`${styles.badge} ${styles.typeBadge}`}>
            {order.order_type === 'dine-in' ? 'Dine-in' : 'Takeaway'}
          </span>
          {isWalkin && <span className={`${styles.badge} ${styles.walkinBadge}`}>Walk-in</span>}
          {scheduled && (
            <span className={`${styles.badge} ${styles.preorderBadge}`}>
              Pre-order · {scheduled.format('D MMM, h:mm A')}
            </span>
          )}
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
              {it.notes && <span className={styles.itemNote}> — {it.notes}</span>}
            </span>
            <span className={styles.itemPrice}>${(Number(it.unitPrice || 0) * Number(it.quantity || 1)).toFixed(2)}</span>
          </div>
        ))}
      </div>

      {order.notes && <p className={styles.notes}>Note: {order.notes}</p>}

      {eta ? (
        <div className={styles.etaRow}>
          <span className={`${styles.etaTag} ${etaOverdue ? styles.etaTagOverdue : ''}`}>
            ⏱ Ready ~{eta.format('h:mm A')}{etaOverdue ? ' · overdue' : ''}
          </span>
          {active && onEditEta && (
            <button type="button" className={styles.linkBtn} disabled={busy} onClick={() => onEditEta(order)}>
              Edit
            </button>
          )}
        </div>
      ) : active && onEditEta ? (
        <div className={styles.etaRow}>
          <button type="button" className={styles.linkBtn} disabled={busy} onClick={() => onEditEta(order)}>
            + Set est. time
          </button>
        </div>
      ) : null}

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
              {undoable && (
                <Button size="small" variant="text" disabled={busy} onClick={() => onUndoStatus(order)} sx={{ textTransform: 'none' }}>
                  Undo
                </Button>
              )}
              <Button size="small" variant="text" color="error" disabled={busy} onClick={() => (onCancel ? onCancel(order) : onSetStatus(order, 'cancelled'))} sx={{ textTransform: 'none' }}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <span className={styles.mutedNote}>{meta.label}</span>
              {undoable && (
                <Button size="small" variant="text" disabled={busy} onClick={() => onUndoStatus(order)} sx={{ textTransform: 'none' }}>
                  Undo
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Shared dialogs (used by Terminal and Order Queue) ───────────────────────

// Confirms an undo one step back and requires a reason for the audit trail.
export function UndoStatusDialog({ order, busy, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  if (!order) return null;

  const meta = STATUS_META[order.status] || { label: order.status };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Undo &ldquo;{meta.label}&rdquo; for {orderRef(order.id)}?</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          The order moves one step back in the queue. Please state the reason — it is kept on the order&rsquo;s history.
        </Typography>
        <TextField
          autoFocus
          fullWidth
          size="small"
          label="Reason"
          placeholder="e.g. pressed Complete by accident"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          multiline
          minRows={2}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!reason.trim() || busy}
          onClick={() => onConfirm(order, reason.trim())}
          startIcon={busy ? <CircularProgress size={14} color="inherit" /> : null}
          sx={{ textTransform: 'none' }}
        >
          Undo
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Confirms a cancellation and requires a reason (kept on the order history).
export function CancelOrderDialog({ order, busy, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  if (!order) return null;

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Cancel {orderRef(order.id)}?</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          Please state the reason for cancelling{order.payment_status === 'paid' ? ' (and any refund note)' : ''}. It is kept on the order&rsquo;s history.
        </Typography>
        <TextField
          autoFocus
          fullWidth
          size="small"
          label="Reason"
          placeholder="e.g. customer cancelled, out of stock, refunded via PayNow"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          multiline
          minRows={2}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Keep order</Button>
        <Button
          variant="contained"
          color="error"
          disabled={!reason.trim() || busy}
          onClick={() => onConfirm(order, reason.trim())}
          startIcon={busy ? <CircularProgress size={14} color="inherit" /> : null}
          sx={{ textTransform: 'none' }}
        >
          Cancel order
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Adjust an order's estimated completion time: quick ± buttons or direct time entry.
export function EditEtaDialog({ order, busy, onClose, onConfirm }) {
  const [eta, setEta] = useState(() => {
    if (order?.estimated_ready_at) return dayjs(order.estimated_ready_at);
    return dayjs().add(15, 'minute');
  });
  if (!order) return null;

  const nudge = (mins) => setEta((prev) => prev.add(mins, 'minute'));

  const onTimeInput = (value) => {
    // value is "HH:mm" — keep the current date, swap the time.
    const [hh, mm] = String(value).split(':').map(Number);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return;
    setEta((prev) => prev.hour(hh).minute(mm).second(0).millisecond(0));
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Est. completion for {orderRef(order.id)}</DialogTitle>
      <DialogContent>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
          <TextField
            type="time"
            size="small"
            label="Ready at"
            value={eta.format('HH:mm')}
            onChange={(e) => onTimeInput(e.target.value)}
            inputProps={{ step: 60 }}
          />
          {[-10, -5, 5, 10].map((m) => (
            <Button key={m} size="small" variant="outlined" onClick={() => nudge(m)} sx={{ textTransform: 'none', minWidth: 52 }}>
              {m > 0 ? `+${m}` : m} min
            </Button>
          ))}
        </div>
        <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: 'text.secondary' }}>
          {eta.format('dddd, D MMM · h:mm A')}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button
          variant="contained"
          disabled={busy}
          onClick={() => onConfirm(order, eta.toISOString())}
          startIcon={busy ? <CircularProgress size={14} color="inherit" /> : null}
          sx={{ textTransform: 'none' }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
