import type { Channel } from "@/lib/channels";
import type {
  FichaDto,
  LossReason,
  PriorityValue,
  SourceDto,
  StageChangeSource,
} from "@/lib/types";

export type Customer360Conversation = {
  id: string;
  channel: Channel;
  aiEnabled: boolean;
  handoffAt: string | null;
  lastInboundAt: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  preview: string | null;
  createdAt: string;
};

export type Customer360StageEvent = {
  id: string;
  fromStageName: string | null;
  toStageName: string;
  toStageKind: "open" | "won" | "lost";
  occurredAt: string;
  source: StageChangeSource;
  actorName: string | null;
  approximate: boolean;
  lossReason: LossReason | null;
  lossNote: string | null;
};

export type Customer360Order = {
  eventId: string;
  stageName: string;
  occurredAt: string;
  amountCents: number | null;
  currency: string | null;
};

export type Customer360Booking = {
  id: string;
  kind: "session" | "delivery" | "block";
  status: "agendada" | "realizada" | "no_show" | "cancelada";
  source: "manual" | "ai";
  scheduledAt: string;
  durationMinutes: number;
  conversationId: string | null;
  meetingLink: string | null;
  linkPending: boolean;
  notes: string | null;
};

export type Customer360File = {
  assetId: string;
  messageId: string;
  conversationId: string;
  direction: "in" | "out";
  kind:
    | "image"
    | "video"
    | "audio"
    | "document"
    | "sticker"
    | "location"
    | "contacts";
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  caption: string | null;
  fetchStatus: "available" | "pending" | "failed";
  createdAt: string;
};

export type Customer360Dto = {
  contact: {
    id: string;
    name: string;
    phone: string | null;
    notes: string | null;
    archivedAt: string | null;
    source: SourceDto;
    ficha: FichaDto;
    createdAt: string;
    updatedAt: string;
  };
  responsible: null;
  tasks: [];
  lead: {
    id: string;
    priority: PriorityValue | null;
    amountCents: number | null;
    currency: string | null;
    lastActivityAt: string | null;
    createdAt: string;
    stage: {
      id: string;
      name: string;
      kind: "open" | "won" | "lost";
    };
  } | null;
  conversations: Customer360Conversation[];
  pipelineHistory: Customer360StageEvent[];
  orders: Customer360Order[];
  bookings: Customer360Booking[];
  files: Customer360File[];
};
