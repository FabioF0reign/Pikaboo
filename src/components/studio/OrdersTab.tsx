"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FLOW, flowOf } from "@/lib/orderFlow";
import type { Order, OrderStatus } from "@/lib/types";

const statBox: React.CSSProperties = { background: "#fff7fa", border: "4px solid #f9bcd9", borderRadius: 22, padding: "12px 14px" };

function formatPlaced(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " · " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

function addressLine(o: Order) {
  const a = o.address;
  if (!a) return "Local pickup at the studio";
  return [a.street, a.street2, [a.city, a.state].filter(Boolean).join(", "), a.zip].filter((v) => v && String(v).trim()).join(", ") || "Local pickup at the studio";
}

export default function OrdersTab() {
  const supabase = useMemo(() => createClient(), []);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("orders").select("*").order("placed_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
    const channel = supabase
      .channel("orders-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setStatus(id: string, status: OrderStatus, trackingNumber?: string | null) {
    setBusyId(id);
    try {
      await fetch(`/api/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, trackingNumber }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  function markDone(o: Order) {
    if (o.method === "ship") {
      const input = window.prompt("Tracking number for this shipment (optional — leave blank to skip):", o.tracking_number || "");
      if (input === null) return; // cancelled — don't mark as done
      setStatus(o.id, "done", input.trim() || null);
      return;
    }
    setStatus(o.id, "done");
  }

  async function removeOrder(id: string) {
    if (!confirm("Delete this order? This can't be undone.")) return;
    await supabase.from("orders").delete().eq("id", id);
    await load();
  }

  const counts: Record<OrderStatus, number> = { new: 0, confirmed: 0, printing: 0, ready: 0, done: 0 };
  orders.forEach((o) => (counts[o.status] += 1));
  const openCount = orders.filter((o) => o.status !== "done").length;
  const revenue = orders.filter((o) => o.status !== "new").reduce((n, o) => n + (Number(o.total) || 0), 0);

  const stats = [
    { value: String(openCount), label: "open orders" },
    { value: String(counts.new), label: "awaiting confirm" },
    { value: String(counts.printing + counts.ready), label: "in the studio" },
    { value: "$" + revenue, label: "confirmed value" },
  ];

  const filters: { key: "all" | OrderStatus; label: string }[] = [
    { key: "all", label: `All (${orders.length})` },
    ...FLOW.map((f) => ({ key: f.key, label: `${f.label.charAt(0)}${f.label.slice(1).toLowerCase()} (${counts[f.key]})` })),
  ];

  const shown = orders.filter((o) => filter === "all" || o.status === filter);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
        {stats.map((s) => (
          <div key={s.label} style={statBox}>
            <div style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 27, lineHeight: 1, color: "#c22168" }}>{s.value}</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#8a3a61", marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {filters.map((f) => {
          const selected = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={selected}
              style={{ position: "relative", background: "#fff7fa", border: "3px solid #f9bcd9", borderRadius: 999, padding: "10px 16px", fontWeight: 800, fontSize: 13.5, color: "#5a1c3a", cursor: "pointer", minHeight: 44 }}
            >
              {f.label}
              {selected && <span style={{ position: "absolute", inset: -3, border: "4px solid #ec3d84", borderRadius: 999, pointerEvents: "none" }} />}
            </button>
          );
        })}
        <button
          type="button"
          onClick={load}
          style={{ marginLeft: "auto", background: "#fdeaf3", border: "3px solid #f9bcd9", borderRadius: 999, padding: "10px 16px", fontWeight: 800, fontSize: 13.5, color: "#c22168", cursor: "pointer", minHeight: 44 }}
        >
          Refresh
        </button>
      </div>

      {!loading && orders.length === 0 && (
        <div style={{ background: "#fff7fa", border: "5px dashed #f592bf", borderRadius: 28, padding: "30px 20px", textAlign: "center" }}>
          <div style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 22, color: "#c22168" }}>No orders here yet</div>
          <div style={{ fontSize: 14, color: "#8a3a61", marginTop: 6, maxWidth: 380, marginLeft: "auto", marginRight: "auto" }}>
            Orders placed on the form show up here automatically — on any device, in real time.
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {shown.map((o) => {
          const fl = flowOf(o.status);
          const busy = busyId === o.id;
          return (
            <div key={o.id} style={{ background: "#fff7fa", border: "5px solid #ec3d84", borderRadius: 28, boxShadow: "0 7px 0 #f7a8cc", padding: 16 }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 9 }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#c22168", background: "#fdeaf3", borderRadius: 999, padding: "6px 11px" }}>{o.order_no}</span>
                <span style={{ fontWeight: 800, fontSize: 12, letterSpacing: ".04em", color: "#fff", background: fl.color, borderRadius: 999, padding: "6px 12px" }}>{fl.label}</span>
                {o.rush && <span style={{ fontWeight: 800, fontSize: 12, color: "#5b3d00", background: "#ffd84d", borderRadius: 999, padding: "6px 11px" }}>RUSH</span>}
                {o.resin && <span style={{ fontWeight: 800, fontSize: 12, color: "#1f6d96", background: "#c7e9ff", borderRadius: 999, padding: "6px 11px" }}>RESIN</span>}
                <span style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 700, color: "#8a3a61" }}>{formatPlaced(o.placed_at)}</span>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "baseline", marginTop: 12 }}>
                <span style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 21 }}>{o.product_name}</span>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: "#8a3a61" }}>
                  {o.size_label} · qty {o.qty}
                </span>
                <span style={{ marginLeft: "auto", fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 21, color: "#b81a5c" }}>${o.total}</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 12 }}>
                {o.colors.map((c, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "3px solid #fbd6e7", borderRadius: 16, padding: "8px 11px" }}>
                    <span style={{ width: 26, height: 26, flex: "none", borderRadius: 9, border: "3px solid #fff", boxShadow: "0 0 0 2px #fbd6e7", background: c.hex }} />
                    <span style={{ fontWeight: 800, fontSize: 14, minWidth: 88 }}>{c.name}</span>
                    <span style={{ fontSize: 13.5, color: "#8a3a61" }}>{c.note?.trim() || "no note given"}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10, marginTop: 12 }}>
                <div style={{ background: "#fdeaf3", borderRadius: 16, padding: "11px 13px" }}>
                  <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".05em", color: "#c22168" }}>CUSTOMER</div>
                  <div style={{ fontWeight: 800, fontSize: 15, marginTop: 3 }}>{o.customer_name}</div>
                  <div style={{ fontSize: 13.5, color: "#8a3a61" }}>{o.customer_email}</div>
                  <div style={{ fontSize: 13.5, color: "#8a3a61" }}>{o.customer_phone?.trim() || "no phone given"}</div>
                </div>
                <div style={{ background: "#fdeaf3", borderRadius: 16, padding: "11px 13px" }}>
                  <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".05em", color: "#c22168" }}>{o.method === "ship" ? "SHIP TO" : "PICKUP"}</div>
                  <div style={{ fontSize: 13.5, color: "#8a3a61", marginTop: 3, lineHeight: 1.45 }}>{addressLine(o)}</div>
                  {o.method === "ship" && o.tracking_number && <div style={{ fontSize: 13.5, color: "#8a3a61", marginTop: 3 }}>Tracking: {o.tracking_number}</div>}
                </div>
              </div>

              {o.notes?.trim() && (
                <div style={{ marginTop: 10, background: "#fff9e6", border: "3px solid #ffd84d", borderRadius: 16, padding: "11px 13px", fontSize: 13.5, color: "#5b3d00" }}>{o.notes}</div>
              )}

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
                {fl.next && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => (fl.next === "done" ? markDone(o) : setStatus(o.id, fl.next!))}
                    style={{ background: "#b81a5c", color: "#fff", border: "none", borderBottom: "4px solid #b81a5c", borderRadius: 999, padding: "11px 17px", fontWeight: 800, fontSize: 13.5, cursor: busy ? "default" : "pointer", minHeight: 44, opacity: busy ? 0.7 : 1 }}
                  >
                    {fl.nextLabel}
                  </button>
                )}
                {o.status !== "new" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      const i = FLOW.findIndex((f) => f.key === o.status);
                      setStatus(o.id, FLOW[Math.max(0, i - 1)].key);
                    }}
                    style={{ background: "#fdeaf3", color: "#c22168", border: "3px solid #f9bcd9", borderRadius: 999, padding: "10px 16px", fontWeight: 800, fontSize: 13.5, cursor: busy ? "default" : "pointer", minHeight: 44 }}
                  >
                    Back a step
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeOrder(o.id)}
                  style={{ marginLeft: "auto", background: "#fff", color: "#c22168", border: "3px solid #f9bcd9", borderRadius: 999, padding: "10px 16px", fontWeight: 800, fontSize: 13.5, cursor: "pointer", minHeight: 44 }}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
