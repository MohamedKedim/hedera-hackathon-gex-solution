export interface ProductionItem {
  id: string;
  internal_id: string | null;
  name: string | null;
  city: string | null;
  country: string | null;
  zip: string | null;
  email: string | null;
  owner: string | null;
  date_online: string | null;
  status: string | null;
  street: string | null;
  website_url: string | null;
  contact_name: string | null;
  project_name: string | null;
  project_type: string | null;
  primary_product: string | null;
  secondary_product: string | null;
  technology: string | null;
  capacity_unit: string | null;
  capacity_value: number | null;
  end_use: string[] | null;
  stakeholders: string[] | null;
  investment_capex: string | null;
  latitude: number | null;
  longitude: number | null;
  type: string;
  project_status: string | null;
  operation_date: string | null;
  updated_at?: string | null;
}

export interface StorageItem {
  id: string;
  internal_id: string | null;
  city: string | null;
  country: string | null;
  zip: string | null;
  email: string | null;
  owner: string | null;
  date_online: string | null;
  status: string | null;
  street: string | null;
  website_url: string | null;
  contact_name: string | null;
  project_name: string | null;
  project_type: string | null;
  primary_product: string | null;
  secondary_product: string | null;
  capacity_unit: string | null;
  capacity_value: number | null;
  stakeholders: string[] | null;
  storage_mass_kt_per_year_unit: string | null;
  storage_mass_kt_per_year_value: number | null;
  latitude: number | null;
  longitude: number | null;
  type: string;
  technology: string | null;
  end_use: string | null;
  investment_capex: string | null;
  project_status: string | null;
  operation_date: string | null;
  updated_at?: string | null;
}

export interface CCUSReference {
  ref: string | null;
  link: string | null;
}

export interface CCUSItem {
  id: string;
  internal_id: string | null;
  name: string | null;
  city: string | null;
  country: string | null;
  street: string | null;
  zip: string | null;
  email: string | null;
  owner: string | null;
  contact: string | null;
  website: string | null;
  project_name: string | null;
  project_type: string | null;
  stakeholders: string | null;
  project_status: string | null;
  operation_date: string | null;
  product: string | null;
  technology_fate: string | null;
  end_use_sector: string | null;
  capacity_unit: string | null;
  capacity_value: number | null;
  investment_capex: string | null;
  references: CCUSReference[] | null;
  latitude: number | null;
  longitude: number | null;
  type: string;
  updated_at?: string | null;
}

// In lib/types2.ts
export interface PortItem {
  id: number;
  internal_id: string | null;
  line_number: number | null;
  ref_id: string | null;
  name: string;
  project_name: string | null;
  project_type: string | null;
  city: string | null;
  street: string | null;
  zip: string | null;
  country: string | null;
  email: string | null;
  contact_name: string | null;
  website_url: string | null;
  owner: string | null;
  stakeholders: string | null;
  port_code: string | null;
  trade_type: string | null;
  partners: string | null;
  investment: string | null;
  status: string | null;
  latitude: number;
  longitude: number;
  type: string;
  product_type: string | null;
  technology_type: string | null;
  capacity_value: number | null;
  capacity_unit: string | null;
  storage_capacity_value: number | null;
  storage_capacity_unit: string | null;
  updated_at?: string | null;
}

export interface PipelineItem {
  id: string;
  pipeline_name: string | null;
  start_location: string | null;
  stop_location: string | null;
  segment_id: string | null;
  segment_order: number | null;
  pipeline_number: string | null;
  infrastructure_type: string | null;
  total_segments: number | null;
  status: string | null;
  type: string;
  project_name: string | null;
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: {
    type: 'Feature';
    geometry: {
      type: 'Point' | 'LineString';
      coordinates: [number, number] | [number, number][];
    };
    properties: ProductionItem | StorageItem | CCUSItem | PortItem | PipelineItem;
  }[];
}

export interface LeafletFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: ProductionItem;
}

export interface PlantFormFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: Partial<ProductionItem>;
}