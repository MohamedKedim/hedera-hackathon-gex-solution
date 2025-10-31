'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function PlantTypeWidgetsPage() {
  const router = useRouter();

  const cards = [
    {
      title: 'Production Plants',
      image: '/plants/production-plant.png',
      color: 'bg-blue-600',
      onClick: () => router.push('/plant-list?type=Production'),
    },
    {
      title: 'Storage Plants',
      image: '/plants/storage-plant.png',
      color: 'bg-teal-600',
      onClick: () => router.push('/plant-list?type=Storage'),
    },
    {
      title: 'CCUS Plants',
      image: '/plants/ccus-plant.png',
      color: 'bg-green-600',
      onClick: () => router.push('/plant-list?type=CCUS'),
    },
    {
      title: 'Ports',
      image: '/plants/port-plant.png', // Added new image path for the port
      color: 'bg-orange-600', // Added a new color for the port widget
      onClick: () => router.push('/ports'), // Added navigation for ports
    },
    /*{
      title: 'All Plants',
      image: '/plants/all-plants.png',
      color: 'bg-purple-600',
      onClick: () => router.push('/plant-list'),
    },*/
  ];

  return (
    <div className="min-h-screen bg-gray-100 font-sans py-10 px-4 sm:px-6">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="relative w-20 h-20 mx-auto">
          <Image
            src="/gex-logo-2.png"
            alt="GEX Logo"
            fill
            className="object-contain"
            priority
          />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-blue-800 mt-5">
          Explore Hydrogen & CCUS Infrastructure
        </h1>
        <p className="text-gray-600 text-sm sm:text-base mt-2">
          Select a category to view details
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        {cards.map((card, index) => (
          <div
            key={index}
            onClick={card.onClick}
            className={`${card.color} rounded-xl text-white cursor-pointer overflow-hidden transition-transform duration-300 hover:scale-103`}
          >
            <div className="relative h-40">
              <Image
                src={card.image}
                alt={card.title}
                fill
                className="object-cover"
              />
            </div>
            <div className="p-5 text-lg sm:text-xl font-semibold text-center">
              {card.title}
            </div>
          </div>
        ))}
      </div>

      {/* Back to Map Button */}
      <button
        onClick={() => router.push('/')}
        className="fixed top-1/2 left-4 transform -translate-y-1/2 bg-blue-600/80 text-white rounded-full px-4 py-2 text-sm flex items-center gap-2 hover:bg-blue-600 transition-colors duration-300 shadow-lg z-50"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        <span>Map</span>
      </button>
    </div>
  );
}