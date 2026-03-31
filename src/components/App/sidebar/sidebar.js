'use client';
import Link from 'next/link';
import styles from './sidebar.module.css';
import { LuClipboardList, LuLayoutDashboard, LuCreditCard, LuUtensils } from 'react-icons/lu';
import { AiOutlineMessage, AiOutlineLineChart } from 'react-icons/ai';
import { BsGift } from 'react-icons/bs';
import { RiQrScan2Line } from "react-icons/ri";
import { RiBubbleChartLine } from "react-icons/ri";
import { FaMobileAlt } from 'react-icons/fa';
import { RiUserSettingsLine, RiNewspaperLine } from 'react-icons/ri';
import { PiCashRegister } from "react-icons/pi";
import { RxGear } from 'react-icons/rx';
import { HiOutlineSpeakerphone } from 'react-icons/hi';
import { MdOutlineSpaceDashboard, MdOutlineNotificationsNone } from 'react-icons/md';
import { LuStamp } from 'react-icons/lu';
import { Submenu } from './submenu/submenu';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import CollbineForBusiness from '../../CollbineForBusiness/CollbineForBusiness';
import { SUBSCRIPTION_DATA } from '@/app/app/subscription/data/SUBSCRIPTION_DATA';
import Shimmer from '../../Shimmer/Shimmer';
import apiClient from '@/utility/api';
import { CREATE_PORTAL_SESSION, SUBSCRIPTION_END_DATE } from '@/utility/apiPaths';


