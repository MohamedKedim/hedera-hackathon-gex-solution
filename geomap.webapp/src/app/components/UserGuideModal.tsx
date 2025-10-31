"use client";
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserGuideModal = ({ isOpen, onClose }: UserGuideModalProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const steps = [
    {
      title: "Search and Filter",
      description: "Use the search box and dropdown filters to find specific projects.",
      iframe: "https://drive.google.com/file/d/1lwIdzxD-kZZksxvGyevfcZmOUYdAbTx0/preview"
    },
    {
      title: "Map Navigation",
      description: "Zoom and pan the map to explore different locations.",
      iframe:"https://drive.google.com/file/d/1QxFLmXlE4lTF8TvHCuYF0JK34_1FBDLi/preview",
    },
    {
      title: "Project Details",
      description: "Click on any marker to see detailed information about a project.",
      iframe: "https://drive.google.com/file/d/1EMymcsUkrGbMNUgfy2DblZ9v_cBUV6R7/preview"
    },
    {
      title: "Legend Reference",
      description: "Use the legend to understand different status colors and icons.",
      iframe: "https://drive.google.com/file/d/1DLpYCtC4ob1KqsZ1esOEYHvWYvNYwQMk/preview"
    }
    ,
    {
      title: "Verify Plant & Update Data",
      description: "See how to verify a plant and update its data. This process is validated by our team.",
      iframe: "https://drive.google.com/file/d/1MigktX0hahEnitjDjvN7ZkXli817zNuI/preview"
    },
    {
      title: "Check Plant List by Sector",
      description: "Learn how to filter and access the plant list for each sector (CCUS, Production, etc.).",
      iframe: "https://drive.google.com/file/d/1o_Yr2qknrUasYQssnxzVK4T8sX-EOx5c/preview" 
    }
  ];

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000] bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-2xl font-bold text-blue-700">GreenEarthX Map User Guide</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Steps */}
        <div className="p-6 grid md:grid-cols-2 gap-6">
          {steps.map((step, index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-start space-x-4">
                <div className="bg-blue-100 text-blue-700 rounded-full w-8 h-8 flex items-center justify-center font-bold">
                  {index + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{step.title}</h3>
                  <p className="text-gray-600 mt-1">{step.description}</p>
                </div>
              </div>

              {/* Video / Iframe with 16:9 Responsive Wrapper */}
              <div className="mt-4">
                <div className="relative w-full pt-[56.25%] rounded-md overflow-hidden shadow-sm border">
                  {step.iframe ? (
                    <iframe
                      src={step.iframe}
                      allow="autoplay"
                      className="absolute top-0 left-0 w-full h-full rounded-md"
                      frameBorder="0"
                      allowFullScreen
                    />
                  ) : step.iframe ? (
                    <video
                      src={step.iframe}
                      controls
                      className="absolute top-0 left-0 w-full h-full rounded-md object-contain"
                    />
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors w-full md:w-auto"
          >
            Got it!
          </button>

          <div className="text-sm text-gray-600 text-center md:text-right">
            Need more help? Contact our team at{" "}
            <a href="mailto:support@greenearthx.com" className="text-blue-600 hover:underline">
              support@greenearthx.com
            </a>{" "}
            or{" "}
            <a href="https://greenearthx.com/contact" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              greenearthx.com
            </a>
          </div>
</div>

      </div>
    </div>,
    document.getElementById('modal-root') as HTMLElement
  );
};

export default UserGuideModal;
