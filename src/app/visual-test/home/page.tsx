import { HomeDashboard } from "@/components/home/home-dashboard";
import type { HomeSummary } from "@/server/home/summary";

export const dynamic = "force-dynamic";

const SUMMARY: HomeSummary = {
  generatedAt: "2026-09-15T14:00:00.000Z",
  counts: {
    pendingConversations: 2,
    unreadMessages: 5,
    highPriorityLeads: 2,
    newOrders: 1,
    upcomingBookings: 1,
    failures: 2,
  },
  pendingConversations: [
    {
      id: "conv-ana",
      channel: "whatsapp",
      contact: { id: "contact-ana", name: "Ana Torres", phone: "+56961234567" },
      stageName: "Interesado",
      aiEnabled: true,
      handoffAt: null,
      handoffReason: null,
      lastInboundAt: "2026-09-15T13:48:00.000Z",
      lastMessageAt: "2026-09-15T13:49:00.000Z",
      unreadCount: 3,
      windowOpen: true,
      windowRemainingMs: 7_200_000,
      preview: "¿Pueden entregar mañana por la tarde?",
    },
    {
      id: "conv-diego",
      channel: "instagram",
      contact: { id: "contact-diego", name: "Diego Soto", phone: null },
      stageName: "Nuevo",
      aiEnabled: false,
      handoffAt: "2026-09-15T13:30:00.000Z",
      handoffReason: "cliente",
      lastInboundAt: "2026-09-15T13:29:00.000Z",
      lastMessageAt: "2026-09-15T13:30:00.000Z",
      unreadCount: 2,
      windowOpen: true,
      windowRemainingMs: 10_800_000,
      preview: "Quiero hablar con una persona.",
    },
  ],
  priorityLeads: [
    {
      id: "lead-ana",
      contactId: "contact-ana",
      conversationId: "conv-ana",
      contactName: "Ana Torres",
      stageName: "Interesado",
      priority: "alta",
      amountCents: 1650000,
      currency: "MXN",
      lastActivityAt: "2026-09-15T13:49:00.000Z",
    },
    {
      id: "lead-camila",
      contactId: "contact-camila",
      conversationId: "conv-camila",
      contactName: "Camila Rojas",
      stageName: "Pedido",
      priority: "alta",
      amountCents: 2890000,
      currency: "MXN",
      lastActivityAt: "2026-09-15T13:20:00.000Z",
    },
  ],
  newOrders: [
    {
      eventId: "order-event-1",
      leadId: "lead-camila",
      contactId: "contact-camila",
      contactName: "Camila Rojas",
      conversationId: "conv-camila",
      stageName: "Pedido",
      occurredAt: "2026-09-15T13:20:00.000Z",
      amountCents: 2890000,
      currency: "MXN",
    },
  ],
  upcomingBookings: [
    {
      id: "booking-1",
      kind: "delivery",
      contactName: "Diego Soto",
      conversationId: "conv-diego",
      scheduledAt: "2026-09-15T16:00:00.000Z",
      linkPending: false,
    },
  ],
  issues: [
    { id: "messages", label: "Mensajes sin enviar", count: 1, href: "/inbox" },
    { id: "meta", label: "Eventos de Meta", count: 1, href: "/settings/ads" },
  ],
  latestResult: {
    id: "result-1",
    status: "done",
    score: 92,
    startedAt: "2026-09-15T13:10:00.000Z",
  },
};

export default function VisualHomePage() {
  return <HomeDashboard summary={SUMMARY} currency="MXN" agenda />;
}
