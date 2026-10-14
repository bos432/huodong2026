export type ActivityStatus = "open" | "full" | "ended" | "cancelled";

export interface Activity {
  id: number;
  title: string;
  date: string;
  weekday: string;
  startTime: string;
  city: string;
  province?: string;
  district?: string;
  distanceText: string;
  venue: string;
  cover: string;
  hostName: string;
  category: string;
  tags: string[];
  priceText: string;
  registrationCount: number;
  remainingSlots: number;
  status: ActivityStatus;
  highlight: string;
  refundPolicy: string;
  insuranceIncluded: boolean;
  endTime?: string;
  startDateTime?: string | null;
  registrationDeadline?: string | null;
  hostAvatar?: string;
  description?: string;
  dataSource?: "api" | "mock";
  isDemo?: boolean;
}

export interface ActivityFilterState {
  time: "all" | "weekend" | "week" | "month";
  types: string[];
}

export type ActivitySort = "recommended" | "nearest_time" | "nearest_distance" | "popularity" | "price_low";
