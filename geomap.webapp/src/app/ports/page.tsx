'use client';

import { useEffect, useState, ReactElement } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { PortItem } from '@/lib/types2'; // Make sure this import path is correct

// Define the structure of the GeoJSON feature for a port
interface PortFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: PortItem;
}

// Reusable component for filter dropdowns
interface SelectBoxProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

export default function PortListPage() {
  const router = useRouter();
  const [portList, setPortList] = useState<PortFeature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    country: '',
    trade_type: '',
  });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Fetch data directly from the /api/ports endpoint
  useEffect(() => {
    setIsLoading(true);
    fetch('/api/ports')
      .then((res) => res.json())
      .then((data) => {
        // Directly set the port features, ensuring it's an array if data is missing
        setPortList(data.ports?.features ?? []);
      })
      .catch((error) => console.error('Error fetching port data:', error))
      .finally(() => setIsLoading(false));
  }, []);

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to the first page when a filter changes
  };

  // Filter the list based on search and dropdown selections
  const filteredPorts = portList.filter((feature) => {
    const p = feature.properties;
    return (
      (!search || p.project_name?.toLowerCase().includes(search.toLowerCase())) &&
      (!filters.status || p.status === filters.status) &&
      (!filters.country || p.country === filters.country) &&
      (!filters.trade_type || p.trade_type === filters.trade_type)
    );
  });

  const paginatedPorts = filteredPorts.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredPorts.length / pageSize);

  // Dynamically get unique options for filter dropdowns from the data
  const getOptions = (key: keyof PortItem) =>
    [
      ...new Set(
        portList
          .map((p) => p.properties[key])
          .filter((v): v is string => !!v && typeof v === 'string')
      ),
    ].sort();

  // Navigate directly to the port-specific verification form
  const handleVerify = (internal_id?: string | null) => {
    if (!internal_id) return;
    router.push(`/port-form/${internal_id}`);
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* Header */}
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
          GEX Port Database
        </h1>
      </div>

      {/* Sector Switcher Added Here */}
      <div className="max-w-7xl mx-auto px-4 md:px-0">
          <SectorSwitcher currentType={'ports'} />
      </div>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-sm p-4 md:p-6 mb-8">
        <input
          type="text"
          placeholder="Search by Port Name..."
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
            label="Country"
            options={getOptions('country')}
            value={filters.country}
            onChange={(v) => handleFilterChange('country', v)}
          />
          <SelectBox
            label="Trade Type"
            options={getOptions('trade_type')}
            value={filters.trade_type}
            onChange={(v) => handleFilterChange('trade_type', v)}
          />
        </div>
      </div>

      {/* Ports Table */}
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-sm">
        <div className="overflow-x-auto p-4">
          {isLoading ? (
             <div className="text-center py-10">Loading Port Data...</div>
          ) : (
          <table className="w-full table-auto border-collapse">
            <thead className="bg-blue-50">
              <tr>
                {['Port Name', 'Type', 'Status', 'Country', 'Trade Type', 'Data Verification'].map(
                  (header) => (
                    <th
                      key={header}
                      className={`px-4 py-3 text-left text-sm font-semibold text-blue-800 ${
                        header === 'Data Verification' ? 'sticky right-0 bg-blue-50 z-10' : ''
                      }`}
                    >
                      {header}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedPorts.map((p) => (
                <tr
                  key={p.properties.internal_id}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 text-sm text-gray-700">{p.properties.project_name || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{p.properties.type || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{p.properties.status || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{p.properties.country || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{p.properties.trade_type || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm sticky right-0 bg-white hover:bg-gray-50 z-10">
                    <button
                      className="px-3 py-1.5 border border-blue-600 text-blue-600 rounded-full text-xs hover:bg-blue-600 hover:text-white transition-colors disabled:opacity-50"
                      onClick={() => handleVerify(p.properties.internal_id)}
                      disabled={!p.properties.internal_id}
                    >
                      Verify
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>

        {/* Pagination Controls */}
        <div className="flex justify-end items-center mt-4 text-sm text-gray-600 p-4">
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="ml-3 px-3 py-1 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            {'<'}
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="ml-2 px-3 py-1 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            {'>'}
          </button>
        </div>
      </div>

      {/* Back Button */}
      <button
        onClick={() => router.push('/plant-widget')} // Or your main widget selection page
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

// Reusable SelectBox component (no changes needed)
const SelectBox: React.FC<SelectBoxProps> = ({ label, options, value, onChange }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="p-3 border border-gray-300 rounded-md min-w-[140px] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
  >
    <option value="" className="text-gray-500">
      {`All ${label}s`}
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
  { value: 'ports', label: 'Ports' },
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
      router.push('/ports');
    } else {
      router.push(`/plant-list?type=${selectedValue}`);
    }
  };

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