'use client';

import { useEffect, useState, ReactElement } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';

interface Feature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    id?: number;
    internal_id?: string;
    name?: string;
    status?: string;
    type?: string; // This property is key for filtering
    capacity_mw?: number | null;
    end_use?: string;
    start_year?: number | null;
    country?: string;
    process?: string;
    project_name?: string;
  };
}

interface SelectBoxProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

export default function PlantListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type');
  const [plantList, setPlantList] = useState<Feature[]>([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    process: '',
    end_use: '',
  });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    fetch('/api/data')
      .then((res) => res.json())
      .then((data) => {
        let combined: Feature[] = [];
        if (typeParam === 'CCUS') {
          combined = data.ccus?.features ?? [];
        } else if (typeParam === 'Production' || typeParam === 'Storage' || typeParam === 'Port') {
          const allFeatures = [
            ...(data.hydrogen?.features ?? []),
            ...(data.ports?.features ?? [])
          ];
          combined = allFeatures.filter(
            (f: Feature) => f.properties.type === typeParam
          );
        } else {
          combined = [
            ...(data.hydrogen?.features ?? []),
            ...(data.ccus?.features ?? []),
            ...(data.ports?.features ?? []),
          ];
        }
        setPlantList(combined);
      })
      .catch((error) => console.error('Error fetching data:', error));
  }, [typeParam]);

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const filtered = plantList.filter((f) => {
    const p = f.properties;
    const nameMatch = p.name || p.project_name || '';
    return (
      (!search || nameMatch.toLowerCase().includes(search.toLowerCase())) &&
      (!filters.status || p.status === filters.status) &&
      (!filters.process || p.process === filters.process) &&
      (!filters.end_use || p.end_use === filters.end_use)
    );
  });

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const getOptions = (key: keyof Feature['properties']) => [
    ...new Set(
      plantList
        .map((p) => p.properties[key])
        .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
    ),
  ].sort();

  const handleVerify = (internal_id?: string, plantType?: string) => {
  if (!internal_id || !plantType) return;
  const type = plantType.toLowerCase();

  const baseUrl = process.env.NEXT_PUBLIC_GEOMAP_URL; // Different service URL

  let targetUrl = '';
  switch (type) {
    case 'production':
      targetUrl = `${baseUrl}/plant-form/production/${internal_id}`;
      break;
    case 'storage':
      targetUrl = `${baseUrl}/plant-form/storage/${internal_id}`;
      break;
    case 'ccus':
      targetUrl = `${baseUrl}/plant-form/ccus/${internal_id}`;
      break;
    case 'port':
      targetUrl = `${baseUrl}/port-form/${internal_id}`;
      break;
    default:
      console.error('Unknown plant type for verification:', plantType);
      return;
  }
  
  // Direct browser navigation - NO router.push!
  window.location.href = targetUrl;
};

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <div className="text-center mb-6 pt-6">
        <div className="flex justify-center items-center gap-3">
          <Image
            src="/gex-logo-2.png"
            alt="GEX Logo"
            width={50}
            height={80}
            className="h-16 w-auto"
          />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-blue-600 mt-2">
          GEX Database
        </h1>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-0">
          <SectorSwitcher currentType={typeParam} />
      </div>

      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-sm p-4 md:p-6 mb-8">
        <input
          type="text"
          placeholder="Search by Plant Name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <SelectBox
            label="Status"
            options={getOptions('status')}
            value={filters.status}
            onChange={(v) => handleFilterChange('status', v)}
          />
          <SelectBox
            label="Process"
            options={getOptions('process')}
            value={filters.process}
            onChange={(v) => handleFilterChange('process', v)}
          />
          <SelectBox
            label="End Use"
            options={getOptions('end_use')}
            value={filters.end_use}
            onChange={(v) => handleFilterChange('end_use', v)}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-sm p-4 md:p-6">
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse">
            <thead className="bg-blue-50">
              <tr>
                {[
                  'Plant Name',
                  'Type',
                  'End Use',
                  'Status',
                  'Country',
                  'Process',
                  'Capacity (MW)',
                  'Start Year',
                  'Data Verification',
                ].map((header, index) => (
                  <th
                    key={index}
                    className={`px-4 py-3 text-left text-sm font-semibold text-blue-800 min-w-[120px] ${
                      header === 'Data Verification' ? 'sticky right-0 bg-blue-50 z-10' : ''
                    }`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((p, index) => (
                <tr
                  key={`${p.properties.internal_id}-${index}`}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {p.properties.name || p.properties.project_name || 'Not Available'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {p.properties.type || 'Not Available'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {p.properties.end_use || 'Not Available'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {p.properties.status || 'Not Available'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {p.properties.country || 'Not Available'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {p.properties.process || 'Not Available'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {p.properties.capacity_mw ?? 'Not Available'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {p.properties.start_year ?? 'Not Available'}
                  </td>
                  <td className="px-4 py-3 text-sm sticky right-0 bg-white z-10">
                    <button
                      className="px-3 py-1.5 border border-blue-600 text-blue-600 rounded-full text-sm hover:bg-blue-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => handleVerify(p.properties.internal_id, p.properties.type)}
                      disabled={!p.properties.internal_id || !p.properties.type}
                    >
                      Verify
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end items-center mt-4 text-sm text-gray-600">
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="ml-3 px-3 py-1 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {'<'}
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="ml-2 px-3 py-1 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {'>'}
          </button>
        </div>
      </div>

      <button
        onClick={() => router.push('/plant-widget')}
        className="fixed top-1/2 left-4 transform -translate-y-1/2 bg-blue-600/80 text-white border-none rounded-full px-4 py-2 text-sm flex items-center gap-2 hover:bg-blue-600 transition-colors shadow-lg z-50"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        <span>Back</span>
      </button>
    </div>
  );
}

const SelectBox: React.FC<SelectBoxProps> = ({ label, options, value, onChange }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="p-3 border border-gray-300 rounded-md min-w-[140px] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
  >
    <option value="" className="text-gray-500">
      {`All ${label}`}
    </option>
    {options.map((opt) => (
      <option key={opt} value={opt}>
        {opt}
      </option>
    ))}
  </select>
);

// --- SectorSwitcher Component Definition ---

const SECTORS = [
  { value: 'all', label: 'All Plants' },
  { value: 'Production', label: 'Production Plants' },
  { value: 'CCUS', label: 'CCUS Plants' },
  { value: 'Storage', label: 'Storage Plants' },
  { value: 'ports', label: 'Ports' }, // Corrected value for ports
];

interface SectorSwitcherProps {
  currentType: string | null;
}

function SectorSwitcher({ currentType }: SectorSwitcherProps): ReactElement {
  const router = useRouter();

  const handleSectorChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = event.target.value;

    if (selectedValue === 'all') {
      router.push('/plant-list');
    } else if (selectedValue === 'ports') {
      // ✅ Corrected: Navigates to the dedicated /ports page
      router.push('/ports');
    } else {
      router.push(`/plant-list?type=${selectedValue}`);
    }
  };

  // If the user is on /plant-list without a type, it's 'all'
  const selectedValue = currentType || 'all';

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm mb-8">
      <label htmlFor="sector-switcher" className="block text-md font-semibold text-gray-800 mb-2">
        Filter by Sector Type
      </label>
      <select
        id="sector-switcher"
        onChange={handleSectorChange}
        value={selectedValue}
        className="w-full p-3 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {SECTORS.map((sector) => (
          <option key={sector.value} value={sector.value}>
            {sector.label}
          </option>
        ))}
      </select>
    </div>
  );
}