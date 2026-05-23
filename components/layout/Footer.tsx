import Image from 'next/image';
import Link from 'next/link';
import { FaInstagram, FaFacebookF } from 'react-icons/fa';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#2D051A] text-[#faf3f5] border-t border-[#840d5c]/20">
      <div className="max-w-7xl mx-auto px-6 py-16">

        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">

          {/* Brand Section */}
          <div className="col-span-1 md:col-span-1">

            <Image
              src="/images/AI_images/logo1_ikna.png"
              alt="IKNA Logo"
              width={50}
              height={50}
              className="mb-4"
            />

            <p className="text-sm text-[#faf3f5]/60 leading-relaxed">
              Elevating movement through dynamic support and thoughtful design.
              Designed in Chennai, for every body type.
            </p>

          </div>

          {/* Shop Links */}
          <div>

            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-6 text-[#840d5c]">
              Shop
            </h3>

            <ul className="space-y-3 text-sm text-[#faf3f5]/80 font-medium">

              <li>
                <Link
                  href="/shop"
                  className="hover:text-white hover:translate-x-1 inline-block transition-all duration-300"
                >
                  All Products
                </Link>
              </li>

              <li>
                <Link
                  href="/about-us"
                  className="hover:text-white hover:translate-x-1 inline-block transition-all duration-300"
                >
                 About us
                </Link>
              </li>
              <li>
                <Link
                  href="/cart"
                  className="hover:text-white hover:translate-x-1 inline-block transition-all duration-300"
                >
              Shopping cart
                </Link>
              </li>
            </ul>

          </div>

          {/* Support Links */}
          <div>

            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-6 text-[#840d5c]">
              Support
            </h3>

            <ul className="space-y-3 text-sm text-[#faf3f5]/80 font-medium">

              <li>
                <Link
                  href="/shipping"
                  className="hover:text-white hover:translate-x-1 inline-block transition-all duration-300"
                >
                  Shipping
                </Link>
              </li>

              <li>
                <Link
                  href="/contact"
                  className="hover:text-white hover:translate-x-1 inline-block transition-all duration-300"
                >
                  Contact Us
                </Link>
              </li>

            </ul>

          </div>

          {/* Social Section */}
          <div>

            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-6 text-[#840d5c]">
              Stay Connected
            </h3>

            <div className="flex flex-col space-y-4">

              {/* Social Icons */}
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

        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">

          <p className="text-[10px] text-[#faf3f5]/40 font-medium tracking-wide">
            &copy; {currentYear} IKNA. ALL RIGHTS RESERVED.
          </p>

          <div className="flex gap-8 text-[10px] text-[#faf3f5]/40 font-bold uppercase tracking-widest">

            <Link
              href="/privacy"
              className="hover:text-[#840d5c] transition-colors duration-300"
            >
              Privacy Policy
            </Link>

            <Link
              href="/terms"
              className="hover:text-[#840d5c] transition-colors duration-300"
            >
              Terms of Service
            </Link>

          </div>

        </div>

      </div>
    </footer>
  );
};

export default Footer;