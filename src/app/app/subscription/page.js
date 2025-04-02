'use client';

import { Suspense } from 'react';
import SubscriptionContent from './components/SubscriptionContent';

export default function SubscriptionPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SubscriptionContent />
    </Suspense>
  );
} 