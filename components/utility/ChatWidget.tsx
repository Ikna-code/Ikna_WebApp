"use client";
import React, { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Replace with your client's actual WhatsApp number
  const whatsappNumber = "919876543210"; 
  const message = "Hi IKNA! I need help finding my perfect bra size.";
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      
      {/* 1. CHAT WINDOW (Requirement 6) */}
      {isOpen && (
        <div className="mb-4 w-72 md:w-80 bg-white shadow-2xl border border-ikna-brown-light/20 rounded-lg overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="bg-ikna-dark p-4 flex justify-between items-center">
            <div>
              <p className="text-white text-[10px] font-bold tracking-widest uppercase">IKNA Assistant</p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <p className="text-white/70 text-[10px]">Fit experts online</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white">
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-4 h-48 bg-ikna-beige/30 overflow-y-auto">
            <div className="bg-white p-3 rounded-r-lg rounded-tl-lg shadow-sm max-w-[85%] border border-ikna-brown-light/10">
              <p className="text-[11px] text-ikna-dark leading-relaxed">
                Hello! I'm here to help you solve your fit problems. Would you like to chat with a stylist on WhatsApp or use our automated guide?
              </p>
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-3 border-t border-ikna-brown-light/10 bg-white space-y-2">
            <a 
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white py-2 rounded-md text-[10px] font-bold uppercase tracking-wider hover:opacity-90 transition-opacity"
            >
              Chat on WhatsApp
            </a>
            <button className="flex items-center justify-center gap-2 w-full bg-ikna-brown text-white py-2 rounded-md text-[10px] font-bold uppercase tracking-wider hover:bg-ikna-dark transition-colors">
              Self-Help Guide
            </button>
          </div>
        </div>
      )}

      {/* 2. FLOATING TRIGGER BUTTONS */}
      <div className="flex flex-col gap-3">
        {/* Requirement 6: WhatsApp Specific Button (Smaller) */}
        {!isOpen && (
          <a 
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
            title="WhatsApp Us"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
          </a>
        )}

        {/* Primary Chat Trigger */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 bg-ikna-dark text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-ikna-brown transition-all duration-300"
        >
          {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
        </button>
      </div>
    </div>
  );
};

export default ChatWidget;