import Image from 'next/image';
import styles from './ErrorPage.module.css';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import { Button } from '@mui/material';
import { EMAIL_CONTACT_ADDRESS } from '@/utility/constantString';


const ErrorPage = ({
  message
}) => {

  const refreshHandler = (event) => {
    event.preventDefault();
    window.location.reload();
  };

  return (
    <ContentCard className={styles.body}>
      <div className={styles.content}>
        <Image
          src='/images/common/alert_undraw.svg'
          height={480}
          width={480}
          className={styles.alertImage}
          alt='Alert error'
        />

        <div className={styles.contentInfo}>
          <h1>An error had occured</h1>

          <p className={styles.genericMessage}>
            {message && <>{message} <br /></>}
            Please wait a moment and try again, or refresh the page.<br />
            If the issue persists, contact us at <a href={`mailto:${EMAIL_CONTACT_ADDRESS}`}>{EMAIL_CONTACT_ADDRESS}</a> for assistance.
          </p>

          <Button
            type='submit'
            variant='contained'
            color='primary'
            fullWidth
            onClick={refreshHandler}
            className={styles.refreshButton}
          >
            Refresh
          </Button>
        </div>
      </div>
    </ContentCard>
  )
};

export default ErrorPage;