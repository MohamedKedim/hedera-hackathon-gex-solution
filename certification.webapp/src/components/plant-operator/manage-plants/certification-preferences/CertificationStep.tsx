'use client';
import React, { useEffect, useState } from 'react';
import QuestionWithRadio from '../common/QuestionWithRadio';
import SelectWithTags from '../common/SelectWithTags';

interface Props {
  data: {
    selectedSchemes?: string[];
    primaryReasons?: string[];
    certificationRequirements?: string[];
    requirementText?: string;
    hasBodyCriteria?: boolean | null;
    bodyCriteriaText?: string;
    hasPreferences?: boolean | null;
    preferencesText?: string;
  };
  onChange: (updated: any) => void;
}

const CertificationStep: React.FC<Props> = ({ data, onChange }) => {
  const [localData, setLocalData] = useState(data);

  useEffect(() => {
    setLocalData(data); // Sync with parent
  }, [data]);

  const handleBlur = () => {
    onChange(localData);
  };

  const schemeOptions = [
    'CertifHy EU RFNBO Scheme',
    'CertifHy NGC Scheme',
    'TÜV Rheinland “H2.21” Standard',
    'ISCC EU',
    'ISCC PLUS',
    'ISCC CORSIA',
    'RSB',
    '2BSvs',
    'REDcert-EU',
    'SCOTTISH QUALITY FARM ASSURED COMBINABLE CROPS (SQC)',
    'Better Biomass',
    'KZR INiG system',
    'REDcert, Red Tractor Farm Assurance Combinable Crops & Sugar Beet Scheme (Red Tractor)',
    'Austrian Agricultural Certification Scheme (AACS)',
    'Bonsucro EU',
    'Round Table on Responsible Soy EU RED (RTRS EU RED)',
    'Sustainable Biomass Program (SBP)',
    'Sustainable Resources (Sure) voluntary Scheme',
    'Universal Feed Assurance Scheme (UFAS)',
    'French Low Carbon Label',
    'Guarantee of Origin (GO) for Renewable Gas',
    'German CertifHy Equivalent (H2Global Initiative)',
    'Smart Gas Grid Certification (SGGC)',
    'Carbon Trust Carbon Neutral Certification',
    'PosHYdon Certification (Hydrogen from Offshore Wind)',
    'European Energy Certificate System (EECS)',
    'Swedish Biogas & Biofuels Sustainability Certification',
    'Programme for the Endorsement of Forest Certification (PEFC)',
    'Trade Assurance Scheme for Combinable Crops (TASCC)',
    'GHG Reduction Certificate',
    'SÜD CMS 70',
    'Renewable Ammonia Certification',
    'REDcert Certification for SAF',
  ];

  const reasons = ['Regulatory Compliance', 'Market Access', 'Carbon Credits', 'Corporate Sustainability'];

  const toggleItem = (
    list: string[] = [],
    key: keyof Props['data'],
    value: string
  ) => {
    const updated = list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];

    const newData = { ...localData, [key]: updated };
    setLocalData(newData);
    onChange(newData); // immediate update for checkbox
  };

  return (
    <div className="space-y-6 bg-transparent">
      {/* Certification Schemes */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <SelectWithTags
          label="Which certification schemes are you currently considering?"
          options={schemeOptions}
          selected={localData.selectedSchemes ?? []}
          onChange={(val) => {
            const updated = { ...localData, selectedSchemes: val };
            setLocalData(updated);
            onChange(updated);
          }}
        />
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
        {/* Primary Reason */}
        <div>
          <p className="font-medium mb-2">What is your primary reason for seeking certification?</p>
          {reasons.map((reason) => (
            <label key={reason} className="block font-medium ml-8 mb-1">
              <input
                type="checkbox"
                className="mr-2 accent-blue-600"
                checked={localData.primaryReasons?.includes(reason) || false}
                onChange={() =>
                  toggleItem(localData.primaryReasons ?? [], 'primaryReasons', reason)
                }
              />
              {reason}
            </label>
          ))}
        </div>

        {/* Certification Requirement */}
        <div>
          <p className="font-medium mb-2">Do you require certification for:</p>
          {['Voluntary labeling', 'Mandatory compliance'].map((option) => (
            <label key={option} className="block font-medium ml-8 mb-1">
              <input
                type="checkbox"
                className="mr-2 accent-blue-600"
                checked={localData.certificationRequirements?.includes(option) || false}
                onChange={() =>
                  toggleItem(localData.certificationRequirements ?? [], 'certificationRequirements', option)
                }
              />
              {option}
            </label>
          ))}

          {localData.certificationRequirements?.includes('Mandatory compliance') && (
            <textarea
              placeholder="Please describe which regulations or directives you need to comply with..."
              className="ml-8 mt-2 border w-1/2 px-2 py-1 rounded-md"
              value={localData.requirementText || ''}
              onChange={(e) =>
                setLocalData((prev) => ({ ...prev, requirementText: e.target.value }))
              }
              onBlur={handleBlur}
            />
          )}
        </div>

        {/* Specific Body Criteria */}
        <QuestionWithRadio
          label="Do you have specific certification body selection criteria?"
          checked={localData.hasBodyCriteria ?? null}
          onCheck={(val) => {
            const updated = { ...localData, hasBodyCriteria: val };
            setLocalData(updated);
            onChange(updated);
          }}
        />
        {localData.hasBodyCriteria && (
          <textarea
            placeholder="Please describe your selection criteria..."
            className="ml-8 border w-1/2 px-2 py-1 rounded-md"
            value={localData.bodyCriteriaText || ''}
            onChange={(e) =>
              setLocalData((prev) => ({ ...prev, bodyCriteriaText: e.target.value }))
            }
            onBlur={handleBlur}
          />
        )}

        {/* Additional Preferences */}
        <QuestionWithRadio
          label="Do you have any additional preferences we should consider?"
          checked={localData.hasPreferences ?? null}
          onCheck={(val) => {
            const updated = { ...localData, hasPreferences: val };
            setLocalData(updated);
            onChange(updated);
          }}
        />
        {localData.hasPreferences && (
          <textarea
            placeholder="Add any specific preferences..."
            className="ml-8 border w-1/2 px-2 py-1 rounded-md"
            value={localData.preferencesText || ''}
            onChange={(e) =>
              setLocalData((prev) => ({ ...prev, preferencesText: e.target.value }))
            }
            onBlur={handleBlur}
          />
        )}
      </div>
    </div>
  );
};

export default CertificationStep;