export default function Sidebar({
    isClose,
    onClose,
    className,
    subscriptionStatus,
    isLoadingSubscription
}) {
    const RELEASES_TAB = 'RELEASES_TAB';
    const STAMP_TAB = 'STAMP_TAB';
    const SCAN_TO_WIN_TAB = 'SCAN_TO_WIN_TAB';
    const POINTS_TAB = 'POINTS_TAB';
    const REDEEMABLE_TAB = 'REDEEMABLE_TAB';
    const MENU_ORDERS_TAB = 'MENU_ORDERS_TAB';

    const pathname = usePathname();
    const pathSegments = pathname.split('/');
    const section = pathSegments[2]
    const subSection = pathSegments[3];

    const subscriptionPlan = SUBSCRIPTION_DATA.find(plan => plan.lookup_key === subscriptionStatus);

    const [sidebarMinimised, setSidebarMinimised] = useState(false);
    const [currentSelection, setCurrentSelection] = useState(undefined);
    const [isLoadingPortal, setIsLoadingPortal] = useState(false);
    const [cancelDate, setCancelDate] = useState(null);

    useEffect(() => {
        const fetchEndDate = async () => {
            try {
                const res = await apiClient.get(SUBSCRIPTION_END_DATE);
                const data = res.data?.data;
                if (data?.cancel_at_period_end && data?.service_ends_at_formatted) {
                    const date = new Date(data.service_ends_at_formatted);
                    setCancelDate(date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
                }
            } catch {
                // Silently ignore
            }
        };
        if (subscriptionStatus) fetchEndDate();
    }, [subscriptionStatus]);

    const handleManageSubscription = async () => {
        setIsLoadingPortal(true);
        try {
            const response = await apiClient.post(CREATE_PORTAL_SESSION);
            const portalUrl = response.data.data.url;
            window.location.href = portalUrl;
        } catch (error) {
            console.error('Failed to create portal session:', error);
            setIsLoadingPortal(false);
        }
    };

    // Auto-expand submenu based on current path
    useEffect(() => {
        const currentSection = pathname.split('/')[2];
        if (currentSection === 'release') {
            setCurrentSelection(RELEASES_TAB);
        } else if (currentSection === 'stamp-management' || currentSection === 'card-design') {
            setCurrentSelection(STAMP_TAB);
        } else if (
            currentSection === 'menu-builder' ||
            currentSection === 'shop-settings' ||
            currentSection === 'order-queue' ||
            currentSection === 'payments-setup'
        ) {
            setCurrentSelection(MENU_ORDERS_TAB);
        } else if (currentSection === 'redeemable') {
            setCurrentSelection(REDEEMABLE_TAB);
        } else if (currentSection === 'scan-to-win') {
            setCurrentSelection(SCAN_TO_WIN_TAB);
        } else if (currentSection === 'points-management') {
            setCurrentSelection(POINTS_TAB);
        }
    }, [pathname]);

    const toggleSidebar = () => {
        setSidebarMinimised(!sidebarMinimised);
        setCurrentSelection(undefined);
    };

    const toggleMenus = (type) => {
        setCurrentSelection(currentSelection == type ? undefined : type);
        setSidebarMinimised(false);
    };

    return (
        <>
            <aside className={`${styles.sidebar} ${sidebarMinimised ? styles.close : ''} ${className}`}>
                <ul className={`${styles.top} ${cancelDate ? styles.topWithBanner : ''}`}>
                    <li className={styles.logoLi}>
                        <Link className={styles.logoLink} href='/'>
                            <CollbineForBusiness />
                        </Link>
                        {/* <div className={styles.minimiseSidebar} onClick={toggleSidebar}>
                            <FaAnglesLeft className={sidebarMinimised ? styles.rotate : styles.reverseRotate} />
                        </div> */}
                    </li>

                    <li className={section === undefined ? styles.active : ''}>
                        <Link href='/app'>
                            <MdOutlineSpaceDashboard className={styles.icon} />
                            <span>Dashboard</span>
                        </Link>
                    </li>

                    <li>
                        <Link href='/terminal'>
                            <PiCashRegister className={styles.icon} />
                            <span>Loyalty Terminal</span>
                        </Link>
                    </li>

                    {
                        !sidebarMinimised && <li className={styles.labelLi}>
                            <label className={styles.label}>General</label>
                        </li>
                    }

                    <li className={section == 'official-business-details' ? styles.active : ''}>
                        <Link href='/app/official-business-details'>
                            <LuClipboardList className={styles.icon} />
                            <span>Official Business Details</span>
                        </Link>
                    </li>

                    <li className={section == 'customer-facing-business-details' ? styles.active : ''}>
                        <Link href='/app/customer-facing-business-details'>
                            <RiNewspaperLine className={styles.icon} />
                            <span>Customer-Facing Details</span>
                        </Link>
                    </li>

                    {/* <li className={section == 'notifications' ? styles.active : ''}>
                        <Link href='/app/notifications'>
                            <MdOutlineNotificationsNone className={styles.icon} />
                            <span>Notifications</span>
                        </Link>
                    </li> */}

                    <Submenu
                        title={'Releases'}
                        submenus={[
                            { href: '/app/release/submission', title: 'Release Submission' },
                            { href: '/app/release/status', title: 'Release Status' },
                            { href: '/app/release/history', title: 'History' }
                        ]}
                        isExpand={currentSelection == RELEASES_TAB}
                        icon={FaMobileAlt}
                        onClick={() => { toggleMenus(RELEASES_TAB) }}
                    />

                    {
                        !sidebarMinimised && <li className={styles.labelLi}>
                            <label className={styles.label}>Products Categories</label>
                        </li>
                    }

                    <Submenu
                        title={'Menu & Orders'}
                        submenus={[
                            { href: '/app/menu-builder', title: 'Menu Builder' },
                            { href: '/app/shop-settings', title: 'Ordering Settings' },
                            { href: '/app/order-queue', title: 'Order Queue' },
                            { href: '/app/payments-setup', title: 'Payments Setup' }
                        ]}
                        isExpand={currentSelection == MENU_ORDERS_TAB}
                        icon={LuUtensils}
                        onClick={() => { toggleMenus(MENU_ORDERS_TAB) }}
                    />

                    <Submenu
                        title={'Stamp System'}
                        submenus={[
                            { href: '/app/stamp-management', title: 'Stamp Managment' },
                            { href: '/app/card-design', title: 'Card Design' }
                        ]}
                        isExpand={currentSelection == STAMP_TAB}
                        icon={LuStamp}
                        onClick={() => { toggleMenus(STAMP_TAB) }}
                    />
                    
                    <Submenu
                        title={'Scan to Win'}
                        submenus={[
                            { href: '/app/scan-to-win', title: 'Configuration' },
                            { href: '/app/scan-to-win/qr-code', title: 'QR Code' },
                            { href: '/app/scan-to-win/collection-status', title: 'Collection Status' }
                        ]}
                        isExpand={currentSelection == SCAN_TO_WIN_TAB}
                        icon={RiQrScan2Line}
                        onClick={() => { toggleMenus(SCAN_TO_WIN_TAB) }}
                    />

                    {/* <Submenu
                        title={'Points System'}
                        submenus={[
                            { href: '/app/points-management', title: 'Points Management' },
                            { href: '/document', title: 'Membership Tiers' },
                        ]}
                        isExpand={currentSelection == POINTS_TAB}
                        icon={ImCoinDollar}
                        onClick={() => { toggleMenus(POINTS_TAB) }}
                    /> */}

                    <Submenu
                        title={'Redeemable'}
                        submenus={[
                            { href: '/app/redeemable/rewards', title: 'All Rewards' },
                            { href: '/app/redeemable/rewards?reward_type=stampReward', title: 'Rewards For Stamp System' },
                            { href: '/app/redeemable/rewards?reward_type=scanToWinReward', title: 'Rewards For Scan to Win' }
                            // { href: '/app/redeemable/new-join-rewards', title: 'New Join Rewards' },
                        ]}
                        isExpand={currentSelection == REDEEMABLE_TAB}
                        icon={BsGift}
                        onClick={() => { toggleMenus(REDEEMABLE_TAB) }}
                    />

                    {/* {
                        !sidebarMinimised && <li className={styles.labelLi}>
                            <label className={styles.label}>GROWTH & MARKETING</label>
                        </li>
                    } */}

                    {/* <li className={section == 'ratings' ? styles.active : ''}>
                        <Link href='/app/ratings'>
                        <FaRegStar className={styles.icon} />
                            <span>Ratings and Reviews</span>
                        </Link>
                    </li> */}

                    {
                        !sidebarMinimised && <li className={styles.labelLi}>
                            <label className={styles.label}>Analytics</label>
                        </li>
                    }

                    {/* <li className={section == 'ratings' ? styles.active : ''}>
                        <Link href='/app/ratings'>
                        <LuLayoutDashboard className={styles.icon} />
                            <span>Overview</span>
                        </Link>
                    </li> */}

                    <li className={section == 'analytics' ? styles.active : ''}>
                        <Link href='/app/analytics'>
                        <AiOutlineLineChart className={styles.icon} />
                            <span>Activity</span>
                        </Link>
                    </li>

                    {/* <li className={section == 'ratings' ? styles.active : ''}>
                        <Link href='/app/ratings'>
                        <RiBubbleChartLine className={styles.icon} />
                            <span>Customers and Retentions</span>
                        </Link>
                    </li> */}

                    {/* <li className={section == 'ratings' ? styles.active : ''}>
                        <Link href='/app/ratings'>
                        <LuCreditCard className={styles.icon} />
                            <span>Card Distributions</span>
                        </Link>
                    </li> */}

                    {
                        !sidebarMinimised && <li className={styles.labelLi}>
                            <label className={styles.label}>Settings</label>
                        </li>
                    }


                    <li className={section == 'users-and-permissions' ? styles.active : ''}>
                        <Link href='/app/users-and-permissions'>
                            <RiUserSettingsLine className={styles.icon} />
                            <span>Users and permissions</span>
                        </Link>
                    </li>

                    <li>
                        <Link href='/app/feedback'>
                            <HiOutlineSpeakerphone className={styles.icon} />
                            <span>Feedbacks</span>
                        </Link>
                    </li>

                    <li className={section == 'setting' ? styles.active : ''}>
                        <Link href='/app/setting'>
                            <RxGear className={styles.icon} />
                            <span>Account Settings</span>
                        </Link>
                    </li>
                </ul>
                <div className={styles.subscriptionContainer}>
                    <div className={styles.subscriptionRow}>
                        {isLoadingSubscription ? (
                            <div className={styles.shimmerContainer}>
                                <Shimmer
                                    width="120px"
                                    height="16px"
                                    className={styles.titleShimmer}
                                    responsive={true}
                                />
                                <Shimmer
                                    width="100px"
                                    height="12px"
                                    className={styles.costShimmer}
                                    responsive={false}
                                />
                            </div>
                        ) : (
                            <div>
                                <p className={styles.title}>{subscriptionPlan?.name || 'Free'}</p>
                                <p className={styles.cost}>
                                    {subscriptionPlan?.interval
                                        ? `${subscriptionPlan.interval === 'year' ? 'Yearly' : 'Monthly'} Subscription`
                                        : 'No-Cost ($0/Month)'}
                                </p>
                            </div>
                        )}

                        {!isLoadingSubscription && (
                            subscriptionPlan?.name ? (
                                <Link href="/app/subscription/manage" className={styles.button}>
                                    Manage
                                </Link>
                            ) : (
                                <Link href="/app/subscription" className={styles.button}>
                                    Upgrade
                                </Link>
                            )
                        )}
                    </div>
                    {cancelDate && (
                        <div className={styles.cancelStrip}>
                            <p>Your subscription will end on {cancelDate}.</p>
                            <button
                                type="button"
                                className={styles.cancelStripButton}
                                onClick={handleManageSubscription}
                                disabled={isLoadingPortal}
                            >
                                {isLoadingPortal ? 'Loading…' : "Don\u2019t cancel subscription"}
                            </button>
                        </div>
                    )}
                </div>
            </aside>
            {!isClose && <div className={styles.overlay} onClick={onClose} />}
        </>
    )
}