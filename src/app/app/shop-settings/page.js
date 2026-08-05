'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Popover,
  Radio,
  RadioGroup,
  Select,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import { FaCheck } from 'react-icons/fa';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import apiClient from '@/utility/api';
import { ORDERING_SETTINGS, CALENDAR_OVERRIDES, CALENDAR_OVERRIDE, RELEASE_STATUS, PUBLISH_SHOP_SETTINGS_UPDATE, PREORDER_COUNTS } from '@/utility/apiPaths';
import Link from 'next/link';

import styles from './ShopSettings.module.css';

const pad2 = (n) => String(n).padStart(2, '0');
const dateKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const generateTimeSlots = () => {
  const slots = [];
  for (let m = 6 * 60; m <= 23 * 60 + 30; m += 30) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    slots.push(`${pad2(h)}:${pad2(mm)}`);
  }
  return slots;
};

const format12h = (hhmm) => {
  const [hh, mm] = hhmm.split(':').map((x) => Number(x));
  const suffix = hh >= 12 ? 'PM' : 'AM';
  const h12 = ((hh + 11) % 12) + 1;
  return `${pad2(h12)}:${pad2(mm)} ${suffix}`;
};

const formatDateHuman = (d) =>
  d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const dayNameByIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DEFAULT_HOURS = [
  { enabled: false, open: '09:00', close: '22:00' },
  { enabled: true,  open: '09:00', close: '22:00' },
  { enabled: true,  open: '09:00', close: '22:00' },
  { enabled: true,  open: '09:00', close: '22:00' },
  { enabled: true,  open: '09:00', close: '22:00' },
  { enabled: true,  open: '09:00', close: '22:00' },
  { enabled: true,  open: '10:00', close: '23:00' },
];

