/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');
const { v2: cloudinary } = require('cloudinary');
require('dotenv').config();

const prisma = new PrismaClient();

const SUPABASE_URL = String(process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');

function isCloudinaryUrl(value) {
  return String(value || '').includes('res.cloudinary.com');
}

function normalizeStoragePath(pathOrUrl) {
  const value = String(pathOrUrl || '').trim();
  if (!value) return '';

  if (!value.startsWith('http://') && !value.startsWith('https://')) {
    return value.replace(/\s+/g, '').replace(/^\/+/, '');
  }

  try {
    const url = new URL(value);
    const markers = [
      '/storage/v1/object/public/products/',
      '/storage/v1/object/products/',
      '/storage/v1/render/image/public/products/',
    ];

    for (const marker of markers) {
      const idx = url.pathname.indexOf(marker);
      if (idx >= 0) {
        return url.pathname.slice(idx + marker.length).replace(/\s+/g, '').replace(/^\/+/, '');
      }
    }
  } catch {
    return '';
  }

  return '';
}

function toCloudinaryPublicId(storagePath) {
  return String(storagePath || '').replace(/\.[^.]+$/, '');
}

function toSupabasePublicUrl(storagePath) {
  return `${SUPABASE_URL}/storage/v1/object/public/products/${storagePath}`;
}

async function uploadFromSupabase(storagePath) {
  const sourceUrl = toSupabasePublicUrl(storagePath);
  const publicId = toCloudinaryPublicId(storagePath);

  const uploaded = await cloudinary.uploader.upload(sourceUrl, {
    public_id: publicId,
    overwrite: true,
    resource_type: 'image',
  });

  return {
    storagePath,
    sourceUrl,
    secureUrl: uploaded.secure_url,
    publicId: uploaded.public_id,
  };
}

async function main() {
  if (!SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const products = await prisma.product.findMany({
    include: { images: true },
  });

  const pathsToUpload = new Set();

  for (const product of products) {
    if (!isCloudinaryUrl(product.image)) {
      const path = normalizeStoragePath(product.image);
      if (path) pathsToUpload.add(path);
    }

    for (const imageRow of product.images || []) {
      if (!isCloudinaryUrl(imageRow.image_path)) {
        const path = normalizeStoragePath(imageRow.image_path);
        if (path) pathsToUpload.add(path);
      }
    }
  }

  const uploads = new Map();
  let uploadedCount = 0;
  let failedCount = 0;

  for (const path of pathsToUpload) {
    try {
      const uploaded = await uploadFromSupabase(path);
      uploads.set(path, uploaded);
      uploadedCount++;
      console.log(`[UPLOADED] ${path} -> ${uploaded.publicId}`);
    } catch (error) {
      failedCount++;
      console.log(`[FAILED] ${path} -> ${error.message}`);
    }
  }

  let productUpdates = 0;
  let imageUpdates = 0;

  for (const product of products) {
    if (!isCloudinaryUrl(product.image)) {
      const path = normalizeStoragePath(product.image);
      const uploaded = uploads.get(path);
      if (uploaded) {
        await prisma.product.update({
          where: { id: product.id },
          data: { image: uploaded.secureUrl },
        });
        productUpdates++;
      }
    }

    for (const imageRow of product.images || []) {
      if (!isCloudinaryUrl(imageRow.image_path)) {
        const path = normalizeStoragePath(imageRow.image_path);
        const uploaded = uploads.get(path);
        if (uploaded) {
          await prisma.productImage.update({
            where: { id: imageRow.id },
            data: {
              image_path: uploaded.secureUrl,
              public_id: uploaded.publicId,
            },
          });
          imageUpdates++;
        }
      }
    }
  }

  console.log('--- Backfill Summary ---');
  console.log(`Unique paths detected: ${pathsToUpload.size}`);
  console.log(`Uploaded to Cloudinary: ${uploadedCount}`);
  console.log(`Upload failures: ${failedCount}`);
  console.log(`Products updated: ${productUpdates}`);
  console.log(`ProductImage rows updated: ${imageUpdates}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
