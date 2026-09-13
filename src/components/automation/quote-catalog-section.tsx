"use client";

import { useEffect, useState } from "react";
import { Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Field =
  | "product_variant"
  | "product_configuration"
  | "material"
  | "color"
  | "legs"
  | "order_extras";
type Product = {
  id: string;
  name: string;
  aliases: string[];
  basePriceCents: number;
  adjustments: Array<{
    id: string;
    label: string;
    field: Field;
    matches: string[];
    priceCents: number;
  }>;
};
type Catalog = {
  enabled: boolean;
  currency: string;
  products: Product[];
  shippingRates: Array<{
    id: string;
    commune: string;
    aliases: string[];
    priceCents: number;
  }>;
};

const FIELDS = new Set<Field>([
  "product_variant",
  "product_configuration",
  "material",
  "color",
  "legs",
  "order_extras",
]);

function id(prefix: string, value: string): string {
  return `${prefix}_${value.toLocaleLowerCase("es").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 50)}`;
}
function aliases(value = ""): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}
function pesos(value: string, line: number): number {
  const amount = Number(value.replace(/[.$\s]/g, ""));
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error(`Monto inválido en la línea ${line}`);
  return amount * 100;
}
function lines(value: string): string[][] {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => line.split("|").map((part) => part.trim()));
}

export function QuoteCatalogSection() {
  const [enabled, setEnabled] = useState(false);
  const [currency, setCurrency] = useState("CLP");
  const [products, setProducts] = useState("");
  const [rules, setRules] = useState("");
  const [shipping, setShipping] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void fetch("/api/settings/quotes").then(async (response) => {
      if (!response.ok) return;
      const catalog = ((await response.json()) as { catalog: Catalog | null }).catalog;
      if (!catalog) return;
      setEnabled(catalog.enabled);
      setCurrency(catalog.currency);
      setProducts(catalog.products.map((p) => `${p.name} | ${p.aliases.join(", ")} | ${p.basePriceCents / 100}`).join("\n"));
      setRules(catalog.products.flatMap((p) => p.adjustments.map((r) => `${p.name} | ${r.field} | ${r.matches.join(", ")} | ${r.label} | ${r.priceCents / 100}`)).join("\n"));
      setShipping(catalog.shippingRates.map((r) => `${r.commune} | ${r.aliases.join(", ")} | ${r.priceCents / 100}`).join("\n"));
    });
  }, []);

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const parsedProducts: Product[] = lines(products).map((row, index) => {
        const [name, aliasText, amountText] = row;
        if (row.length !== 3 || !name || amountText === undefined) throw new Error(`Producto inválido en la línea ${index + 1}`);
        return { id: id("prd", name), name, aliases: aliases(aliasText), basePriceCents: pesos(amountText, index + 1), adjustments: [] };
      });
      for (const [index, row] of lines(rules).entries()) {
        const [productName, field, matchText, label, amountText] = row;
        if (row.length !== 5 || !productName || !field || !matchText || !label || amountText === undefined) throw new Error(`Regla inválida en la línea ${index + 1}`);
        if (!FIELDS.has(field as Field)) throw new Error(`Campo desconocido en la línea ${index + 1}`);
        const product = parsedProducts.find((item) => item.name.toLocaleLowerCase("es") === productName.toLocaleLowerCase("es"));
        if (!product) throw new Error(`La línea ${index + 1} usa un producto inexistente`);
        product.adjustments.push({ id: id("adj", `${productName}_${field}_${matchText}`), label, field: field as Field, matches: aliases(matchText), priceCents: pesos(amountText, index + 1) });
      }
      const shippingRates = lines(shipping).map((row, index) => {
        const [commune, aliasText, amountText] = row;
        if (row.length !== 3 || !commune || amountText === undefined) throw new Error(`Despacho inválido en la línea ${index + 1}`);
        return { id: id("shp", commune), commune, aliases: aliases(aliasText), priceCents: pesos(amountText, index + 1) };
      });
      if (enabled && (!parsedProducts.length || !shippingRates.length)) throw new Error("Para activar el cotizador agrega productos y comunas");
      const response = await fetch("/api/settings/quotes", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ enabled, currency, products: parsedProducts, shippingRates }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error?.message || "No se pudo guardar");
      setMessage("Cotizador guardado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" /> Cotizador determinista</CardTitle>
        <CardDescription>Parley calcula precios y despacho desde estas reglas. NEA no puede escribir ni modificar importes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} /> Activar cotizador y exigir precio válido antes de Pedido</label>
          <div className="space-y-1.5"><Label htmlFor="quote-currency">Moneda</Label><Input id="quote-currency" value={currency} maxLength={3} onChange={(event) => setCurrency(event.target.value.toUpperCase())} /></div>
        </div>
        <div className="space-y-1.5"><Label htmlFor="quote-products">Productos: nombre | alias separados por coma | precio base</Label><textarea id="quote-products" className="min-h-28 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs" value={products} onChange={(event) => setProducts(event.target.value)} placeholder="Futón Globo | futon, futón | 145000" /></div>
        <div className="space-y-1.5"><Label htmlFor="quote-rules">Opciones y adicionales: producto | campo | valores equivalentes | etiqueta | precio adicional</Label><textarea id="quote-rules" className="min-h-36 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs" value={rules} onChange={(event) => setRules(event.target.value)} placeholder={"Futón Globo | product_configuration | sin brazos | Sin brazos | 0\nFutón Globo | product_configuration | con brazos | Brazos | 20000\nFutón Globo | legs | madera, patas de madera | Patas de madera | 10000\nFutón Globo | order_extras | puff adicional, puff | Puff adicional | 10000"} /><p className="text-xs text-muted-foreground">Campos permitidos: product_variant, product_configuration, material, color, legs y order_extras. Registra también las opciones incluidas usando precio 0.</p></div>
        <div className="space-y-1.5"><Label htmlFor="quote-shipping">Despachos: comuna | alias separados por coma | tarifa</Label><textarea id="quote-shipping" className="min-h-28 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs" value={shipping} onChange={(event) => setShipping(event.target.value)} placeholder="Lampa |  | 15000" /></div>
        {message && <p className="text-sm text-muted-foreground" role="status">{message}</p>}
        <Button onClick={() => void save()} disabled={busy}>{busy ? "Guardando…" : "Guardar cotizador"}</Button>
      </CardContent>
    </Card>
  );
}
