'use client';

import { Dialog } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { IoCloseSharp } from 'react-icons/io5';
import Abutton from '@/components/Buttons/Abutton';
import styles from './LandingContactSuccessModal.module.css';

const LandingContactSuccessModal = ({
    open,
    onClose,
    whatsappUrl,
    phoneHref,
    phoneDisplay,
}) => {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{ className: styles.paper }}
        >
            <div className={styles.header}>
                <div className={styles.iconWrap} aria-hidden="true">
                    <CheckCircleIcon className={styles.icon} />
                </div>

                <IoCloseSharp
                    className={styles.closeIcon}
                    onClick={onClose}
                    role="button"
                    tabIndex={0}
                />
            </div>

            <h3 className={styles.title}>Thanks for reaching out</h3>

            <p className={styles.message}>
                We will contact you in 1 - 2 days.
            </p>
            <p className={styles.messageSecondary}>
                Urgent methods please Whatsapp us or call us.
            </p>

            <div className={styles.actions}>
                <Abutton
                    variant="primary"
                    size="medium"
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => {
                        // Let link navigation happen, but close the modal immediately.
                        onClose?.();
                        e.stopPropagation();
                    }}
                >
                    Whatsapp
                </Abutton>

                <Abutton
                    variant="secondary"
                    size="medium"
                    href={phoneHref}
                    onClick={(e) => {
                        onClose?.();
                        e.stopPropagation();
                    }}
                >
                    {phoneDisplay || 'Call us'}
                </Abutton>
            </div>
        </Dialog>
    );
};

export default LandingContactSuccessModal;

