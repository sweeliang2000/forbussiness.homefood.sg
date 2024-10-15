'use client';
import Link from 'next/link';
import styles from './sidebar.module.css';
import { LuClipboardList } from "react-icons/lu";
import { AiOutlineMessage } from "react-icons/ai";
import { BsGift } from "react-icons/bs";
import { FaAnglesLeft } from "react-icons/fa6";
import { FaMobileAlt } from "react-icons/fa";
import { RiUserSettingsLine, RiNewspaperLine } from "react-icons/ri";
import { ImCoinDollar } from "react-icons/im";
import { RxGear } from "react-icons/rx";
import { HiOutlineSpeakerphone } from "react-icons/hi";
import { MdOutlineSpaceDashboard, MdOutlineNotificationsNone } from "react-icons/md";
import { LuStamp } from "react-icons/lu";
import { Submenu } from './submenu/submenu';
import { useState } from 'react';
import { usePathname } from 'next/navigation';


export default function Sidebar() {
    const RELEASES_TAB = 'RELEASES_TAB';
    const STAMP_TAB = 'STAMP_TAB';
    const POINTS_TAB = 'POINTS_TAB';
    const REDEEMABLE_TAB = 'REDEEMABLE_TAB';
    const CUSTOMERS_TAB = 'CUSTOMERS_TAB';

    const pathSegments = usePathname().split('/');
    const section = pathSegments[2]
    const subSection = pathSegments[3];

    const [sidebarMinimised, setSidebarMinimised] = useState(false);
    const [currentSelection, setCurrentSelection] = useState(undefined);

    const toggleSidebar = () => {
        setSidebarMinimised(!sidebarMinimised);
        setCurrentSelection(undefined);
    };

    const toggleMenus = (type) => {
        setCurrentSelection(currentSelection == type ? undefined : type);
        setSidebarMinimised(false);
    };

    return (
        <aside className={`${styles.sidebar} ${sidebarMinimised ? styles.close : ''}`}>
            <ul>
                <li className={styles.logoLi}>
                    <span className={`${styles.logo} ${sidebarMinimised ? styles.hiddenLogo : ''}`}>Collbine For Business</span>
                    <div className={styles.minimiseSidebar} onClick={toggleSidebar}>
                        <FaAnglesLeft className={sidebarMinimised ? styles.rotate : styles.reverseRotate} />
                    </div>
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
                    <Link href='/'>
                        <MdOutlineNotificationsNone className={styles.icon} />
                        <span>Notifications</span>
                    </Link>
                </li>

                <Submenu
                    title={'Releases'}
                    submenus={[
                        { href: '/', title: 'Release Review' },
                        { href: '/document', title: 'Release Status' },
                        { href: '/document', title: 'History' }
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
                        { href: '/', title: 'Stamp Managment' },
                        { href: '/document', title: 'Membership Tiers' },
                        { href: '/project', title: 'Redeemable Items' }
                    ]}
                    isExpand={currentSelection == STAMP_TAB}
                    icon={LuStamp}
                    onClick={() => { toggleMenus(STAMP_TAB) }}
                />

                <Submenu
                    title={'Points System'}
                    submenus={[
                        { href: '/', title: 'Points Management' },
                        { href: '/document', title: 'Membership Tiers' },
                    ]}
                    isExpand={currentSelection == POINTS_TAB}
                    icon={ImCoinDollar}
                    onClick={() => { toggleMenus(POINTS_TAB) }}
                />

                <Submenu
                    title={'Redeemable'}
                    submenus={[
                        { href: '/', title: 'My Rewards' },
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

                <Submenu
                    title={'Customers'}
                    submenus={[
                        { href: '/', title: 'Ratings and Reviews' },
                        { href: '/document', title: 'Direct Message' }
                    ]}
                    isExpand={currentSelection == CUSTOMERS_TAB}
                    icon={AiOutlineMessage}
                    onClick={() => { toggleMenus(CUSTOMERS_TAB) }}
                />

                {
                    !sidebarMinimised && <li className={styles.labelLi}>
                        <label className={styles.label}>Settings</label>
                    </li>
                }

                <li>
                    <Link href='/'>
                        <RiUserSettingsLine className={styles.icon} />
                        <span>Users and permissions</span>
                    </Link>
                </li>

                <li>
                    <Link href='/'>
                        <HiOutlineSpeakerphone className={styles.icon} />
                        <span>Feedbacks</span>
                    </Link>
                </li>

                <li>
                    <Link href='/'>
                        <RxGear className={styles.icon} />
                        <span>Account Settings</span>
                    </Link>
                </li>
            </ul>
        </aside>
    )
}