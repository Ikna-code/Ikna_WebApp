import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const productTypes = await prisma.$queryRaw<Array<{
      id: string;
      name: string;
      slug: string;
      displayOrder: number;
    }>>`
      SELECT id, name, slug, "displayOrder"
      FROM "product_types"
      WHERE "isActive" = true
      ORDER BY "displayOrder" ASC
    `;

    const productTypeIds = new Set(productTypes.map((type: any) => type.id));
    const filterGroupsRaw = await prisma.$queryRaw<Array<{
      id: string;
      productTypeId: string;
      name: string;
      displayName: string;
      slug: string;
      filterType: string;
      displayOrder: number;
    }>>`
      SELECT
        id,
        "productTypeId",
        name,
        "displayName",
        slug,
        "filterType",
        "displayOrder"
      FROM "filter_groups"
      WHERE "isActive" = true
      ORDER BY "displayOrder" ASC
    `;

    const filterGroups = filterGroupsRaw.filter((group) => productTypeIds.has(group.productTypeId));
    const groupIds = new Set(filterGroups.map((group: any) => group.id));

    const filterOptionsRaw = await prisma.$queryRaw<Array<{
      id: string;
      filterGroupId: string;
      value: string;
      displayLabel: string;
      colorHex: string | null;
      displayOrder: number;
    }>>`
      SELECT
        id,
        "filterGroupId",
        value,
        "displayLabel",
        "colorHex",
        "displayOrder"
      FROM "filter_options"
      WHERE "isActive" = true
      ORDER BY "displayOrder" ASC
    `;

    const filterOptions = filterOptionsRaw.filter((option) => groupIds.has(option.filterGroupId));

    const optionsByGroupId = new Map<string, any[]>();
    for (const option of filterOptions) {
      const list = optionsByGroupId.get(option.filterGroupId) || [];
      list.push({
        id: option.id,
        value: option.value,
        displayLabel: option.displayLabel,
        colorHex: option.colorHex,
      });
      optionsByGroupId.set(option.filterGroupId, list);
    }

    const groupsByTypeId = new Map<string, any[]>();
    for (const group of filterGroups) {
      const list = groupsByTypeId.get(group.productTypeId) || [];
      list.push({
        id: group.id,
        name: group.name,
        displayName: group.displayName,
        slug: group.slug,
        filterType: group.filterType,
        filterOptions: optionsByGroupId.get(group.id) || [],
      });
      groupsByTypeId.set(group.productTypeId, list);
    }

    const response = productTypes.map((type: any) => ({
      id: type.id,
      name: type.name,
      slug: type.slug,
      filterGroups: groupsByTypeId.get(type.id) || [],
    }));

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load filters' },
      { status: 500 }
    );
  }
}
