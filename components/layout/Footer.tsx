import Image from 'next/image';
import Link from 'next/link';
import { FaInstagram, FaFacebookF, FaPhoneAlt, FaEnvelope } from 'react-icons/fa';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="bg-[#2D051A] border-t border-[#840d5c]/20"
      style={{ color: 'lab(96.4337% 2.68027 -.0899553 / .8)' }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        
        {/* Changed mobile from grid-cols-2 to a stacked layout (flex flex-col) that transitions into a 4-column grid on desktop */}
        <div className="flex flex-col gap-y-8 md:grid md:grid-cols-4 md:gap-x-6 md:gap-y-0 md:gap-12">

          {/* Brand Section */}
          <div className="md:col-span-1">
            <Image
              src="/images/AI_images/logo1_ikna.png"
              alt="IKNA Logo"
              width={50}
              height={50}
              className="mb-4"
            />
            <h6
              className="text-sm font-bold mb-1.5 not-italic"
              style={{ fontFamily: '"Amsterdam", cursive' }}
            >
              Hey Beautiful! Embrace Yourself
            </h6>
          </div>

          {/* Shop Links */}
          <div>
            <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] mb-3 md:mb-6">
              Shop
            </h3>
            <ul className="space-y-2 md:space-y-3 text-xs md:text-sm font-medium">
              <li>
                <Link
                  href="/shop/bras"
                  className="hover:translate-x-1 inline-block transition-all duration-300"
                >
                  Bras
                </Link>
              </li>
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] mb-3 md:mb-6">
              Quick Links
            </h3>
            <ul className="space-y-2 md:space-y-3 text-xs md:text-sm font-medium">
              <li>
                <Link
                  href="/about-us"
                  className="hover:translate-x-1 inline-block transition-all duration-300"
                >
                  About us
                </Link>
              </li>
              <li>
                <Link
                  href="/FAQs"
                  className="hover:translate-x-1 inline-block transition-all duration-300"
                >
                  FAQs
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy-policy"
                  className="hover:translate-x-1 inline-block transition-all duration-300"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms-and-conditions"
                  className="hover:translate-x-1 inline-block transition-all duration-300"
                >
                  Terms and Conditions
                </Link>
              </li>
              <li>
                <Link
                  href="/sitemap"
                  className="hover:translate-x-1 inline-block transition-all duration-300"
                >
                  SiteMap
                </Link>
              </li>
            </ul>
          </div>

          {/* Social Section */}
          <div className="md:col-span-1">
            {/* CONTACT US */}
            <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] mb-3 md:mb-6">
              Contact Us
            </h3>

            <div className="flex flex-col gap-3 md:gap-4 mb-6 md:mb-10">
              {/* Phone */}
              <Link
                href="tel:+919840349375"
                className="flex items-center gap-2.5 md:gap-3 transition-colors duration-300"
              >
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <FaPhoneAlt className="text-[#ffffff] text-[16px]" />
                </div>
                <span className="text-xs md:text-sm">+91 98403 49375</span>
              </Link>

              {/* Email */}
              <Link
                href="mailto:admin@ikna.com"
                className="flex items-center gap-2.5 md:gap-3 transition-colors duration-300"
              >
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <FaEnvelope className="text-[#ffffff] text-[16px]" />
                </div>
                <span className="text-xs md:text-sm break-all">
                  admin@ikna.com
                </span>
              </Link>
            </div>

            {/* STAY CONNECTED */}
            <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] mb-3 md:mb-6">
              Stay Connected
            </h3>

            <div className="flex gap-4">
              {/* Instagram */}
              <Link
                href="https://instagram.com/ikna_official"
                target="_blank"
                aria-label="Instagram"
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:scale-110 transition-all duration-300"
              >
                <FaInstagram className="text-[#E1306C] text-[20px]" />
              </Link>

              {/* Facebook */}
              <Link
                href="https://facebook.com"
                target="_blank"
                aria-label="Facebook"
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:scale-110 transition-all duration-300"
              >
                <FaFacebookF className="text-[#1877F2] text-[18px]" />
              </Link>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col md:flex-row justify-center items-center gap-4">
          <p className="text-[10px] font-medium tracking-wide">
            &copy; {currentYear} IKNA. ALL RIGHTS RESERVED.
          </p>
        </div>

      </div>
    </footer>
  );
};

export default Footer;