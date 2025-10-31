import { ReactElement } from 'react';
import ProductionForm from '@/app/components/ProductionForm';
import StorageForm from '@/app/components/StorageForm';
import CCUSForm from '@/app/components/CCUSForm';
// import AuthBridge from '@/app/components/AuthBridge';
import { logger } from '@/lib/logger';
import { ProductionItem, StorageItem, CCUSItem } from '@/lib/types2';
import { STATUS_OPTIONS, PRODUCER_PROJECT_TYPES_OPTIONS, STORAGE_PROJECT_TYPES_OPTIONS, CCUS_PROJECT_TYPES_OPTIONS, PRODUCER_END_USE_OPTIONS, CCUS_END_USE_OPTIONS, PRODUCER_PRODUCT_OPTIONS, CCUS_TECHNOLOGY_OPTIONS, PRODUCER_TECHNOLOGY_OPTIONS } from '@/lib/lookupTables';
import { cache } from 'react';

// Cache the fetch to avoid redundant calls
const cachedFetch = cache(async (url: string) => {
  const response = await fetch(url, { cache: 'force-cache' }); // Use Next.js cache
  return response.json();
});

interface PlantFormPageProps {
  params: Promise<{ type: string; id: string }>;
}

export default async function PlantFormPage({ params }: PlantFormPageProps) {
  const { type, id } = await params; // Properly await params
  logger.info('PlantFormPage params', { type, id });
  const planturl = `${process.env.GEOMAP_URL || 'http://localhost:3001'}/api/plant/${type}/${id}`;
  console.log('[PlantFormPage] Fetching plant data from:', planturl);
  // Fetch data server-side with caching from map app's own API
  const { feature: initialLeafletFeature, error: initialError } = await cachedFetch(
    planturl
  );
  console.log('[PlantFormPage] Fetched feature from API:', JSON.stringify(initialLeafletFeature, null, 2));

  logger.info('PlantFormPage fetched feature', { initialLeafletFeature, initialError });

  let initialFeature: ProductionItem | StorageItem | CCUSItem | null = null;
  if (initialLeafletFeature?.geometry.type === 'Point') {
    const { properties } = initialLeafletFeature;
    const sector = type.toLowerCase();

    console.log('Fetched date_online value:', properties.date_online);

    

    const parseArrayField = (value: any): string[] => {
      if (!value) {
        return [];
      }

      // 1. Combine all elements into a single string.
      // This handles both the malformed array `["[\"Mobility\"", "\"Power\"]"]`
      // and a potential string like `"Mobility,Power"`.
      const combinedString = Array.isArray(value) ? value.join(',') : String(value);

      // 2. Aggressively remove all JSON-like characters: brackets and quotes.
      // '["Mobility","Power"]' becomes 'Mobility,Power'
      const cleanedString = combinedString.replace(/[\[\]"]/g, '');

      // 3. Split by comma and filter out any empty strings that may result.
      if (cleanedString === '') {
        return [];
      }
      
      return cleanedString.split(',').map(s => s.trim()).filter(Boolean);
    };

    if (sector === 'production' && 'primary_product' in properties) {
      initialFeature = {
        id: properties.id ?? '',
        internal_id: properties.internal_id ?? id,
        name: properties.project_name ?? 'Placeholder Feature',
        type: properties.type ?? 'Production',
        status: properties.status ?? '',
        city: properties.city ?? '',
        country: properties.country ?? '',
        zip: properties.zip ?? '',
        email: properties.email ?? '',
        owner: properties.owner ?? '',
        date_online: properties.date_online ?? '',
        street: properties.street ?? '',
        website_url: properties.website_url ?? '',
        contact_name: properties.contact_name ?? '',
        project_name: properties.project_name ?? '',
        project_type: properties.project_type ?? '',
        primary_product: properties.primary_product ?? '',
        secondary_product: properties.secondary_product ?? '',
        technology: properties.technology ?? '',
        capacity_unit: properties.capacity_unit ?? '',
        capacity_value: properties.capacity_value ?? 0,
        end_use: parseArrayField(properties.end_use),
        stakeholders: parseArrayField(properties.stakeholders),
        investment_capex: properties.investment_capex ?? '',
        latitude: properties.latitude ?? 0,
        longitude: properties.longitude ?? 0,
      } as ProductionItem;
    } else if (sector === 'storage' && 'storage_mass_kt_per_year_unit' in properties) {
      initialFeature = {
        id: properties.id ?? '',
        internal_id: properties.internal_id ?? id,
        city: properties.city ?? '',
        country: properties.country ?? '',
        zip: properties.zip ?? '',
        email: properties.email ?? '',
        owner: properties.owner ?? '',
        date_online: properties.date_online ?? '',
        status: properties.status ?? '',
        street: properties.street ?? '',
        website_url: properties.website_url ?? '',
        contact_name: properties.contact_name ?? '',
        project_name: properties.project_name ?? '',
        project_type: properties.project_type ?? '',
        primary_product: properties.primary_product ?? '',
        stakeholders: properties.stakeholders ?? [],
        storage_mass_kt_per_year_unit: properties.storage_mass_kt_per_year_unit ?? '',
        storage_mass_kt_per_year_value: properties.storage_mass_kt_per_year_value ?? 0,
        latitude: properties.latitude ?? 0,
        longitude: properties.longitude ?? 0,
        type: properties.type ?? 'Storage',
      } as StorageItem;
    } else if (sector === 'ccus' && 'technology_fate' in properties) {
      initialFeature = {
        id: properties.id ?? '',
        internal_id: properties.internal_id ?? id,
        name: properties.name ?? 'Placeholder Feature',
        type: properties.type ?? 'CCUS',
        project_status: properties.project_status ?? '',
        city: properties.city ?? '',
        country: properties.country ?? '',
        street: properties.street ?? '',
        zip: properties.zip ?? '',
        email: properties.email ?? '',
        owner: properties.owner ?? '',
        contact: properties.contact ?? '',
        website: properties.website ?? '',
        project_name: properties.project_name ?? '',
        project_type: properties.project_type ?? '',
        stakeholders: properties.stakeholders ?? [],
        product: properties.product ?? '',
        technology_fate: properties.technology_fate ?? '',
        end_use_sector: properties.end_use_sector ?? [],
        capacity_unit: properties.capacity_unit ?? '',
        capacity_value: properties.capacity_value ?? 0,
        investment_capex: properties.investment_capex ?? '',
        operation_date: properties.operation_date ?? '',
        latitude: properties.latitude ?? 0,
        longitude: properties.longitude ?? 0,
      } as CCUSItem;
    }
  }

  const statusOptions: string[] = [
    'Project initiation (Before Pre-FEED)',
    'Project Foundation- Pre-FEED',
    'FEED',
    'Pre-FID',
    'FID',
    'EPC contracted',
    'Pre-Commissioning & Commissioning',
    'Initial Production (COD)',
  ];

 const statusTooltip: ReactElement = (
  <span
  title={`If your current status is not part of this list, please select the most appropriate one.\n\n${statusOptions.join('\n')}`}
  className="
    ml-2               // Margin left
    p-1.5              // Padding around the icon
    cursor-help        // Help cursor on hover
    text-gray-400      // Icon color
    hover:text-blue-500 // Icon color on hover (blue)
    hover:bg-white     // White background color on hover
    dark:text-gray-500  // Icon color in dark mode
    dark:hover:text-blue-300 // Icon color on hover in dark mode (light blue)
    dark:hover:bg-gray-800 // Background on hover in dark mode
    rounded-full       // Makes the hover background circular
    transition-colors  // Smoothly animates the color changes
    duration-200       // Sets the speed of the animation
    relative           // For positioning the tooltip
  "
>
  <svg
    className="w-5 h-5 block" // Slightly larger icon, `block` for better alignment
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
  {/* Custom tooltip styles */}
  <div className="
    absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-2 w-max max-w-xs 
    bg-white text-gray-800 border border-blue-500 rounded-md shadow-lg 
    text-sm font-light z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200
  ">
    If your current status is not part of this list, please select the most appropriate one.
    <br />
    {statusOptions.join('\n')}
  </div>
</span>


);

  const sector = type.toLowerCase();
  if (sector === 'production') {
    return (
      <>
        {/* <AuthBridge /> removed, now in layout */}
        <ProductionForm
          initialFeature={initialFeature as ProductionItem | null}
          initialError={initialError}
          statusOptions={STATUS_OPTIONS}
          statusTooltip={statusTooltip}
          projectTypeOptions={PRODUCER_PROJECT_TYPES_OPTIONS}
          endUseOptions={PRODUCER_END_USE_OPTIONS}
          productOptions={PRODUCER_PRODUCT_OPTIONS}
          technologyTypeOptions={PRODUCER_TECHNOLOGY_OPTIONS}
        />
      </>
    );
  } else if (sector === 'storage') {
    return (
      <>
        {/* <AuthBridge /> removed, now in layout */}
        <StorageForm
          initialFeature={initialFeature as StorageItem | null}
          initialError={initialError}
          statusOptions={STATUS_OPTIONS}
          statusTooltip={statusTooltip}
          projectTypeOptions={STORAGE_PROJECT_TYPES_OPTIONS}
        />
      </>
    );
  } else if (sector === 'ccus') {
    return (
      <>
        {/* <AuthBridge /> removed, now in layout */}
        <CCUSForm
          initialFeature={initialFeature as CCUSItem | null}
          initialError={initialError}
          statusOptions={STATUS_OPTIONS}
          statusTooltip={statusTooltip}
          projectTypeOptions={CCUS_PROJECT_TYPES_OPTIONS}
          endUseSectorOptions={CCUS_END_USE_OPTIONS}
          technologyTypeOptions={CCUS_TECHNOLOGY_OPTIONS}
        />
      </>
    );
  }

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
            Invalid Project Type
          </h2>
          <p className="text-gray-600 mb-6">The specified project type is not recognized.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={() => window.location.href = '/'}
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
              onClick={() => window.location.href = '/plant-list'}
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