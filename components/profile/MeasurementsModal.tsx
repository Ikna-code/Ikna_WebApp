'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, ChevronDown } from 'lucide-react';
import { saveMeasurements } from '@/backend/actions/measurements';

interface MeasurementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (measurements: any) => void;
  initialData?: {
    bustCm?: number;
    underburstCm?: number;
    waistCm?: number;
    waistInches?: number;
    hipsCm?: number;
    inseamCm?: number;
  };
}

const MeasurementsModal: React.FC<MeasurementsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData = {},
}) => {
  const normalizedInitialData = initialData ?? {};
  const [bust, setBust] = useState(normalizedInitialData.bustCm || '91');
  const [underbust, setUnderbust] = useState(normalizedInitialData.underburstCm || '76');
  
  // Waist unit toggle and value state
  const [waistUnit, setWaistUnit] = useState<'cm' | 'inches'>('cm');
  const [waistValue, setWaistValue] = useState(
    normalizedInitialData.waistCm || normalizedInitialData.waistInches || ''
  );
  
  const [hips, setHips] = useState(normalizedInitialData.hipsCm || '95');
  const [inseam, setInseam] = useState(normalizedInitialData.inseamCm || '75');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    setBust(normalizedInitialData.bustCm || '91');
    setUnderbust(normalizedInitialData.underburstCm || '76');
    setWaistValue(normalizedInitialData.waistCm || normalizedInitialData.waistInches || '');
    setHips(normalizedInitialData.hipsCm || '95');
    setInseam(normalizedInitialData.inseamCm || '75');
    setError('');
  }, [isOpen, normalizedInitialData]);

  const handleSave = async () => {
    setIsLoading(true);
    setError('');

    const calculatedWaistCm = waistUnit === 'cm' ? parseFloat(String(waistValue)) : undefined;
    const calculatedWaistInches = waistUnit === 'inches' ? parseFloat(String(waistValue)) : undefined;

    try {
      const response = await saveMeasurements({
        bustCm: bust ? parseFloat(String(bust)) : undefined,
        underburstCm: underbust ? parseFloat(String(underbust)) : undefined,
        waistCm: calculatedWaistCm,
        waistInches: calculatedWaistInches,
        hipsCm: hips ? parseFloat(String(hips)) : undefined,
        inseamCm: inseam ? parseFloat(String(inseam)) : undefined,
      });

      if (!response?.success) {
        setError(response?.error || 'Failed to save measurements');
        return;
      }

      onSave({
        bustCm: bust,
        underburstCm: underbust,
        waistCm: calculatedWaistCm,
        waistInches: calculatedWaistInches,
        hipsCm: hips,
        inseamCm: inseam,
      });

      onClose();
    } catch (err) {
      setError('An error occurred while saving');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Container */}
      <div className="relative bg-[#FAF6F7] rounded-xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto flex flex-col font-sans text-[#331424]">
        
        {/* Header */}
        <div className="relative p-6 pb-4 border-b border-gray-100 bg-white flex justify-between items-center rounded-t-xl">
          <h2 className="text-md font-serif font-semibold tracking-wider text-[#331424]">
            UPDATE YOUR MEASUREMENTS PROFILE
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body Split View */}
        <div className="p-6 flex gap-6 bg-white flex-1">
          {/* Left Column: Inputs */}
          <div className="flex-1 space-y-5">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold tracking-wider uppercase text-[#331424]">YOUR MEASUREMENTS</span>
            </div>

            {error && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {error}
              </div>
            )}

            {/* Topwear/Bras Section */}
            <div>
              <h3 className="text-xs font-bold text-[#331424] mb-2">Topwear/Bras</h3>
              <div className="space-y-2">
                {/* Bust */}
                <div className="flex border border-gray-300 rounded-lg overflow-hidden bg-white h-10 focus-within:border-gray-400">
                  <div className="w-[120px] bg-[#FCF7F8] px-3 flex items-center border-r border-gray-200 gap-2 text-xs text-[#331424]">
                    <span>👙</span> <span>Bust</span>
                  </div>
                  <input
                    type="number"
                    value={bust}
                    onChange={(e) => setBust(e.target.value)}
                    className="flex-1 px-3 text-right text-sm font-medium focus:outline-none"
                  />
                  <div className="px-3 flex items-center text-xs text-gray-500 bg-white">cm</div>
                </div>

                {/* Underburst */}
                <div className="flex border border-gray-300 rounded-lg overflow-hidden bg-white h-10 focus-within:border-gray-400">
                  <div className="w-[120px] bg-[#FCF7F8] px-3 flex items-center border-r border-gray-200 gap-2 text-xs text-[#331424]">
                    <span>🩱</span> <span>Underbust</span>
                  </div>
                  <input
                    type="number"
                    value={underbust}
                    onChange={(e) => setUnderbust(e.target.value)}
                    className="flex-1 px-3 text-right text-sm font-medium focus:outline-none"
                  />
                  <div className="px-3 flex items-center text-xs text-gray-500 bg-white">cm</div>
                </div>

                {/* Waist with Unit Selection */}
                <div className="flex border border-gray-300 rounded-lg overflow-hidden bg-white h-10 focus-within:border-gray-400">
                  <div className="w-[120px] bg-[#FCF7F8] px-3 flex items-center border-r border-gray-200 gap-2 text-xs text-[#331424]">
                    <span>🩲</span> <span>Waist</span>
                  </div>
                  <input
                    type="number"
                    value={waistValue}
                    onChange={(e) => setWaistValue(e.target.value)}
                    placeholder="—"
                    className="flex-1 px-3 text-right text-sm font-medium focus:outline-none"
                  />
                  <div className="relative flex items-center bg-white border-l border-gray-100">
                    <select
                      value={waistUnit}
                      onChange={(e) => setWaistUnit(e.target.value as 'cm' | 'inches')}
                      className="appearance-none pl-3 pr-7 py-1 text-xs text-gray-500 bg-transparent focus:outline-none cursor-pointer font-medium"
                    >
                      <option value="cm">cm /inches</option>
                      <option value="inches">inches</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottomwear Section */}
            <div className="pt-2">
              <h3 className="text-xs font-bold text-[#331424] mb-2">Bottomwear</h3>
              <div className="space-y-2">
                {/* Hips */}
                <div className="flex border border-gray-300 rounded-lg overflow-hidden bg-white h-10 focus-within:border-gray-400">
                  <div className="w-[120px] bg-[#FCF7F8] px-3 flex items-center border-r border-gray-200 gap-2 text-xs text-[#331424]">
                    <span>🩳</span> <span>Hips</span>
                  </div>
                  <input
                    type="number"
                    value={hips}
                    onChange={(e) => setHips(e.target.value)}
                    className="flex-1 px-3 text-right text-sm font-medium focus:outline-none"
                  />
                  <div className="px-3 flex items-center text-xs text-gray-500 bg-white">cm</div>
                </div>

                {/* Inseam */}
                <div className="flex border border-gray-300 rounded-lg overflow-hidden bg-white h-10 focus-within:border-gray-400">
                  <div className="w-[120px] bg-[#FCF7F8] px-3 flex items-center border-r border-gray-200 gap-2 text-xs text-[#331424]">
                    <span>👖</span> <span>Inseam</span>
                  </div>
                  <input
                    type="number"
                    value={inseam}
                    onChange={(e) => setInseam(e.target.value)}
                    className="flex-1 px-3 text-right text-sm font-medium focus:outline-none"
                  />
                  <div className="px-3 flex items-center text-xs text-gray-500 bg-white">cm</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Model Silhouette Graphic Diagram */}

        </div>

        {/* Footer Actions */}
        <div className="p-6 pt-2 bg-white flex gap-4 rounded-b-xl">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-2.5 rounded-full border border-gray-300 text-gray-500 font-medium uppercase text-xs tracking-wider hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex-1 px-6 py-2.5 rounded-full bg-[#5A2241] text-white font-medium uppercase text-xs tracking-wider hover:bg-[#40182E] transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 size={14} className="animate-spin" />}
            Save & Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default MeasurementsModal;