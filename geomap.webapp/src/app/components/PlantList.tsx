// components/PlantList.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { CCUSItem, ProductionItem, StorageItem } from '@/lib/types2';

interface Feature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: CCUSItem | ProductionItem | StorageItem;
}

interface Column {
  header: string;
  accessor: (properties: Feature['properties']) => string | number | undefined;
}

interface SelectBoxProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

interface PlantListProps {
  type: string;
  data: Feature[];
  columns: Column[];
}

const SelectBox: React.FC<SelectBoxProps> = ({ label, options, value, onChange }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="p-3 border border-gray-300 rounded-md min-w-[140px] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
  >
    <option value="" className="text-gray-500">{`All ${label}s`}</option>
    {options.map((opt) => (
      <option key={opt} value={opt}>{opt}</option>
    ))}
  </select>
);

export default function PlantList({ type, data, columns }: PlantListProps) {
  const router = useRouter();
  const [plantList, setPlantList] = useState<Feature[]>(data);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    project_type: '',
    end_use: '',
  });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setPlantList(data);
  }, [data]);

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const filtered = plantList.filter((f) => {
    const p = f.properties;
    const nameMatch = ('name' in p ? p.name : p.project_name) ?? '';
    let statusMatch = '';
    let projectTypeMatch = '';
    let endUseMatch = '';

    if (p.type === 'CCUS') {
      statusMatch = (p as CCUSItem).project_status ?? '';
      projectTypeMatch = (p as CCUSItem).project_type ?? '';
      const endUseSector = (p as CCUSItem).end_use_sector;
      endUseMatch = Array.isArray(endUseSector)
        ? endUseSector.join(', ')
        : (endUseSector ?? '');
    } else if (p.type === 'Production') {
      statusMatch = (p as ProductionItem).status ?? '';
      projectTypeMatch = (p as ProductionItem).project_type ?? '';
      endUseMatch = (p as ProductionItem).end_use?.join(', ') ?? '';
    } else if (p.type === 'Storage') {
      statusMatch = (p as StorageItem).status ?? '';
      projectTypeMatch = (p as StorageItem).project_type ?? '';
      endUseMatch = ''; // StorageItem has no end_use or end_use_sector
    }

    return (
      (!search || nameMatch.toLowerCase().includes(search.toLowerCase())) &&
      (!filters.status || statusMatch === filters.status) &&
      (!filters.project_type || projectTypeMatch === filters.project_type) &&
      (!filters.end_use || endUseMatch.includes(filters.end_use))
    );
  });

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const getOptions = (key: string) => {
    const values = plantList
      .map((p) => {
        if (key === 'status') {
          if (p.properties.type === 'CCUS') {
            return (p.properties as CCUSItem).project_status ?? '';
          } else if (p.properties.type === 'Production' || p.properties.type === 'Storage') {
            return (p.properties as ProductionItem | StorageItem).status ?? '';
          }
        }
        if (key === 'project_type') {
          return p.properties.project_type ?? '';
        }
        if (key === 'end_use') {
          if (p.properties.type === 'CCUS') {
            const endUseSector = (p.properties as CCUSItem).end_use_sector;
            return Array.isArray(endUseSector)
              ? endUseSector.join(', ')
              : (endUseSector ?? '');
          } else if (p.properties.type === 'Production') {
            return (p.properties as ProductionItem).end_use?.join(', ') ?? '';
          }
          return ''; // StorageItem has no end_use
        }
        return '';
      })
      .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
      .flatMap((v) => v.split(',').map((s) => s.trim()))
      .filter((v) => v !== '');
    return [...new Set(values)].sort();
  };

  const handleVerify = (internal_id?: string | null, plantType?: string | null) => {
    if (!internal_id || !plantType) return;
    const typeLower = plantType.toLowerCase();
    switch (typeLower) {
      case 'production':
        router.push(`/plant-form/production/${internal_id}`);
        break;
      case 'storage':
        router.push(`/plant-form/storage/${internal_id}`);
        break;
      case 'ccus':
        router.push(`/plant-form/ccus/${internal_id}`);
        break;
      case 'port':
        router.push(`/port-form/${internal_id}`);
        break;
      default:
        console.error('Unknown plant type for verification:', plantType);
        break;
    }
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
          GEX Database - {type}
        </h1>
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
            label="Project Type"
            options={getOptions('project_type')}
            value={filters.project_type}
            onChange={(v) => handleFilterChange('project_type', v)}
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
                {columns.map((col, index) => (
                  <th
                    key={index}
                    className={`px-4 py-3 text-left text-sm font-semibold text-blue-800 min-w-[120px] ${
                      col.header === 'Data Verification' ? 'sticky right-0 bg-blue-50 z-10' : ''
                    }`}
                  >
                    {col.header}
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
                  {columns.map((col, colIndex) => (
                    <td
                      key={colIndex}
                      className={`px-4 py-3 text-sm ${
                        col.header === 'Data Verification'
                          ? 'sticky right-0 bg-white z-10'
                          : 'text-gray-700'
                      }`}
                    >
                      {col.header === 'Data Verification' ? (
                        <button
                          className="px-3 py-1.5 border border-blue-600 text-blue-600 rounded-full text-sm hover:bg-blue-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => handleVerify(p.properties.internal_id, p.properties.type)}
                          disabled={!p.properties.internal_id || !p.properties.type}
                        >
                          Verify
                        </button>
                      ) : (
                        col.accessor(p.properties) ?? 'Not Available'
                      )}
                    </td>
                  ))}
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