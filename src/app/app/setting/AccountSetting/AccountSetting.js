// https://console.stampme.com/stamp-cards/editcard
'use client';
import styles from './AccountSetting.module.css';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import SignOutAllSessionCell from './_components/SignOutAllSessionsCell';
import DeleteAccount from './_components/DeleteAccount';
import SignoutSection from './_components/SignoutSection';
import ManageSubscriptionCell from './_components/ManageSubscriptionCell';
import UpgradeCell from './_components/UpgradeCell';
import { useEffect, useState, useCallback } from 'react';
import ChangePasswordCell from './_components/ChangePasswordCell';
import { getSubscriptionLookupKey } from '@/utility/subscriptionStorage';
import InvitationBanner from '@/components/InvitationBanner/InvitationBanner';
import apiClient from '@/utility/api';
import { INVITATION_STATUS, STAMP_MANAGEMENT } from '@/utility/apiPaths';
import { getUserDataFromCookie } from '@/utility/cookieUtils';
import DialogPopup from '@/components/DialogPopup/DialogPopup';
import FormTextField from '@/components/Form Components/FormTextField/FormTextField';
import { Alert } from '@mui/material';

const QRCODE_CONFIG = '/api/data/qrcode/configuration';

const PRODUCT_FEATURES = [
    { id: 'stamp', title: 'Stamp System', href: '/app/stamp-management', getEnabled: async () => { const res = await apiClient.get(STAMP_MANAGEMENT); const d = res?.data?.data; return d?.isEnabled === 'true' || d?.isEnabled === true; } },
    { id: 'scan-to-win', title: 'Scan to Win', href: '/app/scan-to-win', getEnabled: async () => { try { const res = await apiClient.get(QRCODE_CONFIG); const d = res?.data?.data; return d?.isEnabled === 'true' || d?.isEnabled === true; } catch (e) { if (e?.response?.status === 404) return false; throw e; } } },
];

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
    const [productsLoading, setProductsLoading] = useState(true);
    const [productStatus, setProductStatus] = useState(PRODUCT_FEATURES.map((f) => ({ id: f.id, title: f.title, href: f.href, enabled: false })));

    const [manageDialogOpen, setManageDialogOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [disableConfirmText, setDisableConfirmText] = useState('');
    const [manageError, setManageError] = useState('');
    const [manageSubmitting, setManageSubmitting] = useState(false);

    useEffect(() => {
        const storedLookupKey = getSubscriptionLookupKey();
        console.log('Stored lookup key:', storedLookupKey);
        setIsUserSubscripted(!!storedLookupKey);
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

    const fetchProductStatus = useCallback(async () => {
        setProductsLoading(true);
        try {
            const results = await Promise.all(
                PRODUCT_FEATURES.map(async (f) => {
                    try {
                        const enabled = await f.getEnabled();
                        return { id: f.id, title: f.title, href: f.href, enabled };
                    } catch {
                        return { id: f.id, title: f.title, href: f.href, enabled: false };
                    }
                })
            );
            setProductStatus(results);
        } finally {
            setProductsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProductStatus();
    }, [fetchProductStatus]);

    const openManageDialog = (row) => {
        setSelectedProduct(row);
        setDisableConfirmText('');
        setManageError('');
        setManageDialogOpen(true);
    };

    const closeManageDialog = () => {
        setManageDialogOpen(false);
        setSelectedProduct(null);
        setDisableConfirmText('');
        setManageError('');
    };

    const setProductEnabled = async (productId, enabled) => {
        if (productId === 'stamp') {
            const res = await apiClient.get(STAMP_MANAGEMENT);
            const d = res?.data?.data || {};
            const formData = new FormData();
            formData.append('isEnabled', enabled ? 'true' : 'false');
            formData.append('cardTitle', d.cardTitle || '');
            formData.append('cardDescription', d.cardDescription || '');
            formData.append('termsAndConditions', d.termsAndConditions || '');
            formData.append('numberOfStamps', String(d.numberOfStamps ?? 6));
            formData.append('expirationType', d.expirationType || 'validForDays');
            formData.append('numberOfDaysToExpire', String(d.numberOfDaysToExpire ?? 30));
            formData.append('cardStepDetails', d.cardStepDetails || '[]');
            await apiClient.put(STAMP_MANAGEMENT, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        } else if (productId === 'scan-to-win') {
            let res;
            try {
                res = await apiClient.get(QRCODE_CONFIG);
            } catch (e) {
                if (e?.response?.status === 404) res = null;
                else throw e;
            }
            const d = res?.data?.data || {};
            const formData = new FormData();
            formData.append('isEnabled', enabled ? 'true' : 'false');
            formData.append('rewardChances', typeof d.rewardChances === 'string' ? d.rewardChances : (d.rewardChances ? JSON.stringify(d.rewardChances) : '[]'));
            if (!d || Object.keys(d).length === 0) {
                await apiClient.post(QRCODE_CONFIG, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            } else {
                await apiClient.put(QRCODE_CONFIG, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            }
        }
    };

    const handleManageSubmit = async (e) => {
        e.preventDefault();
        if (!selectedProduct) return;
        const wantDisable = selectedProduct.enabled === true;
        if (wantDisable) {
            if (disableConfirmText.trim().toLowerCase() !== 'confirm') {
                setManageError('Please type "confirm" to disable.');
                return;
            }
        }
        setManageError('');
        setManageSubmitting(true);
        try {
            await setProductEnabled(selectedProduct.id, !selectedProduct.enabled);
            closeManageDialog();
            await fetchProductStatus();
        } catch (err) {
            const msg = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || 'Request failed';
            setManageError(msg);
        } finally {
            setManageSubmitting(false);
        }
    };

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

                <ContentCard className={styles.content}>
                    <div>
                        <h2>Products</h2>
                        <p className={styles.productsDescription}>Which features are enabled for your shop.</p>
                        {productsLoading ? (
                            <p className={styles.productsLoading}>Loading…</p>
                        ) : (
                            <div className={styles.tableWrap}>
                                <table className={styles.productsTable}>
                                    <thead>
                                        <tr>
                                            <th className={styles.productsTh}>Feature</th>
                                            <th className={styles.productsTh}>Status</th>
                                            <th className={styles.productsTh}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productStatus.map((row) => (
                                            <tr key={row.id} className={styles.productsTr}>
                                                <td className={styles.productsTd}>{row.title}</td>
                                                <td className={styles.productsTd}>
                                                    <span className={row.enabled === true ? styles.statusEnabled : styles.statusDisabled}>
                                                        {row.enabled === true ? 'Enabled' : 'Disabled'}
                                                    </span>
                                                </td>
                                                <td className={styles.productsTd}>
                                                    <button type="button" className={styles.productsLink} onClick={() => openManageDialog(row)}>Manage</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
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

            <DialogPopup
                title={selectedProduct ? `Manage ${selectedProduct.title}` : 'Manage'}
                isOpen={manageDialogOpen}
                setIsOpen={setManageDialogOpen}
                actionTitle={manageSubmitting ? (selectedProduct?.enabled ? 'Disabling…' : 'Enabling…') : (selectedProduct?.enabled ? 'Disable' : 'Enable')}
                actionDisabled={manageSubmitting || (selectedProduct?.enabled === true && disableConfirmText.trim().toLowerCase() !== 'confirm')}
                onSubmit={handleManageSubmit}
                onClose={closeManageDialog}
                PaperProps={{ sx: { width: '90%', maxWidth: '480px' } }}
            >
                <div className={styles.dialogBody}>
                    {manageError && (
                        <Alert severity="error" sx={{ marginBottom: '16px' }}>{manageError}</Alert>
                    )}
                    {selectedProduct && (
                        <>
                            <p className={styles.dialogP}>
                                Current status: <strong>{selectedProduct.enabled ? 'Enabled' : 'Disabled'}</strong>.
                                {selectedProduct.enabled
                                    ? ' Do you want to disable this feature?'
                                    : ' Do you want to enable this feature?'}
                            </p>
                            {selectedProduct.enabled && (
                                <>
                                    <p className={styles.dialogP}>Type &quot;confirm&quot; below to disable.</p>
                                    <FormTextField
                                        title=""
                                        subtitle=""
                                        placeholder='Type "confirm" here'
                                        id="disable_confirm"
                                        name="disable_confirm"
                                        helperText=""
                                        error={false}
                                        value={disableConfirmText}
                                        onChange={(e) => {
                                            setDisableConfirmText(e.target.value);
                                            setManageError('');
                                        }}
                                    />
                                </>
                            )}
                        </>
                    )}
                </div>
            </DialogPopup>
        </>
    )
};

export default AccountSetting;