"use client";
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import { Heart, ShoppingBag, Star, ShieldCheck, Truck, ChevronLeft, MessageSquare } from 'lucide-react';
import ReviewSection from '@/app/reviews/page';
import { getProductWithImages } from "@/backend/actions/products";
import { addToCart } from "@/backend/actions/order";
import { IMAGE_BASE_URL } from '@/public/constants/constants';
import { createClient } from '@/backend/lib/supabaseClient'; // 1. Import Supabase
import { useStore } from '@/store/useStore';

// --- ICONS OMITTED FOR BREVITY ---
const BreathableIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"> <path d="M12 3v10M12 3l-3 3M12 3l3 3" /> <circle cx="12" cy="16" r="5" strokeDasharray="2 2" /> <path d="M8 16h8" opacity="0.5" /> </svg>);
const MeshIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"> <path d="M4 8h16M4 12h16M4 16h16M8 4v16M12 4v16M16 4v16" strokeDasharray="1 2" /> <path d="M3 3l18 18" opacity="0.3" /> </svg>);
const SmoothingIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"> <path d="M4 12h12M13 9l3 3-3 3" /> <path d="M20 5c-2 2-2 12 0 14" strokeLinecap="round" /> <path d="M4 5c1 2 1 12 0 14" opacity="0.3" /> </svg>);
const SupportIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"> <path d="M6 18c2-4 10-4 12 0" /> <path d="M12 18V8M12 8l-2 2M12 8l2 2" strokeWidth="1.5" /> <rect x="5" y="18" width="14" height="2" rx="1" fill="currentColor" fillOpacity="0.1" /> </svg>);
const DetachableIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"> <path d="M9 4h6v4H9z" /> <path d="M12 8v12" strokeDasharray="3 2" /> <path d="M8 12l2-2 2 2" opacity="0.5" /> </svg>);

