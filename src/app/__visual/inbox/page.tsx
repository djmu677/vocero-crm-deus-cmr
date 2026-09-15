import { InboxClient } from "@/components/inbox/inbox-client";

export const dynamic = "force-dynamic";

export default function VisualInboxPage() {
  return <InboxClient channels={["whatsapp", "instagram", "messenger"]} />;
}
