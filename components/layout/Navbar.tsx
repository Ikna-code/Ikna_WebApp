"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavbarProps {
  isMobile?: boolean;
  onClose?: () => void;
}

export default function Navbar({ isMobile, onClose }: NavbarProps) {
  const pathname = usePathname();

  const navLinks = [
    // { name: "Admin Dashboard", href: "/Admin" },
    { name: "HOME", href: "/" },
    { name: "SHOP", href: "/shop" },
    { name: "ABOUT IKNA", href: "/about-us" },
  ];

  return (
    <nav className={isMobile 
      ? "flex flex-col space-y-6" 
      : "hidden md:flex items-center space-x-10"}
    >
      {navLinks.map((link) => {
        const isActive = pathname === link.href;

        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onClose}
            className={`text-[11px] font-bold tracking-[0.2em] transition-all duration-200 
              ${isActive 
                ? "text-[#840d5c] border-b-2 border-[#840d5c] md:pb-1 w-fit" 
                : "text-[#321327] hover:text-[#840d5c]"
              }`}
          >
            {link.name}
          </Link>
        );
      })}
    </nav>
  );
}