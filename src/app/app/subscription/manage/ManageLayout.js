'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Backdrop, CircularProgress } from '@mui/material';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import { LuCreditCard, LuFileText, LuMapPin, LuTrendingDown, LuTrendingUp, LuXCircle } from 'react-icons/lu';
import styles from './ManageSubscription.module.css';
import apiClient from '@/utility/api';
import { CREATE_PORTAL_SESSION } from '@/utility/apiPaths';

const TABS = [
  { id: 'payment', label: 'Update Payment Information', icon: LuCreditCard, openPortal: true },
  { id: 'billing', label: 'Update Billing Information', icon: LuMapPin, openPortal: true },
  { id: 'invoices', label: 'View Invoice History', icon: LuFileText, openPortal: true },
  { id: 'upgrade', label: 'Upgrade Subscription', icon: LuTrendingUp, href: '/app/subscription/manage' },
  { id: 'downgrade', label: 'Downgrade Subscription', icon: LuTrendingDown, href: '/app/subscription/manage/downgrade' },
  { id: 'cancel', label: 'Cancel Subscription', icon: LuXCircle, danger: true, openPortal: true },
];

export default function ManageLayout({ children }) {
  const router = useRouter();
  const [portalLoadingId, setPortalLoadingId] = useState(null);

  const handleClick = async (tab) => {
    if (tab.openPortal) {
      if (portalLoadingId) return;
      setPortalLoadingId(tab.id);
      try {
        const response = await apiClient.post(CREATE_PORTAL_SESSION);
        const portalUrl = response.data?.data?.url;
        if (portalUrl) {
          window.location.href = portalUrl;
          return;
        }
        setPortalLoadingId(null);
      } catch (error) {
        console.error('Failed to create portal session:', error);
        setPortalLoadingId(null);
      }
    } else if (tab.href) {
      router.push(tab.href);
    }
  };

  return (
    <div className={styles.container}>
      <Backdrop
        open={!!portalLoadingId}
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1, flexDirection: 'column', gap: '16px' }}
      >
        <CircularProgress color="inherit" size={48} />
        <span style={{ fontSize: '1rem', fontWeight: 500 }}>Redirecting to billing portal…</span>
      </Backdrop>

      <h1 className={styles.pageTitle}>Manage your subscription</h1>
      <ContentCard>
        <div className={styles.tabbedBox}>
          <nav className={styles.tabNav} aria-label="Subscription management">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`${styles.tabButton} ${tab.danger ? styles.tabButtonDanger : ''}`}
                onClick={() => handleClick(tab)}
                disabled={!!portalLoadingId}
              >
                <tab.icon className={styles.tabIcon} size={20} />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
          <div className={styles.tabPanelContent}>
            {children}
          </div>
        </div>
      </ContentCard>
    </div>
  );
}
