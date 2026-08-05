'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import ReviewBox from '../../../components/ReviewBox/ReviewBox';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import apiClient from '@/utility/api';
import { RATINGS } from '@/utility/apiPaths';
import styles from './page.module.css';

const toReview = (r) => ({
  id: r.id,
  stars: Math.min(5, Math.max(1, Number(r.rating) || 0)),
  title: '',
  date: r.created_at ? dayjs(r.created_at).format('MMM D, YYYY') : '',
  user: r.customer_name || 'Anonymous',
  text: r.comment || '',
  response: r.response || '',
  responseDate: r.response_at ? dayjs(r.response_at).format('MMM D, YYYY') : '',
});

export default function RatingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState({ count: 0, average: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  const [ratings, setRatings] = useState([]);

  // Reply dialog
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replySaving, setReplySaving] = useState(false);
  const [replyError, setReplyError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get(RATINGS);
      const d = res.data?.data ?? {};
      setSummary({
        count: d.count ?? 0,
        average: d.average ?? 0,
        distribution: d.distribution ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      });
      setRatings((d.ratings ?? []).map(toReview));
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load reviews.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openReply = (review) => {
    setReplyTarget(review);
    setReplyText(review.response || '');
    setReplyError('');
  };

  const saveReply = async () => {
    if (!replyTarget) return;
    setReplySaving(true);
    setReplyError('');
    try {
      await apiClient.put(`${RATINGS}/${replyTarget.id}/response`, { response: replyText.trim() });
      const now = dayjs().format('MMM D, YYYY');
      setRatings((prev) => prev.map((r) => (r.id === replyTarget.id ? { ...r, response: replyText.trim(), responseDate: now } : r)));
      setReplyTarget(null);
    } catch (err) {
      setReplyError(err?.response?.data?.message || 'Failed to save reply.');
    } finally {
      setReplySaving(false);
    }
  };

  const maxBar = useMemo(
    () => Math.max(1, ...Object.values(summary.distribution ?? {})),
    [summary]
  );

  return (
    <div className={styles.container}>
      <HeaderSection
        title="Reviews"
        description={<p>Customer ratings and reviews of your shop. Reply to reviews to show customers you&apos;re listening.</p>}
        showButton={false}
        showCancelButton={false}
      />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><CircularProgress /></div>
      ) : error ? (
        <Alert severity="error" onClose={() => setError('')} sx={{ mt: 2 }}>{error}</Alert>
      ) : summary.count === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyStars}>★★★★★</div>
          <h3>No reviews yet</h3>
          <p>When customers review your shop, their ratings will appear here.</p>
        </div>
      ) : (
        <>
          <div className={styles.summaryCard}>
            <div className={styles.summaryScore}>
              <div className={styles.avgNumber}>{summary.average.toFixed(1)}</div>
              <div className={styles.avgStars}>
                {'★'.repeat(Math.round(summary.average))}
                <span className={styles.avgStarsMuted}>{'★'.repeat(5 - Math.round(summary.average))}</span>
              </div>
              <div className={styles.avgCount}>{summary.count} review{summary.count === 1 ? '' : 's'}</div>
            </div>
            <div className={styles.distribution}>
              {[5, 4, 3, 2, 1].map((star) => {
                const n = summary.distribution?.[star] ?? 0;
                return (
                  <div key={star} className={styles.distRow}>
                    <span className={styles.distLabel}>{star}★</span>
                    <div className={styles.distTrack}>
                      <div className={styles.distFill} style={{ width: `${(n / maxBar) * 100}%` }} />
                    </div>
                    <span className={styles.distCount}>{n}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.reviewsGrid}>
            {ratings.map((review) => (
              <ReviewBox key={review.id} review={review} onReply={openReply} />
            ))}
          </div>
        </>
      )}

      <Dialog open={!!replyTarget} onClose={() => setReplyTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{replyTarget?.response ? 'Edit reply' : 'Reply to review'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            label="Your reply"
            placeholder="Thank you for your feedback…"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            sx={{ mt: 1 }}
          />
          {replyError ? <Alert severity="error" sx={{ mt: 1 }}>{replyError}</Alert> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReplyTarget(null)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            loading={replySaving}
            disabled={!replyText.trim()}
            onClick={saveReply}
            sx={{ textTransform: 'none' }}
          >
            Save reply
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