const SingleProductPage = () => {
    const { id } = useParams();
    const router = useRouter();
    const supabase = createClient(); // 2. Initialize Supabase

    const [activeImgIdx, setActiveImgIdx] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [productData, setProductData] = useState<any>(null);
    const reviewRef = useRef<HTMLDivElement>(null);
    const [selectedSize, setSelectedSize] = useState<string>('');
    const [isAdding, setIsAdding] = useState(false);

    // 3. State for Real User ID
    const [userId, setUserId] = useState<string | null>(null);
    const { addItemToCart, isLoading } = useStore(); // Access the slice


    const braFeatures = [
        { icon: <BreathableIcon />, label: "Breathable Cups" },
        { icon: <MeshIcon />, label: "Cotton Mesh" },
        { icon: <SmoothingIcon />, label: "Side Smoothing" },
        { icon: <SupportIcon />, label: "High Support" },
        { icon: <DetachableIcon />, label: "Detachable Straps" },
    ];

    useEffect(() => {
        const initPage = async () => {
            try {
                // 4. Get Authenticated User
                const { data: { user } } = await supabase.auth.getUser();
                if (user) setUserId(user.id);

                // Fetch Product Data
                const data = await getProductWithImages(id?.toString() || "");
                setProductData(data);
            } catch (error) {
                console.error("Initialization error:", error);
            }
        };
        initPage();
    }, [id, supabase.auth]);

    const product = useMemo(() => {
        return productData && productData.id === id ? productData : null;
    }, [productData, id]);

    const scrollToReviews = () => {
        reviewRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // const handleAddToBag = async () => {
    //     // 5. Auth Check
    //     if (!userId) {
    //         alert("Please login to add items to your bag.");
    //         router.push('/login'); // Or your login path
    //         return;
    //     }

    //     if (!selectedSize) {
    //         alert("Please select a size first");
    //         return;
    //     }

    //     const productId = Array.isArray(id) ? id[0] : id;
    //     if (!productId) return;

    //     setIsAdding(true);
    //     try {
    //         const result = await addToCart(userId, productId, selectedSize, 1);

    //         if (result.success) {
    //             alert(`Added ${selectedSize} to bag successfully!`);
    //         } else {
    //             alert(result.error || "Failed to add item");
    //         }
    //     } catch (err) {
    //         console.error("Client side error:", err);
    //         alert("An unexpected error occurred");
    //     } finally {
    //         setIsAdding(false);
    //     }
    // };

    // Inside your SingleProductPage component

const handleAddToBag = async () => {
    if (!userId) {
        alert("Please login first");
        return;
    }
    if (!selectedSize) {
        alert("Please select a size");
        return;
    }

    // This one line handles the DB update AND the global UI state
    await addItemToCart(userId, product.id, selectedSize, 1);
    
    // Optional: Show success feedback
    if (!useStore.getState().error) {
        alert("Added to bag!");
    }
};

    if (!product) return (
        <div className="min-h-screen flex items-center justify-center bg-[#F9F3F5]">
            <div className="animate-pulse text-[#840d5c] font-bold tracking-widest">LOADING PRODUCT...</div>
        </div>
    );

    return (
        <div className="bg-[#F9F3F5] min-h-screen flex flex-col">
            <Header />

            <main className="flex-grow flex flex-col px-4 md:px-8 pb-12">
                <div className="max-w-[1440px] mx-auto w-full">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#321327]/60 py-3 md:py-6 transition-colors hover:text-[#840d5c]"
                    >
                        <ChevronLeft size={12} /> Back to Collection
                    </button>
                </div>

                <div className="max-w-[1440px] mx-auto w-full space-y-8">
                    <div className="flex flex-col lg:flex-row gap-8 bg-white p-2 lg:p-10 rounded-[3rem] shadow-sm border border-[#840d5c]/5">

                        {/* GALLERY */}
                        <div className="flex flex-col-reverse md:flex-row gap-6 lg:w-[60%]">
                            <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto no-scrollbar md:w-24">
                                {productData?.product_images?.map((fileName: { image_path: string }, index: number) => (
                                    <button
                                        key={index}
                                        onClick={() => setActiveImgIdx(index)}
                                        className={`relative w-16 h-20 md:w-full md:h-28 flex-shrink-0 rounded-2xl overflow-hidden border-2 transition-all duration-300 ${activeImgIdx === index ? 'border-[#840d5c] shadow-lg' : 'border-transparent opacity-40 hover:opacity-100'
                                            }`}
                                    >
                                        <Image src={`${IMAGE_BASE_URL}/${fileName.image_path}`} alt="thumb" fill className="object-cover" />
                                    </button>
                                ))}
                            </div>

                            <div className="relative flex-grow aspect-[4/5] md:aspect-auto  rounded-[2rem] overflow-hidden group">
                                <div className="absolute top-0 bottom-0 right-1 md:right-6 z-20 flex flex-col justify-center gap-6 my-auto">
                                    {braFeatures.map((feature, i) => (
                                        <div key={i} className="group/feat relative flex items-center justify-center">
                                            <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-white/95 backdrop-blur-md shadow-xl border border-[#840d5c]/5 flex items-center justify-center text-[#840d5c] hover:bg-[#840d5c] hover:text-white transition-all duration-500 cursor-help">
                                                {feature.icon}
                                            </div>
                                            <span className="absolute right-16 whitespace-nowrap bg-[#321327] text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-xl opacity-0 translate-x-4 group-hover/feat:opacity-100 group-hover/feat:translate-x-0 transition-all pointer-events-none shadow-2xl">
                                                {feature.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <Image
                                    src={`${IMAGE_BASE_URL}/${productData?.product_images[activeImgIdx]?.image_path}`}
                                    alt="Product Main Image"
                                    fill
                                    priority
                                    className="object-contain p-8 transition-transform duration-1000 group-hover:scale-110"
                                />
                            </div>
                        </div>

                        {/* DETAILS */}
                        <div className="lg:w-[40%] flex flex-col justify-center">
                            <div className="space-y-8">
                                <header className="space-y-3">
                                    <p className="text-[11px] font-bold tracking-[0.4em] text-[#840d5c] uppercase opacity-70">Signature Collection</p>
<h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif text-[#321327] leading-tight md:leading-[1.1]">
  {product.name}
</h1>
                                    <button onClick={scrollToReviews} className="flex items-center gap-3 hover:opacity-70 transition-opacity">
                                        <div className="flex text-[#840d5c]">
                                            {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" strokeWidth={0} />)}
                                        </div>
                                        <span className="text-[10px] font-bold text-[#321327] tracking-widest uppercase border-b border-[#321327]/20 pb-0.5">824 Reviews</span>
                                    </button>
                                </header>

                                <div className="border-y border-[#840d5c]/10 py-4">
                                    <div className="flex items-baseline gap-3">
<span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#321327] tracking-tighter">
  Rs.{product.price}
</span>                                        <span className="text-sm text-[#321327]/40 line-through">Rs.485.00</span>
                                    </div>
                                    <p className="text-[13px] text-[#321327]/60 mt-4 leading-relaxed font-medium">
                                        {product.description || "Crafted with our proprietary seamless technology for a second-skin feel."}
                                    </p>
                                </div>

<div className="space-y-4 md:space-y-6">
    {/* Label Row */}
    <div className="flex justify-between items-center text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-[#321327]">
        <span>Select Size</span>
        <button className="text-[#840d5c] underline decoration-2 underline-offset-4">Size Guide</button>
    </div>

    {/* Size Grid: Reduced padding for mobile */}
    <div className="grid grid-cols-4 gap-2 md:gap-3 text-black">
        {['XS', 'S', 'M', 'L'].map((size) => (
            <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={`py-2.5 md:py-4 border-2 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm transition-all active:scale-95 ${
                    selectedSize === size
                        ? 'border-[#840d5c] text-[#840d5c] bg-[#840d5c]/5'
                        : 'border-[#321327]/5 hover:border-[#840d5c]/30'
                }`}
            >
                {size}
            </button>
        ))}
    </div>

    {/* Action Buttons: Scaled padding and font-size */}
    <div className="flex flex-col gap-3 md:gap-4 pt-2 md:pt-4">
        <button
            onClick={handleAddToBag}
            disabled={isAdding}
            className={`w-full text-white py-3.5 md:py-5 rounded-full font-bold uppercase tracking-[0.2em] md:tracking-[0.25em] text-[10px] md:text-[11px] flex items-center justify-center gap-3 shadow-xl md:shadow-2xl transition-all active:scale-[0.98] ${
                isAdding ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#840d5c] hover:bg-[#321327] shadow-[#840d5c]/30'
            }`}
        >
            <ShoppingBag size={18} className="md:w-5 md:h-5" />
            {isAdding ? 'Adding...' : 'Add To Bag'}
        </button>

        <button
            onClick={() => setIsModalOpen(true)}
            className="w-full bg-white border-2 border-[#321327]/10 text-[#321327] py-3.5 md:py-5 rounded-full font-bold uppercase tracking-[0.2em] md:tracking-[0.25em] text-[10px] md:text-[11px] flex items-center justify-center gap-3 hover:border-[#840d5c] hover:text-[#840d5c] transition-all"
        >
            <MessageSquare size={16} className="md:w-[18px] md:h-[18px]" /> Write A Review
        </button>
    </div>
</div>

                                <div className="grid grid-cols-2 gap-4 pt-0 md:pt-4 pb-4">
                                    <div className="flex items-center gap-4 p-2 bg-[#F9F3F5] rounded-[1.5rem] border border-[#840d5c]/5 ">
                                        <Truck size={22} className="text-[#840d5c]" />
                                        <span className="text-[9px] font-bold uppercase text-[#321327]/60 leading-tight tracking-wider">Express <br />Shipping</span>
                                    </div>
                                    <div className="flex items-center gap-4 p-2 bg-[#F9F3F5] rounded-[1.5rem] border border-[#840d5c]/5">
                                        <ShieldCheck size={22} className="text-[#840d5c]" />
                                        <span className="text-[9px] font-bold uppercase text-[#321327]/60 leading-tight tracking-wider">Quality <br />Assured</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div ref={reviewRef}>
                        <ReviewSection productId={id} />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SingleProductPage;