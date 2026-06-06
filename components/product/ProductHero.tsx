// ProductHero.tsx
import Image from 'next/image';

interface ProductHeroProps {
  currentImage?: string;
  productName?: string;
}
const ProductHero = ({ 
  currentImage = "/images/beach.jpeg", 
  productName = "The Dynamic Support..." 
}: ProductHeroProps) => {
  return (
    // Add z-0 here to establish a new stacking context for the whole group
    <div className="relative w-full z-0"> 
      
      {/* Main Image Container */}
      {/* ADD z-10 here so the image sits ABOVE the arch */}
      <div className="relative z-10 aspect-[4/5] w-full overflow-hidden bg-ikna-cream rounded-sm shadow-sm">
        <Image
          src={currentImage}
          alt={`${productName} - Confidence Preview`}
          fill
          priority
          className="object-cover object-center transition-opacity duration-500"
          sizes="800px"
        />
        
        {/* ... (Tags and Indicators stay the same) ... */}
      </div>

      {/* Decorative Architectural Element */}
      {/* Change -z-10 to z-0 so it's above the page background but below the image (z-10) */}
      {/* <div className="absolute z-0 -top-6 -left-6 w-72 h-96 border border-ikna-brown-light/30 rounded-t-full hidden lg:block" /> */}
    </div>
  );
};

export default ProductHero;