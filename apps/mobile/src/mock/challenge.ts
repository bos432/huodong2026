import type { Challenge } from "../types/challenge";
const challengeHero = "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80";
const challengeLake = "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80";
export const mockChallenges: Challenge[] = [
  { id: 1, title: "慢π城市观察记录", startDate: "10.01", endDate: "12.31", distanceText: "12个观察点", cover: challengeHero, media: [challengeHero, challengeLake], participantCount: 0, checkpointCount: 12, progress: 0, status: "in_progress", isDemo: true },
  { id: 2, title: "周末慢走练习", startDate: "10.01", endDate: "12.31", distanceText: "8段真实路线", cover: challengeLake, media: [challengeLake], participantCount: 0, checkpointCount: 8, progress: 0, status: "not_started", isDemo: true }
];
