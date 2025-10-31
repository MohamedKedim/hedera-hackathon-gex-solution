"use client";
import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import UserGuideModal from './UserGuideModal';
import ContactUsModal from './ContactUsModal';
import { MailIcon, BookIcon, UserIcon, LogInIcon, ChevronRightIcon, ChevronLeftIcon, LogOutIcon } from 'lucide-react';

const AuthBridge = dynamic(() => import('./AuthBridge'), { ssr: false });

export default function GexHeader() {
  const [showContactModal, setShowContactModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showUserGuideModal, setShowUserGuideModal] = useState(false);
  const [showUserSubMenu, setShowUserSubMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const authBridgeRef = useRef<{ handleLogin: () => void; handleLogout: () => void }>(null);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
        setShowUserSubMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = (event: React.MouseEvent) => {
    event.stopPropagation();
    setMenuOpen((prev) => {
      if (!prev) setShowUserSubMenu(false);
      return !prev;
    });
  };

  const toggleUserSubMenu = (event: React.MouseEvent) => {
    event.stopPropagation();
    setShowUserSubMenu(true);
  };

  const returnToMainMenu = (event: React.MouseEvent) => {
    event.stopPropagation();
    setShowUserSubMenu(false);
  };

  const handleAuthChange = (authStatus: boolean, userData: any) => {
    setIsAuthenticated(authStatus);
    setUser(userData);
  };

  return (
    <header className="w-full px-4 py-3 bg-white shadow-md border-b border-gray-100/50 z-[1000]">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link href="/">
            <Image src="/gex-logo.png" alt="GEX Logo" width={40} height={40} className="h-10 w-10 object-contain" />
          </Link>
          <Link href="/">
            <span className="text-lg font-bold text-[#006cb5] tracking-tight sm:text-xl">GreenEarthX Map</span>
          </Link>
        </div>
        <div>
          <button
            ref={buttonRef}
            onClick={toggleMenu}
            className="p-2 rounded text-gray-700 hover:bg-gray-100 focus:outline-none transition-colors"
            aria-label="Toggle menu"
          >
            <i className={`fa ${menuOpen ? 'fa-times' : 'fa-bars'} text-xl`} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute top-16 right-4 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 transform transition-all duration-300 ease-in-out origin-top-right scale-y-0 opacity-0 max-h-[calc(100vh-80px)] overflow-y-auto z-[1100] md:w-72 data-[open=true]:scale-y-100 data-[open=true]:opacity-100"
          data-open={menuOpen}
        >
          <div className="flex flex-col items-start gap-2 p-4">
            {showUserSubMenu ? (
              <>
                <button
                  onClick={returnToMainMenu}
                  className="w-full text-left text-gray-600 hover:text-blue-700 hover:bg-gray-50 transition-colors flex items-center gap-2 py-2 px-3 rounded-md"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">Back</span>
                </button>

                <div className="text-sm text-gray-600 px-3 py-2">{user?.email || 'No email'}</div>

                {/* Logout in RED */}
                <button
                  onClick={() => {
                    authBridgeRef.current?.handleLogout();
                    setMenuOpen(false);
                    setShowUserSubMenu(false);
                  }}
                  className="w-full bg-red-600 text-white px-4 py-2 rounded-full shadow-md flex items-center justify-center gap-2 text-sm hover:bg-red-700 transition-colors"
                >
                  <LogOutIcon className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                {/* User / Sign In item (simple like others) */}
                <button
                  onClick={isAuthenticated ? toggleUserSubMenu : () => authBridgeRef.current?.handleLogin()}
                  className="w-full text-left text-gray-600 hover:text-blue-700 hover:bg-gray-50 transition-colors flex items-center justify-between gap-2 py-2 px-3 rounded-md"
                >
                  <div className="flex items-center gap-2">
                    {isAuthenticated ? (
                      <>
                        <UserIcon className="h-5 w-5" />
                        <span className="text-sm font-medium">
                          Welcome, {user?.name || user?.email || 'User'}
                        </span>
                      </>
                    ) : (
                      <>
                        <LogInIcon className="h-5 w-5" />
                        <span className="text-sm font-medium">Sign In</span>
                      </>
                    )}
                  </div>
                  {isAuthenticated && <ChevronRightIcon className="h-5 w-5" />}
                </button>

                {/* User Guide */}
                <button
                  onClick={() => {
                    setShowUserGuideModal(true);
                    setMenuOpen(false);
                    setShowUserSubMenu(false);
                  }}
                  className="w-full text-left text-gray-600 hover:text-blue-700 hover:bg-gray-50 transition-colors flex items-center gap-2 py-2 px-3 rounded-md"
                >
                  <BookIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">User Guide</span>
                </button>

                {/* Contact Us */}
                <button
                  onClick={() => {
                    setShowContactModal(true);
                    setMenuOpen(false);
                    setShowUserSubMenu(false);
                  }}
                  className="w-full text-left text-gray-600 hover:text-blue-700 hover:bg-gray-50 transition-colors flex items-center gap-2 py-2 px-3 rounded-md"
                >
                  <MailIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">Contact Us</span>
                </button>

                {/* Access Database (kept blue since it’s a CTA) */}
                <button
                  onClick={() => {
                    window.location.href = '/plant-widget';
                    setMenuOpen(false);
                    setShowUserSubMenu(false);
                  }}
                  className="w-full bg-blue-600/80 text-white px-4 py-2 rounded-full shadow-md flex items-center justify-center gap-2 text-sm hover:bg-blue-600 transition-colors"
                >
                  <span>Access Database</span>
                  <i className="fa fa-arrow-right" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <ContactUsModal isOpen={showContactModal} onClose={() => setShowContactModal(false)} />
      <UserGuideModal isOpen={showUserGuideModal} onClose={() => setShowUserGuideModal(false)} />
      <AuthBridge onAuthChange={handleAuthChange} ref={authBridgeRef} />
    </header>
  );
}
