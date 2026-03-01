export type EventCategory =
  | "SPORTS"
  | "MUSICAL"
  | "WORKSHOPS"
  | "EXHIBITIONS"
  | "CULTURAL"
  | "RELIGIOUS";

export type VoteType = "RSVP" | "ORGANISER_VOTE";

export type SponsorType = "GOLD" | "SILVER" | "PARTNER";

export type EventPayload = {
  name: string;
  category: EventCategory;
  date: string;
  location: string;
  description?: string;
  customFields?: Record<string, string>;
  ticketRequired: boolean;
  sponsorRequested?: boolean;
  sponsorsReady?: boolean;
  published?: boolean;
};
