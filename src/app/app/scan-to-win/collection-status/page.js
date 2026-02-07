'use client';

import { useState, useCallback, useEffect } from 'react';
import dayjs from 'dayjs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import LoadingPage from '@/components/LoadingPage/LoadingPage';
import ErrorPage from '@/components/ErrorPage/ErrorPage';
import apiClient from '@/utility/api';
import { REWARDS } from '@/utility/apiPaths';
import ScanToWinOnboarding from '../ScanToWinOnboarding/ScanToWinOnboarding';
import styles from './page.module.css';

const SKIP_KEYS = new Set(['shop_id', 'claim_date', 'data']);

/** Max characters for axis labels. */
const MAX_LABEL_CHARS = 12;

/** Truncate reward name to a short label for the chart axis. */
function getShortLabel(fullName) {
  if (!fullName || fullName.length <= MAX_LABEL_CHARS) return fullName;
  return fullName.slice(0, MAX_LABEL_CHARS).trim() + '…';
}

/** Custom Y-axis tick (reward labels on the left in horizontal chart). */
function YAxisTick({ x, y, payload }) {
  const value = payload?.value ?? '';
  if (typeof value === 'string' && !value.trim()) return null;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dx={-8}
        textAnchor="end"
        fill="#333"
        fontSize={12}
      >
        {value}
      </text>
    </g>
  );
}

/** Distinct colors for bars (and legend). */
const BAR_COLORS = [
  '#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#0288d1',
  '#388e3c', '#d32f2f', '#7b1fa2', '#00796b', '#f57c00',
  '#5d4037', '#455a64', '#c2185b', '#0097a7', '#689f38',
];

/**
 * Build chart data from API response.
 * Ignores shop_id, claim_date. For keys like "uuid|Reward Name", uses the part after "|".
 * For keys that are just "uuid", uses rewardIdToName lookup so labels show full reward names.
 */
function buildChartData(rawData, rewardIdToName = {}) {
  if (!rawData || rawData.data === null) return [];
  const items = [];
  let index = 0;
  for (const [key, value] of Object.entries(rawData)) {
    if (SKIP_KEYS.has(key) || value == null) continue;
    const count = Number(value);
    if (Number.isNaN(count)) continue;
    const name = key.includes('|')
      ? key.split('|').slice(1).join('|').trim()
      : (rewardIdToName[key] || key);
    const label = getShortLabel(name);
    const fill = BAR_COLORS[index % BAR_COLORS.length];
    items.push({ name, count, label, fill });
    index += 1;
  }
  return items;
}

function hasNoData(rawData) {
  if (!rawData) return true;
  if (rawData.data === null) return true;
  return buildChartData(rawData, {}).length === 0;
}

