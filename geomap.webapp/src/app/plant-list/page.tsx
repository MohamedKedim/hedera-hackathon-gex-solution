'use client';

import { Suspense } from 'react';
import PlantListPage from '../components/PlantListPage';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PlantListPage />
    </Suspense>
  );
}