export default function ShopSettingsPage() {
  const timeSlots = useMemo(() => generateTimeSlots(), []);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaveSuccess, setIsSaveSuccess] = useState(false);
  const [hasPublishableChanges, setHasPublishableChanges] = useState(false);
  const [isPublishLoading, setIsPublishLoading] = useState(false);
  const [isPublishSuccess, setIsPublishSuccess] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const [isEdit, setIsEdit] = useState(true);
  const [releaseStatus, setReleaseStatus] = useState(null);

  // SECTION 1 — Ordering Hours
  const [hours, setHours] = useState(DEFAULT_HOURS);

  // SECTION 2 — Order Settings
  const [orderMode, setOrderMode] = useState('today_and_preorder');
  const [defaultDailyQuota, setDefaultDailyQuota] = useState(50);
  const [bookingDaysAhead, setBookingDaysAhead] = useState(90);
  const [minNoticeHours, setMinNoticeHours] = useState(0.5);

  // Snapshot of last-saved (or loaded) values — used to detect unsaved changes
  const [savedSettings, setSavedSettings] = useState(null);

  const hasChanges = useMemo(() => {
    if (!savedSettings) return false;
    return (
      JSON.stringify(hours) !== JSON.stringify(savedSettings.hours) ||
      orderMode !== savedSettings.orderMode ||
      defaultDailyQuota !== savedSettings.defaultDailyQuota ||
      bookingDaysAhead !== savedSettings.bookingDaysAhead ||
      minNoticeHours !== savedSettings.minNoticeHours
    );
  }, [hours, orderMode, defaultDailyQuota, bookingDaysAhead, minNoticeHours, savedSettings]);

  // SECTION 3 — Ordering Calendar
  const today = useMemo(() => startOfDay(new Date()), []);
  const [viewMonth, setViewMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const currentMonthLabel = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Active pre-orders per date key, loaded for each viewed month.
  const [preOrdersByDate, setPreOrdersByDate] = useState({});

  const loadPreorderCounts = useCallback(async (month) => {
    try {
      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);
      const res = await apiClient.get(PREORDER_COUNTS, {
        params: { from: monthStart.toISOString(), to: monthEnd.toISOString() },
      });
      const scheduled = res.data?.data?.scheduled ?? [];
      // Zero out every day of the fetched month, then count — so cancelled
      // pre-orders don't leave stale counts behind.
      const monthCounts = {};
      for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
        monthCounts[dateKey(d)] = 0;
      }
      for (const iso of scheduled) {
        const key = dateKey(new Date(iso));
        monthCounts[key] = (monthCounts[key] ?? 0) + 1;
      }
      setPreOrdersByDate((prev) => ({ ...prev, ...monthCounts }));
    } catch {
      // Non-fatal: calendar still works without pre-order counts
    }
  }, []);

  useEffect(() => {
    loadPreorderCounts(viewMonth);
  }, [viewMonth, loadPreorderCounts]);

  const [calendarOverrides, setCalendarOverrides] = useState({});

  const showToast = (message, severity = 'success') => setSnack({ open: true, message, severity });

  // Reset save success tick when user makes new edits
  useEffect(() => {
    if (hasChanges) setIsSaveSuccess(false);
  }, [hasChanges]);

  // Load ordering settings on mount
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await apiClient.get(ORDERING_SETTINGS);
        const data = res.data.data;
        const loaded = {
          hours: data?.hours ?? DEFAULT_HOURS,
          orderMode: data?.orderMode ?? 'today_and_preorder',
          defaultDailyQuota: data?.defaultDailyQuota ?? 50,
          bookingDaysAhead: data?.bookingDaysAhead ?? 90,
          minNoticeHours: data?.minNoticeHours ?? 0.5,
        };
        setHours(loaded.hours);
        setOrderMode(loaded.orderMode);
        setDefaultDailyQuota(loaded.defaultDailyQuota);
        setBookingDaysAhead(loaded.bookingDaysAhead);
        setMinNoticeHours(loaded.minNoticeHours);
        setSavedSettings(loaded);
        // Show the Publish button as available on load if there are saved-but-unpublished changes.
        setHasPublishableChanges(!!data?.isChanges);
        if (data?.isEdit !== undefined) setIsEdit(data.isEdit);
      } catch (err) {
        if (err.response?.status === 404) {
          // No settings saved yet — set defaults as the baseline
          setSavedSettings({
            hours: DEFAULT_HOURS,
            orderMode: 'today_and_preorder',
            defaultDailyQuota: 50,
            bookingDaysAhead: 90,
            minNoticeHours: 0.5,
          });
        } else {
          showToast('Failed to load ordering settings', 'error');
        }
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const fetchReleaseStatus = async () => {
      try {
        const res = await apiClient.get(RELEASE_STATUS);
        const data = res.data;
        if (data?.data?.status) setReleaseStatus(data.data.status);
      } catch {
        // Non-critical
      }
    };
    fetchReleaseStatus();
  }, []);

  // Load calendar overrides whenever the viewed month changes
  const loadCalendarOverrides = useCallback(async (month) => {
    try {
      const year = month.getFullYear();
      const m = month.getMonth() + 1;
      const res = await apiClient.get(CALENDAR_OVERRIDES, { params: { year, month: m } });
      setCalendarOverrides((prev) => ({ ...prev, ...res.data.data }));
    } catch {
      // Non-fatal: calendar still works without override data
    }
  }, []);

  useEffect(() => {
    loadCalendarOverrides(viewMonth);
  }, [viewMonth, loadCalendarOverrides]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const payload = { hours, orderMode, defaultDailyQuota, bookingDaysAhead, minNoticeHours };
      await apiClient.put(ORDERING_SETTINGS, payload);
      setSavedSettings(payload);
      setIsSaveSuccess(true);
      setHasPublishableChanges(true);
      setIsPublishSuccess(false);
      showToast('Settings saved successfully');
    } catch {
      showToast('Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishSettingsUpdate = () => setShowPublishConfirm(true);

  const handleConfirmPublishSettingsUpdate = async () => {
    setShowPublishConfirm(false);
    setIsPublishLoading(true);
    setIsPublishSuccess(false);
    try {
      await apiClient.post(PUBLISH_SHOP_SETTINGS_UPDATE);
      setIsPublishSuccess(true);
      setHasPublishableChanges(false);
    } catch {
      showToast('Failed to publish settings update', 'error');
    } finally {
      setIsPublishLoading(false);
    }
  };

  const normalizeNumberSafe = (value, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  const { calendarCells } = useMemo(() => {
    const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const startIdx = first.getDay();
    const cells = [];
    for (let i = 0; i < 42; i += 1) {
      const dayNum = i - startIdx + 1;
      cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), dayNum));
    }
    return { calendarCells: cells };
  }, [viewMonth]);

  const getDayDerived = (d) => {
    const key = dateKey(d);
    const override = calendarOverrides[key];
    const dow = d.getDay();
    const defaultOpen = !!hours[dow]?.enabled;
    const status = override?.status ?? (defaultOpen ? 'open' : 'closed');
    const preOrders = preOrdersByDate[key] ?? 0;
    const useDefaultQuota = override ? !!override.useDefaultQuota : true;
    const quota = override
      ? useDefaultQuota
        ? defaultDailyQuota
        : normalizeNumberSafe(override.quota, defaultDailyQuota)
      : defaultDailyQuota;
    const isQuotaOverridden = override ? !useDefaultQuota : false;
    const reason = override?.reason ?? '';
    return { key, status, preOrders, quota, isQuotaOverridden, reason };
  };

  // Popover state
  const [dayPopoverAnchorEl, setDayPopoverAnchorEl] = useState(null);
  const [dayPopoverKey, setDayPopoverKey] = useState(null);
  const [draftStatus, setDraftStatus] = useState('open');
  const [draftUseDefaultQuota, setDraftUseDefaultQuota] = useState(true);
  const [draftQuota, setDraftQuota] = useState(defaultDailyQuota);
  const [draftReason, setDraftReason] = useState('');
  const [isSavingOverride, setIsSavingOverride] = useState(false);

  const popoverDerived = (() => {
    if (!dayPopoverKey) return null;
    const [y, m, da] = dayPopoverKey.split('-').map((x) => Number(x));
    return getDayDerived(new Date(y, m - 1, da));
  })();

  const openDayPopover = (d, anchorEl) => {
    if (!isEdit) return;
    const derived = getDayDerived(d);
    const isPast = startOfDay(d).getTime() < today.getTime();
    if (isPast) return;
    if (derived.status !== 'open') return;

    setDayPopoverKey(derived.key);
    setDayPopoverAnchorEl(anchorEl ?? null);
    setDraftStatus(derived.status);
    setDraftUseDefaultQuota(!derived.isQuotaOverridden);
    setDraftQuota(derived.quota);
    setDraftReason(derived.reason);
  };

  const closeDayPopover = () => {
    setDayPopoverAnchorEl(null);
    setDayPopoverKey(null);
  };

  const applyOverrideForDay = async () => {
    if (!popoverDerived) return;

    const reasonToSave = draftStatus === 'closed' ? (draftReason || '') : '';
    const payload = {
      date: popoverDerived.key,
      status: draftStatus,
      useDefaultQuota: draftUseDefaultQuota,
      quota: draftUseDefaultQuota ? null : Math.max(1, draftQuota),
      reason: reasonToSave,
    };

    setIsSavingOverride(true);
    try {
      await apiClient.put(CALENDAR_OVERRIDE, payload);
      setCalendarOverrides((prev) => ({
        ...prev,
        [popoverDerived.key]: {
          status: draftStatus,
          useDefaultQuota: draftUseDefaultQuota,
          quota: draftUseDefaultQuota ? 0 : Math.max(1, draftQuota),
          reason: reasonToSave,
        },
      }));
      closeDayPopover();
      showToast('Day override saved');
    } catch {
      showToast('Failed to save day override', 'error');
    } finally {
      setIsSavingOverride(false);
    }
  };

  const { daysOfWeek } = useMemo(() => ({ daysOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] }), []);

  const prevMonth = () =>
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));

  const nextMonth = () =>
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  const dayPopoverWarning = useMemo(() => {
    if (!popoverDerived || draftStatus !== 'closed' || popoverDerived.preOrders <= 0) return '';
    return `⚠️ Closing this date will affect ${popoverDerived.preOrders} existing pre-orders.`;
  }, [popoverDerived, draftStatus]);

  if (isLoading) {
    return (
      <div className={styles.page} style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.stickyHeader}>
        <HeaderSection
          title="Ordering Settings"
          description={
            <p>Configure ordering hours, order mode, and pre-order availability for your shop.</p>
          }
          showButton={false}
          showCancelButton={false}
          isSuccess={releaseStatus === 'approved_scheduled'}
          successMessage={
            !isEdit && releaseStatus === 'approved_scheduled'
              ? (
                <>
                  Your release has been approved. It will be released on the date you stated on{' '}
                  <Link href="/app/release/submission">Release Submission Page</Link>.
                  {' '}If you wish to change the date, cancel and re-send for approval. For any enquiry or urgent release, please email support@homefood.sg.
                </>
              )
              : null
          }
          infoMessage={
            !isEdit && releaseStatus !== 'approved_scheduled'
              ? 'The information has been submitted for release and is currently under review. To make any changes, please cancel it under Release Submission.'
              : null
          }
          rightActions={
            <>
              <Button
                size="small"
                variant="contained"
                loading={isSaving}
                loadingPosition="start"
                startIcon={isSaveSuccess ? <FaCheck /> : undefined}
                disabled={isSaving || !hasChanges || !isEdit || isSaveSuccess}
                onClick={handleSaveSettings}
                sx={{ textTransform: 'none' }}
              >
                {isSaveSuccess ? 'Saved' : 'Save Settings'}
              </Button>
              {releaseStatus === 'Released' && (
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  loading={isPublishLoading}
                  loadingPosition="start"
                  startIcon={isPublishSuccess ? <FaCheck /> : undefined}
                  disabled={isPublishSuccess || !hasPublishableChanges || hasChanges}
                  onClick={handlePublishSettingsUpdate}
                  sx={{ textTransform: 'none' }}
                >
                  {isPublishSuccess ? 'Update Published' : 'Publish Update'}
                </Button>
              )}
            </>
          }
        />
      </div>

      <div className={styles.content}>
        <br />
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <div>
              <Typography sx={{ fontWeight: 900 }}>Ordering Hours</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                Set the hours customers can place orders. &ldquo;Closed&rdquo; means no orders can be placed, not that the shop is physically closed.
              </Typography>
            </div>
          </AccordionSummary>
          <AccordionDetails>
            <div className={styles.tableWrap}>
              <div className={styles.hoursTable}>
                {hours.map((h, idx) => {
                  const disabled = !h.enabled || !isEdit;
                  return (
                    <div key={idx} className={styles.hoursRow}>
                      <Typography className={styles.dayCell}>{dayNameByIndex[idx]}</Typography>
                      <div className={styles.hoursToggleCell}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={h.enabled}
                              disabled={!isEdit}
                              onChange={(e) => {
                                const nextEnabled = e.target.checked;
                                setHours((prev) => {
                                  const copy = [...prev];
                                  copy[idx] = { ...copy[idx], enabled: nextEnabled };
                                  return copy;
                                });
                              }}
                            />
                          }
                          label={h.enabled ? null : <span className={styles.closedInline}>Closed</span>}
                        />
                      </div>
                      <Select
                        className={styles.timeSelect}
                        size="small"
                        disabled={disabled}
                        value={h.open}
                        onChange={(e) => {
                          const value = e.target.value;
                          setHours((prev) => {
                            const copy = [...prev];
                            copy[idx] = { ...copy[idx], open: value };
                            return copy;
                          });
                        }}
                      >
                        {timeSlots.map((t) => (
                          <MenuItem key={t} value={t}>{format12h(t)}</MenuItem>
                        ))}
                      </Select>
                      <Select
                        className={styles.timeSelect}
                        size="small"
                        disabled={disabled}
                        value={h.close}
                        onChange={(e) => {
                          const value = e.target.value;
                          setHours((prev) => {
                            const copy = [...prev];
                            copy[idx] = { ...copy[idx], close: value };
                            return copy;
                          });
                        }}
                      >
                        {timeSlots.map((t) => (
                          <MenuItem key={t} value={t}>{format12h(t)}</MenuItem>
                        ))}
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>
          </AccordionDetails>
        </Accordion>

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <div>
              <Typography sx={{ fontWeight: 900 }}>Order Settings</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                Choose whether to allow immediate orders today, plus how many days ahead customers can pre-order.
              </Typography>
            </div>
          </AccordionSummary>
          <AccordionDetails>
            <div className={styles.grid2}>
              <div style={{ gridColumn: '1 / -1' }}>
                <Typography sx={{ fontWeight: 800, fontSize: 14, marginBottom: 1 }}>Order mode</Typography>
                <RadioGroup value={orderMode} onChange={(e) => setOrderMode(e.target.value)}>
                  <FormControlLabel
                    value="today_only"
                    control={<Radio size="small" disabled={!isEdit} />}
                    label="Order Today"
                  />
                  <FormControlLabel
                    value="today_and_preorder"
                    control={<Radio size="small" disabled={!isEdit} />}
                    label="Order Today + Pre-order"
                  />
                  <FormControlLabel value="preorder_only" control={<Radio size="small" disabled={!isEdit} />} label="Pre-order only" />
                </RadioGroup>
                <br />
              </div>

              <TextField
                label="Max items per day (default)"
                type="number"
                inputProps={{ min: 1 }}
                value={defaultDailyQuota}
                disabled={!isEdit}
                onChange={(e) => setDefaultDailyQuota(Math.max(1, Number(e.target.value)))}
                helperText="Applied to all calendar days unless overridden"
                size="small"
              />
              <TextField
                label="Allow pre-orders up to X days ahead"
                type="number"
                inputProps={{ min: 1, max: 90 }}
                value={bookingDaysAhead}
                disabled={!isEdit || orderMode === 'today_only'}
                onChange={(e) => setBookingDaysAhead(Math.max(1, Math.min(90, Number(e.target.value))))}
                helperText={
                  orderMode === 'today_only'
                    ? 'Not applicable — pre-orders are disabled in Order Today mode'
                    : orderMode === 'preorder_only'
                      ? 'Customers can only pre-order within this range'
                      : 'Default is 90 days (3 months)'
                }
                size="small"
              />
              <TextField
                label="Minimum hours notice"
                type="number"
                inputProps={{ min: 0.5, step: 0.5 }}
                value={minNoticeHours}
                disabled={!isEdit}
                onChange={(e) => setMinNoticeHours(Math.max(0.5, Number(e.target.value)))}
                helperText="Set in 0.5-hour steps (default: 0.5 hour)"
                size="small"
              />
            </div>
          </AccordionDetails>
        </Accordion>

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <div>
              <Typography sx={{ fontWeight: 900 }}>Ordering Calendar</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                View and manage ordering availability by date. Override daily quotas, close specific dates, and see upcoming pre-orders at a glance.
              </Typography>
            </div>
          </AccordionSummary>
          <AccordionDetails>
            <div className={styles.calendarWrap}>
              <div className={styles.calHeader}>
                <Button variant="outlined" size="small" sx={{ textTransform: 'none' }} onClick={prevMonth}>
                  Prev
                </Button>
                <Typography sx={{ fontWeight: 900 }}>{currentMonthLabel}</Typography>
                <Button variant="outlined" size="small" sx={{ textTransform: 'none' }} onClick={nextMonth}>
                  Next
                </Button>
              </div>

              <div className={styles.calendarGrid}>
                {daysOfWeek.map((d) => (
                  <div key={d} className={styles.dowCell}>{d}</div>
                ))}

                {calendarCells.map((d, idx) => {
                  const key = dateKey(d);
                  const isInMonth = d.getMonth() === viewMonth.getMonth();
                  const isPast = startOfDay(d).getTime() < today.getTime();
                  const derived = getDayDerived(d);
                  const hasPreOrders = derived.preOrders > 0;
                  const isClosed = derived.status === 'closed';
                  const remainingSlots = Math.max(0, derived.quota - derived.preOrders);

                  const background = isClosed
                    ? 'rgba(220, 53, 69, 0.08)'
                    : hasPreOrders
                      ? 'rgba(34, 197, 94, 0.14)'
                      : 'white';

                  const clickable = !isPast && isInMonth && derived.status === 'open';

                  return (
                    <div
                      key={`${key}-${idx}`}
                      className={styles.dayCell}
                      style={{
                        background,
                        opacity: isInMonth ? 1 : 0.6,
                        pointerEvents: clickable ? 'auto' : 'none',
                      }}
                      onClick={(e) => openDayPopover(d, e.currentTarget)}
                    >
                      <div className={styles.dayTop}>
                        <Typography className={styles.dayNum} style={{ fontWeight: 900 }}>
                          {d.getDate()}
                        </Typography>
                        {derived.status === 'closed' ? <span className={styles.closedLabel}>Closed</span> : null}
                      </div>

                      {hasPreOrders ? (
                        <div className={styles.badgeOrders}>{derived.preOrders} orders</div>
                      ) : null}

                      {!isClosed ? (
                        <div className={styles.badgeQuota}>
                          {remainingSlots} slots
                          {derived.isQuotaOverridden ? <span className={styles.badgeBolt}>⚡</span> : null}
                        </div>
                      ) : null}

                      {derived.status === 'closed' && derived.reason ? (
                        <Typography variant="caption" className={styles.reason}>
                          {derived.reason}
                        </Typography>
                      ) : null}

                      {isPast ? <div className={styles.pastMask} /> : null}
                    </div>
                  );
                })}
              </div>

              <div className={styles.legendWrap}>
                <Button
                  variant="text"
                  size="small"
                  sx={{ textTransform: 'none' }}
                  className={styles.legendToggle}
                  onClick={() => setIsLegendOpen((prev) => !prev)}
                >
                  {isLegendOpen ? 'Hide legend details' : 'Show legend details'}
                </Button>

                {isLegendOpen ? (
                  <div className={styles.legend}>
                    <div>🟢 Open: Date is available for ordering.</div>
                    <div>🔴 Closed: Date is not available for ordering.</div>
                    <div>🟢 Has pre-orders: There are existing orders on this date.</div>
                    <div>⚡ Quota overridden: This date uses a custom quota, not the default.</div>
                  </div>
                ) : null}
              </div>
            </div>
          </AccordionDetails>
        </Accordion>
      </div>

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snack.severity} sx={{ width: '100%' }}>
          {snack.message}
        </Alert>
      </Snackbar>

      <Popover
        open={Boolean(dayPopoverKey)}
        onClose={closeDayPopover}
        anchorEl={dayPopoverAnchorEl}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <div className={styles.popover}>
          {popoverDerived ? (
            <>
              <Typography sx={{ fontWeight: 900, marginBottom: 8 }}>
                {formatDateHuman(new Date(popoverDerived.key))}
              </Typography>

              <div className={styles.popRow}>
                <Typography className={styles.popLabel}>Status</Typography>
                <Select size="small" value={draftStatus} onChange={(e) => setDraftStatus(e.target.value)}>
                  <MenuItem value="open">Open</MenuItem>
                  <MenuItem value="closed">Closed</MenuItem>
                </Select>
              </div>

              <div className={styles.popRow}>
                <Typography className={styles.popLabel}>Quota override</Typography>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', width: '100%' }}>
                  <TextField
                    size="small"
                    type="number"
                    inputProps={{ min: 1 }}
                    value={draftUseDefaultQuota ? defaultDailyQuota : draftQuota}
                    disabled={draftUseDefaultQuota}
                    onChange={(e) => setDraftQuota(Math.max(1, Number(e.target.value)))}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={draftUseDefaultQuota}
                        onChange={(e) => setDraftUseDefaultQuota(e.target.checked)}
                      />
                    }
                    label={`Use default (${defaultDailyQuota})`}
                  />
                </div>
              </div>

              <div className={styles.popRow}>
                <Typography className={styles.popLabel}>Reason/Note</Typography>
                <TextField
                  size="small"
                  value={draftReason}
                  disabled={draftStatus === 'open'}
                  placeholder="(optional)"
                  onChange={(e) => setDraftReason(e.target.value)}
                  fullWidth
                />
              </div>

              {dayPopoverWarning ? (
                <Alert severity="error" sx={{ marginTop: 8 }}>{dayPopoverWarning}</Alert>
              ) : null}

              <Typography variant="caption" className={styles.popHint} sx={{ marginTop: 4 }}>
                ⚠️ {popoverDerived.preOrders} pre-orders on this day
              </Typography>

              <div className={styles.popActions}>
                <Button variant="outlined" sx={{ textTransform: 'none' }} onClick={closeDayPopover}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  sx={{ textTransform: 'none' }}
                  onClick={applyOverrideForDay}
                  disabled={isSavingOverride}
                >
                  {isSavingOverride ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </Popover>

      <Dialog open={showPublishConfirm} onClose={() => setShowPublishConfirm(false)}>
        <DialogTitle>Publish Update for Ordering Settings</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to publish your ordering settings? This will make your latest changes visible to customers immediately.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPublishConfirm(false)} style={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button onClick={handleConfirmPublishSettingsUpdate} variant="contained" style={{ textTransform: 'none' }}>
            Publish
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
