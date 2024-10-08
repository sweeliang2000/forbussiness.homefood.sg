import Link from 'next/link';
import styles from './sidebar.module.css';
import { IoHomeOutline, IoCreateOutline } from "react-icons/io5";
import { LuLayoutDashboard } from "react-icons/lu";
import { FaRegCalendarAlt, FaChevronDown, FaChevronLeft } from "react-icons/fa";
import { MdOutlinePeopleAlt } from "react-icons/md";


export default function Sidebar() {
    return(
        <aside>
            <ul>
                <li>
                    <span>Collbine For Business</span>

                    <FaChevronLeft />
                </li>
                <li className={styles.active}>
                    <IoHomeOutline/>
                    <Link href='/'>
                        <span>Home</span>
                    </Link>
                </li>

                <li>
                    <LuLayoutDashboard />
                    <Link href='/'>
                        <span>Dashboard</span>
                    </Link>
                </li>

                <li>
                    <button className={styles.dropdownBtn}>
                        <IoCreateOutline />
                        <span>Create</span>
                        <FaChevronDown />
                    </button>
                    <ul className={styles.submenu}>
                        <li><Link href='/'>Folder</Link></li>
                        <li><Link href='/'>Document</Link></li>
                        <li><Link href='/'>Project</Link></li>
                    </ul>
                </li>

                <li>
                    <FaRegCalendarAlt />
                    <Link href='/'>
                        <span>Calendar</span>
                    </Link>
                </li>

                <li>
                    <button className={styles.dropdownBtn}>
                        <IoCreateOutline />
                        <span>Todo-Lists</span>
                        <FaChevronDown />
                    </button>
                    <ul className={styles.submenu}>
                        <li><Link href='/'>Work</Link></li>
                        <li><Link href='/'>Private</Link></li>
                        <li><Link href='/'>Coding</Link></li>
                    </ul>
                </li>

                <li>
                    <MdOutlinePeopleAlt />
                    <Link href='/'>
                        <span>Profile</span>
                    </Link>
                </li>
            </ul>
        </aside>
    )
}