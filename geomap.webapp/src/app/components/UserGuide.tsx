// components/UserGuide.tsx
"use client";
import React, { useState } from 'react';
import UserGuideModal from './UserGuideModal';

const UserGuide = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 text-gray-600 hover:text-blue-700 transition-colors"
        title="User Guide"
      >
        {/* Beautiful Open Book Icon (Heroicons) */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20l-4-2-4 2V6a2 2 0 012-2h4v14zm0 0l4-2 4 2V6a2 2 0 00-2-2h-4v14z" />
        </svg>
      </button>

      <UserGuideModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export default UserGuide;
