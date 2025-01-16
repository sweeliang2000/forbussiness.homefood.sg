import styles from './stamp-setup.module.css';
import { ContentCard } from '@/components/ContentCard/ContentCard';
import { HeaderSection } from '@/components/HeaderSection/HeaderSection';
import { Button, TextField } from '@mui/material';
import Link from 'next/link';

export default function StampSetup() {
  return (
    <div className={styles.container}>
      <HeaderSection
        className={styles.header}
        title='Stamp Management'
        description={
          <p>
            Create and design your stamp card and the rewards to be given when
            customers hit a certain goal. <Link href='/'>Find out more.</Link>
          </p>

        }
      />

      <ContentCard className={styles.content}>
        <div>
          <h2>Card Setup</h2>
          <h3>Card title (Optional)</h3>
          <p className={styles.description}>
            A name for your stamp card. For example, BUY 6 COFFEES AND GET ONE FREE!
          </p>

          <TextField
            variant='outlined'
            placeholder=''
            fullWidth
          />
        </div>

        <div>
          <h3>Card description (Optional)</h3>
          <p className={styles.description}>
            A short description of your program. Displays on the front of your the card to customers like BUY 6 COFFEES AND GET ONE FREE!
          </p>
          <TextField
            label=''
            variant='outlined'
            placeholder=''
            fullWidth
          />
        </div>

        <div>
          <h3>Number of stamps</h3>
          <p className={styles.description}>
            Total amount of stamps your stamp card should have. (Maximum of 16)
          </p>

          <div className={styles.addressFields}>
            <TextField
              variant='outlined'
              placeholder='6'
              fullWidth
              type='number'
              inputProps={{
                min: 0,
                max: 16,
              }}
            />
          </div>
        </div>
      </ContentCard>

      <ContentCard className={styles.content}>
        <div>
          <h2>Expiration Settings</h2>

          <h3 className={styles.noDescriptionTitle}>Expiration Type</h3>
          <p className={styles.description}>
            Once the expiration type are released, any changes require a minimum of 1 month&apos;s
            notice to ensure customers are informed in advance.
          </p>

          <TextField
            placeholder='Your name'
            variant='outlined'
            fullWidth
          />
        </div>

        <div>
          <h3 className={styles.noDescriptionTitle}>Stamp Expiry Period (Days)</h3>

          <TextField
            variant='outlined'
            placeholder='Accounts Manager'
            fullWidth
          />
        </div>
      </ContentCard>

      <ContentCard className={styles.content}>
        <div>
          <h2>Default Design</h2>

          <h3 className={styles.noDescriptionTitle}>Reward Icons (Stamped)</h3>
          <p className={styles.description}>
            The user has collected this stamp, and it directly contributes to achieving the reward. This indicates completed actions that are essential for earning the reward.
          </p>
        </div>

        <div>
          <h3 className={styles.noDescriptionTitle}>Reward Icons (Unstamped)</h3>
          <p className={styles.description}>
            This stamp is part of the reward criteria but hasn&apos;t been collected yet. It represents the progress the user needs to make to earn the reward.
          </p>
        </div>

        <div>
          <h3 className={styles.noDescriptionTitle}>Non-Reward Icons (Stamped)</h3>
          <p className={styles.description}>
            The user has collected this stamp, but it does not contribute to the current reward. These stamps may be part of bonus achievements or additional incentives.
          </p>
        </div>

        <div>
          <h3 className={styles.noDescriptionTitle}>Non-Reward Icons (Unstamped)</h3>
          <p className={styles.description}>
            This stamp is not related to the current reward and hasn&apos;t been collected yet. It may represent optional actions or future rewards that the user can pursue.
          </p>
        </div>
      </ContentCard>

      <ContentCard className={styles.content}>
        <div>
          <h2>My rewards</h2>
          <p className={styles.description}>
            Create the rewards that your customers will love. This will make to always come back!
          </p>
          <Button
            variant='contained'
            className={styles.button}
          >
            Add reward
          </Button>



        </div>
      </ContentCard>
    </div>
  );
}
