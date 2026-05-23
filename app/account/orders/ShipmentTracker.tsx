// components/orders/ShipmentTracker.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { Truck, ExternalLink, PackageCheck } from 'lucide-react';

interface TrackerProps {
  shipmentId: string;
}

const ShipmentTracker = ({ shipmentId }: TrackerProps) => {
  const [trackingData, setTrackingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTracking = async () => {
      try {
        // You would create a simple API route to proxy Shiprocket's tracking
        const res = await fetch(`/api/shiprocket/track?id=${shipmentId}`);
        const data = await res.json();
        setTrackingData(data);
      } catch (e) {
        console.error("Tracking error", e);
      } finally {
        setLoading(false);
      }
    };
    if (shipmentId) fetchTracking();
  }, [shipmentId]);

  if (loading) return <div className="animate-pulse h-10 bg-gray-100 rounded-xl" />;
  if (!trackingData) return null;

  return (
    <div className="mt-6 p-6 bg-white rounded-[2rem] border border-[#840d5c]/10 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3 text-[#840d5c]">
          <Truck size={20} />
          <h4 className="text-[10px] font-black uppercase tracking-widest">Live Tracking</h4>
        </div>
        <span className="text-[10px] font-bold bg-green-100 text-green-700 px-3 py-1 rounded-full uppercase">
          {trackingData.status || "In Transit"}
        </span>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-[#321327]/60 font-medium">
          Current Location: <span className="text-[#321327] font-bold">{trackingData.current_location || "Processing"}</span>
        </p>
        <div className="w-full bg-[#FAF3F5] h-2 rounded-full overflow-hidden">
          <div 
            className="bg-[#840d5c] h-full transition-all duration-1000" 
            style={{ width: `${trackingData.progress || 40}%` }} 
          />
        </div>
      </div>

      <a 
        href={trackingData.tracking_url} 
        target="_blank" 
        className="mt-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#840d5c] hover:underline"
      >
        View Full Details on Shiprocket <ExternalLink size={12} />
      </a>
    </div>
  );
};

export default ShipmentTracker;