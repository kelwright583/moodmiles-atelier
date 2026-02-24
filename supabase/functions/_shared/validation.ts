import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export { z };

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function parseBody<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .map((i: { path: (string | number)[]; message: string }) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new ValidationError(`Invalid input: ${issues}`);
  }
  return result.data as T;
}

export type FetchWeatherBody = {
  trip_id: string;
  latitude: number;
  longitude: number;
  start_date: string;
  end_date: string;
};

export type GooglePlacesBody = { input: string };

export type FetchDestinationImageBody = {
  trip_id: string;
  destination: string;
  country?: string | null;
};

export type GenerateOutfitsBody = {
  trip_id: string;
  destination: string;
  country?: string | null;
  trip_type?: string | null;
  weather_summary?: string | null;
  events_summary?: string | null;
  similar_to?: { title: string; occasion: string; description: string } | null;
};

export type SearchFashionBody = {
  trip_id: string;
  destination: string;
  country?: string | null;
  trip_type?: string | null;
  occasion?: string | null;
};

export type SuggestActivitiesBody = {
  trip_id: string;
  destination: string;
  country?: string | null;
  trip_type?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type SuggestPackingBody = { trip_id: string };

export const fetchWeatherSchema = z.object({
  trip_id: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const googlePlacesSchema = z.object({
  input: z.string().min(1).max(200),
});

export const fetchDestinationImageSchema = z.object({
  trip_id: z.string().uuid(),
  destination: z.string().min(1).max(200),
  country: z.string().max(100).optional().nullable(),
});

export const fetchTrendsSchema = z.object({}).passthrough().optional();

export const generateOutfitsSchema = z.object({
  trip_id: z.string().uuid(),
  destination: z.string().min(1).max(200),
  country: z.string().max(100).optional().nullable(),
  trip_type: z.string().max(100).optional().nullable(),
  weather_summary: z.string().max(2000).optional().nullable(),
  events_summary: z.string().max(2000).optional().nullable(),
  similar_to: z
    .object({
      title: z.string(),
      occasion: z.string(),
      description: z.string(),
    })
    .optional()
    .nullable(),
});

export const searchFashionSchema = z.object({
  trip_id: z.string().uuid(),
  destination: z.string().min(1).max(200),
  country: z.string().max(100).optional().nullable(),
  trip_type: z.string().max(100).optional().nullable(),
  occasion: z.string().max(200).optional().nullable(),
});

export const suggestActivitiesSchema = z.object({
  trip_id: z.string().uuid(),
  destination: z.string().min(1).max(200),
  country: z.string().max(100).optional().nullable(),
  trip_type: z.string().max(100).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

export const suggestPackingSchema = z.object({
  trip_id: z.string().uuid(),
});
