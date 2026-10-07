export type ChallengeStatus = "not_started" | "in_progress" | "completed" | "ended";

export interface Challenge {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  distanceText: string;
  cover: string;
  media: string[];
  participantCount: number;
  checkpointCount: number;
  progress: number;
  status: ChallengeStatus;
  isDemo?: boolean;
}
