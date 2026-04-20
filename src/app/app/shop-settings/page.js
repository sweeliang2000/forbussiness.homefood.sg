// Ordering Settings (mock) - all local state, no backend.
'use client';

import { useMemo, useState } from 'react';
import {
  Alert,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Checkbox,
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import styles from './ShopSettings.module.css';

const pad2 = (n) => String(n).padStart(2, '0');
const dateKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const generateTimeSlots = () => {
  // 06:00 AM – 11:30 PM, every 30 minutes.
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

const formatDateHuman = (d) => {
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

const dayNameByIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ShopSettingsPage() {
  const timeSlots = useMemo(() => generateTimeSlots(), []);
  const [isLegendOpen, setIsLegendOpen] = useState(false);

  // Top tabs (Menu Builder placeholder vs Ordering Settings).
  const [tabValue, setTabValue] = useState('shop'); // UI-only

  // SECTION 1 — Ordering Hours
  const [hours, setHours] = useState(() => {
    // 0=Sun ... 6=Sat
    return [
      { enabled: false, open: '09:00', close: '22:00' }, // Sun OFF
      { enabled: true, open: '09:00', close: '22:00' }, // Mon
      { enabled: true, open: '09:00', close: '22:00' }, // Tue
      { enabled: true, open: '09:00', close: '22:00' }, // Wed
      { enabled: true, open: '09:00', close: '22:00' }, // Thu
      { enabled: true, open: '09:00', close: '22:00' }, // Fri
      { enabled: true, open: '10:00', close: '23:00' }, // Sat
    ];
  });

  // SECTION 2 — Order Settings
  const [orderMode, setOrderMode] = useState('today_and_preorder');
  const [defaultDailyQuota, setDefaultDailyQuota] = useState(50);
  const [bookingDaysAhead, setBookingDaysAhead] = useState(90);
  const [minNoticeHours, setMinNoticeHours] = useState(0.5);

  // SECTION 3 — Ordering Calendar
  const initialViewMonth = useMemo(() => new Date(2026, 3, 1), []); // April 2026
  const [viewMonth, setViewMonth] = useState(initialViewMonth);

  // Pre-orders (mock data).
  const preOrdersByDate = useMemo(() => {
    return {
      '2026-04-05': 3,
      '2026-04-10': 7,
      '2026-04-14': 1,
    };
  }, []);

  // Manual override for 12 Apr 2026 (closed with reason).
  const [calendarOverrides, setCalendarOverrides] = useState(() => {
    return {
      '2026-04-12': {
        status: 'closed',
        useDefaultQuota: true,
        quota: 0,
        reason: 'Staff Training',
      },
    };
  });

  const today = useMemo(() => startOfDay(new Date()), []);
  const currentMonthLabel = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const normalizeNumberSafe = (value, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  const { calendarCells, monthStart, monthEnd } = useMemo(() => {
    const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const last = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0);
    const startIdx = first.getDay(); // 0=Sun
    const totalDays = last.getDate();
    const cells = [];
    // Fill 6 weeks grid (42 cells)
    for (let i = 0; i < 42; i += 1) {
      const dayNum = i - startIdx + 1;
      const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), dayNum);
      cells.push(d);
    }
    return { calendarCells: cells, monthStart: first, monthEnd: last };
  }, [viewMonth]);

  const getDayDerived = (d) => {
    const key = dateKey(d);
    const override = calendarOverrides[key];
    const dow = d.getDay(); // 0..6 (Sun..Sat)
    const defaultOpen = !!hours[dow]?.enabled;
    const status = override?.status ? override.status : defaultOpen ? 'open' : 'closed';
    const preOrders = preOrdersByDate[key] ?? 0;
    const defaultQuota = defaultDailyQuota;
    const useDefaultQuota = override ? !!override.useDefaultQuota : true;
    const quota = override
      ? useDefaultQuota
        ? defaultQuota
        : normalizeNumberSafe(override.quota, defaultQuota)
      : defaultQuota;
    const isQuotaOverridden = override ? !useDefaultQuota : false;
    const reason = override?.reason ?? '';
    return { key, status, preOrders, quota, isQuotaOverridden, reason };
  };

  // Popover state
  const [dayPopoverAnchorEl, setDayPopoverAnchorEl] = useState(null);
  const [dayPopoverKey, setDayPopoverKey] = useState(null);

  const popoverDerived = (() => {
    if (!dayPopoverKey) return null;
    const [y, m, da] = dayPopoverKey.split('-').map((x) => Number(x));
    const d = new Date(y, m - 1, da);
    return getDayDerived(d);
  })();

  const [draftStatus, setDraftStatus] = useState('open');
  const [draftUseDefaultQuota, setDraftUseDefaultQuota] = useState(true);
  const [draftQuota, setDraftQuota] = useState(defaultDailyQuota);
  const [draftReason, setDraftReason] = useState('');

  const openDayPopover = (d, anchorEl) => {
    const derived = getDayDerived(d);
    // Only open future dates that are open by default/override.
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

  const [snack, setSnack] = useState({ open: false, message: '' });
  const showToast = (message) => setSnack({ open: true, message });

  // Calendar popover anchor: use element anchor. We'll store clicked key and compute anchor via query.
  // Because the cells are plain divs, we use a ref-less fallback: open at top-left by using a dummy element.
  // For a mock UX, this is sufficient.
  const popoverOpen = Boolean(dayPopoverKey);

  const applyOverrideForDay = () => {
    if (!popoverDerived) return;

    const preOrders = popoverDerived.preOrders;
    const isClosing = draftStatus === 'closed';
    const reasonToSave = isClosing ? (draftReason || popoverDerived.reason || '') : '';

    setCalendarOverrides((prev) => ({
      ...prev,
      [popoverDerived.key]: {
        status: draftStatus,
        useDefaultQuota: draftUseDefaultQuota,
        quota: draftUseDefaultQuota ? 0 : Math.max(1, draftQuota),
        reason: reasonToSave,
      },
    }));
    // Also validate warning: no block, only UI messaging.
    void preOrders;
    closeDayPopover();
  };

  const { daysOfWeek } = useMemo(() => ({ daysOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] }), []);

  const prevMonth = () => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const dayPopoverWarning = useMemo(() => {
    if (!popoverDerived) return '';
    if (draftStatus !== 'closed') return '';
    if (popoverDerived.preOrders <= 0) return '';
    return `⚠️ Closing this date will affect ${popoverDerived.preOrders} existing pre-orders.`;
  }, [popoverDerived, draftStatus]);

  return (
    <div className={styles.page}>
      <div className={styles.tabsRow}>
        <Button
          variant={tabValue === 'menu' ? 'contained' : 'outlined'}
          disabled
          onClick={() => setTabValue('menu')}
          sx={{ textTransform: 'none' }}
        >
          Menu Builder
        </Button>
        <Button
          variant="contained"
          sx={{ textTransform: 'none' }}
          onClick={() => setTabValue('shop')}
        >
          Ordering Settings
        </Button>
      </div>

      <div className={styles.content}>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <div>
              <Typography sx={{ fontWeight: 900 }}>Ordering Hours</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                Set the hours customers can place orders. Orders can be scheduled for future dates within these hours — &ldquo;closed&rdquo; means no orders can be placed, not that the shop is physically closed.
              </Typography>
            </div>
          </AccordionSummary>
          <AccordionDetails>
            <div className={styles.tableWrap}>
              <div className={styles.hoursTable}>
                {hours.map((h, idx) => {
                  const disabled = !h.enabled;
                  return (
                    <div key={idx} className={styles.hoursRow}>
                      <Typography className={styles.dayCell}>{dayNameByIndex[idx]}</Typography>
                      <div className={styles.hoursToggleCell}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={h.enabled}
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
                          <MenuItem key={t} value={t}>
                            {format12h(t)}
                          </MenuItem>
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
                          <MenuItem key={t} value={t}>
                            {format12h(t)}
                          </MenuItem>
                        ))}
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>
          </AccordionDetails>
        </Accordion>

        <Accordion>
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
                    value="today_and_preorder"
                    control={<Radio size="small" />}
                    label="Order Today + Pre-order"
                  />
                  <FormControlLabel value="preorder_only" control={<Radio size="small" />} label="Pre-order only" />
                </RadioGroup>

                <br/>
              </div>

              <TextField
                label="Max items per day (default)"
                type="number"
                inputProps={{ min: 1 }}
                value={defaultDailyQuota}
                onChange={(e) => setDefaultDailyQuota(Math.max(1, Number(e.target.value)))}
                helperText="Applied to all calendar days unless overridden"
                size="small"
              />
              <TextField
                label="Allow pre-orders up to X days ahead"
                type="number"
                inputProps={{ min: 1, max: 90 }}
                value={bookingDaysAhead}
                onChange={(e) => setBookingDaysAhead(Math.max(1, Math.min(90, Number(e.target.value))))}
                helperText={
                  orderMode === 'preorder_only'
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
                  <div key={d} className={styles.dowCell}>
                    {d}
                  </div>
                ))}

                {calendarCells.map((d, idx) => {
                  const key = dateKey(d);
                  const isInMonth = d.getMonth() === viewMonth.getMonth();
                  const isPast = startOfDay(d).getTime() < today.getTime();
                  const derived = getDayDerived(d);
                  const hasPreOrders = derived.preOrders > 0;
                  const isClosed = derived.status === 'closed';
                  const isQuotaOverridden = derived.isQuotaOverridden;
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
                        <div className={styles.badgeOrders}>
                          {derived.preOrders} orders
                        </div>
                      ) : null}

                      {!isClosed ? (
                        <div className={styles.badgeQuota}>
                          {remainingSlots} slots
                          {isQuotaOverridden ? <span className={styles.badgeBolt}>⚡</span> : null}
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

      <div className={styles.stickySave}>
        <Button
          variant="contained"
          fullWidth
          sx={{
            textTransform: 'none',
            backgroundColor: '#2563EB',
            '&:hover': { backgroundColor: '#2563EB' },
          }}
          onClick={() => showToast('Settings saved successfully')}
        >
          Save Settings
        </Button>
      </div>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ open: false, message: '' })}>
        <Alert severity="success" sx={{ width: '100%' }}>
          {snack.message}
        </Alert>
      </Snackbar>

      <Popover
        open={popoverOpen}
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
                <Select
                  size="small"
                  value={draftStatus}
                  onChange={(e) => setDraftStatus(e.target.value)}
                >
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
                <Alert severity="error" sx={{ marginTop: 8 }}>
                  {dayPopoverWarning}
                </Alert>
              ) : null}

              <Typography variant="caption" className={styles.popHint} sx={{ marginTop: 4 }}>
                ⚠️ {popoverDerived.preOrders} pre-orders on this day
              </Typography>

              <div className={styles.popActions}>
                <Button variant="outlined" sx={{ textTransform: 'none' }} onClick={closeDayPopover}>
                  Cancel
                </Button>
                <Button variant="contained" sx={{ textTransform: 'none' }} onClick={applyOverrideForDay}>
                  Save
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </Popover>
    </div>
  );
}

