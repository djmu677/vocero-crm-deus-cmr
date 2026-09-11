"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Connection = {
  chatId: string;
  botUsername: string | null;
  chatLabel: string | null;
  enabled: boolean;
  tokenLast4: string;
};

export function TelegramAlertSection() {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [token, setToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/settings/telegram");
    if (!response.ok) return;
    const data = await response.json();
    setConnection(data.connection);
    if (data.connection) {
      setChatId(data.connection.chatId);
      setEnabled(data.connection.enabled);
    }
  }

  useEffect(() => { void load(); }, []);

  async function save() {
    setBusy(true); setMessage("");
    const response = await fetch("/api/settings/telegram", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: token || undefined, chatId, enabled }),
    });
    const data = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Configuración guardada." : data.error?.message || "No se pudo guardar.");
    if (response.ok) { setToken(""); await load(); }
    setBusy(false);
  }

  async function test() {
    setBusy(true); setMessage("");
    const response = await fetch("/api/settings/telegram/test", { method: "POST" });
    const data = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Mensaje de prueba enviado." : data.error?.message || "No se pudo enviar la prueba.");
    setBusy(false);
  }

  async function disconnect() {
    if (!window.confirm("¿Desconectar las alertas de Telegram?")) return;
    setBusy(true);
    await fetch("/api/settings/telegram", { method: "DELETE" });
    setConnection(null); setToken(""); setChatId(""); setEnabled(true);
    setMessage("Telegram desconectado."); setBusy(false);
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Alertas de pedidos por Telegram</CardTitle>
        <CardDescription>
          Avisa al equipo cuando un lead entra correctamente en Pedido. El mensaje contiene solo un resumen comercial y el enlace a la conversación.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connection && (
          <div className="flex items-center gap-3 rounded-lg border border-success-soft bg-success-tint p-4 text-sm text-success-text">
            <CheckCircle2 className="h-5 w-5" />
            <span>Conectado a {connection.chatLabel || connection.chatId}{connection.botUsername ? ` con @${connection.botUsername}` : ""} · token ····{connection.tokenLast4}</span>
          </div>
        )}
        <ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
          <li>Crea el bot con @BotFather y copia su token.</li>
          <li>Agrega el bot al grupo del equipo o inicia una conversación con él.</li>
          <li>Pega el ID del chat y guarda; Parley validará ambos datos antes de almacenarlos.</li>
        </ol>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="telegram-token">Token del bot</Label>
            <Input id="telegram-token" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder={connection ? "Dejar vacío para conservarlo" : "123456:ABC…"} autoComplete="new-password" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="telegram-chat">ID del chat</Label>
            <Input id="telegram-chat" value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="-1001234567890" autoComplete="off" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Enviar alertas al entrar en Pedido
        </label>
        {message && <p className="text-sm text-muted-foreground" role="status">{message}</p>}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void save()} disabled={busy || !chatId || (!connection && !token)}>Guardar conexión</Button>
          {connection && <Button variant="outline" onClick={() => void test()} disabled={busy}>Enviar prueba</Button>}
          {connection && <Button variant="ghost" onClick={() => void disconnect()} disabled={busy}>Desconectar</Button>}
        </div>
      </CardContent>
    </Card>
  );
}
