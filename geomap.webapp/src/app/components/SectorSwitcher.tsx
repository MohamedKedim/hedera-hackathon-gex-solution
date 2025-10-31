'use client';

import { useRouter } from 'next/navigation';
import { ReactElement } from 'react';

const SECTORS = [
  { value: 'all', label: 'All Plants' },
  { value: 'Production', label: 'Production Plants' },
  { value: 'CCUS', label: 'CCUS Plants' },
  { value: 'Storage', label: 'Storage Plants' },
  { value: 'ports', label: 'Ports' },
];

export default function SectorSwitcher(): ReactElement {
  const router = useRouter();

  const handleSectorChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = event.target.value;

    if (selectedValue === 'all') {
      router.push('/plant-list');
    } else if (selectedValue === 'ports') {
      router.push('/ports');
    } else {
      router.push(`/plant-list?type=${selectedValue}`);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md mb-6 border border-gray-200">
      <label
        htmlFor="sector-switcher"
        className="block text-lg font-semibold text-black mb-2" // <- always black
      >
        Explore Infrastructure
      </label>
      <select
        id="sector-switcher"
        onChange={handleSectorChange}
        className="w-full p-3 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 !text-black appearance-none"
        defaultValue=""
      >
        <option value="" hidden>
          -- Select a category to view --
        </option>
        {SECTORS.map((sector) => (
          <option key={sector.value} value={sector.value}>
            {sector.label}
          </option>
        ))}
      </select>

    </div>
  );
}
