'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Alert,
  Button,
  CircularProgress,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { FaSync } from 'react-icons/fa';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import apiClient from '@/utility/api';
import { ACTIVITY_LOG } from '@/utility/apiPaths';
import styles from './page.module.css';

// Human labels for the recorded action codes.
const ACTION_LABELS = {
  'order.walkin_create': 'Placed walk-in order',
  'order.preorder_create': 'Placed pre-order',
  'order.status': 'Changed order status',
  'order.cancel': 'Cancelled order',
  'order.undo': 'Undid order status',
  'order.payment_confirm': 'Confirmed payment',
  'menu.sold_out': 'Toggled sold-out',
  'menu.publish': 'Published menu',
  'settings.publish': 'Published settings',
  'shop.open': 'Opened shop',
  'shop.close': 'Closed shop',
  'shop.slug_set': 'Changed shop link',
  'rating.reply': 'Replied to review',
  'user.invite': 'Invited user',
  'user.role_change': 'Changed user role',
  'user.remove': 'Removed user',
};

const actionLabel = (a) => ACTION_LABELS[a] || a;

// One-line summary of the detail JSON per action.
const describe = (e) => {
  const d = e.detail || {};
  switch (e.action) {
    case 'order.walkin_create':
    case 'order.preorder_create':
      return `${d.orderType || ''}${d.total != null ? ` · $${Number(d.total).toFixed(2)}` : ''}${d.scheduledFor ? ` · pickup ${dayjs(d.scheduledFor).format('D MMM h:mm A')}` : ''}`;
    case 'order.status':
      return d.status ? `→ ${d.status}` : '';
    case 'order.cancel':
      return d.reason ? `Reason: ${d.reason}` : '';
    case 'order.undo':
      return `${d.from} → ${d.to}${d.reason ? ` · ${d.reason}` : ''}`;
    case 'menu.sold_out':
      return `${d.soldOut ? 'Sold out' : 'Available'}`;
    case 'settings.publish':
      return e.entity_type || '';
    case 'shop.slug_set':
      return d.slug ? `/shop/${d.slug}` : '';
    case 'user.invite':
      return `${d.email || ''}${d.role ? ` as ${d.role}` : ''}`;
    case 'user.role_change':
      return `${d.email || ''}: ${d.from} → ${d.to}`;
    case 'user.remove':
      return `${d.email || ''}${d.role ? ` (${d.role})` : ''}`;
    default:
      return '';
  }
};

export default function ActivityLogPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [entries, setEntries] = useState([]);
  const [actors, setActors] = useState([]);
  const [actions, setActions] = useState([]);
  const [migrationNeeded, setMigrationNeeded] = useState(false);

  // Filters
  const [fromDate, setFromDate] = useState(() => dayjs().subtract(7, 'day').startOf('day'));
  const [toDate, setToDate] = useState(() => dayjs().endOf('day'));
  const [actor, setActor] = useState('all');
  const [action, setAction] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        from: fromDate.startOf('day').toISOString(),
        to: toDate.endOf('day').toISOString(),
      };
      if (actor !== 'all') params.actor = actor;
      if (action !== 'all') params.action = action;
      const res = await apiClient.get(ACTIVITY_LOG, { params });
      const d = res.data?.data ?? {};
      setEntries(d.entries ?? []);
      // Keep the filter option lists stable-ish by merging newly seen values.
      setActors((prev) => [...new Set([...prev, ...(d.actors ?? [])])]);
      setActions((prev) => [...new Set([...prev, ...(d.actions ?? [])])]);
      setMigrationNeeded(!!d.migrationNeeded);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load activity log.');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, actor, action]);

  useEffect(() => { load(); }, [load]);

  const actionOptions = useMemo(() => [...actions].sort(), [actions]);

  return (
    <div className={styles.page}>
      <HeaderSection
        title="Activity Log"
        description={<p>A record of who did what in your shop — useful when multiple people manage the same shop.</p>}
        showButton={false}
        showCancelButton={false}
        rightActions={
          <Button size="small" variant="outlined" startIcon={<FaSync />} onClick={load} sx={{ textTransform: 'none' }}>
            Refresh
          </Button>
        }
      />

      <div className={styles.filters}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label="From"
            value={fromDate}
            onChange={(v) => v && setFromDate(v)}
            format="DD MMM YYYY"
            slotProps={{ textField: { size: 'small' } }}
          />
          <DatePicker
            label="To"
            value={toDate}
            onChange={(v) => v && setToDate(v)}
            format="DD MMM YYYY"
            slotProps={{ textField: { size: 'small' } }}
          />
        </LocalizationProvider>
        <Select size="small" value={actor} onChange={(e) => setActor(e.target.value)} sx={{ minWidth: 180 }}>
          <MenuItem value="all">All users</MenuItem>
          {actors.map((a) => (<MenuItem key={a} value={a}>{a}</MenuItem>))}
        </Select>
        <Select size="small" value={action} onChange={(e) => setAction(e.target.value)} sx={{ minWidth: 180 }}>
          <MenuItem value="all">All actions</MenuItem>
          {actionOptions.map((a) => (<MenuItem key={a} value={a}>{actionLabel(a)}</MenuItem>))}
        </Select>
      </div>

      {migrationNeeded ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Database update required — run scripts/add-ratings-and-activity.sql in the Supabase SQL editor to start recording activity.
        </Alert>
      ) : null}

      {error ? <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert> : null}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><CircularProgress /></div>
      ) : entries.length === 0 ? (
        <ContentCard><p className={styles.empty}>No activity in this range.</p></ContentCard>
      ) : (
        <ContentCard>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>When</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className={styles.nowrap}>{dayjs(e.created_at).format('D MMM YYYY, h:mm A')}</td>
                    <td>
                      <span className={styles.actor}>{e.actor_id || 'Unknown'}</span>
                      {e.actor_role ? <span className={styles.role}>{e.actor_role}</span> : null}
                    </td>
                    <td className={styles.nowrap}>{actionLabel(e.action)}</td>
                    <td className={styles.detail}>{describe(e)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ContentCard>
      )}
    </div>
  );
}
