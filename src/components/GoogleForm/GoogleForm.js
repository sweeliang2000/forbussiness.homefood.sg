'use client';
import { useEffect, useState } from 'react';
import styles from './GoogleForm.module.css';

const GoogleForm = ({ email }) => {
  // Set initial URL with base form URL
  const [formUrl, setFormUrl] = useState('https://docs.google.com/forms/d/e/1FAIpQLSc13ngu6oEO5UqFyfuWAAWJWDhoJSTgl0f4tDEUE1hVW_hrjg/viewform?usp=pp_url');

  useEffect(() => {
    // Base form URL
    const baseUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSc13ngu6oEO5UqFyfuWAAWJWDhoJSTgl0f4tDEUE1hVW_hrjg/viewform?usp=pp_url';
    
    // Add email parameter if provided
    const url = email 
      ? `${baseUrl}&entry.1045781291=${encodeURIComponent(email)}`
      : baseUrl;
    
    setFormUrl(url);
  }, [email]);

  return (
    <div className={styles.formContainer}>
      <iframe
        src={formUrl}
        width="100%"
        height="100%"
        frameBorder="0"
        marginHeight="0"
        marginWidth="0"
        title="Google Form"
      >
        Loading…
      </iframe>
    </div>
  );
};

export default GoogleForm; 