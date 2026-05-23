  "use server"
  import { db } from "@/backend/lib/db";
  import { revalidatePath } from "next/cache";
  import { supabase } from '../lib/supabaseClient';

  // --- MIDDLEWARE-LIKE ROLE CHECK ---
  async function verifyAdmin() {
    // Logic: Get session from your Auth provider (Clerk/Auth.js)
    // For now, we simulate a check:
    const isAdmin = true; // Replace with: session?.user.role === 'ADMIN'
    if (!isAdmin) throw new Error("Unauthorized");
  }

  // 🟢 CREATE
  export async function createProduct(data: any) {
    await verifyAdmin();
    const product = await db.product.create({ data });
    revalidatePath("/"); 
    return product;
  }

  // 🔵 READ (Public)
  export async function getAllProducts() {
    return await db.product.findMany({
      include: {
        reviews: {
          select: {
            rating: true // We only need the rating to calculate the average
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // 🟡 UPDATE
  export async function updateProduct(id: string, data: any) {
    await verifyAdmin();
    await db.product.update({ where: { id }, data });
    revalidatePath("/");
  }

  // 🔴 DELETE
  export async function deleteProduct(id: string) {
    await verifyAdmin();
    await db.product.delete({ where: { id } });
    revalidatePath("/");
  }

  export const getProductWithImages = async (productId: string) => {
    const { data, error } = await supabase
      .from('Product') // Note the capital "P" as per your SQL
      .select(`
        *,
        product_images (
          image_path,
          is_primary
        )
      `)
      .eq('id', productId)
      .single();

    if (error) {
      console.error("Error fetching product:", error);
      return null;
    }

    return data;
  };

  export const getAllProductsWithPrimaryImage = async () => {
    const { data, error } = await supabase
      .from('Product')
      .select(`
        *,
        product_images(image_path, is_primary)
      `)
      // This syntax tells Supabase: "Only include the images where is_primary is true"
      .filter('product_images.is_primary', 'eq', true);

    if (error) {
      console.error("Error fetching products:", error);
      return []; // Return empty array instead of null to prevent .map errors
    }

    return data;
  };

  export async function getProductReviewStats(productId: string) {
    const [stats, breakdown, recentReviews] = await Promise.all([
      // 1. Get the average rating and total count
      db.review.aggregate({
        where: { productId },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      
      // 2. Get the count for each star (5, 4, 3, 2, 1) for the bars
      db.review.groupBy({
        by: ['rating'],
        where: { productId },
        _count: { rating: true },
      }),

      // 3. Get the actual reviews to display
      db.review.findMany({
        where: { productId },
        orderBy: { createdAt: 'desc' },
        take: 10, // Load first 10
      })
    ]);

    return {
      average: stats._avg.rating || 0,
      totalCount: stats._count._all,
      breakdown,
      reviews: recentReviews
    };
  }