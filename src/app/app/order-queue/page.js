'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import dayjs from 'dayjs';
import {
  Select,
  MenuItem,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Alert,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { FaSync, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import styles from './page.module.css';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import apiClient from '@/utility/api';
import { SHOP_ORDERS } from '@/utility/apiPaths';
import { OrderCard, STATUS_FILTERS, orderRef } from './_views/OrderCard';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayKeyOf = (d) => dayjs(d).format('YYYY-MM-DD');

function CalendarShimmer() {
  return (
    <div className={styles.calGrid}>
      {DOW.map((d) => (
        <div key={d} className={styles.dow}>{d}</div>
      ))}
      {Array.from({ length: 42 }).map((_, i) => (
        <div key={i} className={`${styles.dayCell} ${styles.shimmer}`} />
      ))}
    </div>
  );
}

function ListShimmer() {
  return (
    <div className={styles.grid}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={styles.orderCard}>
          <div className={`${styles.shimmer} ${styles.shLine} ${styles.shWide}`} />
          <div className={`${styles.shimmer} ${styles.shBlock}`} />
          <div className={`${styles.shimmer} ${styles.shLine}`} />
        </div>
      ))}
    </div>
  );
}

export default function OrderQueuePage() {
  const [viewMonth, setViewMonth] = useState(() => dayjs().startOf('month'));
  const [selectedDate, setSelectedDate] = useState(() => dayjs());
  const [monthOrders, setMonthOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [screenshot, setScreenshot] = useState(null); // { url, ref }

  const viewMonthRef = useRef(viewMonth);
  viewMonthRef.current = viewMonth;
  const monthKey = viewMonth.format('YYYY-MM');

  const fetchMonth = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError('');
    try {
      const m = viewMonthRef.current;
      const from = m.startOf('month').toISOString();
      const to = m.endOf('month').toISOString();
      const res = await apiClient.get(SHOP_ORDERS, { params: { from, to } });
      setMonthOrders(res.data?.data ?? []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load orders.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonth();
  }, [monthKey, fetchMonth]);

  // Poll silently for new orders every 30s.
  useEffect(() => {
    const id = setInterval(() => fetchMonth(true), 30000);
    return () => clearInterval(id);
  }, [fetchMonth]);

  const countsByDay = useMemo(() => {
    const m = {};
    for (const o of monthOrders) {
      const k = dayKeyOf(o.created_at);
      m[k] = (m[k] || 0) + 1;
    }
    return m;
  }, [monthOrders]);

  const cells = useMemo(() => {
    const first = viewMonth.startOf('month');
    const startIdx = first.day(); // 0 = Sunday
    return Array.from({ length: 42 }, (_, i) => first.add(i - startIdx, 'day'));
  }, [viewMonth]);

  const dayOrders = useMemo(() => {
    const k = selectedDate.format('YYYY-MM-DD');
    return monthOrders.filter((o) => dayKeyOf(o.created_at) === k);
  }, [monthOrders, selectedDate]);

  const filtered = useMemo(() => {
    const sf = STATUS_FILTERS.find((f) => f.key === statusFilter);
    const q = search.trim().toLowerCase();
    return dayOrders.filter((o) => {
      if (sf?.match && !sf.match(o.status)) return false;
      if (q) {
        const hay = `${orderRef(o.id)} ${(o.items || []).map((i) => i.name).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [dayOrders, statusFilter, search]);

  const handleSetStatus = async (order, status) => {
    setBusyId(order.id);
    setError('');
    try {
      await apiClient.put(`${SHOP_ORDERS}/${order.id}/status`, { status });
      setMonthOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o)));
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update order.');
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmPayment = async (order) => {
    setBusyId(order.id);
    setError('');
    try {
      await apiClient.post(`${SHOP_ORDERS}/${order.id}/confirm-payment`);
      setMonthOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, payment_status: 'paid' } : o)));
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to confirm payment.');
    } finally {
      setBusyId(null);
    }
  };

  const goToday = () => {
    setViewMonth(dayjs().startOf('month'));
    setSelectedDate(dayjs());
  };

  const todayKey = dayjs().format('YYYY-MM-DD');
  const selKey = selectedDate.format('YYYY-MM-DD');

  return (
    <div className={styles.root}>
      <HeaderSection
        className={styles.header}
        title="Order Queue"
        description={<p>A monthly summary of your orders — pick a day to view and manage its orders.</p>}
        showButton={false}
        isError={!!error}
        setShowError={() => setError('')}
        errorMessage={error}
        rightActions={
          <Button size="small" variant="outlined" onClick={() => fetchMonth()} startIcon={<FaSync />} sx={{ textTransform: 'none' }}>
            Refresh
          </Button>
        }
      />

      {/* Month calendar */}
      <ContentCard className={styles.calCard}>
        <div className={styles.calHeader}>
          <div className={styles.calNav}>
            <button type="button" className={styles.navBtn} onClick={() => setViewMonth((m) => m.subtract(1, 'month'))} aria-label="Previous month">
              <FaChevronLeft size={12} />
            </button>
            <span className={styles.monthLabel}>{viewMonth.format('MMMM YYYY')}</span>
            <button type="button" className={styles.navBtn} onClick={() => setViewMonth((m) => m.add(1, 'month'))} aria-label="Next month">
              <FaChevronRight size={12} />
            </button>
          </div>
          <div className={styles.calMeta}>
            {!isLoading && <span className={styles.monthTotal}>{monthOrders.length} order{monthOrders.length !== 1 ? 's' : ''} this month</span>}
            <button type="button" className={styles.todayBtn} onClick={goToday}>Today</button>
          </div>
        </div>

        {isLoading ? (
          <CalendarShimmer />
        ) : (
          <div className={styles.calGrid}>
            {DOW.map((d) => (
              <div key={d} className={styles.dow}>{d}</div>
            ))}
            {cells.map((d, idx) => {
              const k = d.format('YYYY-MM-DD');
              const inMonth = d.month() === viewMonth.month();
              const count = inMonth ? countsByDay[k] || 0 : 0;
              const isToday = k === todayKey;
              const isSel = k === selKey;
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!inMonth}
                  className={[
                    styles.dayCell,
                    !inMonth ? styles.adjacent : '',
                    isSel ? styles.selected : '',
                    isToday ? styles.today : '',
                    count > 0 ? styles.hasOrders : '',
                  ].join(' ')}
                  onClick={() => inMonth && setSelectedDate(d)}
                >
                  <span className={styles.dayNum}>{d.date()}</span>
                  {count > 0 && <span className={styles.countBadge}>{count}</span>}
                </button>
              );
            })}
          </div>
        )}
      </ContentCard>

      {/* Selected day's orders */}
      <div className={styles.dayHeader}>
        <h2 className={styles.dayTitle}>{selectedDate.format('dddd, D MMM YYYY')}</h2>
        <div className={styles.dayFilters}>
          <Select size="small" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={styles.statusSelect}>
            {STATUS_FILTERS.map((f) => (
              <MenuItem key={f.key} value={f.key}>{f.label}</MenuItem>
            ))}
          </Select>
          <TextField size="small" placeholder="Search ref or item…" value={search} onChange={(e) => setSearch(e.target.value)} className={styles.search} />
        </div>
      </div>

      {isLoading ? (
        <ListShimmer />
      ) : filtered.length === 0 ? (
        <ContentCard>
          <p className={styles.empty}>No orders on this day.</p>
        </ContentCard>
      ) : (
        <div className={styles.grid}>
          {filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              busy={busyId === order.id}
              onSetStatus={handleSetStatus}
              onConfirmPayment={handleConfirmPayment}
              onViewScreenshot={(o) => setScreenshot({ url: o.screenshot_signed_url, ref: orderRef(o.id) })}
            />
          ))}
        </div>
      )}

      <Dialog open={!!screenshot} onClose={() => setScreenshot(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, pr: 1 }}>
          <span>Payment screenshot {screenshot?.ref}</span>
          <IconButton aria-label="close" size="small" onClick={() => setScreenshot(null)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {screenshot?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={screenshot.url} alt="Payment screenshot" className={styles.screenshotFull} />
          ) : (
            <Alert severity="info">No screenshot available.</Alert>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
