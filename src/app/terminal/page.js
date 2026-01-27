'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TerminalControlPanel from './TerminalControlPanel';
import CustomerPhoneNumberControlPanel from './CustomerPhoneNumberControlPanel';
import UserRewardsList from './UserRewardsList';
import { getUserDataFromCookie } from '@/utility/cookieUtils';
import apiClient from '@/utility/api';
import { REFRESH_USER_COOKIE } from '@/utility/apiPaths';
import { BASE_URL_BACKEND } from '../../../config/config';
// Removed direct Supabase client import - using API route instead
import styles from './page.module.css';

const TerminalPage = () => {
    const router = useRouter();
    const [phoneNumber, setPhoneNumber] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerBirthday, setCustomerBirthday] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expirationType, setExpirationType] = useState(null);
    const [numberOfDaysToExpire, setNumberOfDaysToExpire] = useState(null);
    const [shopId, setShopId] = useState(null);
    const [shopName, setShopName] = useState(null);
    const [performedBy, setPerformedBy] = useState(null);
    const [performedByName, setPerformedByName] = useState(null);
    const [selectedReward, setSelectedReward] = useState(null);
    const [rewardsRefreshKey, setRewardsRefreshKey] = useState(0);
    const [customerUserId, setCustomerUserId] = useState(null);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [isStampEnabled, setIsStampEnabled] = useState(false);

    const handlePhoneNumberSubmit = async (phone) => {
        setPhoneNumber(phone);
        setIsLoading(true);
        setError(null);
        setCustomerName('');
        setCustomerBirthday('');

        try {
            // Call backend API for user profile
            const response = await fetch(`${BASE_URL_BACKEND}/api/mobile/userProfile?phone=${encodeURIComponent(phone)}`, {
                method: 'GET',
                credentials: 'include', // Include cookies for authentication
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.status === 404) {
                // Customer not found
                setError('not_found');
                setCustomerName('');
                setCustomerBirthday('');
            } else if (!response.ok) {
                // Other error (401, 500, etc.)
                const errorData = await response.json().catch(() => ({}));
                console.error('API error:', errorData);
                if (response.status === 401) {
                    setError('unauthorized');
                } else {
                    setError('error');
                }
                setCustomerName('');
                setCustomerBirthday('');
            } else {
                // Success - parse the new response structure
                const result = await response.json();
                console.log('Customer profile response:', result);
                
                // New API structure: { data: { name, birthday, phone_number } }
                const customerData = result.data || result;
                
                // Check if name and birthday are null - treat as not found
                if (customerData.name === null && customerData.birthday === null) {
                    setError('not_found');
                    setCustomerName('');
                    setCustomerBirthday('');
                } else {
                    setCustomerName(customerData.name || '');
                    setCustomerBirthday(customerData.birthday || '');
                    // Use phone_number as userId since it's the primary key
                    setCustomerUserId(customerData.phone_number || phone || null);
                    setError(null);
                }
            }
        } catch (err) {
            console.error('Error fetching customer:', err);
            console.error('Error details:', {
                message: err.message,
                status: err.status,
                code: err.code,
                details: err
            });
            // Check if it's a 401 unauthorized error
            if (err.message?.includes('401') || err.status === 401 || err.message?.includes('Unauthorized')) {
                setError('unauthorized');
            } else {
                setError('error');
            }
            setCustomerName('');
            setCustomerBirthday('');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChangeCustomer = () => {
        setPhoneNumber('');
        setCustomerName('');
        setCustomerBirthday('');
        setCustomerUserId(null);
        setError(null);
        setSelectedReward(null);
    };

    // Check authentication when component mounts
    useEffect(() => {
        const checkAuthentication = async () => {
            try {
                await apiClient.get(REFRESH_USER_COOKIE);
                console.log('[TERMINAL] User is authenticated');
                setIsCheckingAuth(false);
            } catch (error) {
                // If user not found (404), redirect to login
                if (error?.response?.status === 404) {
                    const currentPath = typeof window !== 'undefined' 
                        ? window.location.pathname + window.location.search 
                        : '/terminal';
                    const encodedPath = encodeURIComponent(currentPath);
                    const message = encodeURIComponent('401 Unauthorized\n\nPlease login to access the terminal');
                    router.push(`/login?message=${message}&redirect=${encodedPath}`);
                    return;
                }
                // For other errors, also redirect to login
                console.error('[TERMINAL] Authentication error:', error);
                const currentPath = typeof window !== 'undefined' 
                    ? window.location.pathname + window.location.search 
                    : '/terminal';
                const encodedPath = encodeURIComponent(currentPath);
                const message = encodeURIComponent('401 Unauthorized\n\nPlease login to access the terminal');
                router.push(`/login?message=${message}&redirect=${encodedPath}`);
            }
        };

        checkAuthentication();
    }, [router]);

    // Check if stamp functionality is enabled
    useEffect(() => {
        if (isCheckingAuth) return; // Wait for auth check to complete

        const checkStampEnabled = async () => {
            console.log('🚀 Starting checkStampEnabled...');
            try {
                console.log('📡 Fetching from:', `${BASE_URL_BACKEND}/api/mobile/stampDataIsEnabled`);
                const response = await fetch(`${BASE_URL_BACKEND}/api/mobile/stampDataIsEnabled`, {
                    method: 'GET',
                    credentials: 'include', // Include cookies for authentication
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });
                console.log('📥 Response status:', response.status, 'ok:', response.ok);
                
                if (response.status === 404) {
                    // 404 means stamps are not enabled
                    console.log('❌ Stamp functionality is disabled (404)');
                    setIsStampEnabled(false);
                } else if (response.ok) {
                    // Parse the JSON response
                    const result = await response.json();
                    console.log('📦 Full API response:', JSON.stringify(result, null, 2));
                    console.log('📦 Parsed result:', result);
                    
                    // Check if data.isEnabled is "true" (it's a string in the response)
                    const checkDetails = {
                        success: result.success,
                        hasData: !!result.data,
                        dataKeys: result.data ? Object.keys(result.data) : [],
                        isEnabled: result.data?.isEnabled,
                        isEnabledType: typeof result.data?.isEnabled,
                        isEnabledEqualsTrue: result.data?.isEnabled === "true",
                        isEnabledEqualsTrueStrict: result.data?.isEnabled === "true",
                        isEnabledTruthy: !!result.data?.isEnabled,
                        fullCondition: result.success && result.data && result.data.isEnabled === "true"
                    };
                    console.log('🔍 Checking isEnabled - Full details:', checkDetails);
                    
                    // Step by step condition check
                    const step1 = result.success;
                    const step2 = !!result.data;
                    const step3 = result.data?.isEnabled === "true";
                    console.log('🔍 Condition steps:', {
                        step1_success: step1,
                        step2_hasData: step2,
                        step3_isEnabledEqualsTrue: step3,
                        final: step1 && step2 && step3
                    });
                    
                    if (result.success && result.data && result.data.isEnabled === "true") {
                        console.log('✅✅✅ ALL CONDITIONS MET - Setting isStampEnabled to TRUE');
                        console.log('📝 Calling setIsStampEnabled(true)');
                        setIsStampEnabled(true);
                        console.log('✅ setIsStampEnabled(true) called');
                    } else {
                        console.log('❌❌❌ CONDITIONS NOT MET - Setting isStampEnabled to FALSE', {
                            success: result.success,
                            hasData: !!result.data,
                            isEnabled: result.data?.isEnabled,
                            isEnabledEqualsTrue: result.data?.isEnabled === "true"
                        });
                        setIsStampEnabled(false);
                    }
                } else {
                    // Other errors - default to disabled for safety
                    console.warn('⚠️ Unexpected response when checking stamp enabled:', response.status);
                    setIsStampEnabled(false);
                }
            } catch (err) {
                console.error('💥 Error checking stamp enabled status:', err);
                console.error('💥 Error details:', {
                    message: err.message,
                    stack: err.stack
                });
                // On error, default to disabled
                setIsStampEnabled(false);
            }
        };

        checkStampEnabled();
    }, [isCheckingAuth]);

    // Debug: Log whenever isStampEnabled changes
    useEffect(() => {
        console.log('🔄🔄🔄 isStampEnabled state changed to:', isStampEnabled, 'type:', typeof isStampEnabled, 'boolean value:', !!isStampEnabled);
        console.trace('Stack trace for isStampEnabled change');
    }, [isStampEnabled]);

    // Fetch shop details when component mounts (only after auth check passes)
    useEffect(() => {
        if (isCheckingAuth) return; // Wait for auth check to complete

        const fetchShopDetails = async () => {
            try {
                // Get shop_id and user info from cookie
                const userData = getUserDataFromCookie();
                const shopIdFromCookie = userData?.shop_id;
                const userId = userData?.user_id;
                const userEmail = userData?.email || null; // Use email as performed_by_name

                if (!shopIdFromCookie) {
                    console.warn('shop_id not found in user cookie');
                    return;
                }

                setShopId(shopIdFromCookie);
                setPerformedBy(userId);
                setPerformedByName(userEmail);

                // Fetch shop details from API
                const response = await fetch(`/api/terminal/shop-details?shop_id=${encodeURIComponent(shopIdFromCookie)}`);
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.error('Error fetching shop details:', errorData);
                    return;
                }

                const shopData = await response.json();
                
                // Store expiration info and shop name
                setExpirationType(shopData.expirationType);
                setNumberOfDaysToExpire(shopData.numberOfDaysToExpire);
                setShopName(shopData.shopName || null);

                // Console.log the information
                console.log('Shop Details:', {
                    shop_id: shopData.shop_id,
                    expirationType: shopData.expirationType,
                    numberOfDaysToExpire: shopData.numberOfDaysToExpire,
                    fullStampData: shopData.stampData
                });
            } catch (err) {
                console.error('Error fetching shop details:', err);
            }
        };

        fetchShopDetails();
    }, [isCheckingAuth]);

    // Show loading state while checking authentication
    if (isCheckingAuth) {
        return (
            <div className={styles.container}>
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '100vh',
                    flexDirection: 'column',
                    gap: '1rem'
                }}>
                    <p>Checking authentication...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Left Side */}
            <div className={styles.leftSide}>
                {phoneNumber ? (
                    <div className={styles.customerNavbar}>
                        <div className={styles.customerInfo}>
                            <div className={styles.customerDetails}>
                                {isLoading ? (
                                    <p className={styles.loadingText}>Loading customer information...</p>
                                ) : error === 'not_found' ? (
                                    <div className={styles.errorContainer}>
                                        <p className={styles.errorTitle}>Collbine Account Not Created</p>
                                        <p className={styles.errorMessage}>
                                            This phone number is not associated with a Collbine account. 
                                            Please inform the customer to download the Collbine app to view loyalty information.
                                        </p>
                                        <p className={styles.customerPhone}>{phoneNumber}</p>
                                    </div>
                                ) : error === 'unauthorized' ? (
                                    <div className={styles.errorContainer}>
                                        <p className={styles.errorTitle}>Authentication Error</p>
                                        <p className={styles.errorMessage}>
                                            Unable to access customer database. Please check Supabase configuration and permissions.
                                        </p>
                                        <p className={styles.customerPhone}>{phoneNumber}</p>
                                    </div>
                                ) : error === 'error' ? (
                                    <div className={styles.errorContainer}>
                                        <p className={styles.errorTitle}>Error Loading Customer</p>
                                        <p className={styles.errorMessage}>
                                            Unable to retrieve customer information. Please try again.
                                        </p>
                                        <p className={styles.customerPhone}>{phoneNumber}</p>
                                    </div>
                                ) : (
                                    <>
                                        <p className={styles.customerName}>{customerName || 'Not Found'}</p>
                                        <p className={styles.customerPhone}>{phoneNumber}</p>
                                        {customerBirthday && (
                                            <p className={styles.customerBirthday}>
                                                Birthday: {(() => {
                                                    try {
                                                        const date = new Date(customerBirthday);
                                                        if (isNaN(date.getTime())) {
                                                            return customerBirthday; // Return as-is if invalid date
                                                        }
                                                        return date.toLocaleDateString('en-US', { 
                                                            year: 'numeric', 
                                                            month: 'long', 
                                                            day: 'numeric' 
                                                        });
                                                    } catch (e) {
                                                        return customerBirthday;
                                                    }
                                                })()}
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                        <button 
                            className={styles.changeCustomerButton}
                            onClick={handleChangeCustomer}
                        >
                            Change Customer
                        </button>
                    </div>
                ) : (
                    <div className={styles.welcomeSection}>
                        <p className={styles.welcomeMessage}>
                            Enter a customer phone number to view their loyalty information, manage stamps, and process rewards.
                        </p>
                    </div>
                )}
                {/* User Rewards List */}
                {phoneNumber && !error && (
                    <UserRewardsList 
                        key={rewardsRefreshKey}
                        phoneNumber={phoneNumber}
                        shopId={shopId}
                        onRewardSelect={(reward) => {
                            setSelectedReward(reward);
                        }}
                    />
                )}
            </div>

            {/* Right Side */}
            {phoneNumber ? (
                <>
                    {console.log('🔍🔍🔍 Passing isStampEnabled to TerminalControlPanel:', {
                        isStampEnabled,
                        type: typeof isStampEnabled,
                        booleanValue: !!isStampEnabled,
                        stringValue: String(isStampEnabled),
                        strictTrue: isStampEnabled === true,
                        truthy: !!isStampEnabled
                    })}
                    <TerminalControlPanel 
                        phoneNumber={phoneNumber}
                        shopId={shopId}
                        shopName={shopName}
                        customerUserId={customerUserId}
                        expirationType={expirationType}
                        numberOfDaysToExpire={numberOfDaysToExpire}
                        onSuccess={handleChangeCustomer}
                        performedBy={performedBy}
                        performedByName={performedByName}
                        selectedReward={selectedReward}
                        onRewardRedeemed={() => {
                            setSelectedReward(null);
                            setRewardsRefreshKey(prev => prev + 1);
                        }}
                        isStampEnabled={isStampEnabled}
                    />
                </>
            ) : (
                <CustomerPhoneNumberControlPanel onPhoneNumberSubmit={handlePhoneNumberSubmit} />
            )}
        </div>
    );
};

export default TerminalPage;