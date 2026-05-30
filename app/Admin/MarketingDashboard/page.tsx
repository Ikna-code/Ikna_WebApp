'use client';

import React, { useState } from 'react';
import { Megaphone, Plus, Percent, Users, TrendingUp } from 'lucide-react';

export default function Marketing() {
  const [campaignTitle, setCampaignTitle] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [campaigns, setCampaigns] = useState([
    { id: 1, name: 'SS Mid-Season Sale', audience: 'VIP Shoppers', reach: 450, status: 'Active' },
    { id: 2, name: 'First Time Buyers Promo', audience: 'New Customers', reach: 1200, status: 'Active' },
  ]);

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignTitle) return;
    
    setCampaigns([
      ...campaigns,
      {
        id: Date.now(),
        name: campaignTitle,
        audience: 'General Audience',
        reach: Math.floor(Math.random() * 500) + 100,
        status: 'Active',
      },
    ]);
    setCampaignTitle('');
    setDiscountPercent('');
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      
      {/* Campaign List */}
      <div className="xl:col-span-2 space-y-6">
        <div>
          <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">
            Promotions
          </span>
          <h1 className="text-2xl font-black text-[#840d5c] mb-6">Marketing Campaigns</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-[#f7e8f1] rounded-2xl flex items-center justify-center text-[#840d5c]">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-neutral-400 font-bold uppercase">Total Reach</p>
              <p className="text-xl font-extrabold text-neutral-800">1,650</p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-neutral-400 font-bold uppercase">Audience Segments</p>
              <p className="text-xl font-extrabold text-neutral-800">2</p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-neutral-400 font-bold uppercase">Avg. Conversion</p>
              <p className="text-xl font-extrabold text-neutral-800">4.2%</p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-neutral-100 rounded-3xl border border-neutral-200 bg-white shadow-sm">
          {campaigns.map((c) => (
            <div key={c.id} className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#840d5c]/10 rounded-2xl flex items-center justify-center text-[#840d5c]">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-neutral-800">{c.name}</h3>
                  <p className="text-[9px] text-neutral-400 font-medium">Audience: {c.audience}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 font-bold rounded-lg">
                  {c.reach} Reach
                </span>
                <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 font-extrabold rounded-lg">
                  {c.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Campaign Creation Form */}
      <div className="xl:col-span-1">
        <form onSubmit={handleCreateCampaign} className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm space-y-4">
          <h3 className="text-base font-black text-[#840d5c]">Create Campaign</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-[9px] font-black tracking-widest text-neutral-400 mb-1">
                CAMPAIGN NAME
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Summer Clearance Sale"
                value={campaignTitle}
                onChange={(e) => setCampaignTitle(e.target.value)}
                className="w-full text-xs border border-neutral-300 rounded-xl px-3 py-2.5 outline-none focus:border-[#840d5c] transition"
              />
            </div>

            <div>
              <label className="block text-[9px] font-black tracking-widest text-neutral-400 mb-1">
                DISCOUNT (%)
              </label>
              <input
                type="number"
                placeholder="e.g. 20"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                className="w-full text-xs border border-neutral-300 rounded-xl px-3 py-2.5 outline-none focus:border-[#840d5c] transition"
              />
            </div>

            <div>
              <label className="block text-[9px] font-black tracking-widest text-neutral-400 mb-1">
                TARGET AUDIENCE
              </label>
              <select className="w-full text-xs bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2.5 outline-none focus:border-[#840d5c] transition">
                <option>All Customers</option>
                <option>VIP Shoppers Only</option>
                <option>Lapsed Buyers</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-[#840d5c] text-white text-xs py-3 rounded-xl font-extrabold hover:bg-[#840d5c] transition shadow-sm flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Launch Campaign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
