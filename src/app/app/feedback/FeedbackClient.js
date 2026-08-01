'use client';

import { useEffect, useState } from 'react';
import GoogleForm from '@/components/GoogleForm/GoogleForm';
import { getUserDataFromCookie } from '@/utility/cookieUtils';

// Resolves the signed-in user's email (from the auth cookie) to prefill the form.
export default function FeedbackClient() {
  const [email, setEmail] = useState('');

  useEffect(() => {
    setEmail(getUserDataFromCookie()?.user_id ?? '');
  }, []);

  return <GoogleForm email={email} />;
}
