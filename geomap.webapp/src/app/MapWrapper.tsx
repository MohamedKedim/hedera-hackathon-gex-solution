'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { CSSProperties } from 'react';
import UserGuideModal from './components/UserGuideModal';
import { GeoJSONFeatureCollection } from '@/lib/types2';

interface Disclaimer {
  content: string[];
}

interface StatusesResponse {
  statuses: { sector: string; current_status: string }[];
}

const LeafletMap = dynamic(() => import('./components/LeafletMap'), {
  ssr: false,
  loading: () => null,
});

const fetchDisclaimerData = async (): Promise<Disclaimer> => {
  const response = await fetch('https://api.example.com/disclaimer');
  if (!response.ok) {
    throw new Error('Failed to fetch disclaimer');
  }
  return response.json();
};

export default function MapWrapper() {
  const [isClient, setIsClient] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [isMapComponentLoaded, setIsMapComponentLoaded] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('gex_disclaimer_accepted');
    }
    return true;
  });
  const [showWelcomeModal, setShowWelcomeModal] = useState(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('gex_welcome_seen');
    }
    return false;
  });
  const [showUserGuideModal, setShowUserGuideModal] = useState(false);
  const [disclaimerData, setDisclaimerData] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mapData, setMapData] = useState<{
    combinedData: GeoJSONFeatureCollection['features'];
    productionData: GeoJSONFeatureCollection;
    storageData: GeoJSONFeatureCollection;
    ccusData: GeoJSONFeatureCollection;
    portsData: GeoJSONFeatureCollection;
    pipelineData: GeoJSONFeatureCollection;
    statusData: StatusesResponse;
  } | null>(null);

  const [loadStartTime, setLoadStartTime] = useState<number | null>(null);
  const [fetchStartTime, setFetchStartTime] = useState<number | null>(null);

  useEffect(() => {
    setIsClient(true);
    setLoadStartTime(Date.now());
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  useEffect(() => {
    import('./components/LeafletMap').then(() => {
      setIsMapComponentLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (showMap && isMapComponentLoaded && loadStartTime !== null) {
      const loadEndTime = Date.now();
      const loadDuration = (loadEndTime - loadStartTime) / 1000;
      console.log(`Map loaded in ${loadDuration.toFixed(2)} seconds`);
      setLoadStartTime(null);
    }
  }, [showMap, isMapComponentLoaded, loadStartTime]);

 useEffect(() => {
  const initializeData = async () => {
    try {
      if (showDisclaimer) {
        const disclaimer = await fetchDisclaimerData();
        setDisclaimerData(disclaimer.content);
      } else {
        setFetchStartTime(Date.now());
        // 1. Ports
        const portsResponse = await fetch('/api/ports-copy');
        const portsData: GeoJSONFeatureCollection = await portsResponse.json();
        // 2. Pipelines
        const pipelineResponse = await fetch('/api/pipelines');
        const pipelineData: { pipelines: GeoJSONFeatureCollection } = await pipelineResponse.json();
        
        const initialData: {
          combinedData: GeoJSONFeatureCollection['features'];
          productionData: GeoJSONFeatureCollection;
          storageData: GeoJSONFeatureCollection;
          ccusData: GeoJSONFeatureCollection;
          portsData: GeoJSONFeatureCollection;
          pipelineData: GeoJSONFeatureCollection;
          statusData: StatusesResponse;
        } = {
          combinedData: [
            ...(portsData.features || []),
            ...(pipelineData.pipelines.features || []),
          ].filter(f => f.geometry?.coordinates),
          productionData: { type: 'FeatureCollection', features: [] },
          storageData: { type: 'FeatureCollection', features: [] },
          ccusData: { type: 'FeatureCollection', features: [] },
          portsData,
          pipelineData: pipelineData.pipelines,
          statusData: { statuses: [] },
        };
        
        setMapData(initialData);
        if (isMapComponentLoaded) {
          setShowMap(true);
          if (!localStorage.getItem('gex_welcome_seen')) {
            localStorage.setItem('gex_welcome_seen', 'true');
            setShowWelcomeModal(true);
          }
        }

          // 3. Production
          const productionResponse = await fetch('/api/production');
          const productionData: GeoJSONFeatureCollection = await productionResponse.json();
          setMapData(prev => ({
            ...prev!,
            combinedData: [
              ...(prev?.portsData.features || []),
              ...(prev?.pipelineData.features || []),
              ...(productionData.features || []),
            ].filter(f => f.geometry?.coordinates),
            productionData,
          }));

          // 4. CCUS
          const ccusResponse = await fetch('/api/ccus');
          const ccusData: GeoJSONFeatureCollection = await ccusResponse.json();
          setMapData(prev => ({
            ...prev!,
            combinedData: [
              ...(prev?.portsData.features || []),
              ...(prev?.pipelineData.features || []),
              ...(prev?.productionData.features || []),
              ...(ccusData.features || []),
            ].filter(f => f.geometry?.coordinates),
            ccusData,
          }));

          // 5. Storage + Statuses
          const [storageResponse, statusResponse] = await Promise.all([
            fetch('/api/storage'),
            fetch('/api/statuses'),
          ]);
          const storageData: GeoJSONFeatureCollection = await storageResponse.json();
          const statusData: StatusesResponse = await statusResponse.json();
          setMapData(prev => {
            const finalData = {
              ...prev!,
              combinedData: [
                ...(prev?.portsData.features || []),
                ...(prev?.pipelineData.features || []),
                ...(prev?.productionData.features || []),
                ...(prev?.ccusData.features || []),
                ...(storageData.features || []),
              ].filter(f => f.geometry?.coordinates),
              storageData,
              statusData,
            };

            if (fetchStartTime !== null) {
              const fetchEndTime = Date.now();
              const fetchDuration = (fetchEndTime - fetchStartTime) / 1000;
              console.log(`fetchMapData completed in ${fetchDuration.toFixed(2)} seconds`);
              setFetchStartTime(null);
            }
            return finalData;
          });
        }
      } catch (err) {
        setError('Failed to load data. Using default content.');
        if (showDisclaimer) {
          setDisclaimerData([
            'You are using a Beta version of GreenEarthX, intended for early access, testing, and feedback.',
            'The platform is under development and may include bugs, incomplete features, or performance issues.',
            'Do not upload sensitive, confidential, or personal information; data security cannot be guaranteed at this stage.',
            'GreenEarthX assumes no liability for data loss or unauthorized access during Beta usage.',
            'Updates and improvements will be communicated ahead of the full release.',
            'Thank you for helping us improve GreenEarthX.',
          ]);
        } else if (isMapComponentLoaded) {
          setShowMap(true);
        }
      }
    };
    initializeData();
  }, [showDisclaimer, isMapComponentLoaded]);

  const handleAcceptDisclaimer = () => {
    localStorage.setItem('gex_disclaimer_accepted', 'true');
    setShowDisclaimer(false);
  };

  const emptyGeoJSON: GeoJSONFeatureCollection = {
    type: 'FeatureCollection',
    features: [],
  };

  if (!isClient) return null;

  if (showDisclaimer) {
    return (
      <DisclaimerScreen
        onAccept={handleAcceptDisclaimer}
        content={disclaimerData || []}
      />
    );
  }

  if (!showMap || !isMapComponentLoaded) return <LoadingScreen />;

  return (
    <>
      <LeafletMap
        combinedData={mapData?.combinedData || []}
        productionData={mapData?.productionData || emptyGeoJSON}
        storageData={mapData?.storageData || emptyGeoJSON}
        ccusData={mapData?.ccusData || emptyGeoJSON}
        portsData={mapData?.portsData || emptyGeoJSON}
        pipelineData={mapData?.pipelineData || emptyGeoJSON} 
        statusData={mapData?.statusData || { statuses: [] }}
      />
      {showWelcomeModal && (
        <WelcomeModal
          onClose={() => setShowWelcomeModal(false)}
          onOpenGuide={() => setShowUserGuideModal(true)}
        />
      )}
      <UserGuideModal
        isOpen={showUserGuideModal}
        onClose={() => setShowUserGuideModal(false)}
      />
    </>
  );
}


function DisclaimerScreen({
  onAccept,
  content,
}: {
  onAccept: () => void;
  content: string[];
}) {
  return (
    <div style={disclaimerStyles.container} role="dialog" aria-labelledby="disclaimer-title">
      <div style={disclaimerStyles.content}>
        <Image
          src="/gex-logo.png"
          alt="GEX Logo"
          width={160}
          height={140}
          style={disclaimerStyles.logo}
        />
        <h1 id="disclaimer-title" style={disclaimerStyles.title}>
          <span style={disclaimerStyles.gex}>GEX</span> Map - Beta Version
        </h1>
        <div style={disclaimerStyles.disclaimerBox}>
          <div style={disclaimerStyles.warningIcon}>⚠️</div>
          <h2 style={disclaimerStyles.disclaimerTitle}>Beta Version Disclaimer</h2>
          {content.length > 0 ? (
            content.map((item, index) => (
              <p key={index} style={disclaimerStyles.disclaimerText}>
                • {item}
              </p>
            ))
          ) : (
            <p style={disclaimerStyles.disclaimerText}>Loading disclaimer...</p>
          )}
        </div>
        <button style={disclaimerStyles.acceptButton} onClick={onAccept}>
          I Understand and Accept
        </button>
      </div>
    </div>
  );
}

function LoadingScreen() {
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes animMarker {
        0% { transform: rotate(45deg) translate(5px, 5px); }
        100% { transform: rotate(45deg) translate(-5px, -5px); }
      }
      @keyframes animShadow {
        0% { transform: scale(0.5); }
        100% { transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <Image src="/gex-logo.png" alt="GEX Logo" width={60} height={96} />
        <h1 style={styles.title}>
          Welcome to <span style={styles.gex}>GEX</span> Map
        </h1>
        <p style={styles.subTitle}>We’re setting things up for you ...</p>
        <div style={styles.loaderWrapper}>
          <div style={styles.loader}>
            <div style={styles.loaderAfter}></div>
            <div style={styles.loaderBefore}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WelcomeModal({
  onClose,
  onOpenGuide,
}: {
  onClose: () => void;
  onOpenGuide: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-[90%] text-center">
        <h2 className="text-xl font-semibold text-[#006CB5] mb-3">Welcome to GEX Map 🎉</h2>
        <p className="text-gray-600 mb-4 text-sm leading-relaxed">
          You can explore environmental projects, interact with the map, and discover insights.
          For more details on how to use the map effectively, check out the{" "}
          <span
            className="font-semibold text-[#006CB5] cursor-pointer"
            onClick={onOpenGuide}
          >
            User Guide
          </span>{" "}
          in the menu.
        </p>
        <button
          onClick={onClose}
          className="bg-[#006CB5] text-white px-5 py-2 rounded-full shadow hover:bg-[#005b94] transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

const styles: { [key: string]: CSSProperties } = {
  container: {
    height: '100vh',
    width: '100vw',
    background: 'linear-gradient(to bottom right, #e0f7fa, #e8f5e9)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: 'Segoe UI, sans-serif',
  },
  content: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    textAlign: 'center' as const,
  },
  logo: { marginBottom: 15 },
  title: { fontSize: '18px', color: '#003B70', fontWeight: 600, marginBottom: '16px' },
  subTitle: {
    marginTop: '4px',
    marginBottom: '20px',
    fontSize: '14px',
    color: '#555',
    fontWeight: 400,
    textAlign: 'center',
  },
  loaderWrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loader: {
    width: 48,
    height: 48,
    position: 'relative' as const,
    display: 'block',
    margin: '0 auto',
    boxSizing: 'border-box' as const,
  },
  loaderAfter: {
    width: 48,
    height: 48,
    position: 'absolute' as const,
    left: 0,
    bottom: 0,
    borderRadius: '50% 50% 0',
    border: '15px solid #006CB5',
    transform: 'rotate(45deg)',
    animation: 'animMarker 0.4s ease-in-out infinite alternate',
    boxSizing: 'border-box' as const,
  },
  loaderBefore: {
    width: 24,
    height: 4,
    position: 'absolute' as const,
    left: 0,
    right: 0,
    top: '150%',
    margin: 'auto',
    borderRadius: '50%',
    background: 'rgba(0, 0, 0, 0.2)',
    animation: 'animShadow 0.4s ease-in-out infinite alternate',
    boxSizing: 'border-box' as const,
  },
};

const disclaimerStyles: { [key: string]: CSSProperties } = {
  container: {
    height: '100vh',
    width: '100vw',
    background: 'linear-gradient(to bottom right, #e0f7fa, #e8f5e9)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    fontFamily: 'Segoe UI, sans-serif',
    padding: '10px',
    boxSizing: 'border-box' as const,
    overflowY: 'auto' as const,
    animation: 'fadeIn 0.6s ease-in',
  },
  content: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px 32px',
    boxShadow: '0 6px 18px rgba(0, 0, 0, 0.12)',
    textAlign: 'center' as const,
    maxWidth: '900px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto' as const,
  },
  logo: { marginBottom: '10px', width: '100px', height: '60px' },
  title: { fontSize: '18px', color: '#003B70', fontWeight: 700, marginBottom: '14px' },
  gex: { color: '#006CB5' },
  disclaimerBox: {
    textAlign: 'left' as const,
    backgroundColor: '#fdfdfd',
    padding: '20px',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    marginBottom: '20px',
    maxHeight: '50vh',
    overflowY: 'auto' as const,
  },
  warningIcon: { fontSize: '20px', color: '#f44336', marginBottom: '10px', textAlign: 'center' as const },
  disclaimerTitle: { fontSize: '18px', fontWeight: 600, color: '#d32f2f', textAlign: 'center' as const, marginBottom: '15px' },
  disclaimerText: { fontSize: '14px', color: '#333', marginBottom: '10px', lineHeight: '1.6' },
  acceptButton: {
    backgroundColor: '#006CB5',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};