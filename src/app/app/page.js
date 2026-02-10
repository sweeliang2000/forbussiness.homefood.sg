'use client';
import styles from './page.module.css';
import Link from 'next/link';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import { FaMobileAlt, FaChartLine } from 'react-icons/fa';
import { LuStamp } from 'react-icons/lu';
import { PiCashRegister } from 'react-icons/pi';
import { HiOutlineSpeakerphone, HiOutlineExclamationCircle } from 'react-icons/hi';
import { MdOutlineNotificationsNone, MdOutlineEmail, MdOutlineReportProblem } from 'react-icons/md';
import { useState, useEffect } from 'react';
import apiClient from '@/utility/api';
import { CHECKLIST_STATUS } from '@/utility/apiPaths';
import { EMAIL_CONTACT_ADDRESS } from '@/utility/constantString';
import ChecklistCell from '@/app/app/release/submission/_views/ChecklistCell';
import LoadingPage from '@/components/LoadingPage/LoadingPage';
import FieldHeader from '@/components/FieldHeader/FieldHeader';

export default function Content() {
  const [customerStats] = useState({
    totalToday: 0,
    returning: 0,
    new: 0
  });

  const [checklistStatus, setChecklistStatus] = useState({
    businessHasAllRequiredField: false,
    customerHasAllRequiredField: false,
    stampHasAllRequiredField: false,
    qrCodeHasAllRequiredField: false,
    thirdRequirementMet: false,
  });
  const [isLoadingChecklist, setIsLoadingChecklist] = useState(true);

  useEffect(() => {
    const fetchChecklistStatus = async () => {
      try {
        const response = await apiClient.get(CHECKLIST_STATUS);
        const checklistData = response.data;
        if (checklistData && checklistData.data) {
          setChecklistStatus({
            businessHasAllRequiredField: checklistData.data.businessHasAllRequiredField || false,
            customerHasAllRequiredField: checklistData.data.customerHasAllRequiredField || false,
            stampHasAllRequiredField: checklistData.data.stampHasAllRequiredField || false,
            qrCodeHasAllRequiredField: checklistData.data.qrCodeHasAllRequiredField || false,
            thirdRequirementMet: checklistData.data.thirdRequirementMet || false,
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

  return (
    <div className={styles.container}>
      {/* Purchase Banner */}
      <div className={styles.banner}>
        <div className={styles.bannerContent}>
          <HiOutlineExclamationCircle className={styles.bannerIcon} />
          <p className={styles.bannerText}>
            You will need to purchase in order for you to release to Collbine up.
          </p>
        </div>
      </div>

      {/* Quick Links and Release Checklist Section */}
      <div className={styles.quickLinksAndChecklistSection}>
        {/* Quick Links Section */}
        <div className={styles.quickLinksSection}>
          <h2 className={styles.sectionTitle}>Quick Links</h2>
          <div className={styles.quickLinksGrid}>
            <Link href="/app/release/submission" className={styles.quickLinkCard}>
              <div className={styles.quickLinkIcon}>
                <FaMobileAlt />
              </div>
              <div className={styles.quickLinkContent}>
                <h3 className={styles.quickLinkTitle}>Releases</h3>
                <p className={styles.quickLinkDescription}>Manage your app releases</p>
              </div>
            </Link>

            <Link href="/app/stamp-management" className={styles.quickLinkCard}>
              <div className={styles.quickLinkIcon}>
                <LuStamp />
              </div>
              <div className={styles.quickLinkContent}>
                <h3 className={styles.quickLinkTitle}>Stamp Management</h3>
                <p className={styles.quickLinkDescription}>Configure your stamp system</p>
              </div>
            </Link>

            <Link href="/app" className={styles.quickLinkCard}>
              <div className={styles.quickLinkIcon}>
                <FaChartLine />
              </div>
              <div className={styles.quickLinkContent}>
                <h3 className={styles.quickLinkTitle}>Overview Stats</h3>
                <p className={styles.quickLinkDescription}>View analytics and insights</p>
              </div>
            </Link>

            <Link href="/terminal" className={styles.quickLinkCard}>
              <div className={styles.quickLinkIcon}>
                <PiCashRegister />
              </div>
              <div className={styles.quickLinkContent}>
                <h3 className={styles.quickLinkTitle}>Loyalty Terminal</h3>
                <p className={styles.quickLinkDescription}>Manage customer loyalty transactions</p>
              </div>
            </Link>
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
                  title="Stamp system and/or Scan to Win"
                  description="Ensure your reward system (stamp or QR/scan to win) is properly configured."
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
        {/* Collbine Updates */}
        <ContentCard className={styles.updatesCard}>
          <div className={styles.updatesHeader}>
            <HiOutlineSpeakerphone className={styles.updatesIcon} />
            <h3 className={styles.updatesTitle}>Collbine Updates</h3>
          </div>
          <div className={styles.updatesContent}>
            <p className={styles.updatesText}>
              Stay tuned for the latest updates and announcements from Collbine.
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
