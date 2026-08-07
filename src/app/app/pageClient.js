'use client';
import styles from './page.module.css';
import Link from 'next/link';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import { FaMobileAlt, FaWhatsapp } from 'react-icons/fa';
import { LuUtensils, LuClipboardList } from 'react-icons/lu';
import { FiChevronRight } from 'react-icons/fi';
import { PiCashRegister } from 'react-icons/pi';
import { HiOutlineSpeakerphone, HiOutlineExclamationCircle } from 'react-icons/hi';
import { MdOutlineNotificationsNone, MdOutlineEmail, MdOutlineReportProblem } from 'react-icons/md';
import { useState, useEffect } from 'react';
import apiClient from '@/utility/api';
import { CHECKLIST_STATUS, SUBSCRIPTION_END_DATE, CREATE_PORTAL_SESSION, CANCEL_SCHEDULE } from '@/utility/apiPaths';
import { EMAIL_CONTACT_ADDRESS } from '@/utility/constantString';
import ChecklistCell from '@/app/app/release/submission/_views/ChecklistCell';
import LoadingPage from '@/components/LoadingPage/LoadingPage';
import FieldHeader from '@/components/FieldHeader/FieldHeader';
import { getSubscriptionLookupKey } from '@/utility/subscriptionStorage';
import { isProLookupKey } from '@/app/app/subscription/data/SUBSCRIPTION_DATA';

/*
  Quick links name their destination rather than a vague umbrella —
  "Order Queue" is predictable in a way "Overview Stats" isn't. The
  stats card used to link to /app, which is this page, so it was a
  dead end; it now points at the queue people actually open next.
*/
const QUICK_LINKS = [
  {
    href: '/app/release/submission',
    icon: FaMobileAlt,
    title: 'Releases',
    description: 'Submit your shop for review and track its status',
  },
  {
    href: '/app/menu-builder',
    icon: LuUtensils,
    title: 'Menu Builder',
    description: 'Edit items, prices and availability',
  },
  {
    href: '/app/order-queue',
    icon: LuClipboardList,
    title: 'Order Queue',
    description: 'See and manage incoming orders',
  },
  {
    href: '/app/terminal',
    icon: PiCashRegister,
    title: 'Terminal / POS',
    description: 'Take payments and look up customers in store',
  },
];

