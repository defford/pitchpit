import { z } from "zod";

const tierSchema = z.enum(["pit", "undercard", "main_event"]);
const billingModeSchema = z.enum(["one_day", "daily_renew"]);

const httpUrlSchema = z
  .url()
  .refine(
    (value) => value.startsWith("http://") || value.startsWith("https://"),
    { message: "website_url must start with http:// or https://" },
  );

export const companyCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  pitch: z.string().trim().min(20).max(500),
  website_url: httpUrlSchema,
  tier: tierSchema,
  billingMode: billingModeSchema,
});

export const companyUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  pitch: z.string().trim().min(20).max(500).optional(),
  website_url: httpUrlSchema.optional(),
  tier: tierSchema.optional(),
  billingMode: billingModeSchema.optional(),
});

function safeNextPath(fallback: string) {
  return z
    .string()
    .optional()
    .transform((value) => {
      if (!value || !value.startsWith("/") || value.startsWith("//")) {
        return fallback;
      }
      return value;
    });
}

export const magicLinkRequestSchema = z.object({
  email: z.email(),
  next: safeNextPath("/dashboard"),
});

export const adminPasswordLoginSchema = z.object({
  email: z.email(),
  password: z.string().min(6).max(200),
  next: safeNextPath("/admin"),
});

export const votePayloadSchema = z.object({
  battleId: z.string().uuid(),
  token: z.string().min(1),
  winnerCompanyId: z.string().uuid(),
});

export const adminReviewActionSchema = z.object({
  companyId: z.string().uuid(),
  action: z.enum(["approve", "reject", "suspend"]),
  reviewNote: z.string().trim().max(1000).optional(),
});

export type CompanyCreateInput = z.infer<typeof companyCreateSchema>;
export type CompanyUpdateInput = z.infer<typeof companyUpdateSchema>;
export type VotePayload = z.infer<typeof votePayloadSchema>;
export type AdminReviewAction = z.infer<typeof adminReviewActionSchema>;
