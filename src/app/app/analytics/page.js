'use client';

import { useState, useCallback, useEffect } from 'react';
import dayjs from 'dayjs';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import { Button } from '@mui/material';
import LoadingPage from '@/components/LoadingPage/LoadingPage';
import ErrorPage from '@/components/ErrorPage/ErrorPage';
import apiClient from '@/utility/api';
import styles from './page.module.css';

const MAX_RANGE_MONTHS = 6;

/** Sum stats from API data array. */
function sumStats(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return { totalUnique: 0, totalReturning: 0, totalNew: 0 };
  }
  return data.reduce(
    (acc, row) => ({
      totalUnique: acc.totalUnique + (Number(row.number_of_unique_customer) || 0),
      totalReturning: acc.totalReturning + (Number(row.number_of_returning_customer) || 0),
      totalNew: acc.totalNew + (Number(row.number_of_new_customer) || 0),
    }),
    { totalUnique: 0, totalReturning: 0, totalNew: 0 }
  );
}

/** Format date for chart display (e.g. "Feb 10"). */
function formatChartDate(dateStr) {
  return dayjs(dateStr).format('MMM D');
}

/** Latest date allowed for end date (yesterday); stats are updated daily after 6am. */
function getMaxEndDate() {
  return dayjs().subtract(1, 'day');
}

