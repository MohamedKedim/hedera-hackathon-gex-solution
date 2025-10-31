// src/app/layout.tsx
import './globals.css';
import GexHeader from './components/GexHeader';
import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Google Tag Manager Script */}
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-HQL4MFH1R2"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-HQL4MFH1R2');
          `}
        </Script>
        
      </head>
      <body className="bg-gray-50 min-h-screen">
        <GexHeader />
        <main className="pt-0">{children}</main>
        <div id="modal-root"></div>
      </body>
    </html>
  );
}