"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { US_STATES, stateName } from "@/lib/usStates";
import type { ShippingRate } from "@/lib/types";

const smallInput: React.CSSProperties = { border: "3px solid #f9bcd9", borderRadius: 14, padding: "11px 13px", fontSize: 14, color: "#5a1c3a", background: "#fff7fa" };

export default function ShippingTab() {
  const supabase = useMemo(() => createClient(), []);
  const [defaultRate, setDefaultRate] = useState(6);
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [addState, setAddState] = useState("");

  async function load() {
    const [{ data: settings }, { data: rateRows }] = await Promise.all([
      supabase.from("shop_settings").select("default_shipping_rate").eq("id", 1).single(),
      supabase.from("shipping_rates").select("*").order("state"),
    ]);
    if (settings) setDefaultRate(Number(settings.default_shipping_rate));
    setRates(rateRows || []);
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function patchLocal(id: string, rate: number) {
    setRates((prev) => prev.map((r) => (r.id === id ? { ...r, rate } : r)));
  }

  async function commitRate(id: string, rate: number) {
    await supabase.from("shipping_rates").update({ rate: Math.max(0, rate) }).eq("id", id);
  }

  async function commitDefault(rate: number) {
    const clamped = Math.max(0, rate);
    setDefaultRate(clamped);
    await supabase.from("shop_settings").update({ default_shipping_rate: clamped }).eq("id", 1);
  }

  async function addStateRate() {
    if (!addState) return;
    const { data } = await supabase.from("shipping_rates").insert({ state: addState, rate: defaultRate }).select().single();
    if (data) setRates((prev) => [...prev, data].sort((a, b) => a.state.localeCompare(b.state)));
    setAddState("");
  }

  async function removeRate(id: string) {
    await supabase.from("shipping_rates").delete().eq("id", id);
    setRates((prev) => prev.filter((r) => r.id !== id));
  }

  const usedStates = new Set(rates.map((r) => r.state));
  const availableToAdd = US_STATES.filter((s) => !usedStates.has(s.code));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: "#fff7fa", border: "5px solid #ec3d84", borderRadius: 28, boxShadow: "0 7px 0 #f7a8cc", padding: "18px 16px" }}>
        <h2 style={{ margin: 0, fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 23, color: "#c22168" }}>Shipping rates</h2>
        <div style={{ fontSize: 13.5, color: "#8a3a61", marginTop: 6 }}>Set a different shipping price per state. Customers see it live in the order summary as soon as they pick their state.</div>

        <div style={{ display: "flex", alignItems: "center", gap: 11, background: "#fff", border: "3px solid #fbd6e7", borderRadius: 18, padding: "9px 11px", marginTop: 14, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14.5 }}>Default rate</div>
            <div style={{ fontSize: 12.5, color: "#8a3a61" }}>Used for any state without its own rate below.</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 800, fontSize: 15, color: "#8a3a61" }}>$</span>
            <input
              type="number"
              min={0}
              value={defaultRate}
              onChange={(e) => setDefaultRate(Number(e.target.value) || 0)}
              onBlur={(e) => commitDefault(Number(e.target.value) || 0)}
              aria-label="Default shipping rate in dollars"
              style={{ ...smallInput, width: 84, fontWeight: 800 }}
            />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
          {rates.map((r) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 11, background: "#fff", border: "3px solid #fbd6e7", borderRadius: 18, padding: "9px 11px", flexWrap: "wrap" }}>
              <span style={{ fontWeight: 800, fontSize: 14.5, flex: "1 1 160px" }}>{stateName(r.state)}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontWeight: 800, fontSize: 15, color: "#8a3a61" }}>$</span>
                <input
                  type="number"
                  min={0}
                  value={r.rate}
                  onChange={(e) => patchLocal(r.id, Number(e.target.value) || 0)}
                  onBlur={(e) => commitRate(r.id, Number(e.target.value) || 0)}
                  aria-label={`Shipping rate for ${stateName(r.state)}`}
                  style={{ ...smallInput, width: 84, fontWeight: 800 }}
                />
              </div>
              <button
                type="button"
                onClick={() => removeRate(r.id)}
                aria-label={`Remove rate for ${stateName(r.state)}`}
                style={{ flex: "none", width: 44, height: 44, border: "3px solid #f9bcd9", borderRadius: "50%", background: "#fff", color: "#c22168", fontSize: 17, fontWeight: 800, cursor: "pointer" }}
              >
                ×
              </button>
            </div>
          ))}
          {rates.length === 0 && <div style={{ fontSize: 13.5, color: "#8a3a61" }}>No state overrides yet — every state uses the default rate above.</div>}
        </div>

        {availableToAdd.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginTop: 14 }}>
            <select
              value={addState}
              onChange={(e) => setAddState(e.target.value)}
              aria-label="State to add a shipping rate for"
              style={{ ...smallInput, flex: "1 1 200px" }}
            >
              <option value="">Choose a state…</option>
              {availableToAdd.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addStateRate}
              disabled={!addState}
              style={{ background: "#b81a5c", color: "#fff", border: "none", borderBottom: "4px solid #b81a5c", borderRadius: 999, padding: "11px 18px", fontWeight: 800, fontSize: 14, cursor: addState ? "pointer" : "default", minHeight: 44, opacity: addState ? 1 : 0.6 }}
            >
              + Add a state rate
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