export default function CollectionStatusPage() {
  const [selectedDate, setSelectedDate] = useState(() => dayjs().format('YYYY-MM-DD'));
  const [chartData, setChartData] = useState([]);
  const [noDataMessage, setNoDataMessage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [configLoading, setConfigLoading] = useState(true);
  const [hasExistingScanToWinConfig, setHasExistingScanToWinConfig] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);

  const fetchDailyCounts = useCallback(async (dateStr) => {
    setLoadError(null);
    setNoDataMessage(false);
    setIsLoading(true);
    try {
      const [countsResponse, rewardsResponse] = await Promise.all([
        apiClient.get('/api/data/qrRewardDailyCounts', { params: { date: dateStr } }),
        apiClient.get(REWARDS, { params: { reward_type: 'scanToWinReward' } }),
      ]);
      const payload = countsResponse.data?.data ?? {};
      const apiRewards = rewardsResponse.data?.data?.rewards ?? [];
      const rewardIdToName = Object.fromEntries(
        apiRewards.map((r) => [r.reward_id, r.rewardName || r.reward_id || 'Unnamed reward'])
      );
      const data = buildChartData(payload, rewardIdToName);
      setChartData(data);
      setNoDataMessage(hasNoData(payload));
    } catch (err) {
      const message = err?.response?.data?.message ?? err?.message ?? 'Failed to load collection status';
      setLoadError(message);
      setChartData([]);
      setNoDataMessage(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDateChange = (newDate) => {
    const dateStr = dayjs(newDate).format('YYYY-MM-DD');
    setSelectedDate(dateStr);
    fetchDailyCounts(dateStr);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const configRes = await apiClient.get('/api/data/qrcode/configuration');
        if (!cancelled) setHasExistingScanToWinConfig(!!(configRes?.data?.data));
      } catch (err) {
        if (!cancelled && err?.response?.status === 404) setHasExistingScanToWinConfig(false);
        else if (!cancelled) setLoadError(err?.response?.data?.message ?? err?.message ?? 'Failed to load');
      } finally {
        if (!cancelled) setConfigLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!hasExistingScanToWinConfig) return;
    fetchDailyCounts(selectedDate);
  }, [hasExistingScanToWinConfig, selectedDate, fetchDailyCounts]);

  const handleGetStarted = async () => {
    setIsEnabling(true);
    setLoadError(null);
    try {
      const formData = new FormData();
      formData.append('isEnabled', 'true');
      formData.append('rewardChances', '[]');

      await apiClient.post('/api/data/qrcode/configuration', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setHasExistingScanToWinConfig(true);
      await fetchDailyCounts(selectedDate);
    } catch (err) {
      const errorData = err?.response?.data;
      const msg = errorData?.error?.message || errorData?.message || err?.message || 'Failed to enable Scan to Win';
      setLoadError(msg);
    } finally {
      setIsEnabling(false);
    }
  };

  const showOnboarding = !configLoading && !hasExistingScanToWinConfig && !loadError;

  if (configLoading) {
    return <LoadingPage />;
  }
  if (loadError && !showOnboarding) {
    return <ErrorPage message={loadError} />;
  }
  if (showOnboarding) {
    return (
      <div className={styles.root}>
        <ScanToWinOnboarding
          onGetStarted={handleGetStarted}
          isEnabling={isEnabling}
        />
      </div>
    );
  }

  const numSpacers = Math.max(0, 6 - chartData.length);
  const chartDisplayData =
    numSpacers > 0
      ? [
          ...Array.from({ length: numSpacers }, () => ({ label: ' ', name: '', count: 0, fill: 'transparent' })),
          ...chartData,
        ]
      : chartData;

  return (
    <div className={styles.root}>
      <HeaderSection
        title="Collection Status"
        description="View daily QR reward collection counts by date."
        showButton={false}
      />

      <ContentCard className={styles.dateCard}>
        <div className={styles.dateCardContent}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Select date"
              value={dayjs(selectedDate)}
              onChange={handleDateChange}
              format="YYYY-MM-DD"
              className={styles.datePicker}
              slotProps={{
                textField: {
                  size: 'small',
                  fullWidth: true,
                },
              }}
            />
          </LocalizationProvider>
          <p className={styles.note}>
            Only rewards with collections on this date are shown.
          </p>
        </div>
      </ContentCard>

      <ContentCard className={styles.card}>
        {isLoading ? (
          <LoadingPage />
        ) : noDataMessage ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>
              No QR code scanned on this date and no reward collected.
            </p>
          </div>
        ) : (
          <div className={styles.chartSection}>
            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  layout="vertical"
                  data={chartDisplayData}
                  margin={{ top: 16, right: 24, left: 0, bottom: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" horizontal={false} />
                  <XAxis
                    type="number"
                    dataKey="count"
                    tick={{ fill: '#666', fontSize: 12 }}
                    axisLine={{ stroke: '#ccc' }}
                    tickLine={{ stroke: '#ccc' }}
                    allowDecimals={false}
                    label={{ value: 'Count', position: 'insideBottom', offset: -8, style: { fill: '#666' } }}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={90}
                    tick={<YAxisTick />}
                    interval={0}
                    axisLine={{ stroke: '#ccc' }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                    formatter={(value) => [value, 'Collected']}
                    labelFormatter={(_, payload) => {
                      const item = payload?.[0]?.payload;
                      return item?.name ?? '';
                    }}
                  />
                  <Bar dataKey="count" barSize={28} radius={[0, 4, 4, 0]} name="Collected">
                    {chartDisplayData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.legend}>
              {chartData.map((entry) => (
                <div key={entry.label} className={styles.legendItem}>
                  <span className={styles.legendColor} style={{ backgroundColor: entry.fill }} />
                  <span className={styles.legendText}>{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </ContentCard>
    </div>
  );
}
