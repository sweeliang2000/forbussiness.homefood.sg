'use client';

import { useSearchParams } from 'next/navigation';
import ProductDetails from '../views/ProductDetails';
import Message from '../views/Message';

export default function SubscriptionContent() {
  const searchParams = useSearchParams();
  const canceled = searchParams.get('canceled') === 'true';

  if (canceled) {
    // TODO: Handle canceled subscription
    // What should we do here?
  }

  return <ProductDetails />;
} 