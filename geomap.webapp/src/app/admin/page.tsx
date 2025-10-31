'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { format } from 'date-fns';

interface ProjectMap {
  id: number;
  internal_id: string;
  data: any;
  file_link: string;
  tab: string | null;
  line: number;
  created_at: string;
  sector: string | null;
  active: number;
  created_by: string | null;
  modified_by: string | null;
  modified_at: string | null;
  created_by_name: string | null;
  modified_by_name: string | null;
  modification_id: number | null;
}

interface ModificationLog {
  id: number;
  user_id: string;
  user_email: string;
  user_name: string | null;
  table_name: string;
  record_id: number;
  internal_id: string | null;
  action: string;
  old_data: any;
  new_data: any;
  timestamp: string;
  ip_address: string | null;
  user_agent: string | null;
}

interface RecordItem {
  project: ProjectMap;
  modification: ModificationLog | null;
}

interface HistoryItem {
  modification: ModificationLog;
}

export default function AdminPage() {
  const router = useRouter();
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [selectedInternalId, setSelectedInternalId] = useState<string | null>(null);
  const [selectedHistoryInternalId, setSelectedHistoryInternalId] = useState<string | null>(null);
  const [historyRecords, setHistoryRecords] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [filters, setFilters] = useState({
    sector: '',
    active: '',
    modifiedBy: '',
    projectName: '',
  });
  const pageSize = 12;

  useEffect(() => {
    fetchRecords();
  }, [page, filters]);

  const fetchRecords = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.sector) params.append('sector', filters.sector);
      if (filters.active) params.append('active', filters.active);
      if (filters.modifiedBy) params.append('modifiedBy', filters.modifiedBy);
      if (filters.projectName) params.append('projectName', filters.projectName);
      params.append('page', page.toString());
      params.append('limit', pageSize.toString());

      const response = await fetch(`/api/admin/records?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('geomap-auth-token')}`,
        },
      });
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        const errData = await response.json();
        throw new Error(errData.details || `Failed to fetch records: ${response.statusText}`);
      }
      const data = await response.json();
      const items = Array.isArray(data.records) ? data.records : [];
      setRecords(items);
      setTotalRecords(data.total || 0);
      setTotalPages(Math.max(1, Math.ceil((data.total || 0) / pageSize)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching records. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistory = async (internalId: string) => {
    setIsHistoryLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/history?internalId=${internalId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('geomap-auth-token')}`,
        },
      });
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        const errData = await response.json();
        throw new Error(errData.details || `Failed to fetch history: ${response.statusText}`);
      }
      const data = await response.json();
      setHistoryRecords(Array.isArray(data.records) ? data.records : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching history.');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (selectedHistoryInternalId) {
      fetchHistory(selectedHistoryInternalId);
    }
  }, [selectedHistoryInternalId]);

  const handleFilterChange = (field: string, value: string) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleActivate = async (projectId: number, internalId: string) => {
    try {
      const response = await fetch('/api/admin/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('geomap-auth-token')}`,
        },
        body: JSON.stringify({ projectId, internalId }),
      });
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error(`Failed to activate record: ${response.statusText}`);
      }
      const deactivateResponse = await fetch('/api/admin/deactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('geomap-auth-token')}`,
        },
        body: JSON.stringify({ internalId, excludeProjectId: projectId }),
      });
      if (!deactivateResponse.ok) {
        throw new Error(`Failed to deactivate other records: ${deactivateResponse.statusText}`);
      }
      await fetchRecords();
      showNotification('Record activated and others deactivated successfully!', 'bg-green-600');
      if (selectedInternalId === internalId) {
        setSelectedInternalId(null);
      }
    } catch (err) {
      showNotification('Failed to update records. Please try again.', 'bg-red-600');
    }
  };

  const showNotification = (message: string, bgColor: string) => {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 ${bgColor} text-white px-4 py-2 rounded-md shadow-lg animate-fade-in-out`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.classList.add('opacity-0', 'transition-opacity', 'duration-300');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  };

  const renderRecordDetails = (record: RecordItem) => {
    const statusColor = record.project.active === 1 ? 'text-green-600' : 'text-gray-500';
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 rounded-md border border-blue-100 p-4">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">Record Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Project Name:</span>{' '}
              {record.project.data?.project_name || 'Not Available'}
            </div>
            <div>
              <span className="font-medium">Sector:</span>{' '}
              {record.project.sector || 'Not Available'}
            </div>
            <div>
              <span className="font-medium">Status:</span>{' '}
              <span className={statusColor}>
                {record.project.active === 1 ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div>
              <span className="font-medium">Modified By:</span>{' '}
              {record.project.modified_by_name || record.project.modified_by || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Timestamp:</span>{' '}
              {record.project.modified_at
                ? format(new Date(record.project.modified_at), 'PPp')
                : format(new Date(record.project.created_at), 'PPp')}
            </div>
            <div>
              <span className="font-medium">File Link:</span>{' '}
              {record.project.file_link ? (
                <a
                  href={record.project.file_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  View File
                </a>
              ) : (
                'N/A'
              )}
            </div>
            <div>
              <span className="font-medium">Created By:</span>{' '}
              {record.project.created_by_name || record.project.created_by || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Modification ID:</span>{' '}
              {record.project.modification_id || 'N/A'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderHistory = (modification: ModificationLog) => {
    return (
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3">
        <h3 className="text-sm font-semibold text-purple-800">
          Modification ID: {modification.id}
        </h3>
        <p className="text-sm text-gray-600 mt-1 sm:mt-0">
          Timestamp: {format(new Date(modification.timestamp), 'PPp')}
        </p>
      </div>
    );
  };

  const renderDiff = (oldData: any, newData: any) => {
    const keys = [...new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})])];
    return (
      <div className="space-y-4">
        {keys.map((key) => (
          <div key={key} className="flex flex-col border-b border-gray-200 pb-4">
            <label className="text-sm font-semibold text-gray-800 mb-2 capitalize">
              {key.replace(/_/g, ' ')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-red-50 rounded-md border border-red-100">
                <span className="text-xs font-medium text-gray-600">Previous Value:</span>
                <p className="text-sm text-gray-700 break-words">
                  {oldData?.[key] !== undefined
                    ? typeof oldData[key] === 'object'
                      ? JSON.stringify(oldData[key], null, 2).split('\n').map((line, index) => (
                          <span key={index} className="block">
                            {line}
                          </span>
                        ))
                      : String(oldData[key])
                    : 'N/A'}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-md border border-green-100">
                <span className="text-xs font-medium text-gray-600">New Value:</span>
                <p className="text-sm text-gray-700 break-words">
                  {newData?.[key] !== undefined
                    ? typeof newData[key] === 'object'
                      ? JSON.stringify(newData[key], null, 2).split('\n').map((line, index) => (
                          <span key={index} className="block">
                            {line}
                          </span>
                        ))
                      : String(newData[key])
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const paginatedRecords = Array.isArray(records) ? records : [];
  const nextPage = () => page < totalPages && setPage(page + 1);
  const prevPage = () => page > 1 && setPage(page - 1);

  if (error && !selectedHistoryInternalId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-sm max-w-lg w-full">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-blue-800 mb-2">Error Loading Data</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              type="button"
              onClick={() => fetchRecords()}
              className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans py-10 px-4 sm:px-6">
      <div className="text-center mb-10">
        <div className="relative w-20 h-20 mx-auto">
          <Image src="/gex-logo-2.png" alt="GEX Logo" fill className="object-contain" priority />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-blue-800 mt-5">Admin Records Dashboard</h1>
        <p className="text-gray-600 text-sm sm:text-base mt-2">Review and manage all project records</p>
      </div>

      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-sm p-4 md:p-6 mb-8">
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
            <input
              type="text"
              value={filters.projectName}
              onChange={(e) => handleFilterChange('projectName', e.target.value)}
              placeholder="Enter project name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sector</label>
            <select
              value={filters.sector}
              onChange={(e) => handleFilterChange('sector', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Sectors</option>
              <option value="production">Production</option>
              <option value="storage">Storage</option>
              <option value="ccus">CCUS</option>
              <option value="port">Port</option>
              <option value="pipeline">Pipeline</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.active}
              onChange={(e) => handleFilterChange('active', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Modified By</label>
            <input
              type="text"
              value={filters.modifiedBy}
              onChange={(e) => handleFilterChange('modifiedBy', e.target.value)}
              placeholder="Enter email or name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center text-gray-600 py-10">Loading...</div>
        ) : records.length === 0 ? (
          <div className="text-center text-gray-600 py-10">No records found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full table-auto border-collapse max-w-full">
                <thead className="bg-blue-50">
                  <tr>
                    {[
                      'Modification ID',
                      'Internal ID',
                      'Project Name',
                      'Sector',
                      'Status',
                      'Modified By',
                      'Timestamp',
                      'Actions',
                    ].map((header, index) => (
                      <th
                        key={index}
                        className={`px-4 py-3 text-left text-sm font-semibold text-blue-800 ${
                          header === 'Actions' ? 'sticky right-0 bg-blue-50 z-10' : ''
                        } ${header === 'Internal ID' ? 'max-w-[150px] truncate' : ''}`}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.map((item) => (
                    <tr key={item.project.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">{item.project.modification_id || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-[150px] truncate">{item.project.internal_id}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{item.project.data?.project_name || 'Not Available'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{item.project.sector || 'Not Available'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{item.project.active === 1 ? 'Active' : 'Inactive'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {item.project.modified_by_name || item.project.modified_by || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {item.project.modified_at
                          ? format(new Date(item.project.modified_at), 'PPp')
                          : format(new Date(item.project.created_at), 'PPp')}
                      </td>
                      <td className="px-4 py-3 text-sm sticky right-0 bg-white z-10 flex gap-2">
                        <button
                          className="px-3 py-1.5 border border-blue-600 text-blue-600 rounded-full text-sm hover:bg-blue-600 hover:text-white transition-colors"
                          onClick={() => setSelectedInternalId(item.project.internal_id)}
                        >
                          Review
                        </button>
                        <button
                          className="px-3 py-1.5 border border-purple-600 text-purple-600 rounded-full text-sm hover:bg-purple-600 hover:text-white transition-colors"
                          onClick={() => setSelectedHistoryInternalId(item.project.internal_id)}
                        >
                          History
                        </button>
                        <button
                          className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                            item.project.active === 1
                              ? 'border border-gray-600 text-gray-600 hover:bg-gray-600 hover:text-white'
                              : 'border border-green-600 text-green-600 hover:bg-green-600 hover:text-white'
                          }`}
                          onClick={() => handleActivate(item.project.id, item.project.internal_id)}
                        >
                          {item.project.active === 1 ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
              <span>Showing {records.length} of {totalRecords} records</span>
              <div className="flex gap-2">
                <button
                  onClick={prevPage}
                  disabled={page === 1}
                  className="px-3 py-1 border border-blue-600 text-blue-600 rounded-full hover:bg-blue-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                <span>Page {page} of {totalPages}</span>
                <button
                  onClick={nextPage}
                  disabled={page === totalPages}
                  className="px-3 py-1 border border-blue-600 text-blue-600 rounded-full hover:bg-blue-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {selectedInternalId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-5xl w-full max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-blue-800">Review Records for Internal Id: {selectedInternalId}</h2>
              <button
                onClick={() => setSelectedInternalId(null)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {records
                .filter((record) => record.project.internal_id === selectedInternalId)
                .map((record, index) => (
                  <div key={`${record.project.id}-${index}`} className="border-b border-gray-200 pb-4 last:border-b-0">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-semibold text-blue-800">
                        Record ID: {record.project.id} -{' '}
                        <span className={record.project.active === 1 ? 'text-green-600' : 'text-gray-500'}>
                          {record.project.active === 1 ? 'Active' : 'Inactive'}
                        </span>
                      </h3>
                    </div>
                    {renderRecordDetails(record)}
                  </div>
                ))}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setSelectedInternalId(null)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-all duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedHistoryInternalId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-5xl w-full max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-purple-800">History for Internal Id: {selectedHistoryInternalId}</h2>
              <button
                onClick={() => {
                  setSelectedHistoryInternalId(null);
                  setError(null);
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isHistoryLoading ? (
                <div className="text-center text-gray-600">Loading...</div>
              ) : error ? (
                <div className="text-center text-red-600">{error}</div>
              ) : historyRecords.length === 0 ? (
                <div className="text-center text-gray-600">No history found.</div>
              ) : (
                historyRecords.map((item, index) => (
                  <div
                    key={`${item.modification.id}-${index}`}
                    className="border-b border-gray-200 pb-4 last:border-b-0"
                  >
                    {renderHistory(item.modification)}
                    <div className="ml-4 mt-2 space-y-2">
                      <p>
                        <strong>Action:</strong> {item.modification.action}
                      </p>
                      <p>
                        <strong>User:</strong> {item.modification.user_name || item.modification.user_email || 'N/A'}
                      </p>
                      {item.modification.old_data && item.modification.new_data && (
                        <div>
                          <h4 className="text-sm font-medium text-purple-700 mb-2">Changes:</h4>
                          {renderDiff(item.modification.old_data, item.modification.new_data)}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setSelectedHistoryInternalId(null);
                  setError(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-all duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => router.push('/')}
        className="fixed top-1/2 left-4 transform -translate-y-1/2 bg-blue-600/80 text-white rounded-full px-4 py-2 text-sm flex items-center gap-2 hover:bg-blue-600 transition-colors duration-200 shadow-lg z-50"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span>Map</span>
      </button>
    </div>
  );
}