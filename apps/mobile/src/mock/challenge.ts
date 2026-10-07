import type { Challenge } from "../types/challenge";
const challengeHero = "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80";
const challengeLake = "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80";
export const mockChallenges: Challenge[] = [
  { id: 1, title: "慢π城市观察记录", startDate: "10.01", endDate: "12.31", distanceText: "3个观察点", cover: challengeHero, media: [challengeHero, challengeLake], participantCount: 0, checkpointCount: 3, progress: 0, status: "not_started", isDemo: true, tasks: [
    { id: "observe-1", title: "找到一处让你放慢脚步的地方", description: "在街区、公园或路边，记录一个让你愿意停留的细节。", reward: "城市观察贴纸" },
    { id: "observe-2", title: "拍下今天的光线", description: "用一张照片留下今天的光，不要求露脸，也不要求上传。", reward: "慢π纪念章进度" },
    { id: "observe-3", title: "写下一句现场感受", description: "用一句话记下这次出发带给你的感受。", reward: "完成挑战" }
  ] },
  { id: 2, title: "周末慢走练习", startDate: "10.01", endDate: "12.31", distanceText: "2段练习", cover: challengeLake, media: [challengeLake], participantCount: 0, checkpointCount: 2, progress: 0, status: "not_started", isDemo: true, tasks: [
    { id: "walk-1", title: "走一段没有目的地的路", description: "给自己十分钟，不追赶时间，只留意周围。", reward: "慢走记录" },
    { id: "walk-2", title: "记录一个声音", description: "听见并记下一个今天才注意到的声音。", reward: "完成挑战" }
  ] }
];
