'use client';

import React, { useState } from 'react';
import { Calendar, Download, ChevronDown } from 'lucide-react';

export default function Header({ startDate, endDate, onDateChange, onExport }) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);

  const formatDateDisplay = () => {
    const options = { month: 'short', day: 'numeric' };
    return `${startDate.toLocaleDateString('en-US', options)} – ${endDate.toLocaleDateString('en-US', options)}, ${endDate.getFullYear()}`;
  };

  const handleApplyDates = () => {
    if (tempStart <= tempEnd) {
      onDateChange(new Date(tempStart), new Date(tempEnd));
      setCalendarOpen(false);
    }
  };

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const renderCalendarMonth = (date) => {
    const daysInMonth = getDaysInMonth(date);
    const firstDay = getFirstDayOfMonth(date);
    const days = [];

    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    return (
      <div className="p-4 bg-white rounded-lg border border-[#E9E4E0]">
        <div className="text-center mb-4 text-xs font-bold text-[#4A3C44]">
          {date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-[10px]">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <div key={d} className="font-bold text-[#A1959C] h-6 flex items-center justify-center">{d}</div>
          ))}
          {days.map((day, idx) => {
            if (day === null) return <div key={`empty-${idx}`} className="h-6" />;
            const dayDate = new Date(date.getFullYear(), date.getMonth(), day);
            const isStartDate = dayDate.toDateString() === tempStart.toDateString();
            const isEndDate = dayDate.toDateString() === tempEnd.toDateString();
            const isInRange = dayDate > tempStart && dayDate < tempEnd;
            
            return (
              <button
                key={day}
                onClick={() => {
                  if (isStartDate) {
                    setTempStart(dayDate);
                  } else if (isEndDate) {
                    setTempEnd(dayDate);
                  } else if (dayDate < tempStart) {
                    setTempStart(dayDate);
                  } else {
                    setTempEnd(dayDate);
                  }
                }}
                className={`h-6 text-xs font-medium rounded transition ${
                  isStartDate || isEndDate
                    ? 'bg-[#3D0A21] text-white'
                    : isInRange
                    ? 'bg-[#F3B7CD]/40 text-[#2B1B24]'
                    : 'text-[#4A3C44] hover:bg-[#FAF6F4]'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#2B1B24]">Sales Analytics</h1>
        <p className="text-xs text-[#7A6B73] mt-0.5">Track your business performance and sales insights</p>
      </div>
      
      {/* 1. Added relative class here so mobile context handles layout gracefully */}
      <div className="flex items-center gap-3 self-end sm:self-center flex-wrap relative w-full sm:w-auto justify-end">
        <div className="relative">
          <button
            onClick={() => setCalendarOpen(!calendarOpen)}
            className="bg-white px-3 py-2 rounded-xl flex items-center gap-2 border border-[#E9E4E0] shadow-sm text-xs font-medium text-[#4A3C44] hover:bg-[#FAF6F4] transition"
          >
            <Calendar className="w-4 h-4 text-[#7A6B73]" />
            <span>{formatDateDisplay()}</span>
            <ChevronDown className={`w-4 h-4 text-[#A1959C] transition ${calendarOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {calendarOpen && (
            <>
              {/* 2. Backdrop overlay to capture external mobile clicks and frame layout nicely */}
              <div 
                className="fixed inset-0 bg-black/10 z-40 sm:hidden" 
                onClick={() => setCalendarOpen(false)}
              />
              
              {/* 3. Updated positioning strategy */}
              <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 sm:absolute sm:top-full sm:left-auto sm:right-0 sm:translate-x-0 sm:translate-y-0 mt-0 sm:mt-2 z-50 bg-white rounded-2xl shadow-xl border border-[#E9E4E0] p-6 w-[calc(100vw-2rem)] max-w-[340px] sm:w-80">
                <div className="mb-4">
                  <p className="text-xs text-[#7A6B73] mb-3">Select date range (click dates to toggle start/end)</p>
                  {renderCalendarMonth(tempStart)}
                </div>
                <div className="flex gap-2 justify-end border-t border-[#E9E4E0] pt-4">
                  <button
                    onClick={() => setCalendarOpen(false)}
                    className="px-3 py-1.5 text-xs font-medium text-[#7A6B73] hover:bg-[#FAF6F4] rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApplyDates}
                    className="px-3 py-1.5 text-xs font-medium bg-[#3D0A21] text-white rounded-lg hover:bg-[#521330] transition"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        <button
          onClick={onExport}
          className="bg-[#3D0A21] text-white px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-medium hover:bg-[#521330] transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          <span>Export Report</span>
        </button>
      </div>
    </header>
  );
}