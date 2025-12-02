'use client';
import TerminalControlPanel from './TerminalControlPanel';
import styles from './page.module.css';

const TerminalPage = () => {
    return (
        <div className={styles.container}>
            {/* Left Side */}
            <div className={styles.leftSide}>
                <h1>Terminal</h1>
                {/* Left side content can be added here */}
            </div>

            {/* Right Side */}
            <TerminalControlPanel />
        </div>
    );
};

export default TerminalPage;