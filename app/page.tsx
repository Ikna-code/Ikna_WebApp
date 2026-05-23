// app/page.tsx
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ProductHero from '@/components/product/ProductHero';
import ProductSelection from '@/components/product/ProductSelection';
import VariantSwitcher from '@/components/product/VariantSwitcher';
import QuizCard from '@/components/utility/QuizCard';
import SizeChart from '@/components/utility/SizeChart';
import ProblemSolver from '@/components/utility/ProblemSolver';
import ChatWidget from '@/components/utility/ChatWidget';
import Review from '@/components/product/Review';
import BannerSection from '@/components/product/BannerSection';
import Banner from '@/components/product/Banner';
import ProductGrid from '@/components/product/ProductGrid';
import IknaLoader from './iknaLoader/page';
// import OpenBanner from '@/components/product/OpenBanner';


// Example product data matching the image
const product = {
  id: 'dynamic-support',
  name: 'THE DYNAMIC SUPPORT,,',
  type: 'New Arrival',
  price: '$68.00',
  rating: 4.9,
  reviews: 824,
  description: 'Nominally dynamic support so plunge and function to fit wint or adaptability.',
  features: [
    { name: 'COMFORT', icon: 'feather' },
    { name: 'SUPPORT', icon: 'bra' },
    { name: 'SHAPING', icon: 'curves' },
  ]
};

export default function Home() {
  return (
    <>
    {/* <IknaLoader/> */}
    <></>
    <div className="flex flex-col min-h-screen bg-ikna-beige text-ikna-dark bg-white text-black">
      <Header />
    
               <Banner />
                 {/* <OpenBanner /> */}
      <ProductGrid />
   

      <main className="flex-grow container mx-auto px-4 py-8 lg:py-12 relative">
        
        {/* Main Grid: This is a strict 2-column grid on desktop, 1 on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-20">
          
          {/* --- LEFT PANEL (Sticky Image Section) --- */}
          <div className="lg:sticky lg:top-32 lg:h-fit relative space-y-8 z-10">
                       {/* <ProductSelection /> */}

            <ProductHero />
            
            {/* <ProductSelection /> */}
          </div>

          {/* --- RIGHT PANEL (Details & Utilities) --- */}
          <div className="space-y-12">
            
            {/* Main Product Info Section */}
            {/* Added 'relative' and 'overflow-hidden' to clip the ribbon if necessary, and 'p-8' for spacing */}


            {/* Fit Finder Utility Section */}
            <section className="space-y-6">
              <h2 className="text-2xl font-serif text-center lg:text-left text-[#321327]">Find Your Perfect Size</h2>
              <div className="grid md:grid-cols-1 gap-6 items-start">
                <QuizCard />
                {/* <ProductHero /> */}
                {/* <SizeChart /> */}
              </div>
            </section>

 {/* <ProductSelection />   */}
            {/* Problem Solver Section */}
            <section className="pt-8 border-t border-ikna-brown-light/30">
              <ProblemSolver />
            </section>
            
          </div>

        </div>

        {/* Customer Reviews Section */}
        <section className="pt-16 mt-16 border-t border-ikna-brown-light/30">
          <Review />
        </section>
      </main>

      <Footer />

      {/* Floating Support Widget */}
      <ChatWidget />
    </div>
    </>
  );
}
