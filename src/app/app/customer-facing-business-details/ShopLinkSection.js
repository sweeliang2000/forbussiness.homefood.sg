'use client';

import { useEffect, useState } from 'react';
import { Alert, Button, InputAdornment, TextField, Typography } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { FaCheck } from 'react-icons/fa';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import FieldHeader from '@/components/FieldHeader/FieldHeader';
import apiClient from '@/utility/api';
import { SHOP_SLUG } from '@/utility/apiPaths';

const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;

const suggestSlug = (name) => String(name ?? '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 30);

// The shop's public web address (…/shop/<slug>). Saves directly to the live shop
// record, independently of the page's draft/publish flow.
export default function ShopLinkSection({ shopName, className }) {
  const [savedSlug, setSavedSlug] = useState(null);
  const [slug, setSlug] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [migrationNeeded, setMigrationNeeded] = useState(false);

  useEffect(() => {
    apiClient.get(SHOP_SLUG)
      .then((res) => {
        const d = res.data?.data ?? {};
        setSavedSlug(d.slug ?? null);
        setSlug(d.slug ?? '');
        setBaseUrl(d.baseUrl ?? '');
        setMigrationNeeded(!!d.migrationNeeded);
      })
      .catch(() => { /* card still renders; save will surface errors */ })
      .finally(() => setLoaded(true));
  }, []);

  // Suggest a link from the shop display name when none has been claimed yet.
  useEffect(() => {
    if (!loaded || savedSlug || slug) return;
    const suggestion = suggestSlug(shopName);
    if (suggestion.length >= 3) setSlug(suggestion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, savedSlug, shopName]);

  const normalized = slug.trim().toLowerCase();
  const isValid = SLUG_REGEX.test(normalized);
  const isDirty = normalized !== (savedSlug ?? '');
  const displayBase = (baseUrl || 'https://homefood.sg').replace(/^https?:\/\//, '');
  const fullUrl = `${baseUrl || 'https://homefood.sg'}/shop/${normalized || 'your-shop-name'}`;

  const save = async () => {
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      const res = await apiClient.put(SHOP_SLUG, { slug: normalized });
      setSavedSlug(res.data?.data?.slug ?? normalized);
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(err?.response?.data?.message || 'Failed to save shop link.');
    } finally {
      setSaving(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — the URL is visible below for manual copy.
    }
  };

  return (
    <ContentCard className={className}>
      <FieldHeader
        title='Shop Link'
        description='Your shop&rsquo;s public web address — share it or print it as a QR code so customers can find and order from you.'
        type='h3'
      />

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap', marginTop: 12 }}>
        <TextField
          size='small'
          value={slug}
          disabled={saving}
          onChange={(e) => { setSlug(e.target.value.toLowerCase()); setSaveSuccess(false); }}
          placeholder='your-shop-name'
          error={!!slug && !isValid}
          helperText={slug && !isValid
            ? '3–30 characters: lowercase letters, numbers and hyphens (not at the start or end)'
            : ' '}
          slotProps={{
            input: {
              startAdornment: <InputAdornment position='start'>{displayBase}/shop/</InputAdornment>,
            },
          }}
          style={{ flex: 1, minWidth: 300 }}
        />
        <LoadingButton
          variant='contained'
          size='small'
          loading={saving}
          disabled={!isValid || !isDirty}
          startIcon={saveSuccess ? <FaCheck /> : undefined}
          onClick={save}
          sx={{ textTransform: 'none', mt: '2px' }}
        >
          {saveSuccess ? 'Saved' : 'Save Link'}
        </LoadingButton>
        <Button
          variant='outlined'
          size='small'
          disabled={!savedSlug}
          onClick={copy}
          sx={{ textTransform: 'none', mt: '2px' }}
        >
          {copied ? 'Copied!' : 'Copy Link'}
        </Button>
      </div>

      {migrationNeeded ? (
        <Alert severity='info' sx={{ mt: 1 }}>
          Database update required before links can be saved — run scripts/add-preorder-and-slug-columns.sql in the Supabase SQL editor.
        </Alert>
      ) : null}

      {savedSlug && isDirty ? (
        <Alert severity='warning' sx={{ mt: 1 }}>
          Changing your shop link means previously shared links and printed QR codes will stop working.
        </Alert>
      ) : null}

      {saveError ? (
        <Alert severity='error' sx={{ mt: 1 }} onClose={() => setSaveError('')}>
          {saveError}
        </Alert>
      ) : null}

      {savedSlug && !isDirty ? (
        <Typography variant='caption' style={{ display: 'block', marginTop: 6, color: 'rgba(0,0,0,0.6)' }}>
          Live at: {fullUrl}
        </Typography>
      ) : null}
    </ContentCard>
  );
}
