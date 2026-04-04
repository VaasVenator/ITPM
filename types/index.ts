export type EventCategory =
  | "SPORTS"
  | "MUSICAL"
  | "WORKSHOPS"
  | "EXHIBITIONS"
  | "CULTURAL"
  | "RELIGIOUS"

export type VoteType = "RSVP" | "ORGANISER_VOTE";

export type SponsorType = "GOLD" | "SILVER" | "PARTNER";

export type ModerationStatus = "PENDING" | "APPROVED" | "REJECTED";

export type EventPayload = {
  name: string;
  category: EventCategory;
  date: string;
  location: string;
  description?: string;
  eventImage: string;
  customFields?: Record<string, string>;
  ticketRequired: boolean;
  sponsorRequested?: boolean;
  sponsorsReady?: boolean;
  published?: boolean;
};

export type EventReviewPayload = {
  rating: number;
  comment: string;
  anonymous?: boolean;
};

export type EventReviewModerationPayload = {
  action: "approve" | "reject";
  adminComment?: string;
};
