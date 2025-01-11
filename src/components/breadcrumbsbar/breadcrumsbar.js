'use client'
import styles from './breadcrumsbar.module.css';
import { Breadcrumbs, Typography } from '@mui/material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaChevronRight } from 'react-icons/fa';
import { MdDashboard } from 'react-icons/md';

export const BreadcrumsBar = () => {
    const pathSegments = usePathname().split('/').slice(2);

    return (
        <nav className={styles.nav}>
            <Breadcrumbs className={styles.breadcrumbs} separator={<FaChevronRight className={styles.rightArrow} />}>
                {pathSegments.length == 0 ? 
                    <div className={styles.lastPath}>
                        <div className={styles.dashboard}>
                            <MdDashboard/> 
                            <p>Dashboard</p>
                        </div>
                    </div>:
                    <Link className={styles.link} href='/app'>
                        <div className={styles.dashboard}>
                            <MdDashboard/>
                            <p>Dashboard</p>
                        </div>
                    </Link>
                }

                {pathSegments.map((segment, index) => {
                    const isLastSegment = index === pathSegments.length - 1;
                    const href = `${pathSegments.slice(0, index + 1).join('/')}`;
                    let formattedStr = segment.slice(0).replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase());

                    return isLastSegment ? (
                        <p key={segment} className={styles.lastPath}>
                            {formattedStr}
                        </p>
                    ) : (
                        <Link key={segment} href={href}>
                            {formattedStr}
                        </Link>
                    );
                })}
            </Breadcrumbs>
        </nav>
    )
};