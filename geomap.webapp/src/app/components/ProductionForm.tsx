"use client";

import React, { useState, useEffect } from 'react';
import ConfirmationModal from './ConfirmationModal';
import { useParams, useRouter } from 'next/navigation';
import ReCAPTCHA from 'react-google-recaptcha';
import { ProductionItem } from '@/lib/types2';
import { STATUS_OPTIONS, StatusType, PRODUCER_PROJECT_TYPES_OPTIONS, ProducerProjectTypeType, PRODUCER_END_USE_OPTIONS, ProducerEndUseType, PRODUCER_PRODUCT_OPTIONS, ProducerProductType, PRODUCER_TECHNOLOGY_OPTIONS, ProducerTechnologyType } from '@/lib/lookupTables';

// --- TYPE DEFINITIONS ---

interface FieldConfig {
  name: keyof ProductionItem | 'capacity' | 'investment_capex' | 'updated_at';
  label: string;
  type: string;
  placeholder?: string;
  isCombined?: boolean;
  options?: ReadonlyArray<string>;
  disabled?: boolean;
}

type SectionTitle = 'General Information' | 'Location' | 'Specific Information' | 'Contact Information';

interface SectionConfig {
  title: SectionTitle;
  fields: (keyof ProductionItem | 'capacity' | 'investment_capex' | 'updated_at')[];
}

interface ProductionFormProps {
  initialFeature: ProductionItem | null;
  initialError: string | null;
  statusOptions: typeof STATUS_OPTIONS;
  statusTooltip: React.ReactElement;
  projectTypeOptions: typeof PRODUCER_PROJECT_TYPES_OPTIONS;
  endUseOptions: typeof PRODUCER_END_USE_OPTIONS;
  productOptions: typeof PRODUCER_PRODUCT_OPTIONS;
  technologyTypeOptions: typeof PRODUCER_TECHNOLOGY_OPTIONS;
}

