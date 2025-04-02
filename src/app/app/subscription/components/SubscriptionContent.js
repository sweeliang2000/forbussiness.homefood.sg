'use client';

import { useSearchParams } from 'next/navigation';
import Success from '../views/Success';
import ProductDetails from '../views/ProductDetails';
import Message from '../views/Message';

export default function SubscriptionContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const success = searchParams.get('success') === 'true';
  const message = searchParams.get('message') || '';

  if (!success && message === '') {
    return <ProductDetails />;
  }

  if (success && sessionId) {
    return <Success sessionId={sessionId} />;
  }

  return <Message message={message} />;
} 