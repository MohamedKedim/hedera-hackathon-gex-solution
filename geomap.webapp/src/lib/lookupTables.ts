export const STATUS_OPTIONS = [
  "Project initiation (Before Pre-FEED)",
  "Project Foundation- Pre-FEED",
  "FEED",
  "Pre-FID",
  "FID",
  "EPC contracted",
  "Pre-Commissioning & Commissioning",
  "Initial Production (COD)",
] as const;
export type StatusType = typeof STATUS_OPTIONS[number];

export const PRODUCER_PROJECT_TYPES_OPTIONS = [
  "Hydrogen",
  "Ammonia",
  "Methanol",
  "SAF",
  "Biofuel",
  "e-NG",
  "e-fuel"
] as const;
export type ProducerProjectTypeType = typeof PRODUCER_PROJECT_TYPES_OPTIONS[number];

export const STORAGE_PROJECT_TYPES_OPTIONS = [
  "Underground Storage",
  "Above-Ground Gaseous Storage",
  "Solid-State Storage",
  "Chemical Storage",
] as const;
export type StorageProjectTypeType = typeof STORAGE_PROJECT_TYPES_OPTIONS[number];

export const CCUS_PROJECT_TYPES_OPTIONS = [
  "Full chain",
  "Capture",
  "Transport",
  "Storage",
  "T&S",
  "CCU"
] as const;
export type CCUSProjectTypeType = typeof CCUS_PROJECT_TYPES_OPTIONS[number];

export const PORT_PROJECT_TYPES_OPTIONS = [
  "Freeports or special economic zones",
  "Multi-modal logistics zones at majors ports",
  "Others",
  "LNG terminals",
  "Hydrogen import export ports",
  "Ammonia export/import ports",
  "Methanol export/import ports",
  "Water Hubs",
  "Airports",
  "Rail yards / Inland container depots"
] as const;
export type PortProjectTypeType = typeof PORT_PROJECT_TYPES_OPTIONS[number];


export const PRODUCER_END_USE_OPTIONS = [
  "Ammonia",
  "Biofuels", 
  "CH4 grid injection",
  "CH4 mobility",
  "CHP",
  "Domestic heat",
  "Grid injection",
  "Iron&Steel",
  "Methanol",
  "Mobility",
  "Other Industrial",
  "Power",
  "Refining",
  "Synfuels"
] as const;
export type ProducerEndUseType = typeof PRODUCER_END_USE_OPTIONS[number];

export const CCUS_END_USE_OPTIONS = [
  "Biofuels",
  "Cement",
  "Chemicals",
  "DAC",
  "Hydrogen or ammonia",
  "Iron and steel",
  "Natural gas processing/LNG",
  "Other fuel transformation",
  "Other industry",
  "Power and heat",
  "Storage",
  "Transport",
  "T&S"
] as const;
export type CCUSEndUseType = typeof CCUS_END_USE_OPTIONS[number];


export const PRODUCER_PRODUCT_OPTIONS = [
  "Ammonia",
  "Hydrogen",
  "LOHC",
  "Methane",
  "Methanol",
  "Synfuels",
  "Various",
  "e-NG",
  "Biofuel",
  "SAF"
] as const;
export type ProducerProductType = typeof PRODUCER_PRODUCT_OPTIONS[number];

export const PORT_PRODUCT_OPTIONS = [
  "Ammonia",
  "Hydrogen",
  "LH2",
  "LOHC",
  "Methane",
  "Methanol",
  "Synfuels",
  "Various"
] as const;
export type PortProductType = typeof PORT_PRODUCT_OPTIONS[number];

export const PRODUCER_TECHNOLOGY_OPTIONS = [
  "ALK",
  "PEM",
  "SOEC",
  "Other Electrolysis",
  "NG w CCUS",
  "Coal w CCUS",
  "Oil w CCUS",
  "Biomass",
  "Biomass w CCUS",
  "Other",
  "Hysata tech",
  "AEM"
] as const;
export type ProducerTechnologyType = typeof PRODUCER_TECHNOLOGY_OPTIONS[number];

export const STORAGE_TECHNOLOGY_OPTIONS = [
  "Aquifer",
  "Depleted gas",
  "Salt caverns",
  "Hard rock cavern"
] as const;
export type StorageTechnologyType = typeof STORAGE_TECHNOLOGY_OPTIONS[number];

export const CCUS_TECHNOLOGY_OPTIONS = [
  "Dedicated storage",
  "EOR",
  "Use",
  "Vented",
  "Unknown/unspecified"
] as const;
export type CCUSTechnologyType = typeof CCUS_TECHNOLOGY_OPTIONS[number];

export const PORT_TECHNOLOGY_OPTIONS = [
  "Undefined",
  "LOHC Hydrogenation",
  "Regasification",
  "Liquefaction",
  "Compressed Ship",
  "CH2 Storage"
] as const;
export type PortTechnologyType = typeof PORT_TECHNOLOGY_OPTIONS[number];