export default function AnalyticsPage() {
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  const [startDate, setStartDate] = useState(yesterday);
  const [endDate, setEndDate] = useState(yesterday);
  const [dateError, setDateError] = useState(null);

  const [chartData, setChartData] = useState([]);
  const [stats, setStats] = useState({ totalUnique: 0, totalReturning: 0, totalNew: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [loadErrorStatus, setLoadErrorStatus] = useState(null);

  const fetchTerminalLogs = useCallback(async (startStr, endStr) => {
    setLoadError(null);
    setLoadErrorStatus(null);
    setIsLoading(true);
    try {
      const response = await apiClient.get('/api/mobile/terminalLogs/today', {
        params: { start_date: startStr, end_date: endStr },
      });
      const raw = response.data?.data;
      const list = Array.isArray(raw) ? raw : [];
      const sorted = [...list].sort((a, b) => (a.date > b.date ? 1 : -1));

      // Build a continuous series from start to end.
      const start = dayjs(startStr);
      const end = dayjs(endStr);
      const byDate = new Map();
      sorted.forEach((row) => {
        const iso = row.date;
        byDate.set(iso, {
          date: iso,
          number_of_unique_customer: Number(row.number_of_unique_customer) || 0,
          number_of_returning_customer: Number(row.number_of_returning_customer) || 0,
          number_of_new_customer: Number(row.number_of_new_customer) || 0,
        });
      });

      const series = [];
      let current = start;
      while (!current.isAfter(end)) {
        const iso = current.format('YYYY-MM-DD');
        const existing = byDate.get(iso);
        series.push({
          date: iso,
          dateLabel: formatChartDate(iso),
          number_of_unique_customer: existing?.number_of_unique_customer ?? 0,
          number_of_returning_customer: existing?.number_of_returning_customer ?? 0,
          number_of_new_customer: existing?.number_of_new_customer ?? 0,
        });
        current = current.add(1, 'day');
      }

      setChartData(series);
      setStats(sumStats(list));
    } catch (err) {
      const statusCode = err?.response?.status;
      const message = err?.response?.data?.message ?? err?.response?.data?.error?.message ?? err?.message ?? 'Failed to load activity data';
      setLoadError(message);
      setLoadErrorStatus(statusCode ?? null);
      setChartData([]);
      setStats({ totalUnique: 0, totalReturning: 0, totalNew: 0 });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const validateRange = useCallback((startStr, endStr) => {
    const start = dayjs(startStr);
    const end = dayjs(endStr);
    const maxEnd = getMaxEndDate();
    if (end.isAfter(maxEnd)) {
      setDateError('End date cannot be today or in the future. Statistics are updated daily after 6am.');
      return false;
    }
    if (end.isBefore(start)) {
      setDateError('End date must be on or after start date.');
      return false;
    }
    const monthsDiff = end.diff(start, 'month', true);
    if (monthsDiff > MAX_RANGE_MONTHS) {
      setDateError(`Date range cannot exceed ${MAX_RANGE_MONTHS} months.`);
      return false;
    }
    setDateError(null);
    return true;
  }, []);

  const handleStartDateChange = (newDate) => {
    const startStr = dayjs(newDate).format('YYYY-MM-DD');
    setStartDate(startStr);
    validateRange(startStr, endDate);
  };

  const handleEndDateChange = (newDate) => {
    const endStr = dayjs(newDate).format('YYYY-MM-DD');
    setEndDate(endStr);
    validateRange(startDate, endStr);
  };

  const handleApplyRange = () => {
    if (validateRange(startDate, endDate)) {
      fetchTerminalLogs(startDate, endDate);
    }
  };

  // Initial load with default date range (yesterday)
  useEffect(() => {
    if (validateRange(startDate, endDate)) {
      fetchTerminalLogs(startDate, endDate);
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount with default dates
  }, []);

  const chartTooltipStyle = {
    backgroundColor: '#fff',
    border: 'none',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  };

  const LINE_COLORS = {
    unique: '#E4550D',
    returning: '#2e7d32',
    new: '#ed6c02',
  };

  return (
    <div className={styles.root}>
      <HeaderSection
        title="Activity"
        description="Terminal activity and customer statistics by date range."
        showButton={false}
      />

      <ContentCard className={styles.dateCard}>
        <div className={styles.dateCardContent}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <div className={styles.dateRow}>
              <DatePicker
                label="Start date"
                value={dayjs(startDate)}
                onChange={handleStartDateChange}
                format="YYYY-MM-DD"
                className={styles.datePicker}
                slotProps={{
                  textField: {
                    size: 'small',
                    error: !!dateError,
                    helperText: dateError || ' ', // reserve space so both fields match height
                  },
                }}
              />
              <DatePicker
                label="End date"
                value={dayjs(endDate)}
                onChange={handleEndDateChange}
                format="YYYY-MM-DD"
                maxDate={getMaxEndDate()}
                className={styles.datePicker}
                slotProps={{
                  textField: {
                    size: 'small',
                    error: !!dateError,
                    helperText: dateError || `Max ${MAX_RANGE_MONTHS} months from start. Cannot select today or future.`,
                  },
                }}
              />
              <Button
                variant="contained"
                size="small"
                className={styles.applyButton}
                onClick={handleApplyRange}
                disabled={!!dateError || isLoading}
              >
                Submit
              </Button>
            </div>
          </LocalizationProvider>
          <p className={styles.note}>
            Select a date range (maximum 6 months). Statistics and charts are summed from terminal logs in this range.
          </p>
          <p className={styles.noteUpdate}>
            Statistics are updated daily. Please check again after 6am daily for the latest data.
          </p>
        </div>
      </ContentCard>

      {dateError && (
        <ContentCard className={styles.errorCard}>
          <p className={styles.dateErrorText}>{dateError}</p>
        </ContentCard>
      )}

      {!dateError && (
        <>
          {/* Customer Statistics - summed from API data */}
          <div className={styles.statsSection}>
            <div className={styles.statsHeader}>
              <h2 className={styles.sectionTitle}>Customer Statistics</h2>
            </div>
            <div className={styles.statsGrid}>
              <ContentCard className={styles.statCard}>
                <div className={styles.statContent}>
                  <p className={styles.statLabel}>Total Unique Customers</p>
                  <p className={styles.statValue}>{isLoading ? '—' : stats.totalUnique}</p>
                </div>
              </ContentCard>
              <ContentCard className={styles.statCard}>
                <div className={styles.statContent}>
                  <p className={styles.statLabel}>Returning Customers</p>
                  <p className={styles.statValue}>{isLoading ? '—' : stats.totalReturning}</p>
                </div>
              </ContentCard>
              <ContentCard className={styles.statCard}>
                <div className={styles.statContent}>
                  <p className={styles.statLabel}>New Customers</p>
                  <p className={styles.statValue}>{isLoading ? '—' : stats.totalNew}</p>
                </div>
              </ContentCard>
            </div>
          </div>

          {/* Charts */}
          <ContentCard className={styles.card}>
            {isLoading ? (
              <LoadingPage />
            ) : loadError ? (
              <ErrorPage message={loadError} statusCode={loadErrorStatus} />
            ) : chartData.length === 0 ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyText}>No terminal activity in the selected date range.</p>
              </div>
            ) : (
              <div className={styles.chartsSection}>
                {/* Line chart: Unique customers */}
                <div className={styles.chartBlock}>
                  <h3 className={styles.chartTitle}>Unique Customers by Date</h3>
                  <div className={styles.chartWrap}>
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis
                          dataKey="dateLabel"
                          tick={{ fill: '#666', fontSize: 12 }}
                          axisLine={{ stroke: '#ccc' }}
                          tickLine={{ stroke: '#ccc' }}
                        />
                        <YAxis
                          tick={{ fill: '#666', fontSize: 12 }}
                          axisLine={{ stroke: '#ccc' }}
                          tickLine={{ stroke: '#ccc' }}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={chartTooltipStyle}
                          labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ''}
                          formatter={(value) => [value, 'Unique customers']}
                        />
                        <Line
                          type="monotone"
                          dataKey="number_of_unique_customer"
                          stroke={LINE_COLORS.unique}
                          strokeWidth={2}
                          dot={{ fill: LINE_COLORS.unique, r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Line chart: Returning customers */}
                <div className={styles.chartBlock}>
                  <h3 className={styles.chartTitle}>Returning Customers by Date</h3>
                  <div className={styles.chartWrap}>
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis
                          dataKey="dateLabel"
                          tick={{ fill: '#666', fontSize: 12 }}
                          axisLine={{ stroke: '#ccc' }}
                          tickLine={{ stroke: '#ccc' }}
                        />
                        <YAxis
                          tick={{ fill: '#666', fontSize: 12 }}
                          axisLine={{ stroke: '#ccc' }}
                          tickLine={{ stroke: '#ccc' }}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={chartTooltipStyle}
                          labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ''}
                          formatter={(value) => [value, 'Returning customers']}
                        />
                        <Line
                          type="monotone"
                          dataKey="number_of_returning_customer"
                          stroke={LINE_COLORS.returning}
                          strokeWidth={2}
                          dot={{ fill: LINE_COLORS.returning, r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Line chart: New customers */}
                <div className={styles.chartBlock}>
                  <h3 className={styles.chartTitle}>New Customers by Date</h3>
                  <div className={styles.chartWrap}>
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis
                          dataKey="dateLabel"
                          tick={{ fill: '#666', fontSize: 12 }}
                          axisLine={{ stroke: '#ccc' }}
                          tickLine={{ stroke: '#ccc' }}
                        />
                        <YAxis
                          tick={{ fill: '#666', fontSize: 12 }}
                          axisLine={{ stroke: '#ccc' }}
                          tickLine={{ stroke: '#ccc' }}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={chartTooltipStyle}
                          labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ''}
                          formatter={(value) => [value, 'New customers']}
                        />
                        <Line
                          type="monotone"
                          dataKey="number_of_new_customer"
                          stroke={LINE_COLORS.new}
                          strokeWidth={2}
                          dot={{ fill: LINE_COLORS.new, r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </ContentCard>
        </>
      )}
    </div>
  );
}
