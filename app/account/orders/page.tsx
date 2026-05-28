"use client";
import React, { useState } from 'react';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import { Package, ChevronDown, CheckCircle2, MapPin, Loader2 } from 'lucide-react';
import { IMAGE_BASE_URL } from '@/public/constants/constants';
import ShipmentTracker from './ShipmentTracker';
import { useStore } from '@/store/useStore';

const OrdersPage = () => {
  const orders = useStore((s) => s.orders);
  const isOrdersInitialized = useStore((s) => s.isOrdersInitialized);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  const loading = !isOrdersInitialized;

  const toggleAccordion = (id: string) => {
    setActiveOrderId(activeOrderId === id ? null : id);
  };

  if (loading) {
    return (
      <div className="bg-[#FAF3F5] min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-[#840d5c]" size={32} />
      </div>
    );
  }

  return (
    <div className="bg-[#FAF3F5] min-h-screen">
      {/* <Header /> */}
      <main className="max-w-6xl mx-auto px-0 py-6 md:py-12">
        {/* <h1 className="text-2xl sm:text-4xl font-serif text-[#321327] mb-6 md:mb-8">My Orders</h1> */}
        
        {(!orders || orders.length === 0) ? (
          <div className="bg-white rounded-2xl sm:rounded-[2rem] p-8 sm:p-12 text-center border border-[#840d5c]/5 shadow-sm">
            <Package size={40} className="mx-auto text-[#840d5c]/20 mb-4" />
            <h2 className="text-lg sm:text-xl font-serif text-[#321327] mb-2">No orders found</h2>
            <p className="text-xs text-[#321327]/60">When you place an order, it will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const isOpen = activeOrderId === order.id;
              
              const timelineSteps = [
                { status: 'Order Placed', completed: true, active: order.status !== 'CANCELLED', date: new Date(order.createdAt).toLocaleString() },
                { status: 'Order Packed', completed: ['PAID', 'SHIPPED', 'DELIVERED'].includes(order.status), active: order.status !== 'PENDING', date: order.packedAt ? new Date(order.packedAt).toLocaleString() : 'Processing' },
                { status: 'Order Dispatched', completed: ['SHIPPED', 'DELIVERED'].includes(order.status), active: order.status === 'SHIPPED' || order.status === 'DELIVERED', date: order.shippedAt ? new Date(order.shippedAt).toLocaleString() : 'In Transit' },
                { status: 'Order Delivered', completed: order.status === 'DELIVERED', active: order.status === 'DELIVERED', date: order.deliveredAt ? new Date(order.deliveredAt).toLocaleString() : 'Expected Soon' },
              ];

              return (
                <div key={order.id} className={`bg-white rounded-2xl sm:rounded-[2rem] shadow-sm border transition-all duration-300 overflow-hidden ${isOpen ? 'border-[#840d5c]/30 ring-1 ring-[#840d5c]/10' : 'border-[#840d5c]/5'}`}>
                  
                  {/* Accordion Header */}
                  <button 
                    onClick={() => toggleAccordion(order.id)}
                    className="w-full p-4 sm:p-6 flex items-center justify-between text-left hover:bg-[#FAF3F5]/30 transition-colors gap-3"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${isOpen ? 'bg-[#840d5c] text-white' : 'bg-[#FAF3F5] text-[#840d5c]'}`}>
                        <Package size={20} className="sm:size-[24px]" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-[#321327] text-sm sm:text-base truncate">#{order.id}</h3>
                        <div className="flex items-center gap-2 mt-0.5 sm:mt-0 flex-wrap">
                          <p className="text-xs text-[#321327]/50">{new Date(order.createdAt).toLocaleDateString()}</p>
                          {/* Mobile status display visible only on smaller screens */}
                          <span className="sm:hidden text-[8px] font-black uppercase tracking-widest px-2 py-0.5 bg-[#840d5c]/10 text-[#840d5c] rounded-full">
                            {order.status || 'PROCESSING'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 sm:gap-6 flex-shrink-0">
                      {/* Desktop status display hidden on small screens */}
                      <span className="hidden sm:inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-[#840d5c]/10 text-[#840d5c] rounded-full">
                        {order.status || 'PROCESSING'}
                      </span>
                      <ChevronDown size={18} className={`text-[#321327]/20 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {/* Accordion Body */}
                  <div className={`transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="p-4 sm:p-6 md:p-8 pt-0 border-t border-[#FAF3F5] sm:mx-6">
                      
                      {/* Dynamic Items List */}
                      <div className="mt-6 sm:mt-8">
                        <h4 className="text-[10px] sm:text-xs font-black tracking-widest text-[#840d5c] uppercase mb-4">Items in this order</h4>
                        <div className="space-y-3">
                          {order.orderItems?.map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between p-3 sm:p-4 bg-[#FAF3F5]/40 rounded-xl sm:rounded-2xl border border-[#840d5c]/5 gap-4">
                              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                <div className="relative w-10 h-14 sm:w-12 sm:h-16 bg-white rounded-lg overflow-hidden border border-[#840d5c]/5 flex-shrink-0">
                                  <Image 
                                    src={`${IMAGE_BASE_URL}${item.product?.image}`} 
                                    alt={item.product?.name || "Product Image"} 
                                    fill 
                                    className="object-cover" 
                                    sizes="(max-width: 640px) 40px, 48px"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <h5 className="text-xs sm:text-sm font-serif text-[#321327] truncate">{item.product?.name}</h5>
                                  <p className="text-[9px] sm:text-[10px] text-[#321327]/60 tracking-wider uppercase mt-0.5">
                                    Size: {item.selectedSize || 'N/A'} | Qty: {item.quantity}
                                  </p>
                                </div>
                              </div>
                              <p className="text-xs sm:text-sm font-bold text-[#321327] flex-shrink-0">₹{item.price?.toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Info & Tracking Content Grid Layout */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 mt-6 sm:mt-8">
                        
                        {/* Timeline Track */}
                        <div className="relative space-y-5 sm:space-y-6 left-1">
                          <div className="absolute top-2 bottom-2 left-[11px] w-[2px] bg-[#FAF3F5]"></div>
                          {timelineSteps.map((step, idx) => (
                            <div key={idx} className="relative flex gap-3 sm:gap-4 items-start">
                              <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center border-4 border-white shadow-sm flex-shrink-0 ${step.completed ? 'bg-[#840d5c]' : 'bg-[#FAF3F5]'}`}>
                                {step.completed && <CheckCircle2 size={12} className="text-white" />}
                              </div>
                              <div className="min-w-0">
                                <p className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest leading-none ${step.active ? 'text-[#840d5c]' : 'text-[#321327]/60'}`}>
                                  {step.status}
                                </p>
                                <p className="text-[9px] sm:text-[10px] text-[#321327]/40 mt-1 break-words">{step.date}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Additional Info Block */}
                        <div className="space-y-4 sm:space-y-6">
                          <div className="bg-[#FAF3F5] p-4 sm:p-5 rounded-xl sm:rounded-2xl space-y-2sm:space-y-3">
                            <div className="flex items-center gap-2 text-[#840d5c]">
                              <MapPin size={15} />
                              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Shipping Address</span>
                            </div>
                            <p className="text-xs text-[#321327]/70 leading-relaxed break-words">{order.address}</p>
                          </div>
                          
                          <div className="flex justify-between items-end border-t border-[#840d5c]/10 pt-4 px-1">
                            <p className="text-[9px] sm:text-[10px] font-black uppercase text-[#321327]/40">Order Total</p>
                            <p className="text-lg sm:text-xl font-bold text-[#321327]">₹{order.totalAmount?.toLocaleString()}</p>
                          </div>
                        </div>

                        {/* SHIPROCKET INTEGRATION POINT */}
                        {order.status === 'SHIPPED' && order.shipmentId && (
                          <div className="col-span-1 md:col-span-2 w-full">
                            <ShipmentTracker shipmentId={order.shipmentId} />
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default OrdersPage;