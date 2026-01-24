// https://console.stampme.com/stamp-cards/editcard
'use client';
import styles from './AccountSetting.module.css';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import Link from 'next/link';
import ActionCell from './_views/DangerActionCell';
import SignOutAllSessionCell from './_components/SignOutAllSessionsCell';
import DeleteAccount from './_components/DeleteAccount';
import SignoutSection from './_components/SignoutSection';
import ManageSubscriptionCell from './_components/ManageSubscriptionCell';
import UpgradeCell from './_components/UpgradeCell';
import { useEffect, useState } from 'react';
import ChangePasswordCell from './_components/ChangePasswordCell';
import { getSubscriptionLookupKey } from '@/utility/subscriptionStorage';
import InvitationBanner from '@/components/InvitationBanner/InvitationBanner';
import apiClient from '@/utility/api';
import { INVITATION_STATUS } from '@/utility/apiPaths';
import { getUserDataFromCookie } from '@/utility/cookieUtils';

// Function to get invitation status
const getInvitationStatus = async (email) => {
    try {
      const response = await apiClient.get(`${INVITATION_STATUS}?email=${encodeURIComponent(email)}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching invitation status:', error);
      throw error;
    }
};

const AccountSetting = () => {
    const [isUserSubscripted, setIsUserSubscripted] = useState(false);
    const [invitations, setInvitations] = useState([]);

    useEffect(() => {
        const storedLookupKey = getSubscriptionLookupKey();
        if (storedLookupKey) {
            setIsUserSubscripted(true);
        } else {
            setIsUserSubscripted(false);
        }
    }, []);

    // Fetch invitation status on component mount
    useEffect(() => {
        const fetchInvitationData = async () => {
            const userData = getUserDataFromCookie();
            if (userData && userData.user_id) {
                try {
                    const invitationResponse = await getInvitationStatus(userData.user_id);
                    console.log('Invitation response:', invitationResponse);
                    if (invitationResponse.success && invitationResponse.data.is_invited) {
                        // Filter out rejected invitations
                        const filteredInvitations = (invitationResponse.data.invitations || [])
                            .filter(invitation => invitation.status !== 'rejected');
                        setInvitations(filteredInvitations);
                        console.log('Invitations data:', filteredInvitations);
                    }
                } catch (invitationErr) {
                    console.error('Error fetching invitation status:', invitationErr);
                    // Don't set error for invitation fetch failure, just log it
                }
            }
        };

        fetchInvitationData();
    }, []);

    return (
        <>
            <div className={styles.container}>
                {invitations.length > 0 && (
                    <div className={styles.invitationBanner}>
                        {invitations.map((invitation, index) => {
                            console.log('Invitation:', invitation.invitedFrom);
                            return (
                                <InvitationBanner
                                    key={`${invitation.shop_id}-${index}`}
                                    invitedby={invitation.invitedFrom}
                                    shopname={invitation.shop_id}
                                    role={invitation.role}
                                    email={invitation.email}
                                    shop_id={invitation.shop_id}
                                />
                            );
                        })}
                    </div>
                )}

                <ContentCard className={styles.content}>
                    <div>
                        <h2>Basic Account Information</h2>
                        <ChangePasswordCell />
                    </div>
                </ContentCard>

                <ContentCard className={styles.content}>
                    <div>
                        <h2>Subscription</h2>
                        {
                            isUserSubscripted ? (
                                <ManageSubscriptionCell />
                            ) : (
                                <UpgradeCell />
                            )
                        }
                    </div>
                </ContentCard>

                <ContentCard className={`${styles.content} ${styles.danger}`}>
                    <div>
                        <h2>Danger Zone</h2>

                        <div>
                            <SignOutAllSessionCell />
                            <DeleteAccount />
                        </div>
                    </div>
                </ContentCard>

                <SignoutSection />
            </div>
        </>
    )
};

export default AccountSetting;