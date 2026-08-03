'use client';

import { useSearchParams } from 'next/navigation';
import { EscrowDetail } from '@/components/EscrowDetail';

export function EscrowDetailPage() {
  const searchParams = useSearchParams();
  const address = searchParams.get('address') ?? undefined;
  return <EscrowDetail address={address} />;
}
