import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import type {
  Customer360Booking,
  Customer360Dto,
  Customer360File,
  Customer360StageEvent,
} from "@/lib/customer-360";
import type { FichaDto } from "@/lib/types";
import { effectiveSource } from "@/server/contact-source";
import { getContactById, getContactStage } from "@/server/contacts";

/**
 * Lectura agregada de la historia comercial de un contacto.
 *
 * C01 es deliberadamente read-only: tareas y responsable aún no tienen un
 * modelo persistente propio. Se devuelven vacíos explícitos en vez de deducir
 * o inventar datos que el negocio nunca registró.
 */
export async function getCustomer360(
  organizationId: string,
  contactId: string
): Promise<Customer360Dto | null> {
  const contact = await getContactById(organizationId, contactId);
  if (!contact) return null;

  const db = getDb();
  const latestMessageSql = sql<string | null>`(
    select coalesce(m.text, m.type)
    from message m
    where m.conversation_id = ${schema.conversation.id}
      and m.organization_id = ${organizationId}
    order by m.created_at desc
    limit 1
  )`;

  const [
    stageRow,
    conversations,
    stageEvents,
    orderStages,
    bookings,
    files,
  ] = await Promise.all([
    getContactStage(organizationId, contactId),
    db
      .select({
        id: schema.conversation.id,
        channel: schema.conversation.channel,
        aiEnabled: schema.conversation.aiEnabled,
        handoffAt: schema.conversation.handoffAt,
        lastInboundAt: schema.conversation.lastInboundAt,
        lastMessageAt: schema.conversation.lastMessageAt,
        unreadCount: schema.conversation.unreadCount,
        preview: latestMessageSql,
        createdAt: schema.conversation.createdAt,
      })
      .from(schema.conversation)
      .where(
        scoped(
          schema.conversation.organizationId,
          organizationId,
          eq(schema.conversation.contactId, contactId),
          eq(schema.conversation.isTest, false)
        )
      )
      .orderBy(desc(schema.conversation.lastMessageAt), desc(schema.conversation.createdAt)),
    db
      .select({
        id: schema.leadStageEvent.id,
        toStageId: schema.leadStageEvent.toStageId,
        fromStageName: schema.leadStageEvent.fromStageName,
        toStageName: schema.leadStageEvent.toStageName,
        toStageKind: schema.leadStageEvent.toStageKind,
        occurredAt: schema.leadStageEvent.occurredAt,
        source: schema.leadStageEvent.source,
        actorName: schema.user.name,
        approximate: schema.leadStageEvent.approximate,
        lossReason: schema.leadStageEvent.lossReason,
        lossNote: schema.leadStageEvent.lossNote,
      })
      .from(schema.leadStageEvent)
      .leftJoin(
        schema.member,
        and(
          eq(schema.leadStageEvent.actorUserId, schema.member.userId),
          eq(schema.member.organizationId, organizationId)
        )
      )
      .leftJoin(schema.user, eq(schema.member.userId, schema.user.id))
      .where(
        scoped(
          schema.leadStageEvent.organizationId,
          organizationId,
          eq(schema.leadStageEvent.contactId, contactId)
        )
      )
      .orderBy(desc(schema.leadStageEvent.occurredAt)),
    db
      .select({ id: schema.pipelineStage.id })
      .from(schema.pipelineStage)
      .where(
        scoped(
          schema.pipelineStage.organizationId,
          organizationId,
          eq(schema.pipelineStage.botStageKey, "order")
        )
      ),
    db
      .select({
        id: schema.booking.id,
        kind: schema.booking.kind,
        status: schema.booking.status,
        source: schema.booking.source,
        scheduledAt: schema.booking.scheduledAt,
        durationMinutes: schema.booking.durationMinutes,
        conversationId: schema.booking.conversationId,
        meetingLink: schema.booking.meetingLink,
        linkPending: schema.booking.linkPending,
        notes: schema.booking.notes,
      })
      .from(schema.booking)
      .where(
        scoped(
          schema.booking.organizationId,
          organizationId,
          eq(schema.booking.contactId, contactId),
          eq(schema.booking.isTest, false)
        )
      )
      .orderBy(desc(schema.booking.scheduledAt)),
    db
      .select({
        assetId: schema.mediaAsset.id,
        messageId: schema.message.id,
        conversationId: schema.conversation.id,
        direction: schema.message.direction,
        kind: schema.mediaAsset.kind,
        fileName: schema.mediaAsset.fileName,
        mimeType: schema.mediaAsset.mimeType,
        fileSize: schema.mediaAsset.fileSize,
        caption: schema.mediaAsset.caption,
        fetchStatus: schema.mediaAsset.fetchStatus,
        createdAt: schema.mediaAsset.createdAt,
      })
      .from(schema.message)
      .innerJoin(
        schema.conversation,
        and(
          eq(schema.message.conversationId, schema.conversation.id),
          eq(schema.conversation.organizationId, organizationId),
          eq(schema.conversation.contactId, contactId),
          eq(schema.conversation.isTest, false)
        )
      )
      .innerJoin(
        schema.mediaAsset,
        and(
          eq(schema.message.mediaAssetId, schema.mediaAsset.id),
          eq(schema.mediaAsset.organizationId, organizationId)
        )
      )
      .where(
        scoped(
          schema.message.organizationId,
          organizationId,
          isNotNull(schema.message.mediaAssetId)
        )
      )
      .orderBy(desc(schema.mediaAsset.createdAt)),
  ]);

  const orderStageIds = new Set(orderStages.map((stage) => stage.id));
  const pipelineHistory: Customer360StageEvent[] = stageEvents.map((event) => ({
    id: event.id,
    fromStageName: event.fromStageName,
    toStageName: event.toStageName,
    toStageKind: event.toStageKind,
    occurredAt: event.occurredAt.toISOString(),
    source: event.source,
    actorName: event.actorName,
    approximate: event.approximate,
    lossReason: event.lossReason,
    lossNote: event.lossNote,
  }));

  const bookingDtos: Customer360Booking[] = bookings.map((booking) => ({
    ...booking,
    scheduledAt: booking.scheduledAt.toISOString(),
  }));
  const fileDtos: Customer360File[] = files.map((file) => ({
    ...file,
    createdAt: file.createdAt.toISOString(),
  }));

  return {
    contact: {
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
      notes: contact.notes,
      archivedAt: contact.archivedAt?.toISOString() ?? null,
      source: effectiveSource(contact.source),
      ficha: (contact.ficha as FichaDto | null) ?? {},
      createdAt: contact.createdAt.toISOString(),
      updatedAt: contact.updatedAt.toISOString(),
    },
    // No existe hoy una asignación persistida contacto → usuario. Mostrar el
    // actor del último movimiento como "responsable" sería inventar un dato.
    responsible: null,
    // C04 incorporará tareas; C01 no crea un segundo sistema provisional.
    tasks: [],
    lead: stageRow
      ? {
          id: stageRow.lead.id,
          priority: stageRow.lead.priority,
          amountCents: stageRow.lead.amountCents,
          currency: stageRow.lead.currency,
          lastActivityAt: stageRow.lead.lastActivityAt?.toISOString() ?? null,
          createdAt: stageRow.lead.createdAt.toISOString(),
          stage: {
            id: stageRow.stage.id,
            name: stageRow.stage.name,
            kind: stageRow.stage.kind,
          },
        }
      : null,
    conversations: conversations.map((conversation) => ({
      ...conversation,
      handoffAt: conversation.handoffAt?.toISOString() ?? null,
      lastInboundAt: conversation.lastInboundAt?.toISOString() ?? null,
      lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
      createdAt: conversation.createdAt.toISOString(),
    })),
    pipelineHistory,
    orders: stageEvents.flatMap((event) =>
      event.toStageId && orderStageIds.has(event.toStageId)
        ? [
            {
              eventId: event.id,
              stageName: event.toStageName,
              occurredAt: event.occurredAt.toISOString(),
              amountCents: stageRow?.lead.amountCents ?? null,
              currency: stageRow?.lead.currency ?? null,
            },
          ]
        : []
    ),
    bookings: bookingDtos,
    files: fileDtos,
  };
}
