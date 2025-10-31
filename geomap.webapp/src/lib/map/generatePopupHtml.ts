import { ProductionItem, StorageItem, CCUSItem, PortItem, PipelineItem, CCUSReference } from '@/lib/types2';

const displayNameMap: Partial<Record<'Production' | 'Storage' | 'CCUS' | 'Port' | 'Pipeline', Record<string, string>>> = {
  Production: {
    name: 'Plant Name',
  },
};

const formatFieldName = (key: string, type: 'Production' | 'Storage' | 'CCUS' | 'Port' | 'Pipeline'): string => {
  const customName = displayNameMap[type]?.[key];
  if (customName) {
    return customName;
  }
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatValue = (value: any): string => {
  if (value === null || value === undefined || value === '') return 'N/A';
  if (Array.isArray(value)) {
    if (value.length === 0) return 'N/A';
    if (value[0] && typeof value[0] === 'object' && 'link' in value[0]) {
      return value
        .filter((ref: CCUSReference) => ref.link)
        .map((ref: CCUSReference) => ref.link)
        .join(', ');
    }
    return value.join(', ');
  }
  if (typeof value === 'object') {
    if ('unit' in value && 'value' in value) {
      return `${value.value} ${value.unit}${value.vessels ? ` (${value.vessels} vessels)` : ''}`;
    }
    if ('costs_musd' in value) {
      if (!value.costs_musd || value.costs_musd.value === null || value.costs_musd.value === undefined) {
        return '';
      }
      return `${value.costs_musd.value} ${value.costs_musd.unit || 'MUSD'}`;
    }
    if ('status' in value && 'date_online' in value) {
      const status = value.status || 'N/A';
      const date = value.date_online ? ` (${value.date_online})` : '';
      return `${status}${date}`;
    }
    return JSON.stringify(value);
  }
  return String(value);
};

interface CapacityField {
  base: string;
  valueField: string;
  unitField: string;
}

const storageCapacityFields: CapacityField[] = [
  { base: 'storage_mass_kt_per_year', valueField: 'storage_mass_kt_per_year_value', unitField: 'storage_mass_kt_per_year_unit' },
];

const productionCapacityFields: CapacityField[] = [
  { base: 'capacity', valueField: 'capacity_value', unitField: 'capacity_unit' },
  { base: 'investment_capex', valueField: 'investment_capex', unitField: '' },
];

const ccusCapacityFields: CapacityField[] = [
  { base: 'capacity', valueField: 'capacity_value', unitField: 'capacity_unit' },
  { base: 'investment_capex', valueField: 'investment_capex', unitField: '' },
];

const portCapacityFields: CapacityField[] = [
  { base: 'capacity', valueField: 'capacity_value', unitField: 'capacity_unit' },
];

const fieldOrder: Record<'Production' | 'Storage' | 'CCUS' | 'Port' | 'Pipeline', string[]> = {
  Storage: [
    'project_name',
    'project_type',
    'owner',
    'contact_name',
    'email',
    'country',
    'zip',
    'city',
    'street',
    'website_url',
    'status',
    'date_online',
    'primary_product',
    'storage_mass_kt_per_year',
  ],
  Production: [
    'name',
    'project_name',
    'country',
    'city',
    'owner',
    'project_type',
    'primary_product',
    'secondary_product',
    'technology',
    'status',
    'date_online',
    'capacity',
    'end_use',
  ],
  CCUS: [
    'name',
    'project_name',
    'country',
    'city',
    'owner',
    'project_type',
    'product',
    'technology_fate',
    'project_status',
    'operation_date',
    'capacity',
    'end_use_sector',
  ],
  Port: [
    'name',
    'project_name',
    'country',
    'city',
    'trade_type',
    'product_type',
    'status',
    'announced_size',
    'partners',
    'technology_type',
    'capacity',
  ],
  Pipeline: [
    'pipeline_name',
    'start_location',
    'stop_location',
    'infrastructure_type',
    'status',
    'pipeline_number',
    'segment_id',
    'segment_order',
    'total_segments',
  ],
};

export const generatePopupHtml = (
  props: ProductionItem | StorageItem | CCUSItem | PortItem | PipelineItem,
  type: 'Production' | 'Storage' | 'CCUS' | 'Port' | 'Pipeline'
): string => {
  const excludedFields = ['id', 'internal_id', 'latitude', 'longitude', 'stakeholders', 'data_source', 'Ref Id', 'end_use', 'investment', 'references', 'investment_capex'];
  let capacityFields: CapacityField[] = [];
  let specialEntries: [string, { value: any; unit?: any }][] = [];

  if (type === 'Storage') {
    capacityFields = storageCapacityFields;
    const storageProps = props as StorageItem;
    specialEntries = capacityFields
      .filter(field =>
        storageProps[field.valueField as keyof StorageItem] !== undefined &&
        storageProps[field.unitField as keyof StorageItem] !== undefined &&
        storageProps[field.valueField as keyof StorageItem] !== null &&
        storageProps[field.unitField as keyof StorageItem] !== null
      )
      .map(field => [
        field.base,
        {
          value: storageProps[field.valueField as keyof StorageItem],
          unit: storageProps[field.unitField as keyof StorageItem],
        }
      ]);
  } else if (type === 'Production') {
    capacityFields = productionCapacityFields;
    const productionProps = props as ProductionItem;
    specialEntries = capacityFields
      .filter(field =>
        (field.base === 'investment_capex' ?
          productionProps[field.valueField as keyof ProductionItem] !== undefined &&
          productionProps[field.valueField as keyof ProductionItem] !== null :
          productionProps[field.valueField as keyof ProductionItem] !== undefined &&
          productionProps[field.unitField as keyof ProductionItem] !== undefined &&
          productionProps[field.valueField as keyof ProductionItem] !== null &&
          productionProps[field.unitField as keyof ProductionItem] !== null)
      )
      .map(field => [
        field.base,
        {
          value: productionProps[field.valueField as keyof ProductionItem],
          unit: field.unitField ? productionProps[field.unitField as keyof ProductionItem] : undefined,
        }
      ]);
  } else if (type === 'CCUS') {
    capacityFields = ccusCapacityFields;
    const ccusProps = props as CCUSItem;
    specialEntries = capacityFields
      .filter(field =>
        (field.base === 'investment_capex' ?
          ccusProps[field.valueField as keyof CCUSItem] !== undefined &&
          ccusProps[field.valueField as keyof CCUSItem] !== null :
          ccusProps[field.valueField as keyof CCUSItem] !== undefined &&
          ccusProps[field.unitField as keyof CCUSItem] !== undefined &&
          ccusProps[field.valueField as keyof CCUSItem] !== null &&
          ccusProps[field.unitField as keyof CCUSItem] !== null)
      )
      .map(field => [
        field.base,
        {
          value: ccusProps[field.valueField as keyof CCUSItem],
          unit: field.unitField ? ccusProps[field.unitField as keyof CCUSItem] : undefined,
        }
      ]);
  } else if (type === 'Port') {
    capacityFields = portCapacityFields;
    const portProps = props as PortItem;
    specialEntries = capacityFields
      .filter(field =>
        portProps[field.valueField as keyof PortItem] !== undefined &&
        portProps[field.unitField as keyof PortItem] !== undefined &&
        portProps[field.valueField as keyof PortItem] !== null &&
        portProps[field.unitField as keyof PortItem] !== null
      )
      .map(field => [
        field.base,
        {
          value: portProps[field.valueField as keyof PortItem],
          unit: portProps[field.unitField as keyof PortItem],
        }
      ]);
  }

  const allExcludedKeys = new Set([
    ...excludedFields,
    ...capacityFields.map(field => field.valueField),
    ...capacityFields.filter(field => field.unitField).map(field => field.unitField),
  ]);

  const regularEntries: [string, any][] = Object.entries(props).filter(([key, value]) =>
    !allExcludedKeys.has(key) &&
    value !== null &&
    value !== undefined &&
    value !== '' &&
    (!Array.isArray(value) || value.length > 0)
  );

  const orderedFieldOrder = fieldOrder[type];
  const allEntries: [string, any][] = [];
  const usedKeys = new Set<string>();

  for (const key of orderedFieldOrder) {
    const specialEntry = specialEntries.find(([entryKey]) => entryKey === key);
    if (specialEntry) {
      allEntries.push(specialEntry);
      usedKeys.add(key);
      continue;
    }
    const regularEntry = regularEntries.find(([entryKey]) => entryKey === key);
    if (regularEntry) {
      const formattedValue = formatValue(regularEntry[1]);
      if (formattedValue !== '') {
        allEntries.push(regularEntry);
        usedKeys.add(key);
      }
    }
  }

  const remainingEntries = regularEntries.filter(([key, value]) => !usedKeys.has(key) && formatValue(value) !== '');
  allEntries.push(...remainingEntries);

  const popupContent = allEntries
    .map(([key, value]) => {
      return `
        <b class="font-semibold text-gray-800 text-xs">${formatFieldName(key, type)}:</b>
        <span class="text-gray-600 text-xs">${formatValue(value)}</span>
      `;
    })
    .join('<br>');

  // =========== BEGIN MODIFICATION ===========
  
  let verifyUrl = '';
  const internalId = 'internal_id' in props ? props.internal_id : null;
  let formPath = '';

  if (internalId) {
    switch (type) {
      case 'Production':
        formPath = `/plant-form/production/${internalId}`;
        break;
      case 'Storage':
        formPath = `/plant-form/storage/${internalId}`;
        break;
      case 'CCUS':
        formPath = `/plant-form/ccus/${internalId}`;
        break;
      case 'Port':
        formPath = `/port-form/${internalId}`;
        break;
    }
    // Always use geomap-redirect endpoint for authentication and token injection
    const onboardingUrl = process.env.NEXT_PUBLIC_ONBOARDING_URL || 'http://localhost:3000';
    const geomapUrl = process.env.NEXT_PUBLIC_GEOMAP_URL || 'http://localhost:3001';
    verifyUrl = `${onboardingUrl}/api/auth/geomap-redirect?redirect=${encodeURIComponent(geomapUrl + formPath)}`;
  }

  const onboardingUrl = process.env.NEXT_PUBLIC_ONBOARDING_URL || 'http://localhost:3000';
  const geomapUrl = process.env.NEXT_PUBLIC_GEOMAP_URL || 'http://localhost:3001';
  const loginUrl = `${onboardingUrl}/auth/authenticate?redirect=${encodeURIComponent(geomapUrl + formPath)}`;
  const verifyButton = verifyUrl
    ? (() => {
        // Synchronously check token before rendering button
        let isAuthenticated = false;
        try {
          const token = typeof window !== 'undefined' ? window.localStorage.getItem('geomap-auth-token') : null;
          if (token) {
            try {
              JSON.parse(atob(token.split('.')[1]));
              isAuthenticated = true;
            } catch (e) { isAuthenticated = false; }
          }
        } catch (e) { isAuthenticated = false; }
        const label = isAuthenticated ? 'Verify' : 'Login to verify';
        return `
          <button
            id="verify-btn-uniq"
            onclick="event.stopPropagation(); (function() {
              const token = localStorage.getItem('geomap-auth-token');
              if (token) {
                try {
                  JSON.parse(atob(token.split('.')[1]));
                  const tokenParam = encodeURIComponent(token);
                  const urlWithToken = '${verifyUrl}&token=' + tokenParam;
                  window.open(urlWithToken, '_blank');
                } catch (e) {
                  window.open('${loginUrl}', '_blank');
                }
              } else {
                window.open('${loginUrl}', '_blank');
              }
            })();"
            class="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 w-full"
            aria-label="Verify or Login"
          >
            <span id='verify-btn-label-uniq'>${label}</span>
          </button>
        `;
      })()
    : `
        <span class="mt-2 block text-center text-red-500 text-xs" aria-label="No ID available">
          No ID available for verification
        </span>
      `;

  // =========== END MODIFICATION ===========

  return `
    <div class="max-w-[90vw] w-64 p-2 bg-white rounded shadow border border-gray-100 font-sans text-sm">
      ${popupContent}
      ${type !== 'Pipeline' ? verifyButton : ''} 
    </div>
  `;
};