export interface MessageItem {
  id: number;
  type: "assistant" | "activity" | "system";
  title: string;
  summary: string;
  content: string;
  createdAt: string;
  unread: boolean;
}
