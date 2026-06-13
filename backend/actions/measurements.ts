"use server";

import { db } from "@/backend/lib/db";
import { ensureCurrentDbUser } from "@/backend/lib/ensureDbUser";
import { serializeDecimal } from "@/backend/lib/serializeDecimal";

export type UserMeasurements = {
  bustCm?: number;
  underburstCm?: number;
  waistCm?: number;
  waistInches?: number;
  hipsCm?: number;
  inseamCm?: number;
};

const createMeasurementsTableIfNeeded = async () => {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS user_measurements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      bust_cm DECIMAL(10,2),
      underbust_cm DECIMAL(10,2),
      waist_cm DECIMAL(10,2),
      waist_inches DECIMAL(10,2),
      hips_cm DECIMAL(10,2),
      inseam_cm DECIMAL(10,2),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.$executeRawUnsafe(`
    ALTER TABLE user_measurements
    ALTER COLUMN bust_cm TYPE DECIMAL(10,2),
    ALTER COLUMN underbust_cm TYPE DECIMAL(10,2),
    ALTER COLUMN waist_cm TYPE DECIMAL(10,2),
    ALTER COLUMN waist_inches TYPE DECIMAL(10,2),
    ALTER COLUMN hips_cm TYPE DECIMAL(10,2),
    ALTER COLUMN inseam_cm TYPE DECIMAL(10,2)
  `);

  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_user_measurements_user_id ON user_measurements (user_id)`
  );
};

const normalizeMeasurementValue = (value?: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
};

export async function saveMeasurements(measurements: UserMeasurements) {
  try {
    const dbUser = await ensureCurrentDbUser();
    await createMeasurementsTableIfNeeded();

    const measurementId = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await db.$executeRawUnsafe(
      `
        INSERT INTO user_measurements (
          id, user_id, bust_cm, underbust_cm, waist_cm, waist_inches, hips_cm, inseam_cm
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (user_id) DO UPDATE SET
          bust_cm = EXCLUDED.bust_cm,
          underbust_cm = EXCLUDED.underbust_cm,
          waist_cm = EXCLUDED.waist_cm,
          waist_inches = EXCLUDED.waist_inches,
          hips_cm = EXCLUDED.hips_cm,
          inseam_cm = EXCLUDED.inseam_cm,
          updated_at = NOW()
      `,
      measurementId,
      dbUser.id,
      normalizeMeasurementValue(measurements.bustCm),
      normalizeMeasurementValue(measurements.underburstCm),
      normalizeMeasurementValue(measurements.waistCm),
      normalizeMeasurementValue(measurements.waistInches),
      normalizeMeasurementValue(measurements.hipsCm),
      normalizeMeasurementValue(measurements.inseamCm)
    );

    return { success: true, id: measurementId };
  } catch (error) {
    console.error("Failed to save measurements:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to save measurements",
    };
  }
}

export async function getMeasurements() {
  try {
    const dbUser = await ensureCurrentDbUser();
    await createMeasurementsTableIfNeeded();

    const rows = await db.$queryRawUnsafe(
      `
        SELECT
          id,
          user_id AS "userId",
          bust_cm AS "bustCm",
          underbust_cm AS "underburstCm",
          waist_cm AS "waistCm",
          waist_inches AS "waistInches",
          hips_cm AS "hipsCm",
          inseam_cm AS "inseamCm",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM user_measurements
        WHERE user_id = $1
      `,
      dbUser.id
    );

    const result = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    
    // Serialize Decimal and other non-serializable types
    return { success: true, measurements: serializeDecimal(result) };
  } catch (error) {
    console.error("Failed to fetch measurements:", error);
    return { success: false, measurements: null };
  }
}
