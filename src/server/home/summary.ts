import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  gt,
  inArray,
  isNotNull,
  or,
  sql,
} from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import type { ConversationDto, PriorityValue } from "@/lib/types";
import { serializeConversation } from "@/server/inbox/queries";

export type HomeLeadItem = {
  id: string;
  contactId: string;
  conversationId: string | null;
  contactName: string;
  stageName: string;
  priority: PriorityValue | null;
  amountCents: number | null;
  currency: string | null;
  lastActivityAt: string | null;
};

export type HomeOrderItem = {
  eventId: string;
  leadId: string;
  contactId: string;
  contactName: string;
  conversationId: string | null;
  stageName: string;
  occurredAt: string;
  amountCents: number | null;
  currency: string | null;
};

export type HomeBookingItem = {
  id: string;
  kind: "session" | "delivery";
  contactName: string;
  conversationId: string | null;
  scheduledAt: string;
  linkPending: boolean;
};

export type HomeIssue = {
  id: "messages" | "telegram" | "meta" | "lab";
  label: string;
  count: number;
  href: string;
};

export type HomeSummary = {
  generatedAt: string;
  counts: {
    pendingConversations: number;
    unreadMessages: number;
    highPriorityLeads: number;
    newOrders: number;
    upcomingBookings: number;
    failures: number;
  };
  pendingConversations: ConversationDto[];
  priorityLeads: HomeLeadItem[];
  newOrders: HomeOrderItem[];
  upcomingBookings: HomeBookingItem[];
  issues: HomeIssue[];
  latestResult: {
    id: string;
    status: "running" | "done" | "failed";
    score: number | null;
    startedAt: string;
  } | null;
};

const MAX_ITEMS = 5;

export function pendingConversationSummary(conversations: ConversationDto[]) {
  const pending = conversations.filter(
    (conversation) => conversation.unreadCount > 0 || conversation.handoffAt !== null
  );
  return {
    count: pending.length,
    unreadMessages: pending.reduce(
      (total, conversation) => total + conversation.unreadCount,
      0
    ),
    items: pending.slice(0, MAX_ITEMS),
  };
}

function numericCount(rows: { value: number | string }[]): number {
  return Number(rows[0]?.value ?? 0);
}

