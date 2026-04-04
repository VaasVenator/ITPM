import { z } from "zod";

export const signupSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  itNumber: z
    .string()
    .toUpperCase()
    .regex(/^IT\d{8}$/, "IT number must be in format IT12345678"),
  email: z
    .string()
    .toLowerCase()
    .regex(/^IT\d{8}@my\.sliit\.lk$/i, "Email must be in format IT12345678@my.sliit.lk"),
  profileImage: z.string().optional(),
  password: z.string().min(6),
  confirmPassword: z.string().min(6)
})
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  })
  .refine((data) => data.email.toUpperCase().split("@")[0] === data.itNumber, {
    message: "Email username must be your IT number",
    path: ["email"]
  });

export const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(6)
});

export const eventSchema = z.object({
  name: z.string().min(2),
  category: z.enum(["SPORTS", "MUSICAL", "WORKSHOPS", "EXHIBITIONS", "CULTURAL", "RELIGIOUS"]),
  date: z.string(),
  location: z.string().min(2),
  description: z.string().optional(),
  eventImage: z.string().min(1, "Event image is required."),
  customFields: z.record(z.string()).optional(),
  ticketRequired: z.boolean(),
  sponsorRequested: z.boolean().optional(),
  sponsorsReady: z.boolean().optional(),
  published: z.boolean().optional()
});

export const eventReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(10).max(1000),
  anonymous: z.boolean().optional()
});

export const eventReviewModerationSchema = z.object({
  action: z.enum(["approve", "reject"]),
  adminComment: z.string().trim().min(2).max(1000).optional()
}).superRefine((data, ctx) => {
  if (data.action === "reject" && !data.adminComment) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Rejection reason is required.",
      path: ["adminComment"]
    });
  }
});
