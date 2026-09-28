import { Outfit } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-outfit',
});

export const metadata = {
  title: "Portal Sistem Antrian - Kecamatan Gandrungmangu",
  description: "Aplikasi Antrian Real-time Berbasis Cloud Kecamatan Gandrungmangu",
};

export default function AntrianLayout({ children }) {
  return (
    <div className={`antrian-system min-h-screen ${outfit.variable} ${outfit.className}`}>
      {/* Bootstrap 5 & Bootstrap Icons specifically for Antrian portal pages */}
      <link
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
        rel="stylesheet"
        integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH"
        crossOrigin="anonymous"
      />
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
      />

      {children}

      <Script
        src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
        strategy="lazyOnload"
      />
    </div>
  );
}
