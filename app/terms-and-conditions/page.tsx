'use client';

import React from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-[#fffaf7] text-gray-800">
      
<Header />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 md:py-16">
        
        {/* Page Header */}
        <header className="mb-12 border-b border-gray-200 pb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">
            Terms & Conditions
          </h1>

          <div className="text-sm text-gray-500 tracking-wide uppercase">
            Effective Date: May 19, 2026
          </div>
        </header>

        {/* Intro */}
        <p className="text-gray-700 leading-8 text-lg mb-12">
          Welcome to IKNA. By accessing or using our website, you agree to
          comply with the following Terms & Conditions.
        </p>

        <p className="text-gray-700 leading-8 text-lg mb-12">
          Please read them carefully before using the website.
        </p>

        {/* Section 1 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-5 text-black">
            1. General
          </h2>

          <p className="mb-4 text-gray-700 leading-7">
            IKNA is an online lingerie brand specializing in bras. By using this
            website, you confirm that you are at least 18 years old or
            accessing the website under parental supervision.
          </p>

          <p className="text-gray-700 leading-7">
            IKNA reserves the right to update or modify these terms at any time
            without prior notice.
          </p>
        </section>

        {/* Section 2 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-5 text-black">
            2. Product Information
          </h2>

          <p className="mb-4 text-gray-700 leading-7">
            We strive to display product colors, sizes, descriptions, and
            images accurately. However, actual product appearance may slightly
            vary due to screen settings and photography lighting.
          </p>

          <p className="text-gray-700 leading-7">
            All products are subject to availability.
          </p>
        </section>

        {/* Section 3 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-5 text-black">
            3. Pricing & Payments
          </h2>

          <ul className="space-y-3 list-disc pl-6 text-gray-700 leading-7">
            <li>
              All prices are listed in INR (₹) unless otherwise stated.
            </li>

            <li>
              IKNA reserves the right to modify prices at any time without prior
              notice.
            </li>

            <li>
              Payments must be completed through approved payment methods
              available on the website.
            </li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-5 text-black">
            4. Orders & Cancellations
          </h2>

          <p className="mb-4 text-gray-700 leading-7">
            IKNA reserves the right to:
          </p>

          <ul className="space-y-3 list-disc pl-6 text-gray-700 leading-7 mb-6">
            <li>Refuse or cancel any order at our discretion</li>

            <li>
              Cancel orders due to pricing errors, suspicious activity, or
              product unavailability
            </li>
          </ul>

          <p className="text-gray-700 leading-7">
            Customers may request cancellation only before the order is shipped.
          </p>
        </section>

        {/* Section 5 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-5 text-black">
            5. Shipping & Delivery
          </h2>

          <p className="mb-4 text-gray-700 leading-7">
            Delivery timelines are estimates and may vary based on location,
            courier delays, or unforeseen circumstances.
          </p>

          <p className="text-gray-700 leading-7">
            IKNA is not liable for delays caused by third-party logistics
            providers.
          </p>
        </section>

        {/* Section 6 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-5 text-black">
            6. No Return & No Refund Policy
          </h2>

          <p className="mb-4 text-gray-700 leading-7">
            Due to the intimate and hygienic nature of lingerie products, IKNA
            follows a strict No Return, No Exchange, and No Refund Policy once
            the order has been delivered.
          </p>

          <p className="mb-4 text-gray-700 leading-7">
            Customers are requested to carefully review size charts and product
            details before placing an order.
          </p>

          <p className="mb-4 text-gray-700 leading-7">
            Refunds or replacements will only be considered if:
          </p>

          <ul className="space-y-3 list-disc pl-6 text-gray-700 leading-7">
            <li>The wrong product was delivered</li>

            <li>The product received is damaged or defective</li>
          </ul>

          <p className="mt-6 text-gray-700 leading-7">
            Any such issue must be reported within 24 hours of delivery with
            proper unboxing proof/photos.
          </p>
        </section>

        {/* Section 7 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-5 text-black">
            7. Intellectual Property
          </h2>

          <p className="text-gray-700 leading-7">
            All website content including logos, images, product designs,
            graphics, text, and branding belongs to IKNA and may not be copied,
            reproduced, or used without written permission.
          </p>
        </section>

        {/* Section 8 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-5 text-black">
            8. User Conduct
          </h2>

          <p className="mb-4 text-gray-700 leading-7">
            Users agree not to:
          </p>

          <ul className="space-y-3 list-disc pl-6 text-gray-700 leading-7">
            <li>Use the website for unlawful purposes</li>

            <li>Attempt to hack, disrupt, or misuse the website</li>

            <li>Submit false or misleading information</li>
          </ul>
        </section>

        {/* Section 9 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-5 text-black">
            9. Limitation of Liability
          </h2>

          <p className="text-gray-700 leading-7">
            IKNA shall not be liable for indirect, incidental, or consequential
            damages arising from the use of our website or products.
          </p>
        </section>

        {/* Section 10 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-5 text-black">
            10. Governing Law
          </h2>

          <p className="text-gray-700 leading-7">
            These Terms & Conditions shall be governed by and interpreted in
            accordance with the laws of India.
          </p>
        </section>

        {/* Section 11 */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-5 text-black">
            11. Contact Information
          </h2>

          <p className="mb-6 text-gray-700 leading-7">
            For questions regarding these Terms & Conditions:
          </p>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <p className="text-lg font-semibold mb-3">IKNA</p>

            <p className="text-gray-700 mb-2">
              <span className="font-medium">Email:</span>{' '}
              support@ikna.com
            </p>

            <p className="text-gray-700">
              <span className="font-medium">Phone:</span>{' '}
              +91 XXXXX XXXXX
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />    
    </div>
  );
}