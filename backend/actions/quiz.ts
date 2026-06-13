"use server";

import { db } from "@/backend/lib/db";
import { ensureCurrentDbUser } from "@/backend/lib/ensureDbUser";
import { emailService } from "@/backend/services/email";

type SaveFitQuizResultInput = {
  outfit: string;
  comfort: string;
  occasion: string;
  recommendationName: string;
  recommendationDesc: string;
  recommendationImage?: string;
};

const createQuizResultsTableIfNeeded = async () => {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS fit_quiz_results (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      outfit TEXT NOT NULL,
      comfort TEXT NOT NULL,
      occasion TEXT NOT NULL,
      recommendation_name TEXT NOT NULL,
      recommendation_desc TEXT NOT NULL,
      recommendation_image TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_fit_quiz_results_user_created_at ON fit_quiz_results (user_id, created_at DESC)`
  );
};

export async function saveFitQuizResult(input: SaveFitQuizResultInput) {
  const dbUser = await ensureCurrentDbUser();

  if (!input?.recommendationName || !input?.outfit || !input?.comfort || !input?.occasion) {
    return { success: false, error: "Missing quiz result details" };
  }

  try {
    await createQuizResultsTableIfNeeded();

    const resultId = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    await db.$executeRawUnsafe(
      `
        INSERT INTO fit_quiz_results (
          id, user_id, outfit, comfort, occasion,
          recommendation_name, recommendation_desc, recommendation_image
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `,
      resultId,
      dbUser.id,
      input.outfit,
      input.comfort,
      input.occasion,
      input.recommendationName,
      input.recommendationDesc,
      input.recommendationImage || null
    );

    if (dbUser.email) {
      await emailService.sendFitQuizResultEmail(dbUser.email, {
        recommendationName: input.recommendationName,
        recommendationDesc: input.recommendationDesc,
        outfit: input.outfit,
        comfort: input.comfort,
        occasion: input.occasion,
      });
    }

    return { success: true, id: resultId };
  } catch (error) {
    console.error("Failed to save fit quiz result:", error);
    return { success: false, error: "Failed to save quiz result" };
  }
}

export async function getMyFitQuizResults(limit = 5) {
  const dbUser = await ensureCurrentDbUser();

  try {
    await createQuizResultsTableIfNeeded();

    const rows = await db.$queryRawUnsafe(
      `
        SELECT
          id,
          user_id AS "userId",
          outfit,
          comfort,
          occasion,
          recommendation_name AS "recommendationName",
          recommendation_desc AS "recommendationDesc",
          recommendation_image AS "recommendationImage",
          created_at AS "createdAt"
        FROM fit_quiz_results
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `,
      dbUser.id,
      Number(limit) > 0 ? Number(limit) : 5
    );

    return {
      success: true,
      results: JSON.parse(JSON.stringify(Array.isArray(rows) ? rows : [])),
    };
  } catch (error) {
    console.error("Failed to fetch fit quiz results:", error);
    return { success: false, results: [] as any[] };
  }
}
