import Image from 'next/image';
import Link from 'next/link';
import { FaInstagram, FaFacebookF, FaPhone, FaPhoneAlt, FaMailBulk, FaEnvelope } from 'react-icons/fa';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#2D051A] text-[#faf3f5] border-t border-[#840d5c]/20">
      <div className="max-w-7xl mx-auto px-6 py-8">

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
            <h6 className="text-sm italic font-bold mb-2 text-[#ffffff]">
              Hey Beautiful! Embrace Yourself
            </h6>


            {/* <p className="text-sm text-[#faf3f5]/60 leading-relaxed">
              Elevating movement through dynamic support and thoughtful design.
              
            </p> */}

          </div>

          {/* Shop Links */}
          <div>

            <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] mb-6 text-[#840d5c]">
              Shop
            </h3>

            <ul className="space-y-3 text-sm text-[#faf3f5]/80 font-medium">

              <li>
                <Link
                  href="/shop"
                  className="hover:text-white hover:translate-x-1 inline-block transition-all duration-300"
                >
                 Bras
                </Link>
              </li>


            </ul>

          </div>

          {/* Support Links */}
          <div>

            <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] mb-6 text-[#840d5c]">
              Quick Links
            </h3>

            <ul className="space-y-3 text-sm text-[#faf3f5]/80 font-medium">


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
                  href="/FAQs"
                  className="hover:text-white hover:translate-x-1 inline-block transition-all duration-300"
                >
                 FAQs
                </Link>
              </li>
              
              <li>
                <Link
                  href="/privacy-policy"
                  className="hover:text-white hover:translate-x-1 inline-block transition-all duration-300"
                >
                 Privacy Policy
                </Link>
              </li>
              
              <li>
                <Link
                  href="/terms-and-conditions"
                  className="hover:text-white hover:translate-x-1 inline-block transition-all duration-300"
                >
                 Terms and Conditions
                </Link>
              </li>

              <li>
                <Link
                  href="/sitemap"
                  className="hover:text-white hover:translate-x-1 inline-block transition-all duration-300"
                >
                 SiteMap
                </Link>
              </li>


            </ul>

          </div>

          {/* Social Section */}
          
<div>
  {/* CONTACT US */}
  <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] mb-6 text-[#840d5c]">
    Contact Us
  </h3>

  <div className="flex flex-col gap-4 mb-10">

    {/* Phone */}
    <Link
      href="tel:+919840349375"
      className="flex items-center gap-3 text-white hover:text-[#840d5c] transition-colors duration-300"
    >
      <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
        <FaPhoneAlt className="text-[#ffffff] text-[16px]" />
      </div>

      <span className="text-sm">+91 98403 49375</span>
    </Link>

    {/* Email */}
    <Link
      href="mailto:iknaenterprises@gmail.com"
      className="flex items-center gap-3 text-white hover:text-[#840d5c] transition-colors duration-300"
    >
      <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
        <FaEnvelope className="text-[#ffffff] text-[16px]" />
      </div>

      <span className="text-sm break-all">
        iknaenterprises@gmail.com
      </span>
    </Link>
  </div>

  {/* STAY CONNECTED */}
  <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] mb-6 text-[#840d5c]">
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
        <div className="mt-6 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-center items-center gap-4">

          <p className="text-[10px] text-[#faf3f5]/40 font-medium tracking-wide">
            &copy; {currentYear} IKNA. ALL RIGHTS RESERVED.
          </p>


        </div>

      </div>
    </footer>
  );
};

export default Footer;