export default function Content() {
  const [customerStats] = useState({
    totalToday: 0,
    returning: 0,
    new: 0
  });

  const [checklistStatus, setChecklistStatus] = useState({
    businessHasAllRequiredField: false,
    customerHasAllRequiredField: false,
    menuSettingReady: false,
    orderSettingsReady: false,
    stripeConnectReady: false,
    thirdRequirementMet: false,
  });
  const [isLoadingChecklist, setIsLoadingChecklist] = useState(true);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [cancelDate, setCancelDate] = useState(null);
  const [downgradeDate, setDowngradeDate] = useState(null);
  const [cancelScheduleLoading, setCancelScheduleLoading] = useState(false);

  useEffect(() => {
    const lookupKey = getSubscriptionLookupKey();
    const matchesPlan = isProLookupKey(lookupKey);
    setHasPurchased(matchesPlan);

    if (matchesPlan) {
      const fetchEndDate = async () => {
        try {
          const res = await apiClient.get(SUBSCRIPTION_END_DATE);
          const data = res.data?.data;
          const formatDate = (iso) => new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
          if (data?.cancel_at_period_end && data?.service_ends_at_formatted) {
            setCancelDate(formatDate(data.service_ends_at_formatted));
          }
          if (data?.scheduled_downgrade_effective_at_formatted) {
            setDowngradeDate(formatDate(data.scheduled_downgrade_effective_at_formatted));
          }
        } catch {
          // Silently ignore
        }
      };
      fetchEndDate();
    }
  }, []);

  useEffect(() => {
    const fetchChecklistStatus = async () => {
      try {
        const response = await apiClient.get(CHECKLIST_STATUS);
        const checklistData = response.data;
        if (checklistData && checklistData.data) {
          const menuSettingReady = checklistData.data.menuSettingReady || false;
          const orderSettingsReady = checklistData.data.orderSettingsReady || false;
          const stripeConnectReady = checklistData.data.stripeConnectReady || false;
          setChecklistStatus({
            businessHasAllRequiredField: checklistData.data.businessHasAllRequiredField || false,
            customerHasAllRequiredField: checklistData.data.customerHasAllRequiredField || false,
            menuSettingReady,
            orderSettingsReady,
            stripeConnectReady,
            thirdRequirementMet: menuSettingReady && orderSettingsReady && stripeConnectReady,
          });
        }
      } catch (error) {
        console.error('Error fetching checklist status:', error);
      } finally {
        setIsLoadingChecklist(false);
      }
    };

    fetchChecklistStatus();
  }, []);

  const allChecklistCompleted =
    checklistStatus.businessHasAllRequiredField &&
    checklistStatus.customerHasAllRequiredField &&
    checklistStatus.thirdRequirementMet;

  const handleGoToPortal = async () => {
    try {
      const response = await apiClient.post(CREATE_PORTAL_SESSION);
      const portalUrl = response.data?.data?.url;
      if (portalUrl) window.location.href = portalUrl;
    } catch (err) {
      console.error('Failed to open billing portal:', err);
    }
  };

  const handleCancelSchedule = async () => {
    if (cancelScheduleLoading) return;
    setCancelScheduleLoading(true);
    try {
      await apiClient.post(CANCEL_SCHEDULE);
      setDowngradeDate(null);
      window.location.reload();
    } catch (err) {
      console.error('Failed to cancel scheduled downgrade:', err);
    } finally {
      setCancelScheduleLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Purchase Banner */}
      {!hasPurchased && (
        <div className={styles.banner}>
          <div className={styles.bannerContent}>
            <HiOutlineExclamationCircle className={styles.bannerIcon} />
            <p className={styles.bannerText}>
              You will need to purchase in order for you to release to HomeFood up.{' '}
              <Link href="/app/subscription" className={styles.bannerLink}>Upgrade now</Link>
            </p>
          </div>
        </div>
      )}

      {/* Cancel subscription banner */}
      {cancelDate && (
        <div className={styles.cancelBanner}>
          <p className={styles.cancelBannerText}>
            Your subscription will end on <strong>{cancelDate}</strong>.
          </p>
          <button type="button" className={styles.cancelBannerButton} onClick={handleGoToPortal}>
            Don&rsquo;t cancel subscription
          </button>
        </div>
      )}

      {/* Scheduled downgrade banner */}
      {downgradeDate && !cancelDate && (
        <div className={styles.downgradeBanner}>
          <p className={styles.downgradeBannerText}>
            Your plan will be updated or downgraded on <strong>{downgradeDate}</strong>.
          </p>
          <button
            type="button"
            className={styles.downgradeBannerButton}
            onClick={handleCancelSchedule}
            disabled={cancelScheduleLoading}
          >
            {cancelScheduleLoading ? 'Cancelling…' : 'Cancel downgrade'}
          </button>
        </div>
      )}

      {/* Quick Links and Release Checklist Section */}
      <div className={styles.quickLinksAndChecklistSection}>
        {/* Quick Links Section */}
        <div className={styles.quickLinksSection}>
          <h2 className={styles.sectionTitle}>Quick Links</h2>
          <div className={styles.quickLinksGrid}>
            {QUICK_LINKS.map(({ href, icon: Icon, title, description }) => (
              <Link key={href} href={href} className={styles.quickLinkCard}>
                <div className={styles.quickLinkIcon}>
                  <Icon />
                </div>
                <div className={styles.quickLinkContent}>
                  <h3 className={styles.quickLinkTitle}>{title}</h3>
                  <p className={styles.quickLinkDescription}>{description}</p>
                </div>
                {/* Points the way the tap is about to take you. */}
                <FiChevronRight className={styles.quickLinkChevron} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>

        {/* Release Checklist Section */}
        <div className={styles.checklistSection}>
          <h2 className={styles.sectionTitle}>Checklists</h2>
          <ContentCard className={styles.checklistCard}>
            <FieldHeader
              title=""
              description="Ensure that all required tasks have been completed before submitting for review. Please fix any issues."
            />
            {isLoadingChecklist ? (
              <LoadingPage />
            ) : (
              <div className={styles.checklistList}>
                <ChecklistCell
                  title="Official business details"
                  description="Complete all required business information fields."
                  isCompleted={checklistStatus.businessHasAllRequiredField}
                  editLink="/app/official-business-details"
                />
                <ChecklistCell
                  title="Customer-Facing Details"
                  description="Verify all customer-facing information is accurate."
                  isCompleted={checklistStatus.customerHasAllRequiredField}
                  editLink="/app/customer-facing-business-details"
                />
                <ChecklistCell
                  title="Menu and Payment Setup"
                  description={(() => {
                    const missing = [];
                    if (!checklistStatus.menuSettingReady) missing.push('menu');
                    if (!checklistStatus.orderSettingsReady) missing.push('order settings');
                    if (!checklistStatus.stripeConnectReady) missing.push('payment details');
                    if (missing.length === 0) return 'Your menu, order settings, and payment details are all configured correctly.';
                    const formatted = missing.length === 1
                      ? missing[0]
                      : `${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]}`;
                    return `Please complete your ${formatted} before submitting for review.`;
                  })()}
                  isCompleted={checklistStatus.thirdRequirementMet}
                  editLink="/app/stamp-management"
                />
              </div>
            )}
          </ContentCard>
        </div>
      </div>

      {/* Customer Stats Section */}
      {/* <div className={styles.statsSection}>
        <div className={styles.statsHeader}>
          <h2 className={styles.sectionTitle}>Customer Statistics</h2>
          <Link href="/app" className={styles.viewMoreLink}>View More</Link>
        </div>
        <div className={styles.statsGrid}>
          <ContentCard className={styles.statCard}>
            <div className={styles.statContent}>
              <p className={styles.statLabel}>Total Customers Today</p>
              <p className={styles.statValue}>{customerStats.totalToday}</p>
            </div>
          </ContentCard>

          <ContentCard className={styles.statCard}>
            <div className={styles.statContent}>
              <p className={styles.statLabel}>Returning Customers</p>
              <p className={styles.statValue}>{customerStats.returning}</p>
            </div>
          </ContentCard>

          <ContentCard className={styles.statCard}>
            <div className={styles.statContent}>
              <p className={styles.statLabel}>New Customers</p>
              <p className={styles.statValue}>{customerStats.new}</p>
            </div>
          </ContentCard>
        </div>
      </div> */}

      {/* Bottom Section */}
      <div className={styles.bottomSection}>
        {/* HomeFood Updates */}
        <ContentCard className={styles.updatesCard}>
          <div className={styles.updatesHeader}>
            <HiOutlineSpeakerphone className={styles.updatesIcon} />
            <h3 className={styles.updatesTitle}>HomeFood Updates</h3>
          </div>
          <div className={styles.updatesContent}>
            <p className={styles.updatesText}>
              Stay tuned for the latest updates and announcements from HomeFood.
            </p>
            <div className={styles.updatesList}>
              <div className={styles.updateItem}>
                <MdOutlineNotificationsNone className={styles.updateItemIcon} />
                <p className={styles.updateItemText}>No new updates at this time.</p>
              </div>
            </div>
          </div>
        </ContentCard>

        {/* Contact/Report Issues */}
        <ContentCard className={styles.contactCard}>
          <div className={styles.contactHeader}>
            <HiOutlineExclamationCircle className={styles.contactIcon} />
            <h3 className={styles.contactTitle}>Any Issues?</h3>
          </div>
          <div className={styles.contactContent}>
            <p className={styles.contactText}>
              Need help or found a problem? Contact us or report an issue.
            </p>
            <div className={styles.contactActions}>
              <a
                href="https://api.whatsapp.com/send/?phone=6588678978&text&type=phone_number&app_absent=0"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.contactButton}
              >
                <FaWhatsapp className={styles.contactButtonIcon} />
                <span>WhatsApp</span>
              </a>
              <Link href="/app/feedback" className={styles.contactButton}>
                <MdOutlineEmail className={styles.contactButtonIcon} />
                <span>Contact Us</span>
              </Link>
              <Link href="/app/feedback" className={styles.contactButton}>
                <MdOutlineReportProblem className={styles.contactButtonIcon} />
                <span>Report Issue</span>
              </Link>
            </div>
          </div>
        </ContentCard>
      </div>
    </div>
  );
}

