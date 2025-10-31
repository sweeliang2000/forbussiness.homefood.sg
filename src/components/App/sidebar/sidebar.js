'use client';
import Link from 'next/link';
import styles from './sidebar.module.css';
import { LuClipboardList } from 'react-icons/lu';
import { AiOutlineMessage } from 'react-icons/ai';
import { BsGift } from 'react-icons/bs';
import { FaRegStar } from "react-icons/fa6";
import { FaMobileAlt } from 'react-icons/fa';
import { RiUserSettingsLine, RiNewspaperLine } from 'react-icons/ri';
import { ImCoinDollar } from 'react-icons/im';
import { RxGear } from 'react-icons/rx';
import { HiOutlineSpeakerphone } from 'react-icons/hi';
import { MdOutlineSpaceDashboard, MdOutlineNotificationsNone } from 'react-icons/md';
import { LuStamp } from 'react-icons/lu';
import { Submenu } from './submenu/submenu';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import CollbineForBusiness from '../../CollbineForBusiness/CollbineForBusiness';
import { loyaltyInformation } from '@/utility/loyaltyInformation';
import Shimmer from '../../Shimmer/Shimmer';


export default function Sidebar({
    isClose,
    onClose,
    className,
    subscriptionStatus,
    isLoadingSubscription
}) {
    const RELEASES_TAB = 'RELEASES_TAB';
    const STAMP_TAB = 'STAMP_TAB';
    const POINTS_TAB = 'POINTS_TAB';
    const REDEEMABLE_TAB = 'REDEEMABLE_TAB';

    const pathname = usePathname();
    const pathSegments = pathname.split('/');
    const section = pathSegments[2]
    const subSection = pathSegments[3];

    const subscriptionPlan = loyaltyInformation[subscriptionStatus];

    const [sidebarMinimised, setSidebarMinimised] = useState(false);
    const [currentSelection, setCurrentSelection] = useState(undefined);

    // Auto-expand submenu based on current path
    useEffect(() => {
        const currentSection = pathname.split('/')[2];
        if (currentSection === 'release') {
            setCurrentSelection(RELEASES_TAB);
        } else if (currentSection === 'stamp-management' || currentSection === 'card-design') {
            setCurrentSelection(STAMP_TAB);
        } else if (currentSection === 'redeemable') {
            setCurrentSelection(REDEEMABLE_TAB);
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
                <ul className={styles.top}>
                    <li className={styles.logoLi}>
                        <Link className={styles.logoLink} href='/'>
                            <CollbineForBusiness/>
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

                    <li>
                        <Link href='/app/notifications'>
                            <MdOutlineNotificationsNone className={styles.icon} />
                            <span>Notifications</span>
                        </Link>
                    </li>

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
                        title={'Stamp System'}
                        submenus={[
                            { href: '/app/stamp-management', title: 'Stamp Managment' },
                            { href: '/app/card-design', title: 'Card Design' }
                        ]}
                        isExpand={currentSelection == STAMP_TAB}
                        icon={LuStamp}
                        onClick={() => { toggleMenus(STAMP_TAB) }}
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
                            // { href: '/app/redeemable/new-join-rewards', title: 'New Join Rewards' },
                        ]}
                        isExpand={currentSelection == REDEEMABLE_TAB}
                        icon={BsGift}
                        onClick={() => { toggleMenus(REDEEMABLE_TAB) }}
                    />

                    {
                        !sidebarMinimised && <li className={styles.labelLi}>
                            <label className={styles.label}>GROWTH & MARKETING</label>
                        </li>
                    }

                    <li className={section == 'ratings' ? styles.active : ''}>
                        <Link href='/app/ratings'>
                        <FaRegStar className={styles.icon} />
                            <span>Ratings and Reviews</span>
                        </Link>
                    </li>

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
                            <p className={styles.title}>{subscriptionPlan?.plan_name || 'Free'}</p>
                            <p className={styles.cost}>{subscriptionPlan?.payment_type + ' Subscription' || 'No-Cost ($0/Month)'}</p>
                        </div>
                    )}

                    {!isLoadingSubscription && (!subscriptionPlan?.plan_name) &&
                        <Link href="/app/subscription" className={styles.button}>
                            Upgrade
                        </Link>
                    }
                </div>
            </aside>
            { !isClose && <div className={styles.overlay} onClick={onClose}/>}
        </>
    )
}