import { Suspense } from 'react';
import { EscrowDetailPage } from '@/components/EscrowDetailPage';

export default function EscrowDetailRoute() {
  return (
    <Suspense fallback={<p className="text-slate-400">Loading…</p>}>
      <EscrowDetailPage />
    </Suspense>
  );
}
