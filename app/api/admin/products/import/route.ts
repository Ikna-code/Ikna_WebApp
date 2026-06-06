import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Role, Prisma } from '@prisma/client';
import { ensureCurrentDbUser } from '@/backend/lib/ensureDbUser';
import { extractCloudinaryPublicId, uploadImage } from '@/src/lib/cloudinary';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();
const DEFAULT_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1567016549366-5f3194bab37b?w=400&auto=format&fit=crop';
const PRODUCT_IMAGES_PREFIX = 'product_photos';

async function requireAdmin() {
  const dbUser = await ensureCurrentDbUser();

  if (!dbUser || dbUser.role !== Role.ADMIN) {
    return null;
  }

  return dbUser.id;
}

function normalizeHeader(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseSizes(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  }

  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseImageNames(value: unknown) {
  return String(value || '')
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getBaseName(value: string) {
  const normalized = String(value || '').replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  return (parts[parts.length - 1] || '').toLowerCase();
}

function parseImageTokens(value: unknown) {
  return String(value || '')
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeImageToken(value: string) {
  const input = String(value || '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/\\/g, '/')
    .toLowerCase();

  try {
    return decodeURIComponent(input);
  } catch {
    return input;
  }
}

function removeFileExtension(value: string) {
  const input = String(value || '').trim();
  const index = input.lastIndexOf('.');
  return index > 0 ? input.slice(0, index) : input;
}

function parseNumericFolder(pathOrUrl: string) {
  const input = String(pathOrUrl || '');
  if (!input) return null;

  const cleaned = input.replace(/^https?:\/\/[^/]+\/?/, '');
  const parts = cleaned.split('/').filter(Boolean);

  for (let index = 0; index < parts.length; index += 1) {
    if (parts[index] === 'product_photos' && parts[index + 1] && /^\d+$/.test(parts[index + 1])) {
      return Number(parts[index + 1]);
    }
  }

  if (parts[0] && /^\d+$/.test(parts[0])) {
    return Number(parts[0]);
  }

  return null;
}

function sanitizeStorageFolderName(value: string) {
  return String(value || '')
    .trim()
    .replace(/[\\/]/g, '-')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function getNextImageFolderId() {
  const products = await prisma.product.findMany({
    select: {
      image: true,
      images: {
        select: {
          image_path: true,
        },
      },
    },
  });

  let maxFolder = 0;

  for (const product of products) {
    const fromImage = parseNumericFolder(product.image);
    if (fromImage) maxFolder = Math.max(maxFolder, fromImage);

    for (const image of product.images) {
      const fromImagePath = parseNumericFolder(image.image_path);
      if (fromImagePath) maxFolder = Math.max(maxFolder, fromImagePath);
    }
  }

  return Math.max(200001, maxFolder + 1);
}

export async function POST(request: NextRequest) {
  const adminId = await requireAdmin();

  if (!adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const excelFile = formData.get('excelFile');

    if (!(excelFile instanceof File)) {
      return NextResponse.json({ error: 'Excel file is required (excelFile).' }, { status: 400 });
    }

    const uploadedImageFiles = formData
      .getAll('images')
      .filter((entry): entry is File => entry instanceof File);

    const imagesByName = new Map<string, File>();
    for (const file of uploadedImageFiles) {
      const normalizedName = normalizeImageToken(file.name);
      if (normalizedName) {
        imagesByName.set(normalizedName, file);
      }

      const baseName = normalizeImageToken(getBaseName(file.name));
      if (baseName) {
        imagesByName.set(baseName, file);
        imagesByName.set(removeFileExtension(baseName), file);
      }

      imagesByName.set(removeFileExtension(normalizedName), file);
    }

    const workbook = XLSX.read(await excelFile.arrayBuffer(), { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      return NextResponse.json({ error: 'Excel file does not contain any sheets.' }, { status: 400 });
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

    if (!rows.length) {
      return NextResponse.json({ error: 'Excel file has no data rows.' }, { status: 400 });
    }

    let nextFolderId = await getNextImageFolderId();

    const createdProducts: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const normalizedRow = Object.fromEntries(
        Object.entries(row).map(([key, value]) => [normalizeHeader(key), value])
      );

      const providedId = String(normalizedRow.id || '').trim();
      const name = String(normalizedRow.name || '').trim();
      const description = String(normalizedRow.description || '').trim();
      const category = String(normalizedRow.category || 'Bras').trim() || 'Bras';
      const tag = String(normalizedRow.tag || '').trim();
      const price = toNumber(normalizedRow.price);
      const stock = toNumber(normalizedRow.stock);
      const rating = toNumber(normalizedRow.rating);
      const sizes = parseSizes(normalizedRow.sizes);
      const imageCell = String(normalizedRow.image || '').trim();
      const imageTokens = parseImageTokens(imageCell);
      const imageNames = parseImageNames(imageCell);

      if (!name || !description || price === null || stock === null) {
        errors.push(`Row ${index + 2}: missing required fields (name, price, stock, description).`);
        continue;
      }

      const sanitizedProvidedId = sanitizeStorageFolderName(providedId);
      const folderName = sanitizedProvidedId || String(nextFolderId);
      if (!sanitizedProvidedId) {
        nextFolderId += 1;
      }

      let rowImages = imageNames
        .map((imageName) => {
          const normalized = normalizeImageToken(imageName);
          const normalizedBase = normalizeImageToken(getBaseName(normalized));

          const candidates = [
            normalized,
            normalizedBase,
            removeFileExtension(normalized),
            removeFileExtension(normalizedBase),
          ].filter(Boolean);

          for (const candidate of candidates) {
            const matched = imagesByName.get(candidate);
            if (matched) {
              return matched;
            }
          }

          return null;
        })
        .filter((file): file is File => Boolean(file));

      if (!rowImages.length && rows.length === 1 && uploadedImageFiles.length > 0) {
        rowImages = uploadedImageFiles;
      }

      const hasUploadedImageMatch = rowImages.length > 0;
      const explicitPrimaryImage = !hasUploadedImageMatch ? imageCell : '';

      const imagePaths: string[] = [];
      const uploadedImages: Array<{ url: string; publicId: string }> = [];

      for (let imageIndex = 0; imageIndex < rowImages.length; imageIndex += 1) {
        const file = rowImages[imageIndex];
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        try {
          const uploaded = await uploadImage(file, {
            folder: `${PRODUCT_IMAGES_PREFIX}/${folderName}`,
            fileName: `${Date.now()}-${imageIndex}-${safeName}`,
          });

          imagePaths.push(uploaded.url);
          uploadedImages.push(uploaded);
        } catch (error: any) {
          errors.push(`Row ${index + 2}: image upload failed for ${file.name}: ${error?.message || 'Unknown error'}`);
          continue;
        }
      }

      const primaryImagePath =
        explicitPrimaryImage || imagePaths[0] || DEFAULT_PRODUCT_IMAGE;

      if (imageTokens.length && !hasUploadedImageMatch && !explicitPrimaryImage.startsWith('http')) {
        warnings.push(
          `Row ${index + 2}: image names in Excel did not match uploaded folder files.`
        );
      }

      try {
        const createData = {
          name,
          description,
          price,
          stock: Math.trunc(stock),
          category,
          tag: tag || null,
          rating,
          image: primaryImagePath,
          sizes,
          images: imagePaths.length
            ? {
                create: imagePaths.map((path, imageIndex) => ({
                  image_path: path,
                  public_id: uploadedImages[imageIndex]?.publicId || extractCloudinaryPublicId(path) || null,
                  is_primary: imageIndex === 0,
                })),
              }
            : undefined,
        };

        try {
          const created = await prisma.product.create({
            data: {
              id: providedId || undefined,
              ...createData,
            },
          });

          createdProducts.push(created.id);
        } catch (error) {
          const isDuplicateIdError =
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002' &&
            String(error.meta?.target || '').includes('id');

          if (!isDuplicateIdError) {
            throw error;
          }

          const created = await prisma.product.create({
            data: createData,
          });

          createdProducts.push(created.id);
          errors.push(
            `Row ${index + 2}: provided id '${providedId}' already exists. Product created with generated id '${created.id}'.`
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create product in database.';
        errors.push(`Row ${index + 2}: ${message}`);
      }
    }

    return NextResponse.json({
      ok: true,
      createdCount: createdProducts.length,
      failedCount: errors.length,
      errors: [...errors, ...warnings],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to import product data from excel.',
      },
      { status: 500 }
    );
  }
}
