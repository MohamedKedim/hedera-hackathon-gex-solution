import { PortItem } from '@/lib/types2';
import PortForm from '@/app/components/PortForm';
// import AuthBridge from '@/app/components/AuthBridge';
import { logger } from '@/lib/logger';
import { STATUS_OPTIONS, PORT_PROJECT_TYPES_OPTIONS, PORT_PRODUCT_OPTIONS, PORT_TECHNOLOGY_OPTIONS } from '@/lib/lookupTables';
import { ReactElement } from 'react';

interface PortFormPageProps {
  params: Promise<{ id: string }>;
}

export default async function PortFormPage({ params }: PortFormPageProps) {
  const { id } = await params;
  logger.info('PortFormPage params', { id });

  let initialFeature: PortItem | null = null;
  let initialError: string | null = null;

  try {
    const apiUrl = process.env.GEOMAP_URL || 'http://localhost:3001';
    logger.info('Fetching port data from:', { url: `${apiUrl}/api/ports` });

    const response = await fetch(`${apiUrl}/api/ports`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch port data: ${response.statusText}`);
    }

    const data = await response.json();
    logger.info('Fetched port data:', {
      portIds: data.ports?.features.map((f: { properties: PortItem }) => f.properties.internal_id) || [],
    });

    const feature = data.ports?.features.find(
      (f: { properties: PortItem }) =>
        (f.properties.internal_id || '').trim().toLowerCase() === (id || '').trim().toLowerCase()
    );

    if (!feature) {
      logger.warn(`No port found with internal_id: ${id}`);
      initialError = `Port with ID "${id}" not found. Please check the ID or try another port.`;
    } else {
      initialFeature = feature.properties;
    }
  } catch (error) {
    logger.error('Error fetching port data:', error);
    initialError = `Unable to load port data for ID "${id}". Please try again later or check the ID.`;
  }

  logger.info('PortFormPage props passed to PortForm', { initialFeature, initialError });

  const statusTooltip: ReactElement = (
    <span
      className="ml-2 text-gray-500 cursor-help"
      title="If your current status is not part of the dropdown list provided by our app, please select the most appropriate one."
    >
      <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </span>
  );

  return (
    <>
      {/* <AuthBridge /> removed, now in layout */}
      <PortForm
        initialFeature={initialFeature}
        initialError={initialError}
        statusOptions={STATUS_OPTIONS}
        statusTooltip={statusTooltip}
        projectTypeOptions={PORT_PROJECT_TYPES_OPTIONS}
        productTypeOptions={PORT_PRODUCT_OPTIONS} // Added productTypeOptions
        technologyTypeOptions={PORT_TECHNOLOGY_OPTIONS}
      />
    </>
  );
}