export async function getHomeSummary(
  organizationId: string,
  options: { agenda: boolean; now?: Date }
): Promise<HomeSummary> {
  const db = getDb();
  const now = options.now ?? new Date();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const until = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const previewSql = sql<string | null>`(
    select coalesce(m.text, m.type)
    from message m
    where m.conversation_id = ${schema.conversation.id}
    order by m.created_at desc
    limit 1
  )`;
  const stageSql = sql<string | null>`(
    select s.name from lead l
    join pipeline_stage s on s.id = l.stage_id
    where l.contact_id = ${schema.contact.id}
    limit 1
  )`;
  const pendingCondition = or(
    gt(schema.conversation.unreadCount, 0),
    isNotNull(schema.conversation.handoffAt)
  );

  const pendingRowsPromise = db
    .select({
      conversation: schema.conversation,
      contact: schema.contact,
      preview: previewSql,
      stageName: stageSql,
    })
    .from(schema.conversation)
    .innerJoin(
      schema.contact,
      eq(schema.conversation.contactId, schema.contact.id)
    )
    .where(
      scoped(
        schema.conversation.organizationId,
        organizationId,
        eq(schema.conversation.isTest, false),
        pendingCondition
      )
    )
    .orderBy(
      desc(
        sql`coalesce(${schema.conversation.lastMessageAt}, ${schema.conversation.createdAt})`
      )
    )
    .limit(MAX_ITEMS);

  const pendingTotalsPromise = db
    .select({
      value: count(),
      unreadMessages: sql<number>`coalesce(sum(${schema.conversation.unreadCount}), 0)`,
    })
    .from(schema.conversation)
    .where(
      scoped(
        schema.conversation.organizationId,
        organizationId,
        eq(schema.conversation.isTest, false),
        pendingCondition
      )
    );

  const priorityRowsPromise = db
    .select({
      id: schema.lead.id,
      contactId: schema.contact.id,
      conversationId: schema.conversation.id,
      contactName: schema.contact.name,
      stageName: schema.pipelineStage.name,
      priority: schema.lead.priority,
      amountCents: schema.lead.amountCents,
      currency: schema.lead.currency,
      lastActivityAt: schema.lead.lastActivityAt,
    })
    .from(schema.lead)
    .innerJoin(schema.contact, eq(schema.lead.contactId, schema.contact.id))
    .innerJoin(
      schema.pipelineStage,
      eq(schema.lead.stageId, schema.pipelineStage.id)
    )
    .leftJoin(
      schema.conversation,
      and(
        eq(schema.conversation.contactId, schema.contact.id),
        eq(schema.conversation.isTest, false)
      )
    )
    .where(
      scoped(
        schema.lead.organizationId,
        organizationId,
        eq(schema.pipelineStage.kind, "open"),
        eq(schema.lead.priority, "alta")
      )
    )
    .orderBy(
      desc(sql`coalesce(${schema.lead.lastActivityAt}, ${schema.lead.updatedAt})`)
    )
    .limit(MAX_ITEMS);

  const highPriorityCountPromise = db
    .select({ value: count() })
    .from(schema.lead)
    .innerJoin(
      schema.pipelineStage,
      eq(schema.lead.stageId, schema.pipelineStage.id)
    )
    .where(
      scoped(
        schema.lead.organizationId,
        organizationId,
        eq(schema.pipelineStage.kind, "open"),
        eq(schema.lead.priority, "alta")
      )
    );

  const orderRowsPromise = db
    .select({
      eventId: schema.leadStageEvent.id,
      leadId: schema.lead.id,
      contactId: schema.contact.id,
      contactName: schema.contact.name,
      conversationId: schema.conversation.id,
      stageName: schema.leadStageEvent.toStageName,
      occurredAt: schema.leadStageEvent.occurredAt,
      amountCents: schema.lead.amountCents,
      currency: schema.lead.currency,
    })
    .from(schema.leadStageEvent)
    .innerJoin(schema.lead, eq(schema.leadStageEvent.leadId, schema.lead.id))
    .innerJoin(
      schema.contact,
      eq(schema.leadStageEvent.contactId, schema.contact.id)
    )
    .innerJoin(
      schema.pipelineStage,
      eq(schema.leadStageEvent.toStageId, schema.pipelineStage.id)
    )
    .leftJoin(
      schema.conversation,
      and(
        eq(schema.conversation.contactId, schema.contact.id),
        eq(schema.conversation.isTest, false)
      )
    )
    .where(
      scoped(
        schema.leadStageEvent.organizationId,
        organizationId,
        eq(schema.pipelineStage.botStageKey, "order"),
        gte(schema.leadStageEvent.occurredAt, since)
      )
    )
    .orderBy(desc(schema.leadStageEvent.occurredAt))
    .limit(MAX_ITEMS);

  const newOrderCountPromise = db
    .select({ value: count() })
    .from(schema.leadStageEvent)
    .innerJoin(
      schema.pipelineStage,
      eq(schema.leadStageEvent.toStageId, schema.pipelineStage.id)
    )
    .where(
      scoped(
        schema.leadStageEvent.organizationId,
        organizationId,
        eq(schema.pipelineStage.botStageKey, "order"),
        gte(schema.leadStageEvent.occurredAt, since)
      )
    );

  const bookingRowsPromise = options.agenda
    ? db
        .select({
          id: schema.booking.id,
          kind: schema.booking.kind,
          contactName: schema.contact.name,
          conversationId: schema.booking.conversationId,
          scheduledAt: schema.booking.scheduledAt,
          linkPending: schema.booking.linkPending,
        })
        .from(schema.booking)
        .leftJoin(schema.contact, eq(schema.booking.contactId, schema.contact.id))
        .where(
          scoped(
            schema.booking.organizationId,
            organizationId,
            eq(schema.booking.status, "agendada"),
            eq(schema.booking.isTest, false),
            inArray(schema.booking.kind, ["session", "delivery"]),
            gte(schema.booking.scheduledAt, now)
          )
        )
        .orderBy(asc(schema.booking.scheduledAt))
        .limit(MAX_ITEMS)
    : Promise.resolve([]);

  const upcomingBookingCountPromise = options.agenda
    ? db
        .select({ value: count() })
        .from(schema.booking)
        .where(
          scoped(
            schema.booking.organizationId,
            organizationId,
            eq(schema.booking.status, "agendada"),
            eq(schema.booking.isTest, false),
            inArray(schema.booking.kind, ["session", "delivery"]),
            gte(schema.booking.scheduledAt, now),
            sql`${schema.booking.scheduledAt} < ${until}`
          )
        )
    : Promise.resolve([{ value: 0 }]);

  const failedMessagesPromise = db
    .select({ value: count() })
    .from(schema.message)
    .where(
      scoped(
        schema.message.organizationId,
        organizationId,
        eq(schema.message.status, "failed"),
        gte(schema.message.createdAt, since)
      )
    );

  const failedTelegramPromise = db
    .select({ value: count() })
    .from(schema.telegramOrderAlert)
    .where(
      scoped(
        schema.telegramOrderAlert.organizationId,
        organizationId,
        inArray(schema.telegramOrderAlert.status, ["failed", "retrying"]),
        gte(schema.telegramOrderAlert.updatedAt, since)
      )
    );

  const failedConversionsPromise = db
    .select({ value: count() })
    .from(schema.conversionEvent)
    .where(
      scoped(
        schema.conversionEvent.organizationId,
        organizationId,
        eq(schema.conversionEvent.status, "failed"),
        gte(schema.conversionEvent.createdAt, since)
      )
    );

  const failedLabPromise = db
    .select({ value: count() })
    .from(schema.agentTestRun)
    .where(
      scoped(
        schema.agentTestRun.organizationId,
        organizationId,
        eq(schema.agentTestRun.status, "failed"),
        gte(schema.agentTestRun.startedAt, since)
      )
    );

  const latestResultPromise = db
    .select({
      id: schema.agentTestRun.id,
      status: schema.agentTestRun.status,
      score: schema.agentTestRun.score,
      startedAt: schema.agentTestRun.startedAt,
    })
    .from(schema.agentTestRun)
    .where(scoped(schema.agentTestRun.organizationId, organizationId))
    .orderBy(desc(schema.agentTestRun.startedAt))
    .limit(1);

  const [
    pendingRows,
    pendingTotalRows,
    priorityRows,
    highPriorityCountRows,
    orderRows,
    newOrderCountRows,
    bookingRows,
    upcomingBookingCountRows,
    failedMessageRows,
    failedTelegramRows,
    failedConversionRows,
    failedLabRows,
    latestResultRows,
  ] = await Promise.all([
    pendingRowsPromise,
    pendingTotalsPromise,
    priorityRowsPromise,
    highPriorityCountPromise,
    orderRowsPromise,
    newOrderCountPromise,
    bookingRowsPromise,
    upcomingBookingCountPromise,
    failedMessagesPromise,
    failedTelegramPromise,
    failedConversionsPromise,
    failedLabPromise,
    latestResultPromise,
  ]);

  const pendingItems = pendingConversationSummary(
    pendingRows.map((row) =>
      serializeConversation(
        row.conversation,
        row.contact,
        row.preview,
        row.stageName
      )
    )
  ).items;
  const pendingTotals = pendingTotalRows[0];
  const issueCounts = {
    messages: numericCount(failedMessageRows),
    telegram: numericCount(failedTelegramRows),
    meta: numericCount(failedConversionRows),
    lab: numericCount(failedLabRows),
  };
  const allIssues: HomeIssue[] = [
    { id: "messages", label: "Mensajes sin enviar", count: issueCounts.messages, href: "/inbox" },
    { id: "telegram", label: "Alertas de Telegram", count: issueCounts.telegram, href: "/automation" },
    { id: "meta", label: "Eventos de Meta", count: issueCounts.meta, href: "/settings/ads" },
    { id: "lab", label: "Pruebas del agente", count: issueCounts.lab, href: "/results" },
  ];
  const issues = allIssues.filter((issue) => issue.count > 0);

  const latestResult = latestResultRows[0];

  return {
    generatedAt: now.toISOString(),
    counts: {
      pendingConversations: Number(pendingTotals?.value ?? 0),
      unreadMessages: Number(pendingTotals?.unreadMessages ?? 0),
      highPriorityLeads: numericCount(highPriorityCountRows),
      newOrders: numericCount(newOrderCountRows),
      upcomingBookings: numericCount(upcomingBookingCountRows),
      failures: issues.reduce((total, issue) => total + issue.count, 0),
    },
    pendingConversations: pendingItems,
    priorityLeads: priorityRows.map((row) => ({
      ...row,
      lastActivityAt: row.lastActivityAt?.toISOString() ?? null,
    })),
    newOrders: orderRows.map((row) => ({
      ...row,
      occurredAt: row.occurredAt.toISOString(),
    })),
    upcomingBookings: bookingRows.flatMap((row) =>
      row.kind === "session" || row.kind === "delivery"
        ? [
            {
              id: row.id,
              kind: row.kind,
              contactName: row.contactName || "Sin nombre",
              conversationId: row.conversationId,
              scheduledAt: row.scheduledAt.toISOString(),
              linkPending: row.linkPending,
            },
          ]
        : []
    ),
    issues,
    latestResult: latestResult
      ? {
          ...latestResult,
          startedAt: latestResult.startedAt.toISOString(),
        }
      : null,
  };
}
