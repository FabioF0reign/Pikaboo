"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { suggestPrice } from "@/lib/orderFlow";
import type { CustomRequest } from "@/lib/types";

function formatPlaced(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

const STATUS_LABEL: Record<CustomRequest["status"], string> = { new: "NEW IDEA", replied: "REPLIED", added: "ON THE MENU" };
const STATUS_COLOR: Record<CustomRequest["status"], string> = { new: "#c22168", replied: "#456020", added: "#1f6d96" };

export default function IdeasTab({ onAddedToMenu }: { onAddedToMenu: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [ideas, setIdeas] = useState<CustomRequest[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("custom_requests").select("*").order("created_at", { ascending: false });
    setIdeas(data || []);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
    const channel = supabase
      .channel("requests-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "custom_requests" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function priceFor(idea: CustomRequest) {
    if (prices[idea.id] != null) return prices[idea.id];
    return idea.suggested_price != null ? idea.suggested_price : suggestPrice(idea.budget);
  }

  async function markReplied(id: string) {
    await supabase.from("custom_requests").update({ status: "replied" }).eq("id", id);
    load();
  }

  async function removeIdea(id: string) {
    if (!confirm("Delete this idea? This can't be undone.")) return;
    await supabase.from("custom_requests").delete().eq("id", id);
    load();
  }

  async function addToMenu(idea: CustomRequest) {
    const price = priceFor(idea);
    setBusyId(idea.id);
    try {
      const { data: existing } = await supabase.from("products").select("sort_order").order("sort_order", { ascending: false }).limit(1);
      const nextSort = existing?.[0]?.sort_order != null ? existing[0].sort_order + 1 : 1;
      await supabase.from("products").insert({
        name: (idea.idea || "Custom print").slice(0, 40),
        blurb: "Custom request — edit this description",
        price,
        photo_url: idea.photo_url,
        sort_order: nextSort,
      });
      await supabase.from("custom_requests").update({ status: "added", suggested_price: price }).eq("id", idea.id);
      await load();
      onAddedToMenu();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: "#fff7fa", border: "5px solid #ec3d84", borderRadius: 28, boxShadow: "0 7px 0 #f7a8cc", padding: "18px 16px" }}>
        <h2 style={{ margin: 0, fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 23, color: "#c22168" }}>Custom print ideas</h2>
        <div style={{ fontSize: 13.5, color: "#8a3a61", marginTop: 5 }}>Suggestions customers sent from the order form. Turn a good one into a menu item with one tap.</div>
      </div>

      {!loading && ideas.length === 0 && (
        <div style={{ background: "#fff7fa", border: "5px dashed #f592bf", borderRadius: 28, padding: "28px 20px", textAlign: "center" }}>
          <div style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 21, color: "#c22168" }}>No ideas yet</div>
          <div style={{ fontSize: 14, color: "#8a3a61", marginTop: 5 }}>Requests sent from the form&apos;s &quot;Suggest a custom print&quot; box land here.</div>
        </div>
      )}

      {ideas.map((idea) => {
        const price = priceFor(idea);
        const busy = busyId === idea.id;
        return (
          <div key={idea.id} style={{ background: "#fff7fa", border: "5px solid #ec3d84", borderRadius: 28, boxShadow: "0 7px 0 #f7a8cc", padding: 16 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 9 }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#c22168", background: "#fdeaf3", borderRadius: 999, padding: "6px 11px" }}>{idea.request_no}</span>
              <span style={{ fontWeight: 800, fontSize: 12, letterSpacing: ".04em", color: "#fff", background: STATUS_COLOR[idea.status], borderRadius: 999, padding: "6px 12px" }}>
                {STATUS_LABEL[idea.status]}
              </span>
              <span style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 700, color: "#8a3a61" }}>{formatPlaced(idea.created_at)}</span>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
              {idea.photo_url && (
                <div style={{ width: 120, flex: "none", position: "relative" }}>
                  <img src={idea.photo_url} alt="reference" style={{ width: "100%", borderRadius: 14, border: "3px solid #f9bcd9", display: "block" }} />
                </div>
              )}
              <div style={{ flex: "1 1 220px" }}>
                <div style={{ fontSize: 15.5, lineHeight: 1.45, color: "#5a1c3a" }}>{idea.idea}</div>
                <div style={{ fontSize: 13.5, color: "#8a3a61", marginTop: 7 }}>Colors: {idea.colors?.trim() || "open"} · Budget: {idea.budget?.trim() || "not said"}</div>
                <div style={{ fontSize: 13.5, color: "#8a3a61" }}>
                  {idea.customer_name?.trim() || "no name"} · {idea.contact}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginTop: 12, background: "#fdeaf3", borderRadius: 16, padding: "11px 13px" }}>
              <span style={{ fontWeight: 800, fontSize: 13.5, color: "#b81a5c" }}>Your price $</span>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrices((p) => ({ ...p, [idea.id]: Math.max(1, Number(e.target.value) || 1) }))}
                aria-label="Price you will charge for this custom print"
                min={1}
                style={{ width: 94, border: "3px solid #f9bcd9", borderRadius: 13, padding: "10px 12px", fontWeight: 800, fontSize: 15, color: "#5a1c3a", background: "#fff" }}
              />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#8a3a61" }}>
                {idea.budget?.trim() ? `customer suggested ${idea.budget}` : "no budget given — starting at $20"}
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
              <button
                type="button"
                disabled={busy || idea.status === "added"}
                onClick={() => addToMenu(idea)}
                style={{ background: "#b81a5c", color: "#fff", border: "none", borderBottom: "4px solid #b81a5c", borderRadius: 999, padding: "11px 17px", fontWeight: 800, fontSize: 13.5, cursor: busy ? "default" : "pointer", minHeight: 44, opacity: idea.status === "added" ? 0.6 : 1 }}
              >
                {idea.status === "added" ? "Already on the menu" : `Add to the menu at $${price}`}
              </button>
              <button
                type="button"
                onClick={() => markReplied(idea.id)}
                style={{ background: "#fdeaf3", color: "#c22168", border: "3px solid #f9bcd9", borderRadius: 999, padding: "10px 16px", fontWeight: 800, fontSize: 13.5, cursor: "pointer", minHeight: 44 }}
              >
                Mark replied
              </button>
              <button
                type="button"
                onClick={() => removeIdea(idea.id)}
                style={{ marginLeft: "auto", background: "#fff", color: "#c22168", border: "3px solid #f9bcd9", borderRadius: 999, padding: "10px 16px", fontWeight: 800, fontSize: 13.5, cursor: "pointer", minHeight: 44 }}
              >
                Delete
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
