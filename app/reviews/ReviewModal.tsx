"use client";

import React, { useState, useRef, useEffect } from 'react';
import { X, Star, Camera, Check, Loader2, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { createReview, updateReview } from '@/backend/actions/review';

interface ExistingMediaItem {
  id: string;
  url: string;
}

interface NewMediaPreview {
  file: File;
  previewUrl: string;
  kind: 'image' | 'video';
}

interface ReviewModalProps {
  isOpen: boolean;
  reviewData: any;
  productId: string;
  userId: string;
  onClose: () => void;
}

const ReviewModal = ({ isOpen, reviewData, productId, userId, onClose }: ReviewModalProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    rating: 0,
    author: '',
    title: '',
    content: ''
  });
  
  const [existingMedia, setExistingMedia] = useState<ExistingMediaItem[]>([]);
  const [newMediaPreviews, setNewMediaPreviews] = useState<NewMediaPreview[]>([]);
  const [hover, setHover] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && reviewData) {
      const first = String(reviewData.user?.firstName || '').trim();
      const last = String(reviewData.user?.lastName || '').trim();
      const reviewerName = `${first} ${last}`.trim();

      setFormData({
        rating: reviewData.rating || 0,
        author: reviewerName,
        title: reviewData.title || '',
        content: reviewData.comment || ''
      });

      setExistingMedia(
        Array.isArray(reviewData.images)
          ? reviewData.images
              .map((item: any) => ({
                id: String(item?.id || ''),
                url: String(item?.url || '').trim(),
              }))
              .filter((item: ExistingMediaItem) => Boolean(item.url))
          : []
      );
    } else if (isOpen) {
      setFormData({
        rating: 0,
        author: '',
        title: '',
        content: ''
      });
      setExistingMedia([]);
      setNewMediaPreviews([]);
    }
  }, [isOpen, reviewData]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      newMediaPreviews.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, [newMediaPreviews]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const isVideoUrl = (url: string) => {
    const normalized = String(url || '').toLowerCase();
    return (
      normalized.includes('/video/upload/') ||
      /\.(mp4|webm|mov|m4v|avi|mkv)(\?|#|$)/.test(normalized)
    );
  };

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const remainingSlots = Math.max(0, 3 - (existingMedia.length + newMediaPreviews.length));

      if (remainingSlots === 0) {
        setError('You can upload up to 3 files.');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const filesToProcess = selectedFiles.slice(0, remainingSlots);
      const validPreviews: NewMediaPreview[] = [];
      let rejectedCount = 0;

      for (const file of filesToProcess) {
        const mimeType = String(file.type || '').toLowerCase();
        const isVideo = mimeType.startsWith('video/');
        const isImage = mimeType.startsWith('image/');

        if (!isVideo && !isImage) {
          rejectedCount += 1;
          continue;
        }

        const maxSize = isVideo ? 20 * 1024 * 1024 : 5 * 1024 * 1024;
        if (file.size > maxSize) {
          rejectedCount += 1;
          continue;
        }

        validPreviews.push({
          file,
          previewUrl: URL.createObjectURL(file),
          kind: isVideo ? 'video' : 'image',
        });
      }

      if (rejectedCount > 0) {
        setError('Some files were skipped (allowed: image up to 5MB, video up to 20MB).');
      }

      setNewMediaPreviews((current) => [...current, ...validPreviews]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeNewMedia = (index: number) => {
    setNewMediaPreviews((current) => {
      const media = current[index];
      if (media) {
        URL.revokeObjectURL(media.previewUrl);
      }
      return current.filter((_, i) => i !== index);
    });
  };

  const removeExistingMedia = (mediaId: string) => {
    setExistingMedia((current) => current.filter((item) => item.id !== mediaId));
  };

  const uploadReviewMedia = async (files: File[]) => {
    if (!files.length) return [] as string[];

    const formData = new FormData();
    formData.append('productId', String(productId || '').trim());
    files.forEach((file) => formData.append('files', file));

    const response = await fetch('/api/reviews/media/upload', {
      method: 'POST',
      body: formData,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload?.error || 'Failed to upload media');
    }

    return Array.isArray(payload?.uploadedUrls)
      ? payload.uploadedUrls.map((url: any) => String(url || '').trim()).filter(Boolean)
      : [];
  };

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.rating === 0) {
      setError('Please select a star rating');
      return;
    }

    // Validate productId for new reviews
    if (!reviewData?.id && (!productId || productId.trim() === '')) {
      setError('Unable to create review: No product specified. Please navigate to a specific product page.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const uploadedMediaUrls = await uploadReviewMedia(
        newMediaPreviews.map((item) => item.file)
      );

      const retainedMediaUrls = existingMedia
        .map((item) => String(item.url || '').trim())
        .filter(Boolean);

      const mediaUrls = [...retainedMediaUrls, ...uploadedMediaUrls];

      if (reviewData?.id) {
        await updateReview(
          reviewData.id,
          userId,
          {
            rating: Number(formData.rating),
            title: formData.title,
            comment: formData.content,
            authorName: formData.author,
            mediaUrls,
          }
        );
      } else {
        await createReview(
          userId,
          {
            productId: productId, // <-- Must be an ID that exists in the Product table
            rating: Number(formData.rating),
            title: formData.title,
            comment: formData.content,
            isVerified: false,
            authorName: formData.author,
            mediaUrls,
          }
        );
      }
      
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setExistingMedia([]);
        setNewMediaPreviews([]);
        setFormData({ rating: 0, author: '', title: '', content: '' });
        onClose();
      }, 2500);
    } catch (err: any) {
      setError(err.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6 py-10 sm:py-20 h-full">
      <div className="absolute inset-0 bg-[#321327]/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden max-h-full flex flex-col animate-in fade-in zoom-in duration-300">
        {submitted ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-6">
              <Check size={40} strokeWidth={3} />
            </div>
            <h2 className="text-3xl font-serif text-[#321327]">
              {reviewData ? "Review Updated!" : "Review Submitted!"}
            </h2>
            <p className="text-[#321327]/60 mt-2">Thank you for your feedback.</p>
          </div>
        ) : (
          <>
            <div className="p-6 border-b border-[#840d5c]/5 flex justify-between items-center bg-[#FAF3F5]/30">
              <h2 className="text-xl font-serif text-[#321327]">
                {reviewData ? "Edit Review" : "Write a Review"}
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-[#321327]">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5 overflow-y-auto max-h-[75vh] custom-scrollbar">
              <div className="text-center space-y-2">
                <div className="flex justify-center gap-1 sm:gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button 
                      key={star} 
                      type="button" 
                      onClick={() => setFormData(p => ({ ...p, rating: star }))} 
                      onMouseEnter={() => setHover(star)} 
                      onMouseLeave={() => setHover(0)}
                      className="transition-transform active:scale-90"
                    >
                      <Star 
                        size={36} 
                        fill={(hover || formData.rating) >= star ? "#840d5c" : "none"} 
                        stroke={(hover || formData.rating) >= star ? "#840d5c" : "#321327"} 
                        strokeWidth={1.5} 
                      />
                    </button>
                  ))}
                </div>
                {error && <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">{error}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase text-[#321327]/40 ml-2">Name</label>
                <input 
                  required 
                  name="author" 
                  value={formData.author} 
                  onChange={handleChange} 
                  type="text" 
                  placeholder="Your Name" 
                  className="w-full px-5 py-3 rounded-2xl bg-[#FAF3F5] text-[#321327] font-medium text-sm outline-none focus:ring-2 ring-[#840d5c]/10 transition-all placeholder:text-[#321327]/30" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase text-[#321327]/40 ml-2">Feedback</label>
                <textarea 
                  required 
                  name="content" 
                  value={formData.content} 
                  onChange={handleChange} 
                  rows={3} 
                  placeholder="Tell us more about the fit and feel..." 
                  className="w-full px-5 py-3 rounded-2xl bg-[#FAF3F5] text-[#321327] font-medium text-sm outline-none resize-none focus:ring-2 ring-[#840d5c]/10 transition-all placeholder:text-[#321327]/30" 
                />
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center px-2">
                   <p className="text-[10px] font-bold uppercase tracking-widest text-[#321327]/40">Add Photos or Videos</p>
                   <p className="text-[9px] text-[#321327]/30">{existingMedia.length + newMediaPreviews.length}/3</p>
                </div>
                
                <div className="flex gap-3 flex-wrap">
                  {existingMedia.map((item) => (
                    <div key={item.id} className="relative w-20 h-20 rounded-2xl overflow-hidden border border-[#840d5c]/10 shadow-sm group bg-[#f5e9ef]">
                      {isVideoUrl(item.url) ? (
                        <video src={item.url} className="h-full w-full object-cover" muted playsInline />
                      ) : (
                        <Image src={item.url} alt="preview" fill className="object-cover" />
                      )}
                      <button 
                        type="button" 
                        onClick={() => removeExistingMedia(item.id)}
                        className="absolute top-1 right-1 bg-white/90 text-red-500 p-1.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}

                  {newMediaPreviews.map((item, index) => (
                    <div key={item.previewUrl} className="relative w-20 h-20 rounded-2xl overflow-hidden border border-[#840d5c]/10 shadow-sm group bg-[#f5e9ef]">
                      {item.kind === 'video' ? (
                        <video src={item.previewUrl} className="h-full w-full object-cover" muted playsInline />
                      ) : (
                        <Image src={item.previewUrl} alt="preview" fill className="object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => removeNewMedia(index)}
                        className="absolute top-1 right-1 bg-white/90 text-red-500 p-1.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleMediaChange} 
                    accept="image/*,video/*" 
                    multiple 
                    className="hidden" 
                  />
                  
                  {existingMedia.length + newMediaPreviews.length < 3 && (
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-20 h-20 border-2 border-dashed border-[#840d5c]/20 rounded-2xl flex flex-col items-center justify-center text-[#840d5c] hover:bg-[#FAF3F5] hover:border-[#840d5c]/40 transition-all"
                    >
                      <Camera size={24} strokeWidth={1.5} />
                      <span className="text-[8px] font-bold uppercase mt-1">Upload</span>
                    </button>
                  )}
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-4 bg-[#840d5c] text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-[#840d5c]/20 disabled:opacity-50 flex items-center justify-center gap-3 active:scale-[0.98] transition-all mt-4"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (reviewData ? "Update Review" : "Submit Review")}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ReviewModal;