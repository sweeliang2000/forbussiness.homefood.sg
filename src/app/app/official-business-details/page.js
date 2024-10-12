import styles from './page.module.css';
import { ContentCard } from "@/components/ContentCard/ContentCard";
import { HeaderSection } from "@/components/HeaderSection/HeaderSection";
import { TextField } from '@mui/material';
import Link from "next/link";

export default function Content() {
  return (
    <div className={styles.container}>
      <HeaderSection
        className={styles.header}
        title="Your Business"
        description={
          <p>
            This information is used to verify your business.
            The details will not be visible to your customers. <Link href='/'>Find out more.</Link>
          </p>

        }
      />

      <ContentCard className={styles.content}>
        <div>
          <h2>Official information</h2>
          <h3>Business name</h3>
          <p className={styles.description}>The official business name registered with ACRA. For example, McDonald&apos;s Corporation.</p>

          <TextField
            variant="outlined"
            placeholder="McDonald's Corporation."
            fullWidth
          />
        </div>

        <div>
          <h3>Unique Entity Number (UEN)</h3>
          <p className={styles.description}>
            The Unique Entity Number (UEN) is a 9- or 10-digit number issued by the Accounting and Corporate Regulatory Authority (ACRA) for registered businesses in Singapore.
          </p>
          <TextField
            variant="outlined"
            placeholder="McDonalds"
            fullWidth
            type="number"
            slotProps={{
              input: {
                min: 0,
                maxLength: 10,
              },
            }}
          />
        </div>

        <div>
          <h3>Registered Business Address</h3>
          <p className={styles.description}>
            This is the name that customers will see in the app for example, McDonalds.
          </p>

          <div className={styles.addressFields}>
            <TextField
              label="Unit Number"
              variant="outlined"
              placeholder="#05-23"
              fullWidth
            />

            <TextField
              label="Building Name"
              variant="outlined"
              placeholder="International Plaza"
              fullWidth
            />

            <TextField
              label="Street Address"
              variant="outlined"
              placeholder="10 Anson Road"
              fullWidth
            />

            <TextField
              label="Postal Code"
              variant="outlined"
              placeholder="079903"
              fullWidth
              type="number"
              slotProps={{
                input: {
                  maxLength: 6,
                },
              }}
            />
          </div>
        </div>
      </ContentCard>

      <ContentCard className={styles.content}>
          <div>
            <h2>Representative Contact Details</h2>
            <h3 className={styles.noDescriptionTitle}>Name</h3>

            <TextField
              placeholder='Your name'
              variant="outlined"
              fullWidth
            />
          </div>

          <div>
            <h3 className={styles.noDescriptionTitle}>Role</h3>

            <TextField
              variant="outlined"
              placeholder='Accounts Manager'
              fullWidth
            />
          </div>

          <div>
            <h3 className={styles.noDescriptionTitle}>Phone Number</h3>

            <TextField
              variant="outlined"
              placeholder='+6591234567'
              fullWidth
              type="tel"
              slotProps={{
                input: {
                  pattern: "[+]{1}[0-9]{1,3}[0-9]{8}",
                },
              }}
            />
          </div>
      </ContentCard>
    </div>
  );
}
