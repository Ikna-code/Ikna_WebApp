'use client';

import React from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#fffaf7] text-gray-800">
      
<Header />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 md:py-16">
        
        {/* Page Header */}
        <header className="mb-12 border-b border-gray-200 pb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">
            Privacy Policy
          </h1>

          <div className="text-sm text-gray-500 tracking-wide uppercase">
            Effective Date: May 19, 2026
          </div>
        </header>

        {/* Intro */}
        <p className="text-gray-700 leading-8 text-lg mb-12">
          Welcome to IKNA. Your privacy is important to us. This Privacy Policy
          explains how IKNA collects, uses, stores, and protects your personal
          information when you use our website and purchase our products. By
          using our website, you agree to the practices described in this
          Privacy Policy.
        </p>

        {/* Section 1 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-5 text-black">
            1. Information We Collect
          </h2>

          <p className="mb-4 text-gray-700 leading-7">
            We may collect the following information when you visit or place an
            order on our website:
          </p>

          <ul className="space-y-3 list-disc pl-6 text-gray-700 leading-7">
            <li>Full name</li>
            <li>Email address</li>
            <li>Phone number</li>
            <li>Billing and shipping address</li>
            <li>Payment information</li>
            <li>Order details and purchase history</li>
            <li>Device information, IP address, and browser type</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-5 text-black">
            2. How We Use Your Information
          </h2>

          <p className="mb-4 text-gray-700 leading-7">
            IKNA uses your information to:
          </p>

          <ul className="space-y-3 list-disc pl-6 text-gray-700 leading-7">
            <li>Process and deliver your orders</li>
            <li>Provide customer support</li>
            <li>Send order confirmations and shipping updates</li>
            <li>Improve website performance and user experience</li>
            <li>Prevent fraudulent transactions</li>
            <li>
              Send promotional emails or offers (only if subscribed)
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-5 text-black">
            3. Payment Security
          </h2>

          <p className="text-gray-700 leading-7">
            All payments are processed through secure third-party payment
            gateways. IKNA does not store your card or banking information on
            our servers.
          </p>
        </section>

        {/* Section 4 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-5 text-black">
            4. Sharing of Information
          </h2>

          <p className="mb-4 text-gray-700 leading-7">
            We do not sell, rent, or trade your personal information.
            Information may only be shared with:
          </p>

          <ul className="space-y-3 list-disc pl-6 text-gray-700 leading-7">
            <li>Payment gateway providers</li>
            <li>Shipping and logistics partners</li>
            <li>Legal authorities when required by law</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-5 text-black">
            5. Cookies & Tracking Technologies
          </h2>

          <p className="mb-4 text-gray-700 leading-7">
            Our website may use cookies and analytics tools to improve browsing
            experience, understand customer preferences, and enhance website
            functionality.
          </p>

          <p className="text-gray-700 leading-7">
            You can disable cookies through your browser settings.
          </p>
        </section>

        {/* Section 6 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-5 text-black">
            6. Data Protection
          </h2>

          <p className="mb-4 text-gray-700 leading-7">
            We implement reasonable security measures to protect your personal
            information from unauthorized access, misuse, or disclosure.
          </p>

          <p className="text-gray-700 leading-7">
            However, no online transmission or storage system can be guaranteed
            as 100% secure.
          </p>
        </section>

        {/* Section 7 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-5 text-black">
            7. Your Rights
          </h2>

          <p className="mb-4 text-gray-700 leading-7">
            You may contact us to:
          </p>

          <ul className="space-y-3 list-disc pl-6 text-gray-700 leading-7">
            <li>Access your personal information</li>
            <li>Correct inaccurate information</li>
            <li>Request deletion of your data</li>
            <li>Unsubscribe from promotional communications</li>
          </ul>
        </section>

        {/* Section 8 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-5 text-black">
            8. Third-Party Links
          </h2>

          <p className="text-gray-700 leading-7">
            Our website may contain links to third-party websites. IKNA is not
            responsible for the privacy practices or content of external
            websites.
          </p>
        </section>

        {/* Section 9 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-5 text-black">
            9. Changes to This Privacy Policy
          </h2>

          <p className="text-gray-700 leading-7">
            IKNA reserves the right to update or modify this Privacy Policy at
            any time. Changes will be updated on this page with the revised
            effective date.
          </p>
        </section>

        {/* Section 10 */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-5 text-black">
            10. Contact Us
          </h2>

          <p className="mb-6 text-gray-700 leading-7">
            If you have any questions regarding this Privacy Policy, please
            contact us:
          </p>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <p className="text-lg font-semibold mb-3">IKNA</p>

            <p className="text-gray-700 mb-2">
              <span className="font-medium">Email:</span>{' '}
              admin@ikna.com
            </p>

            <p className="text-gray-700">
              <span className="font-medium">Phone:</span>{' '}
               +91 98403 49375
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
<Footer />
    </div>
  );
}