"use client";

import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { MapPin, Plus, Trash2, Edit3, X, Loader2, CheckCircle2 } from 'lucide-react';
import { saveAddressAction, deleteAddressAction, getAddressesByUserId } from '@/backend/actions/settings';
import { createClient } from '@/backend/lib/supabaseClient';

interface Address {
  id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  isDefault: boolean;
}

const AddressPage = () => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [isPending, setIsPending] = useState(false);
  
  // Auth and toast states
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showDefaultToast, setShowDefaultToast] = useState(false);

  const supabase = createClient();

  // Handle scroll locking when modal opens
  useEffect(() => {
    if (isFormOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isFormOpen]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user?.id) {
          setUserId(session.user.id);
          setIsAuthenticated(true);
          await fetchAddresses(session.user.id);
        } else {
          setIsAuthenticated(false);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Authentication check failed:", error);
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const fetchAddresses = async (id: string) => {
    try {
      setIsLoading(true);
      const result = await getAddressesByUserId(id);
      if (result && result.success && result.data) {
        setAddresses(result.data);
        
        const hasDefault = result.data.some((addr: Address) => addr.isDefault);
        if (result.data.length > 0 && !hasDefault) {
          setShowDefaultToast(true);
        } else {
          setShowDefaultToast(false);
        }
      } else {
        console.error(result?.error || "Error fetching addresses.");
        setAddresses([]);
      }
    } catch (e) {
      console.error("Failed to fetch addresses", e);
      setAddresses([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (formData: FormData, isDefaultOverride = false) => {
    if (!userId) {
      alert("You must be logged in to save an address.");
      return;
    }
    setIsPending(true);
    
    const isDefault = isDefaultOverride || formData.get("isDefault") === "on";

    const data = {
      name: formData.get("name") as string,
      street: formData.get("street") as string,
      city: formData.get("city") as string,
      state: formData.get("state") as string,
      zip: formData.get("zip") as string,
      country: "India",
      isDefault: isDefault,
    };

    const addressId = editingAddress ? editingAddress.id : null;

    try {
      const result = await saveAddressAction(userId, data, addressId);
      
      if (result && result.success) {
        setIsFormOpen(false);
        setEditingAddress(null);
        await fetchAddresses(userId);
      } else {
        alert(result?.error || "Error saving address.");
      }
    } catch (e) {
      console.error("An unexpected error occurred during submission:", e);
      alert("An unexpected error occurred. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  const handleSetDefault = async (addr: Address) => {
    if (!userId || isPending) return;
    setIsPending(true);
    setEditingAddress(addr);

    try {
      const result = await saveAddressAction(
        userId, 
        { ...addr, isDefault: true }, 
        addr.id 
      );

      if (result.success) {
        await fetchAddresses(userId);
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error("Failed to set default address:", error);
    } finally {
      setIsPending(false);
    }
  };

  const handleDelete = async (addressId: string) => {
    if (!userId) {
      alert("You must be logged in to delete an address.");
      return;
    }
    if (!confirm("Are you sure you want to delete this address?")) return;
    
    setIsPending(true); 
    
    try {
      const result = await deleteAddressAction(userId, addressId);
      if (result && result.success) {
        await fetchAddresses(userId);
      } else {
        alert(result?.error || "Failed to delete address.");
      }
    } catch (e) {
      console.error("Failed to delete address:", e);
      alert("Failed to delete address.");
    } finally {
      setIsPending(false);
    }
  };

  const startEdit = (addr: Address) => {
    setEditingAddress(addr);
    setIsFormOpen(true);
  };

  if (!isAuthenticated && !isLoading) {
    return (
      <div className="bg-[#FAF3F5] min-h-screen flex items-center justify-center p-4 text-center">
        <p className="text-[#321327]/60 text-sm">Access Denied. Please log in to view this page.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF3F5] min-h-screen">
      {/* <Header /> */}
      <main className="max-w-4xl mx-auto px-0 py-0 md:py-0">
        
        {/* TOP BAR */}
        <div className="flex justify-between items-center mb-6 md:mb-8 gap-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif text-[#321327]">Shipping Address</h1>
          <button 
            onClick={() => { setEditingAddress(null); setIsFormOpen(true); }}
            className="flex items-center gap-2 text-[10px] font-bold text-[#840d5c] uppercase tracking-widest border-2 border-[#840d5c]/20 px-4 py-2.5 sm:px-6 sm:py-3 rounded-full hover:bg-[#840d5c] hover:text-white transition-all shadow-sm flex-shrink-0"
          >
            <Plus size={14} /> Add New
          </button>
        </div>

        {/* COMPACT TOAST NOTIFICATION */}
        {showDefaultToast && (
          <div className="mb-6 p-3 bg-amber-50 border border-amber-300/80 rounded-xl sm:rounded-2xl flex items-center justify-between text-amber-900 shadow-sm text-xs">
            <div className="flex items-center gap-2">
              <span className="text-amber-600 flex-shrink-0">
                <CheckCircle2 size={14} />
              </span>
              <span>Please set a default address for quick checkouts.</span>
            </div>
          </div>
        )}

        {/* LIST OF ADDRESSES */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-16 bg-white/40 rounded-2xl sm:rounded-[3rem] border border-[#840d5c]/10">
              <Loader2 className="animate-spin text-[#840d5c]" size={32} />
            </div>
          ) : (!addresses || addresses.length === 0) ? (
            <div className="text-center py-16 bg-white/40 rounded-2xl sm:rounded-[3rem] border-2 border-dashed border-[#840d5c]/10 text-[#321327]/30 italic text-sm px-4">
              You haven't added any addresses yet.
            </div>
          ) : (
            addresses.map((addr) => (
              <div 
                key={addr.id} 
                className={`bg-white p-5 sm:p-8 rounded-2xl sm:rounded-[3rem] border-2 relative group hover:shadow-md transition-shadow ${addr.isDefault ? 'border-[#840d5c]' : 'border-transparent'}`}
              >
                {addr.isDefault && (
                  <div className="sm:absolute top-6 right-8 flex items-center gap-1 text-[10px] font-bold text-[#840d5c] uppercase tracking-widest mb-3 sm:mb-0">
                    <CheckCircle2 size={12} /> Default Address
                  </div>
                )}
                
                <div className="flex gap-3 sm:gap-4 items-start">
                  <MapPin className={`mt-0.5 flex-shrink-0 ${addr.isDefault ? "text-[#840d5c]" : "text-[#321327]/20"}`} size={22} />
                  <div className="space-y-1 w-full min-w-0">
                    <p className="font-bold text-[#321327] text-sm sm:text-base truncate">{addr.name}</p>
                    <p className="text-xs sm:text-sm text-[#321327]/60 leading-relaxed break-words">
                      {addr.street}<br />{addr.city}, {addr.state} {addr.zip}
                    </p>
                    
                    <div className="flex flex-wrap gap-4 sm:gap-6 mt-4 sm:mt-6 pt-4 border-t border-[#FAF3F5] items-center">
                      <button 
                        onClick={() => startEdit(addr)}
                        className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#321327]/40 hover:text-[#840d5c] transition-all py-1"
                      >
                        <Edit3 size={13} /> Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(addr.id)}
                        className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#321327]/40 hover:text-red-500 transition-all py-1"
                      >
                        <Trash2 size={13} /> Delete
                      </button>

                      {!addr.isDefault && (
                        <button 
                          onClick={() => handleSetDefault(addr)}
                          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#840d5c] hover:underline py-1 ml-auto"
                        >
                          Set Default
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* MODAL OVERLAY AND FORM */}
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
            {/* Backdrop Click Closes Modal */}
            <div 
              className="absolute inset-0 bg-[#321327]/40 backdrop-blur-sm"
              onClick={() => setIsFormOpen(false)}
            />
            
            {/* Modal Body Container */}
            <div className="relative bg-white w-full sm:max-w-xl p-6 sm:p-8 rounded-t-[2rem] sm:rounded-[2.5rem] border-t sm:border border-[#840d5c]/10 shadow-2xl max-h-[90vh] overflow-y-auto z-10 transform transition-transform duration-300 ease-out translate-y-0 animate-slide-up sm:animate-zoom-in">
              
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-serif text-xl sm:text-2xl text-[#321327]">
                  {editingAddress ? "Update Address" : "New Address"}
                </h2>
                <button 
                  onClick={() => setIsFormOpen(false)} 
                  className="text-[#321327]/40 hover:text-[#840d5c] p-1 rounded-full hover:bg-[#FAF3F5] transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Form Content Layout */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleFormSubmit(formData);
                }} 
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                <input name="name" defaultValue={editingAddress?.name} type="text" placeholder="Full Name" required className="sm:col-span-2 p-3.5 sm:p-4 bg-[#FAF3F5] rounded-2xl outline-none focus:ring-1 ring-[#840d5c]/30 text-sm" />
                <input name="street" defaultValue={editingAddress?.street} type="text" placeholder="Street Address" required className="sm:col-span-2 p-3.5 sm:p-4 bg-[#FAF3F5] rounded-2xl outline-none focus:ring-1 ring-[#840d5c]/30 text-sm" />
                <input name="city" defaultValue={editingAddress?.city} type="text" placeholder="City" required className="p-3.5 sm:p-4 bg-[#FAF3F5] rounded-2xl outline-none focus:ring-1 ring-[#840d5c]/30 text-sm" />
                <input name="zip" defaultValue={editingAddress?.zip} type="text" placeholder="ZIP Code" required className="p-3.5 sm:p-4 bg-[#FAF3F5] rounded-2xl outline-none focus:ring-1 ring-[#840d5c]/30 text-sm" />
                <input name="state" defaultValue={editingAddress?.state} type="text" placeholder="State" required className="sm:col-span-2 p-3.5 sm:p-4 bg-[#FAF3F5] rounded-2xl outline-none focus:ring-1 ring-[#840d5c]/30 text-sm" />
                
                <label className="sm:col-span-2 flex items-center gap-3 px-2 cursor-pointer group py-1">
                  <input 
                    type="checkbox" 
                    name="isDefault" 
                    defaultChecked={editingAddress?.isDefault}
                    className="w-4 h-4 accent-[#840d5c] flex-shrink-0"
                  />
                  <span className="text-xs sm:text-sm text-[#321327]/60 group-hover:text-[#321327] select-none">Set as default address</span>
                </label>

                {/* Modal Actions Footer */}
                <div className="sm:col-span-2 flex flex-col sm:flex-row gap-3 mt-4">
                  <button 
                    disabled={isPending}
                    type="submit" 
                    className="w-full sm:flex-1 bg-[#321327] text-white py-3.5 sm:py-4 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-[#840d5c] transition-all disabled:opacity-50 flex items-center justify-center gap-2 order-1 sm:order-2"
                  >
                    {isPending && <Loader2 size={14} className="animate-spin" />}
                    {editingAddress ? "Update Address" : "Save Address"}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setIsFormOpen(false)} 
                    className="w-full sm:flex-1 border border-[#321327]/10 py-3.5 sm:py-4 rounded-full text-[10px] font-bold uppercase tracking-widest text-[#321327]/60 order-2 sm:order-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Embedded Dynamic Tailwind Animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes zoomIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
        .animate-slide-up { @media (max-width: 639px) { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; } }
        .animate-zoom-in { @media (min-width: 640px) { animation: zoomIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; } }
      `}</style>
    </div>
  );
};

export default AddressPage;