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

/** Distinct colors for bars — one per reward/product. */
const BAR_COLORS = [
  '#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#0288d1',
  '#388e3c', '#d32f2f', '#7b1fa2', '#00796b', '#f57c00',
  '#5d4037', '#455a64', '#c2185b', '#0097a7', '#689f38',
];

/** Same hue as hex, with opacity (0–1). Used for stacked "Redeemed" segment. */
function hexToRgba(hex, alpha) {
  if (!hex || hex === 'transparent') return 'transparent';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Parse reward key "uuid|Reward Name" to display name; fallback to rewardIdToName or key. */
function getRewardName(key, rewardIdToName = {}) {
  if (key.includes('|')) return key.split('|').slice(1).join('|').trim();
  return rewardIdToName[key] || key;
}

/** Build a map of reward key -> count from API data object (e.g. data from qrRewardDailyCounts or qrRewardRedeemedCount). */
function parseCountMap(dataObj) {
  if (!dataObj || dataObj === null) return {};
  const map = {};
  for (const [key, value] of Object.entries(dataObj)) {
    if (SKIP_KEYS.has(key) || value == null) continue;
    const count = Number(value);
    if (!Number.isNaN(count)) map[key] = count;
  }
  return map;
}

/**
 * Build merged chart data for stacked bar: collected + redeemed per reward.
 * collectedData and redeemedData are the inner "data" objects from each API (key -> count).
 */
function buildMergedChartData(collectedData, redeemedData, rewardIdToName = {}) {
  const collectedMap = parseCountMap(collectedData);
  const redeemedMap = parseCountMap(redeemedData);
  const allKeys = new Set([...Object.keys(collectedMap), ...Object.keys(redeemedMap)]);
  if (allKeys.size === 0) return [];

  const items = [];
  for (const key of allKeys) {
    const name = getRewardName(key, rewardIdToName);
    const label = getShortLabel(name);
    const collected = collectedMap[key] ?? 0;
    const redeemed = redeemedMap[key] ?? 0; // missing in redeemed response => 0
    // Use a single blue color for all rewards; Redeemed uses same blue with lower opacity.
    const fill = '#1976d2';
    items.push({
      name,
      label,
      collected,
      redeemed,
      fill, // full opacity for Collected
      fillRedeemed: hexToRgba(fill, 0.5), // same hue, lighter for Redeemed
      count: collected + redeemed, // total for ordering/display
    });
  }
  return items;
}

function hasNoData(collectedData, redeemedData) {
  const merged = buildMergedChartData(collectedData ?? {}, redeemedData ?? {}, {});
  return merged.length === 0;
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
      const [countsResponse, redeemedResponse, rewardsResponse] = await Promise.all([
        apiClient.get('/api/data/qrRewardDailyCounts', { params: { date: dateStr } }),
        apiClient.get('/api/mobile/qrRewardRedeemedCount', { params: { date: dateStr } }),
        apiClient.get(REWARDS, { params: { reward_type: 'scanToWinReward' } }),
      ]);
      const collectedPayload = countsResponse.data?.data ?? {};
      const redeemedPayload = redeemedResponse.data?.data ?? null; // API returns data: null when none
      const apiRewards = rewardsResponse.data?.data?.rewards ?? [];
      const rewardIdToName = Object.fromEntries(
        apiRewards.map((r) => [r.reward_id, r.rewardName || r.reward_id || 'Unnamed reward'])
      );
      const data = buildMergedChartData(collectedPayload, redeemedPayload ?? {}, rewardIdToName);
      setChartData(data);
      setNoDataMessage(hasNoData(collectedPayload, redeemedPayload));
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
          ...Array.from({ length: numSpacers }, () => ({ label: ' ', name: '', collected: 0, redeemed: 0, fill: 'transparent', fillRedeemed: 'transparent' })),
          ...chartData,
        ]
      : chartData;

  // Legend sample: first reward color for Collected (solid) and Redeemed (same hue, 50% opacity)
  const sampleFill = chartData[0]?.fill ?? BAR_COLORS[0];
  const sampleFillRedeemed = chartData[0] ? hexToRgba(chartData[0].fill, 0.5) : hexToRgba(BAR_COLORS[0], 0.5);

  return (
    <div className={styles.root}>
      <HeaderSection
        title="Collection Status"
        description="View daily QR reward collection and redemption counts by date."
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
            Only rewards with collections or redemptions on this date are shown.
          </p>
        </div>
      </ContentCard>

      <ContentCard className={styles.card}>
        {isLoading ? (
          <LoadingPage />
        ) : noDataMessage ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>
              No QR code scanned and no reward collected or redeemed on this date.
            </p>
          </div>
        ) : (
          <div className={styles.chartSection}>
            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  layout="vertical"
                  data={chartDisplayData}
                  margin={{ top: 16, right: 24, left: 12, bottom: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" horizontal={false} />
                  <XAxis
                    type="number"
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
                    labelFormatter={(_, payload) => {
                      const item = payload?.[0]?.payload;
                      return item?.name ?? '';
                    }}
                  />
                  <Bar dataKey="collected" stackId="stack" name="Collected" barSize={28} radius={[0, 0, 0, 0]}>
                    {chartDisplayData.map((entry, index) => (
                      <Cell key={`c-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                  <Bar dataKey="redeemed" stackId="stack" name="Redeemed" barSize={28} radius={[0, 4, 4, 0]}>
                    {chartDisplayData.map((entry, index) => (
                      <Cell key={`r-${index}`} fill={entry.fillRedeemed} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.legend}>
              <div className={styles.legendItem}>
                <span className={styles.legendColor} style={{ backgroundColor: sampleFill }} />
                <span className={styles.legendText}>Collected</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendColor} style={{ backgroundColor: sampleFillRedeemed }} />
                <span className={styles.legendText}>Redeemed</span>
              </div>
            </div>
          </div>
        )}
      </ContentCard>
    </div>
  );
}