const ProductionForm: React.FC<ProductionFormProps> = ({ initialFeature, initialError, statusOptions, statusTooltip, projectTypeOptions, endUseOptions, productOptions, technologyTypeOptions }) => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editLimitReached, setEditLimitReached] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [openSections, setOpenSections] = useState<Record<SectionTitle, boolean>>({
    'General Information': false,
    'Location': false,
    'Specific Information': false,
    'Contact Information': false,
  });
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [showRecaptcha, setShowRecaptcha] = useState(false);
  const [recaptchaError, setRecaptchaError] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Field order matching generatePopupHtml
  const fieldOrder: (keyof ProductionItem | 'capacity' | 'investment_capex' | 'updated_at')[] = [
    'name',
    'project_name',
    'owner',
    'project_type',
    'primary_product',
    'secondary_product',
    'country',
    'city',
    'street',
    'zip',
    'technology',
    'status',
    'date_online',
    'capacity',
    'end_use',
    'stakeholders',
    'investment_capex',
    'contact_name',
    'email',
    'website_url',
    'updated_at',
  ];

  const cleanArrayField = (data: any): string[] => {
    if (!data) return [];
    if (Array.isArray(data)) {
      return data.map((item: any) => String(item).trim()).filter(Boolean);
    }
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed.map((item: any) => String(item).trim()).filter(Boolean);
        }
        return [String(parsed).trim()].filter(Boolean);
      } catch (e) {
        return data.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }
    return [];
  };

  const formatDbDate = (date: Date) => {
    const pad = (n: number, z = 2) => ('00' + n).slice(-z);
    const year = date.getUTCFullYear();
    const month = pad(date.getUTCMonth() + 1);
    const day = pad(date.getUTCDate());
    const hour = pad(date.getUTCHours());
    const min = pad(date.getUTCMinutes());
    const sec = pad(date.getUTCSeconds());
    const ms = pad(date.getUTCMilliseconds(), 3) + '000';
    return `${year}-${month}-${day} ${hour}:${min}:${sec}.${ms}+00`;
  };

  const initialFormData: Partial<ProductionItem> & { capacity?: string; investment_capex?: string; updated_at?: string | null } = {
    id: initialFeature?.id ?? '',
    internal_id: initialFeature?.internal_id ?? id ?? '',
    name: initialFeature?.name ?? 'Placeholder Feature',
    type: initialFeature?.type ?? 'Production',
    project_name: initialFeature?.project_name ?? '',
    owner: initialFeature?.owner ?? '',
    stakeholders: cleanArrayField(initialFeature?.stakeholders),
    contact_name: initialFeature?.contact_name ?? '',
    email: initialFeature?.email ?? '',
    country: initialFeature?.country ?? '',
    zip: initialFeature?.zip ?? '',
    city: initialFeature?.city ?? '',
    street: initialFeature?.street ?? '',
    website_url: initialFeature?.website_url ?? '',
    status: initialFeature?.status ? String(initialFeature.status) : '',
    date_online: initialFeature?.date_online ?? '',
    project_type: initialFeature?.project_type ?? '',
    primary_product: initialFeature?.primary_product ?? '',
    secondary_product: initialFeature?.secondary_product ?? '',
    technology: initialFeature?.technology ?? '',
    capacity_unit: initialFeature?.capacity_unit ?? '',
    capacity_value: initialFeature?.capacity_value ?? 0,
    capacity: initialFeature?.capacity_value != null && initialFeature?.capacity_unit 
      ? `${initialFeature.capacity_value} ${initialFeature.capacity_unit}` 
      : initialFeature?.capacity_unit || '',
    end_use: cleanArrayField(initialFeature?.end_use),
    investment_capex: initialFeature?.investment_capex ?? '',
    latitude: initialFeature?.latitude ?? 0,
    longitude: initialFeature?.longitude ?? 0,
    updated_at: initialFeature?.updated_at ?? null,
  };

  const [formData, setFormData] = useState<Partial<ProductionItem> & { capacity?: string; investment_capex?: string; updated_at?: string | null }>(initialFormData);

  useEffect(() => {
    if (initialFeature) {
      console.log('Raw initial data:', initialFeature);
      console.log('Cleaned stakeholders:', cleanArrayField(initialFeature.stakeholders));
      console.log('Form stakeholders:', formData.stakeholders);
      console.log('Cleaned end_use:', cleanArrayField(initialFeature.end_use));
      console.log('Form end_use:', formData.end_use);
      console.log('ProductionForm received initialFeature prop:', JSON.stringify(initialFeature, null, 2));
      console.log('ProductionForm initialized with formData:', JSON.stringify(initialFormData, null, 2));
    }
  }, [initialFeature]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'capacity' || name === 'investment_capex') {
      const [parsedValue, ...unitParts] = value.trim().split(' ');
      const parsedUnit = unitParts.join(' ');
      const parsedNumber = parseFloat(parsedValue) || 0;
      setFormData((prev) => ({
        ...prev,
        [`${name}_value`]: name == 'capacity' ? parsedNumber : prev.capacity_value,
        [`${name}_unit`]: name == 'capacity' ? parsedUnit || prev.capacity_unit || '' : '',
        [name]: value,
        ...(name === 'investment_capex' ? { investment_capex: value } : {}),
      }));
    } else if (name === 'stakeholders') {
      const cleanedArray = value.split(',').map((v) => v.trim()).filter(Boolean);
      setFormData((prev) => ({ ...prev, [name]: cleanedArray }));
    } else {
      const parsedValue =
        ['latitude', 'longitude'].includes(name)
          ? parseFloat(value) || 0
          : value;
      setFormData((prev) => ({ ...prev, [name]: parsedValue }));
    }
  };

  const handleEndUseCheckboxChange = (value: string) => {
    if (!isEditing) return;
    const currentEndUse = Array.isArray(formData.end_use) ? formData.end_use : [];
    const updatedEndUse = currentEndUse.includes(value)
      ? currentEndUse.filter((item) => item !== value)
      : [...currentEndUse, value];
    setFormData((prev) => ({ ...prev, end_use: updatedEndUse }));
  };

  // Helper to get connected user email (from JWT or context)
  // Always get connected email from JWT token
  let connectedEmail: string | null = null;
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('geomap-auth-token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        connectedEmail = payload.email;
      } catch (e) {
        connectedEmail = null;
      }
    }
  }
  const plantId = initialFeature?.internal_id || id;

  // Check edit limit on mount
  useEffect(() => {
    async function checkEditLimit() {
      if (!connectedEmail) return;
      try {
        const res = await fetch(`/api/user-edit-limit?email=${encodeURIComponent(connectedEmail)}&sector=Production`);
        const data = await res.json();
        if (data.count >= 3) {
          setEditLimitReached(true);
        } else {
          setEditLimitReached(false);
        }
      } catch (err) {
        setEditLimitReached(false);
      }
    }
    checkEditLimit();
  }, [connectedEmail]);

  const handleEditClick = async () => {
    // Always check edit limit on click
    if (!connectedEmail) {
      setShowLimitModal(true);
      return;
    }
    try {
      const res = await fetch(`/api/user-edit-limit?email=${encodeURIComponent(connectedEmail)}&sector=Production`);
      const data = await res.json();
      if (typeof data.count === 'number' && data.count >= 3) {
        setEditLimitReached(true);
        setShowLimitModal(true);
        return;
      } else {
        setEditLimitReached(false);
      }
    } catch (err) {
      setEditLimitReached(false);
    }
    if (isEditing) {
      setFormData(prev => ({ ...prev, updated_at: formatDbDate(new Date()) }));
      (document.getElementById('production-form') as HTMLFormElement)?.requestSubmit();
      setIsEditing(false);
      setRecaptchaToken(null);
      return;
    }
    setShowRecaptcha(true);
  };

  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token);
    setRecaptchaError('');
  };

  useEffect(() => {
    const verifyToken = async () => {
      if (recaptchaToken) {
        try {
          const response = await fetch('/api/verify-recaptcha', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: recaptchaToken }),
          });

          const data = await response.json();
          if (data.success) {
            setIsEditing(true);
            setShowRecaptcha(false);
            setFormData(prev => ({ ...prev, updated_at: formatDbDate(new Date()) }));
          } else {
            setRecaptchaError('reCAPTCHA verification failed. Please try again.');
            setRecaptchaToken(null);
          }
        } catch (error) {
          console.error('reCAPTCHA verification error:', error);
          setRecaptchaError('Failed to verify reCAPTCHA. Please try again.');
          setRecaptchaToken(null);
        }
      }
    };

    verifyToken();
  }, [recaptchaToken]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const cleanStakeholdersArray = Array.isArray(formData.stakeholders)
      ? formData.stakeholders.filter(Boolean)
      : [];
    const cleanEndUseArray = Array.isArray(formData.end_use)
      ? formData.end_use.filter(Boolean)
      : [];

    const dataPayload = {
      plant_name: formData.name || null,
      project_name: formData.project_name || null,
      owner: formData.owner || null,
      stakeholders: cleanStakeholdersArray.length ? cleanStakeholdersArray : null,
      contact_name: formData.contact_name || null,
      email: formData.email || null,
      country: formData.country || null,
      zip: formData.zip || null,
      city: formData.city || null,
      street: formData.street || null,
      website_url: formData.website_url || null,
      status: {
        current_status: formData.status || null,
        date_online: formData.date_online ? String(formData.date_online).slice(0, 4) : null,
      },
      coordinates: {
          latitude: String(formData.latitude || 0),
          longitude: String(formData.longitude || 0),
      },
      project_type: formData.project_type || null,
      primary_product: formData.primary_product || null,
      secondary_product: formData.secondary_product || null,
      technology: formData.technology || null,
      capacity: {
        unit: formData.capacity_unit || null,
        value: formData.capacity_value || null,
      },
      end_use: cleanEndUseArray.length ? cleanEndUseArray : null,
      investment_capex: formData.investment_capex || null,
      updated_at: formData.updated_at || null,
    };

    try {
      const token = localStorage.getItem('geomap-auth-token');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      // Debug: extract email from JWT token
      let connectedEmail = null;
      let connectedUserName = null;
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        connectedEmail = payload.email;
        connectedUserName = payload.name || payload.email || 'User';
        console.log('Connected user email from JWT:', connectedEmail);
      } catch (jwtError) {
        console.warn('Could not extract email from JWT:', jwtError);
      }

      const response = await fetch('/api/production', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          internal_id: formData.internal_id,
          data: dataPayload,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save Production data: ${response.statusText}`);
      }

      setShowModal(true);
      try {
        console.log('Confirmation email will be sent to connected user:', connectedEmail);
        if (connectedEmail) {
          await fetch('/api/send-confirmation-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: connectedEmail,
              connectedUserName,
              plantName: formData.name || 'Unknown Plant',
            }),
          });
        } else {
          console.warn('No connected user email found, confirmation email not sent.');
        }
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
      }

      const notification = document.createElement('div');
      notification.className =
        'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-md shadow-lg animate-fade-in-out';
      notification.textContent = 'Changes saved successfully!';
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.classList.add('opacity-0', 'transition-opacity', 'duration-300');
        setTimeout(() => notification.remove(), 300);
      }, 3000);
    } catch (error) {
      console.error('Error saving Production data:', error);
      const notification = document.createElement('div');
      notification.className =
        'fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-md shadow-lg animate-fade-in-out';
      notification.textContent = 'Failed to save changes. Please try again.';
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.classList.add('opacity-0', 'transition-opacity', 'duration-300');
        setTimeout(() => notification.remove(), 300);
      }, 3000);
    }
  };

  const toggleSection = (sectionTitle: SectionTitle) => {
    setOpenSections((prev) => ({ ...prev, [sectionTitle]: !prev[sectionTitle] }));
  };

  const renderFields = () => {
    const fields: FieldConfig[] = [
      { name: 'name', label: 'Plant Name', type: 'text', placeholder: 'Enter plant name' },
      { name: 'project_name', label: 'Project Name', type: 'text', placeholder: 'Enter project name' },
      { name: 'owner', label: 'Owner', type: 'text', placeholder: 'Enter owner' },
      { name: 'project_type', label: 'Project Type', type: 'select', options: projectTypeOptions },
      { name: 'primary_product', label: 'Primary Product', type: 'select', options: productOptions },
      { name: 'secondary_product', label: 'Secondary Product', type: 'select', options: productOptions },
      { name: 'country', label: 'Country', type: 'text', placeholder: 'Country location' },
      { name: 'city', label: 'City', type: 'text', placeholder: 'City location' },
      { name: 'street', label: 'Street', type: 'text', placeholder: 'Enter street' },
      { name: 'zip', label: 'Zip Code', type: 'text', placeholder: 'Enter zip code' },
      { name: 'technology', label: 'Technology', type: 'select', options: technologyTypeOptions },
      { name: 'status', label: 'Status', type: 'select', options: statusOptions },
      { name: 'date_online', label: 'Operational Start Date', type: 'number', placeholder: 'YYYY' },
      { name: 'capacity', label: 'Capacity', type: 'text', placeholder: 'e.g. 100 MW', isCombined: true },
      { name: 'end_use', label: 'End Use', type: 'multiselect', options: endUseOptions },
      { name: 'stakeholders', label: 'Stakeholders', type: 'text', placeholder: 'Comma-separated stakeholders' },
      { name: 'investment_capex', label: 'Investment (CAPEX)', type: 'text', placeholder: 'e.g. 100 USD', isCombined: true },
      { name: 'contact_name', label: 'Contact Name', type: 'text', placeholder: 'Enter contact name' },
      { name: 'email', label: 'Email', type: 'email', placeholder: 'Enter email' },
      { name: 'website_url', label: 'Website', type: 'text', placeholder: 'Enter website URL' },
      { name: 'updated_at', label: 'Updated record', type: 'text', disabled: true },
    ];

    const sections: SectionConfig[] = [
      {
        title: 'General Information',
        fields: ['name', 'project_name', 'owner', 'stakeholders', 'project_type', 'technology', 'primary_product', 'secondary_product', 'end_use',  'website_url' ],
      },
      {
        title: 'Contact Information',
        fields: ['contact_name', 'email'],
      },
      {
        title: 'Location',
        fields: ['country', 'city', 'street', 'zip'],
      },
      {
        title: 'Specific Information',
        fields: ['status', 'date_online', 'capacity', 'investment_capex', 'updated_at'],
      },
    ];

    const [isEndUseOpen, setIsEndUseOpen] = useState<boolean>(false);
    const endUseValues = Array.isArray(formData.end_use) ? formData.end_use : [];
    const dbEndUseValues = cleanArrayField(initialFeature?.end_use).filter(
      (value) => !endUseOptions.includes(value as ProducerEndUseType)
    );
    const allEndUseOptions = [...new Set([...endUseOptions, ...dbEndUseValues])];

    return (
      <div className="space-y-4">
        {sections.map((section: SectionConfig) => (
          <div key={section.title} className="border border-gray-200 rounded-lg shadow-sm">
            <button
              type="button"
              onClick={() => toggleSection(section.title)}
              className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 text-gray-800 font-semibold rounded-t-lg hover:bg-gray-100 transition-colors duration-200"
            >
              <span>{section.title}</span>
              <svg
                className={`w-5 h-5 transform transition-transform duration-200 ${openSections[section.title] ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openSections[section.title] && (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 transition-all duration-200">
                {section.fields
                  .map((name) => fields.find((field) => field.name === name))
                  .filter((field): field is FieldConfig => !!field)
                  .map((field) => (
                    <div key={field.name} className="flex flex-col">
                      <label className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                        {field.label}
                        {field.name === 'status' && statusTooltip}
                        {isEditing && field.type === 'number' && (
                          <span className="ml-1 text-xs text-gray-500">(numeric)</span>
                        )}
                      </label>
                      {field.type === 'select' ? (
                        <select
                          name={field.name}
                          value={formData[field.name] ?? ''}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className={`w-full p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-black ${
                            isEditing ? 'bg-white hover:border-gray-400' : 'bg-gray-50 cursor-not-allowed'
                          }`}
                        >
                          <option value="">
                            {field.name === 'status' ? 'Select a status' 
                              : field.name === 'project_type' ? 'Select a project type'
                              : field.name === 'primary_product' ? 'Select primary product'
                              : field.name === 'secondary_product' ? 'Select secondary product'
                              : field.name === 'technology' ? 'Select a technology'
                              : 'Select an option'}
                          </option>
                          {field.name === 'status' && initialFeature?.status && !statusOptions.includes(initialFeature.status as StatusType) && (
                            <option value={initialFeature.status}>{initialFeature.status}</option>
                          )}
                          {field.name === 'project_type' && initialFeature?.project_type && !projectTypeOptions.includes(initialFeature.project_type as ProducerProjectTypeType) && (
                            <option value={initialFeature.project_type}>{initialFeature.project_type}</option>
                          )}
                          {field.name === 'primary_product' && initialFeature?.primary_product && !productOptions.includes(initialFeature.primary_product as ProducerProductType) && (
                            <option value={initialFeature.primary_product}>{initialFeature.primary_product}</option>
                          )}
                          {field.name === 'secondary_product' && initialFeature?.secondary_product && !productOptions.includes(initialFeature.secondary_product as ProducerProductType) && (
                            <option value={initialFeature.secondary_product}>{initialFeature.secondary_product}</option>
                          )}
                          {field.name === 'technology' && initialFeature?.technology && !technologyTypeOptions.includes(initialFeature.technology as ProducerTechnologyType) && (
                            <option value={initialFeature.technology}>{initialFeature.technology}</option>
                          )}
                          {field.options?.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : field.type === 'multiselect' ? (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => isEditing && setIsEndUseOpen(!isEndUseOpen)}
                            className={`w-full p-3 rounded-md border border-gray-300 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-black ${
                              isEditing ? 'bg-white hover:border-gray-400' : 'bg-gray-50 cursor-not-allowed'
                            }`}
                            disabled={!isEditing}
                          >
                            {Array.isArray(formData.end_use) && formData.end_use.length > 0
                              ? formData.end_use.join(', ')
                              : 'Select end use options'}
                          </button>
                          {isEndUseOpen && (
                            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                              {allEndUseOptions.map((option) => (
                                <label
                                  key={option}
                                  className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    value={option}
                                    checked={Array.isArray(formData.end_use) && formData.end_use.includes(option)}
                                    onChange={() => handleEndUseCheckboxChange(option)}
                                    disabled={!isEditing}
                                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                  {option}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <input
                          type={field.type}
                          name={field.name}
                          value={
                            field.name === 'stakeholders'
                              ? Array.isArray(formData[field.name])
                                ? (formData[field.name] as string[]).join(', ')
                                : String(formData[field.name] ?? '')
                              : field.name === 'capacity'
                              ? formData.capacity ?? ''
                              : field.name === 'investment_capex'
                              ? formData.investment_capex ?? ''
                              : field.name === 'updated_at'
                              ? formData.updated_at ?? ''
                              : String(formData[field.name] ?? '')
                          }
                          onChange={handleInputChange}
                          disabled={!isEditing || field.disabled}
                          placeholder={field.placeholder}
                          className={`w-full p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-black ${
                            isEditing && !field.disabled ? 'bg-white hover:border-gray-400' : 'bg-gray-50 cursor-not-allowed'
                          }`}
                        />
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (initialError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
        <div className="bg-white p-6 sm:p-8 rounded-lg shadow-sm max-w-lg w-full">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-blue-800 mb-2">
              Error Loading Data
            </h2>
            <p className="text-gray-600 mb-6">{initialError}</p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                Back to Map
              </button>
              <button
                type="button"
                onClick={() => router.push('/plant-list')}
                className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M3 14h18m-18-8h18m-18 12h18"
                  />
                </svg>
                Plant List
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100 font-sans">
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-sm max-w-4xl w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-blue-800">
              {formData.name || 'Production Feature Details'}
            </h2>
            <p className="text-gray-500 capitalize text-sm sm:text-base">
              Production Project
            </p>
          </div>
          <button
            type="button"
            onClick={handleEditClick}
            disabled={editLimitReached}
            className={`flex items-center px-4 py-2 rounded-md transition-all duration-200 shadow-sm hover:shadow-md ${
              isEditing
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            } ${editLimitReached ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            <svg
              className={`w-5 h-5 mr-2 transition-transform duration-200 ${isEditing ? 'rotate-45' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isEditing ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              )}
            </svg>
            {isEditing ? 'Save' : 'Edit'}
          </button>
        </div>

        {editLimitReached && (
          <div className="mb-6 p-4 bg-orange-100 border-l-4 border-orange-500 text-orange-700 rounded-md">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-orange-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">
                You can't edit, You already reached the limit of project editing.
              </p>
            </div>
          </div>
        )}

        {showRecaptcha && !isEditing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Please verify you're not a robot</h3>
              <ReCAPTCHA
                sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '6LeFz3MrAAAAAAHeQFSkH9YUVpR2XDiDxTHV9957'}
                onChange={handleRecaptchaChange}
              />
              {recaptchaError && (
                <p className="text-red-500 text-sm mt-2">{recaptchaError}</p>
              )}
              <button
                onClick={() => setShowRecaptcha(false)}
                className="mt-4 px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="mb-6 p-4 bg-blue-50 rounded-md border border-blue-100">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-blue-500 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-blue-700 text-sm">
              {isEditing
                ? 'You are now editing this project. Make your changes and click Save when done.'
                : 'Viewing project details. Click Edit to make changes.'}
            </p>
          </div>
        </div>

        <form id="production-form" onSubmit={handleSubmit}>
          {renderFields()}
          <div className="flex flex-col sm:flex-row justify-between mt-6 pt-4 border-t border-gray-200 gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                Back to Map
              </button>
              <button
                type="button"
                onClick={() => router.push('/plant-list?type=Production')}
                className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M3 14h18m-18-8h18m-18 12h18"
                  />
                </svg>
                Production Plant List
              </button>
            </div>
            {isEditing && (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setFormData(initialFormData);
                    setIsEditing(false);
                    setRecaptchaToken(null);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </form>
        <ConfirmationModal open={showModal} onClose={() => setShowModal(false)} />
        {showLimitModal && (
          <ConfirmationModal
            open={showLimitModal}
            onClose={() => setShowLimitModal(false)}
            message="You can't edit, you reached the limit of 3 edits. You can contact the support team for further info!"
          />
        )}
      </div>
    </div>
  );
};

export default ProductionForm;