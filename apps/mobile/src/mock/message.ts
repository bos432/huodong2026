import type { MessageItem } from "../types/message";

export const mockMessages: MessageItem[] = [
  { id: 1, type: "assistant", title: "【演示】经营助手", summary: "【演示】活动运营提示会显示在这里", content: "真实运营消息接入后，会在这里显示与活动相关的提醒。", createdAt: "演示", unread: false },
  { id: 2, type: "activity", title: "【演示】活动开始提醒", summary: "【演示】活动开始提醒会显示在这里", content: "真实活动提醒接入后会在这里显示。", createdAt: "演示", unread: false },
  { id: 3, type: "system", title: "【演示】活动回顾", summary: "【演示】完成活动后可在这里查看活动回顾", content: "真实活动完成后，回顾和评价会在这里出现。", createdAt: "演示", unread: false }
];
