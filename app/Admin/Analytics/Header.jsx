'use client';

import React, { useState } from 'react';
import { Calendar, Download, ChevronDown, ChevronLeft, ChevronRight, Eye, X } from 'lucide-react';

export default function Header({ startDate, endDate, onDateChange, onExport, reportPreview, showDateFilter = true }) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);
  const [activeRangeEdge, setActiveRangeEdge] = useState('start');
  const [viewMonth, setViewMonth] = useState(new Date(startDate.getFullYear(), startDate.getMonth(), 1));

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

  const moveMonth = (offset) => {
    setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const handleMonthSelect = (event) => {
    const selectedMonth = Number(event.target.value);
    setViewMonth((current) => new Date(current.getFullYear(), selectedMonth, 1));
  };

  const handleYearSelect = (event) => {
    const selectedYear = Number(event.target.value);
    setViewMonth((current) => new Date(selectedYear, current.getMonth(), 1));
  };

  const yearOptions = Array.from({ length: 21 }, (_, index) => 2020 + index);

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const renderCalendarMonth = (date) => {
    const daysInMonth = getDaysInMonth(date);
    const firstDay = getFirstDayOfMonth(date);
    const days = [];

    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    return (
      <div className="p-4 bg-white rounded-lg border border-[#e8bfd5]">
        <div className="text-center mb-4 text-xs font-bold text-[#5c2a46]">
          {date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-[10px]">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <div key={d} className="font-bold text-[#a0708b] h-6 flex items-center justify-center">{d}</div>
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
                  if (activeRangeEdge === 'start') {
                    if (dayDate <= tempEnd) {
                      setTempStart(dayDate);
                    } else {
                      setTempStart(dayDate);
                      setTempEnd(dayDate);
                    }
                    setActiveRangeEdge('end');
                  } else {
                    if (dayDate >= tempStart) {
                      setTempEnd(dayDate);
                    } else {
                      setTempStart(dayDate);
                    }
                    setActiveRangeEdge('start');
                  }
                }}
                className={`h-6 text-xs font-medium rounded transition ${
                  isStartDate || isEndDate
                    ? 'bg-[#840d5c] text-white'
                    : isInRange
                    ? 'bg-[#f3ddea] text-[#2f1126]'
                    : 'text-[#5c2a46] hover:bg-[#f8eef4]'
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
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#2f1126]">Sales Analytics</h1>
        <p className="text-xs text-[#8a5f79] mt-0.5">Track your business performance and sales insights</p>
      </div>
      
      {/* 1. Added relative class here so mobile context handles layout gracefully */}
      <div className="relative flex w-full flex-nowrap items-center justify-end gap-2 overflow-x-auto sm:w-auto sm:gap-3 sm:self-center sm:overflow-visible">
        {showDateFilter && (
          <div className="relative">
            <button
              onClick={() => {
                if (!calendarOpen) {
                  setTempStart(startDate);
                  setTempEnd(endDate);
                  setActiveRangeEdge('start');
                  setViewMonth(new Date(startDate.getFullYear(), startDate.getMonth(), 1));
                }
                setCalendarOpen(!calendarOpen);
              }}
              className="flex items-center gap-2 rounded-xl border border-[#e8bfd5] bg-white px-3 py-2 text-xs font-medium text-[#5c2a46] shadow-sm transition hover:bg-[#f8eef4]"
            >
              <Calendar className="w-4 h-4 text-[#8a5f79]" />
              <span className="hidden sm:inline">{formatDateDisplay()}</span>
              <span className="sm:hidden">Date</span>
              <ChevronDown className={`w-4 h-4 text-[#a0708b] transition ${calendarOpen ? 'rotate-180' : ''}`} />
            </button>

            {calendarOpen && (
              <>
                <div 
                  className="fixed inset-0 bg-black/10 z-40 sm:hidden" 
                  onClick={() => setCalendarOpen(false)}
                />

                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 sm:absolute sm:top-full sm:left-auto sm:right-0 sm:translate-x-0 sm:translate-y-0 mt-0 sm:mt-2 z-50 bg-white rounded-2xl shadow-xl border border-[#e8bfd5] p-6 w-[calc(100vw-2rem)] max-w-85 sm:w-96">
                  <div className="mb-4">
                    <p className="text-xs text-[#8a5f79] mb-3">Select date range and choose which date to edit</p>

                    <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-[#e8bfd5] bg-[#f8eef4] px-2 py-1.5">
                      <button
                        onClick={() => moveMonth(-1)}
                        className="rounded-md p-1 text-[#8a5f79] hover:bg-white"
                        aria-label="Previous month"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <div className="flex items-center gap-2">
                        <select
                          value={viewMonth.getMonth()}
                          onChange={handleMonthSelect}
                          className="rounded-md border border-[#e8bfd5] bg-white px-2 py-1 text-[11px] font-medium text-[#5c2a46]"
                        >
                          {Array.from({ length: 12 }, (_, month) => (
                            <option key={month} value={month}>
                              {new Date(2026, month, 1).toLocaleDateString('en-US', { month: 'short' })}
                            </option>
                          ))}
                        </select>
                        <select
                          value={viewMonth.getFullYear()}
                          onChange={handleYearSelect}
                          className="rounded-md border border-[#e8bfd5] bg-white px-2 py-1 text-[11px] font-medium text-[#5c2a46]"
                        >
                          {yearOptions.map((year) => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={() => moveMonth(1)}
                        className="rounded-md p-1 text-[#8a5f79] hover:bg-white"
                        aria-label="Next month"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                    {renderCalendarMonth(viewMonth)}
                  </div>
                  <div className="flex gap-2 justify-end border-t border-[#e8bfd5] pt-4">
                    <button
                      onClick={() => setCalendarOpen(false)}
                      className="px-3 py-1.5 text-xs font-medium text-[#8a5f79] hover:bg-[#f8eef4] rounded-lg transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleApplyDates}
                      className="px-3 py-1.5 text-xs font-medium bg-[#840d5c] text-white rounded-lg hover:bg-[#6d0b4b] transition"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
        <button
          onClick={() => setPreviewOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-[#e8bfd5] bg-white px-3 py-2 text-xs font-medium text-[#840d5c] shadow-sm transition-colors hover:bg-[#f8eef4]"
        >
          <Eye className="w-4 h-4" />
          <span className="hidden sm:inline">Preview</span>
        </button>
        <button
          onClick={onExport}
          className="flex items-center gap-2 rounded-xl bg-[#840d5c] px-3 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-[#6d0b4b]"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Export Report</span>
        </button>
      </div>

      {previewOpen && reportPreview && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#4f0838]/45 p-3 sm:items-center sm:p-4">
          <div className="my-3 flex max-h-[calc(100vh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[#e8bfd5] bg-white p-4 shadow-2xl sm:my-0 sm:max-h-[calc(100vh-2rem)] sm:p-6">
            <div className="flex items-start justify-between gap-4 border-b border-[#e8bfd5] pb-4">
              <div>
                <h2 className="text-xl font-bold text-[#2f1126]">Sales Report Preview</h2>
                <p className="mt-1 text-xs text-[#8a5f79]">{reportPreview.period}</p>
              </div>
              <button
                onClick={() => setPreviewOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#e8bfd5] text-[#8a5f79] hover:bg-[#f8eef4]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 overflow-y-auto pr-1">
              <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
                {reportPreview.metrics.map((metric) => (
                  <div key={metric.title} className="w-40 shrink-0 rounded-xl border border-[#e8bfd5] bg-[#f8eef4] p-3 sm:w-auto sm:rounded-2xl sm:p-4">
                    <p className="truncate text-[9px] font-bold uppercase tracking-[0.16em] text-[#8a5f79] sm:text-[10px] sm:tracking-[0.24em]">{metric.title}</p>
                    <p className="mt-1 truncate text-base font-bold text-[#2f1126] sm:mt-2 sm:text-xl">{metric.value}</p>
                    <p className="mt-1 text-[9px] font-semibold text-[#840d5c] sm:text-[10px]">{metric.percentage}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-[#e8bfd5] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8a5f79]">Category Breakdown</p>
                <div className="mt-3 space-y-2">
                  {reportPreview.channels.map((channel) => (
                    <div key={channel.name} className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: channel.color }} />
                        <span className="truncate text-[#2f1126]">{channel.name}</span>
                      </div>
                      <span className="shrink-0 font-semibold text-[#5c2a46]">₹{channel.value.toLocaleString()} ({channel.percentage})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}