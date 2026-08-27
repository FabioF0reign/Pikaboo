"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resizeImageToBlob, uploadPhoto } from "@/lib/image";
import PageDecor from "@/components/PageDecor";
import { US_STATES } from "@/lib/usStates";
import type { Product, FilamentColor, OrderColor, ShippingRate } from "@/lib/types";

const SIZES = [
  { key: "sm", label: "Small", note: "palm size · x1.0", mult: 1 },
  { key: "md", label: "Medium", note: "a bit chunkier · x1.4", mult: 1.4 },
  { key: "lg", label: "Large", note: "statement piece · x1.9", mult: 1.9 },
] as const;

const METHODS = [
  { key: "ship", label: "Ship to me" },
  { key: "pickup", label: "Local pickup" },
] as const;

const RUSH_COST = 8;
const RESIN_COST = 5;

type Pick = { name: string; note: string };

const card: React.CSSProperties = {
  background: "#fff7fa",
  border: "5px solid #ec3d84",
  borderRadius: 30,
  boxShadow: "0 8px 0 #f7a8cc",
  padding: "20px 18px",
};

const stepBadge: React.CSSProperties = {
  width: 34,
  height: 34,
  flex: "none",
  display: "grid",
  placeItems: "center",
  background: "#c22168",
  color: "#fff",
  borderRadius: "50%",
  fontFamily: "'Baloo 2', sans-serif",
  fontWeight: 800,
  fontSize: 19,
};

const stepTitle: React.CSSProperties = {
  margin: 0,
  fontFamily: "'Baloo 2', sans-serif",
  fontWeight: 800,
  fontSize: 25,
  color: "#c22168",
};

const fieldLabel: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontWeight: 700,
  fontSize: 14,
  color: "#8a3a61",
};

const textInput: React.CSSProperties = {
  border: "3px solid #f9bcd9",
  borderRadius: 16,
  padding: "13px 14px",
  fontSize: 16,
  color: "#5a1c3a",
  background: "#fff",
};

export default function OrderForm() {
  const supabase = useMemo(() => createClient(), []);

  const [products, setProducts] = useState<Product[]>([]);
  const [colors, setColors] = useState<FilamentColor[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [resinAvailable, setResinAvailable] = useState(true);
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [defaultShipRate, setDefaultShipRate] = useState(6);

  const [productId, setProductId] = useState("");
  const [picks, setPicks] = useState<Pick[]>([]);
  const [size, setSize] = useState<(typeof SIZES)[number]["key"]>("sm");
  const [qty, setQty] = useState(1);
  const [rush, setRush] = useState(false);
  const [resin, setResin] = useState(false);
  const [method, setMethod] = useState<"ship" | "pickup">("ship");
  const [paymentPreference, setPaymentPreference] = useState<"electronic" | "in_person">("electronic");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [street, setStreet] = useState("");
  const [street2, setStreet2] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [zip, setZip] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orderNo, setOrderNo] = useState("");
  const [error, setError] = useState(false);
  const [addrError, setAddrError] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [reqStage, setReqStage] = useState<"closed" | "open" | "sent">("closed");
  const [reqIdea, setReqIdea] = useState("");
  const [reqColors, setReqColors] = useState("");
  const [reqBudget, setReqBudget] = useState("");
  const [reqName, setReqName] = useState("");
  const [reqContact, setReqContact] = useState("");
  const [reqPhotoUrl, setReqPhotoUrl] = useState("");
  const [reqPhotoBusy, setReqPhotoBusy] = useState(false);
  const [reqError, setReqError] = useState(false);
  const [reqSubmitting, setReqSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: c }, { data: settings }, { data: rates }] = await Promise.all([
        supabase.from("products").select("*").order("sort_order"),
        supabase.from("colors").select("*").eq("available", true).order("sort_order"),
        supabase.from("shop_settings").select("resin_available, default_shipping_rate").eq("id", 1).single(),
        supabase.from("shipping_rates").select("*"),
      ]);
      const prods = p || [];
      const cols = c || [];
      setProducts(prods);
      setColors(cols);
      if (prods.length) setProductId(prods[0].id);
      if (cols.length) setPicks([{ name: cols[0].name, note: "" }]);
      const resinOn = settings ? settings.resin_available !== false : true;
      setResinAvailable(resinOn);
      if (!resinOn) setResin(false);
      if (settings) setDefaultShipRate(Number(settings.default_shipping_rate));
      setShippingRates(rates || []);
      setCatalogLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const product = products.find((p) => p.id === productId) || products[0];
  const sizeInfo = SIZES.find((s) => s.key === size) || SIZES[0];

  const shipCost = useMemo(() => {
    if (method !== "ship") return 0;
    const override = shippingRates.find((r) => r.state === stateName);
    return Number(override ? override.rate : defaultShipRate);
  }, [method, stateName, shippingRates, defaultShipRate]);

  const total = useMemo(() => {
    if (!product) return 0;
    const base = Number(product.price) * sizeInfo.mult * qty;
    const rushCost = rush ? RUSH_COST : 0;
    const resinCost = resin ? RESIN_COST : 0;
    return Math.round(base + rushCost + resinCost + shipCost);
  }, [product, sizeInfo, qty, rush, resin, shipCost]);

  function toggleColor(c: FilamentColor) {
    setPicks((prev) => (prev.some((p) => p.name === c.name) ? prev.filter((p) => p.name !== c.name) : prev.concat([{ name: c.name, note: "" }])));
  }

  function hexOf(name: string) {
    return colors.find((c) => c.name === name)?.hex || "#f9b8d6";
  }

  async function submit() {
    if (!product) return;
    const needAddr = method === "ship" && (!street.trim() || !city.trim() || !zip.trim());
    if (!name.trim() || !email.trim() || needAddr) {
      setError(true);
      setAddrError(needAddr);
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    const orderColors: OrderColor[] = picks.map((p) => ({ name: p.name, hex: hexOf(p.name), note: p.note }));
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: product.name,
          sizeLabel: sizeInfo.label,
          qty,
          rush,
          resin,
          colors: orderColors,
          customerName: name,
          customerEmail: email,
          customerPhone: phone,
          method,
          address: method === "ship" ? { street, street2, city, state: stateName, zip } : null,
          paymentPreference: method === "pickup" ? paymentPreference : null,
          notes,
          total,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Something went wrong.");
      setOrderNo(json.orderNo);
      setSubmitted(true);
      setError(false);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setSubmitted(false);
    setQty(1);
    setNotes("");
    setRush(false);
    setResin(false);
  }

  async function onReqPhoto(file: File) {
    setReqPhotoBusy(true);
    try {
      const blob = await resizeImageToBlob(file);
      const url = await uploadPhoto(supabase, "reference-photos", blob);
      setReqPhotoUrl(url);
    } catch {
      // Non-fatal — the customer can still send the idea without a photo.
    } finally {
      setReqPhotoBusy(false);
    }
  }

  async function sendRequest() {
    if (!reqIdea.trim() || !reqContact.trim()) {
      setReqError(true);
      return;
    }
    setReqSubmitting(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: reqIdea,
          colors: reqColors,
          budget: reqBudget,
          customerName: reqName,
          contact: reqContact,
          photoUrl: reqPhotoUrl || null,
        }),
      });
      if (!res.ok) throw new Error();
      setReqStage("sent");
      setReqError(false);
      setReqIdea("");
      setReqColors("");
      setReqBudget("");
      setReqPhotoUrl("");
    } catch {
      setReqError(true);
    } finally {
      setReqSubmitting(false);
    }
  }

  const colorSummary = picks.length ? picks.map((p) => p.name + (p.note.trim() ? " → " + p.note.trim() : "")).join("  ·  ") : "not picked yet";
  const addrSummary = [street, street2, [city, stateName].filter(Boolean).join(", "), zip].filter((v) => v && v.trim()).join(", ");

  return (
    <div
      style={{
        minHeight: "100vh",
        fontFamily: "Nunito, Helvetica, sans-serif",
        color: "#5a1c3a",
        backgroundColor: "#fbd6e7",
        backgroundImage: "repeating-conic-gradient(#f9b8d6 0% 25%, #fdeaf3 0% 50%)",
        backgroundSize: "56px 56px",
        padding: "18px 14px 60px",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 18,
      }}
    >
      <PageDecor pageHeight={4300} />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 720,
          background: "#fff7fa",
          border: "5px solid #ec3d84",
          borderRadius: 34,
          boxShadow: "0 10px 0 #f7a8cc, 0 18px 34px rgba(160, 30, 95, .22)",
          padding: "26px 22px 22px",
          textAlign: "center",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background: "repeating-conic-gradient(rgba(246,150,192,.34) 0% 25%, rgba(255,255,255,0) 0% 50%)",
            backgroundSize: "40px 40px",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "clamp(10px, 3vw, 20px)", flexWrap: "wrap" }}>
            <img
              src="/pikaboo-logo.jpeg"
              alt="Pikaboo by Genny logo"
              style={{ width: "min(209px, 42vw)", height: "auto", flex: "none", mixBlendMode: "multiply" }}
            />
            <div style={{ textAlign: "left" }}>
              <h1
                style={{
                  margin: 0,
                  fontFamily: "'Baloo 2', Nunito, sans-serif",
                  fontWeight: 800,
                  fontSize: "clamp(34px, 10vw, 62px)",
                  lineHeight: 0.95,
                  color: "#ec3d84",
                  textShadow: "3px 3px 0 #fff, 6px 6px 0 #f9bcd9",
                }}
              >
                Pikaboo
              </h1>
              <div style={{ fontFamily: "'Baloo 2', Nunito, sans-serif", fontWeight: 700, fontSize: "clamp(15px, 4.4vw, 20px)", color: "#c22168", marginTop: 2 }}>
                3D print orders · by Genny
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 14 }}>
            <span style={{ background: "#c22168", color: "#fff", fontWeight: 800, fontSize: 12.5, letterSpacing: ".04em", padding: "7px 13px", borderRadius: 999 }}>
              MADE TO ORDER
            </span>
            <span style={{ background: "#ffd84d", color: "#5b3d00", fontWeight: 800, fontSize: 12.5, letterSpacing: ".04em", padding: "7px 13px", borderRadius: 999 }}>
              PICK YOUR COLORS
            </span>
            <span style={{ background: "#fff", color: "#c22168", border: "2px solid #f9bcd9", fontWeight: 800, fontSize: 12.5, letterSpacing: ".04em", padding: "5px 13px", borderRadius: 999 }}>
              5–7 DAY TURNAROUND
            </span>
          </div>
        </div>
      </div>

      {submitted ? (
        <div
          style={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            maxWidth: 720,
            background: "#fff7fa",
            border: "5px solid #ec3d84",
            borderRadius: 30,
            boxShadow: "0 10px 0 #f7a8cc",
            padding: "34px 24px",
            textAlign: "center",
            animation: "pkpop .35s ease-out",
          }}
        >
          <h2 role="status" style={{ margin: 0, fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 34, color: "#ec3d84" }}>
            Yay, order sent!
          </h2>
          <div style={{ fontSize: 16, marginTop: 8, maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
            Genny will reach out with a confirmation and payment link within 24 hours.
          </div>
          <div style={{ marginTop: 18, display: "inline-block", background: "#fdeaf3", border: "3px dashed #f592bf", borderRadius: 18, padding: "12px 20px", fontFamily: "'DM Mono', monospace", fontSize: 15, color: "#c22168" }}>
            order {orderNo}
          </div>
          <div style={{ marginTop: 22 }}>
            <button
              type="button"
              onClick={reset}
              style={{ background: "#b81a5c", color: "#fff", border: "none", borderBottom: "5px solid #b81a5c", borderRadius: 999, padding: "14px 26px", fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 18, cursor: "pointer" }}
            >
              Start another order
            </button>
          </div>
        </div>
      ) : (
        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 720, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Step 1: pick a print */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={stepBadge}>1</span>
              <h2 style={stepTitle}>Pick your print</h2>
            </div>
            <div style={{ fontSize: 14.5, color: "#8a3a61", marginBottom: 14 }}>Everything is printed fresh in Genny&apos;s studio.</div>
            {!catalogLoaded ? (
              <div style={{ fontSize: 14, color: "#8a3a61" }}>Loading the menu…</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                {products.map((p) => {
                  const selected = p.id === productId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setProductId(p.id)}
                      aria-pressed={selected}
                      style={{ position: "relative", textAlign: "left", background: "#fff", border: "3px solid #f9bcd9", borderRadius: 22, padding: "10px 10px 12px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 8 }}
                    >
                      <div style={{ position: "relative", borderRadius: 15, overflow: "hidden", aspectRatio: "4 / 3", background: "repeating-linear-gradient(135deg, #fce0ec 0 9px, #fbc9e0 9px 18px)", display: "grid", placeItems: "center" }}>
                        {p.photo_url ? (
                          <img src={p.photo_url} alt={p.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#8f1049", textAlign: "center", padding: "0 6px" }}>photo coming soon</span>
                        )}
                      </div>
                      <div style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 17, lineHeight: 1.15, color: "#5a1c3a" }}>{p.name}</div>
                      <div style={{ fontSize: 12.5, color: "#8a3a61", lineHeight: 1.35 }}>{p.blurb}</div>
                      <div style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 15, color: "#c22168" }}>from ${p.price}</div>
                      {selected && <span style={{ position: "absolute", inset: -3, border: "4px solid #ec3d84", borderRadius: 24, pointerEvents: "none" }} />}
                      {selected && (
                        <span style={{ position: "absolute", top: -10, right: -8, background: "#ffd84d", color: "#5b3d00", border: "3px solid #fff", borderRadius: 999, fontWeight: 800, fontSize: 11, padding: "4px 9px" }}>
                          PICKED
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 2: choose colors */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={stepBadge}>2</span>
              <h2 style={stepTitle}>Choose colors</h2>
            </div>
            <div style={{ fontSize: 14.5, color: "#8a3a61", marginBottom: 16 }}>Tap the colors you want, then tell Genny what each one is for.</div>
            <div role="group" aria-label="Filament colors" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))", gap: 10 }}>
              {colors.map((c) => {
                const selected = picks.some((p) => p.name === c.name);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleColor(c)}
                    title={c.name}
                    aria-label={c.name}
                    aria-pressed={selected}
                    style={{ position: "relative", background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, minHeight: 44 }}
                  >
                    <span style={{ position: "relative", width: "100%", display: "block" }}>
                      <span style={{ width: "100%", aspectRatio: "1", borderRadius: 16, border: "3px solid #fff", boxShadow: "0 0 0 2px #fbd6e7", display: "block", background: c.hex }} />
                      {selected && <span style={{ position: "absolute", inset: -5, border: "4px solid #ec3d84", borderRadius: 21, pointerEvents: "none" }} />}
                    </span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: "#8a3a61", lineHeight: 1.1, textAlign: "center" }}>{c.name}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
              {picks.map((p) => (
                <div key={p.name} style={{ background: "#fff", border: "3px solid #fbd6e7", borderRadius: 20, padding: 12, display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap" }}>
                  <span style={{ width: 34, height: 34, flex: "none", borderRadius: 11, border: "3px solid #fff", boxShadow: "0 0 0 2px #fbd6e7", background: hexOf(p.name) }} />
                  <span style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 16, minWidth: 92 }}>{p.name}</span>
                  <input
                    type="text"
                    value={p.note}
                    onChange={(e) => setPicks((prev) => prev.map((x) => (x.name === p.name ? { ...x, note: e.target.value } : x)))}
                    placeholder="what should this color be? e.g. the wings"
                    aria-label="What is this color for?"
                    style={{ flex: "1 1 180px", border: "3px solid #f9bcd9", borderRadius: 14, padding: "11px 13px", fontSize: 15, color: "#5a1c3a", background: "#fff7fa" }}
                  />
                  <button
                    type="button"
                    onClick={() => toggleColor({ name: p.name } as FilamentColor)}
                    aria-label="Remove color"
                    style={{ width: 34, height: 34, flex: "none", border: "none", borderRadius: "50%", background: "#fdeaf3", color: "#c22168", fontSize: 17, fontWeight: 800, cursor: "pointer" }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            {picks.length === 0 && (
              <div style={{ marginTop: 14, background: "#fdeaf3", border: "3px dashed #f592bf", borderRadius: 18, padding: "13px 15px", fontSize: 14, color: "#c22168", fontWeight: 700 }}>
                No colors picked yet — tap a swatch above and a note box will show up here.
              </div>
            )}
          </div>

          {/* Step 3: size & quantity */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={stepBadge}>3</span>
              <h2 style={stepTitle}>Size &amp; quantity</h2>
            </div>
            <div role="group" aria-label="Size" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
              {SIZES.map((s) => {
                const selected = s.key === size;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSize(s.key)}
                    aria-pressed={selected}
                    style={{ position: "relative", textAlign: "left", background: "#fff", border: "3px solid #f9bcd9", borderRadius: 20, padding: "12px 14px", cursor: "pointer", minHeight: 66 }}
                  >
                    <div style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 17 }}>{s.label}</div>
                    <div style={{ fontSize: 12.5, color: "#8a3a61" }}>{s.note}</div>
                    {selected && <span style={{ position: "absolute", inset: -3, border: "4px solid #ec3d84", borderRadius: 22, pointerEvents: "none" }} />}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, marginTop: 16 }}>
              <span style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 17 }}>How many?</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "3px solid #f9bcd9", borderRadius: 999, padding: 5 }}>
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Fewer" style={{ width: 44, height: 44, borderRadius: "50%", border: "none", background: "#fdeaf3", color: "#c22168", fontSize: 24, fontWeight: 800, cursor: "pointer" }}>
                  −
                </button>
                <span role="status" aria-live="polite" aria-atomic="true" style={{ minWidth: 34, textAlign: "center", fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 22 }}>
                  {qty}
                </span>
                <button type="button" onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="More" style={{ width: 44, height: 44, borderRadius: "50%", border: "none", background: "#c22168", color: "#fff", fontSize: 24, fontWeight: 800, cursor: "pointer" }}>
                  +
                </button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginLeft: "auto" }}>
                <button
                  type="button"
                  onClick={() => setRush((r) => !r)}
                  aria-pressed={rush}
                  style={{ position: "relative", background: "#fff9e6", border: "3px solid #ffd84d", borderRadius: 999, padding: "11px 18px", fontWeight: 800, fontSize: 14, color: "#5b3d00", cursor: "pointer" }}
                >
                  Rush it · +${RUSH_COST} {rush ? "✓" : ""}
                </button>
                {resinAvailable && (
                  <button
                    type="button"
                    onClick={() => setResin((r) => !r)}
                    aria-pressed={resin}
                    style={{ position: "relative", background: "#eef7ff", border: "3px solid #8fd4ff", borderRadius: 999, padding: "11px 18px", fontWeight: 800, fontSize: 14, color: "#1f6d96", cursor: "pointer" }}
                  >
                    Resin · +${RESIN_COST} {resin ? "✓" : ""}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Step 4: details */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={stepBadge}>4</span>
              <h2 style={stepTitle}>Your details</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
              <label style={fieldLabel}>
                Name
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} aria-required="true" placeholder="Genny B." style={textInput} />
              </label>
              <label style={fieldLabel}>
                Email
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-required="true" placeholder="you@email.com" style={textInput} />
              </label>
              <label style={fieldLabel}>
                Phone number
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" style={textInput} />
              </label>
            </div>
            <div role="group" aria-label="Delivery method" style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
              {METHODS.map((m) => {
                const selected = m.key === method;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMethod(m.key)}
                    aria-pressed={selected}
                    style={{ position: "relative", background: "#fff", border: "3px solid #f9bcd9", borderRadius: 999, padding: "11px 18px", fontWeight: 800, fontSize: 14, color: "#5a1c3a", cursor: "pointer" }}
                  >
                    {m.label}
                    {selected && <span style={{ position: "absolute", inset: -3, border: "4px solid #ec3d84", borderRadius: 999, pointerEvents: "none" }} />}
                  </button>
                );
              })}
            </div>
            {method === "pickup" && (
              <div style={{ marginTop: 14, background: "#fff", border: "3px solid #fbd6e7", borderRadius: 20, padding: 14 }}>
                <h3 style={{ margin: "0 0 10px", fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 17 }}>How will you pay?</h3>
                <div role="group" aria-label="How you'll pay" style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {[
                    { key: "electronic" as const, label: "Pay electronically" },
                    { key: "in_person" as const, label: "Pay in person at pickup" },
                  ].map((opt) => {
                    const selected = paymentPreference === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setPaymentPreference(opt.key)}
                        aria-pressed={selected}
                        style={{ position: "relative", background: "#fff7fa", border: "3px solid #f9bcd9", borderRadius: 999, padding: "11px 18px", fontWeight: 800, fontSize: 14, color: "#5a1c3a", cursor: "pointer" }}
                      >
                        {opt.label}
                        {selected && <span style={{ position: "absolute", inset: -3, border: "4px solid #ec3d84", borderRadius: 999, pointerEvents: "none" }} />}
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 12.5, color: "#8a3a61", marginTop: 9 }}>
                  {paymentPreference === "electronic" ? "You'll get payment links once Genny confirms your order." : "Bring cash, card, or however you'd like to settle up when you pick up."}
                </div>
              </div>
            )}
            {method === "ship" && (
              <div style={{ marginTop: 14, background: "#fff", border: "3px solid #fbd6e7", borderRadius: 20, padding: 14 }}>
                <h3 style={{ margin: "0 0 10px", fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 17 }}>Shipping address</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input type="text" value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Street address" aria-label="Street address" aria-required="true" autoComplete="street-address" style={{ ...textInput, borderRadius: 14, padding: "12px 13px", fontSize: 15 }} />
                  <input type="text" value={street2} onChange={(e) => setStreet2(e.target.value)} placeholder="Apt / unit (optional)" aria-label="Apartment or unit, optional" style={{ ...textInput, borderRadius: 14, padding: "12px 13px", fontSize: 15 }} />
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
                    <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" aria-label="City" aria-required="true" autoComplete="address-level2" style={{ ...textInput, borderRadius: 14, padding: "12px 13px", fontSize: 15 }} />
                    <select value={stateName} onChange={(e) => setStateName(e.target.value)} aria-label="State" autoComplete="address-level1" style={{ ...textInput, borderRadius: 14, padding: "12px 13px", fontSize: 15 }}>
                      <option value="">State</option>
                      {US_STATES.map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <input type="text" value={zip} onChange={(e) => setZip(e.target.value)} placeholder="ZIP" aria-label="ZIP code" aria-required="true" inputMode="numeric" autoComplete="postal-code" style={{ ...textInput, borderRadius: 14, padding: "12px 13px", fontSize: 15 }} />
                  </div>
                </div>
                <div style={{ fontSize: 12.5, color: "#8a3a61", marginTop: 9 }}>Shipping is ${shipCost}, tracked. Genny confirms before you pay.</div>
              </div>
            )}
            <label style={{ ...fieldLabel, marginTop: 14 }}>
              Notes for Genny
              <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Names to engrave, color swaps, gift wrap..." style={{ ...textInput, resize: "vertical" }} />
            </label>
          </div>

          {/* Order summary */}
          <div style={{ background: "#b81a5c", border: "5px solid #8f1049", borderRadius: 30, boxShadow: "0 8px 0 #74093c", padding: "20px 18px", color: "#fff" }}>
            <h2 style={{ margin: 0, fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 23 }}>Your order</h2>
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Print", value: product?.name || "" },
                { label: "Colors", value: colorSummary },
                { label: "Size", value: sizeInfo.label },
                { label: "Quantity", value: String(qty) },
                ...(resin ? [{ label: "Finish", value: `Resin · +$${RESIN_COST}` }] : []),
                { label: "Delivery", value: METHODS.find((m) => m.key === method)!.label + (method === "ship" ? ` · +$${shipCost}` : "") + (rush ? " · rush" : "") },
                ...(method === "ship" ? [{ label: "Ship to", value: addrSummary || "add your address above" }] : []),
                ...(method === "pickup" ? [{ label: "Payment", value: paymentPreference === "electronic" ? "Electronic" : "In person at pickup" }] : []),
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", gap: 12, alignItems: "baseline", borderBottom: "2px dashed rgba(255,255,255,.4)", paddingBottom: 7 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700 }}>{row.label}</span>
                  <span style={{ marginLeft: "auto", textAlign: "right", fontWeight: 800, fontSize: 15 }}>{row.value}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 14 }}>
              <span style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 20 }}>Estimate</span>
              <span style={{ marginLeft: "auto", fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 32, color: "#ffe89a" }}>${total}</span>
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              style={{ width: "100%", marginTop: 16, background: "#fff7fa", color: "#b81a5c", border: "none", borderBottom: "6px solid #f9bcd9", borderRadius: 999, padding: "17px 20px", fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 21, cursor: submitting ? "default" : "pointer", minHeight: 56, opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? "Sending…" : "Send my order"}
            </button>
            <div style={{ textAlign: "center", fontSize: 12.5, marginTop: 10 }}>No payment yet — Genny confirms colors first.</div>
            {error && (
              <div role="alert" style={{ marginTop: 12, background: "#fff7fa", color: "#c22168", borderRadius: 16, padding: "11px 14px", fontWeight: 800, fontSize: 14, textAlign: "center" }}>
                {addrError ? "Please fill in your shipping address (street, city, ZIP)." : "Please add your name and email so Genny can reach you."}
              </div>
            )}
            {submitError && (
              <div role="alert" style={{ marginTop: 12, background: "#fff7fa", color: "#c22168", borderRadius: 16, padding: "11px 14px", fontWeight: 800, fontSize: 14, textAlign: "center" }}>
                {submitError}
              </div>
            )}
          </div>

          {/* Custom print request */}
          <div style={{ background: "#fff7fa", border: "5px dashed #f592bf", borderRadius: 30, padding: "20px 18px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
              <h2 style={{ margin: 0, fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 23, color: "#c22168" }}>Want something we don&apos;t print yet?</h2>
            </div>
            <div style={{ fontSize: 14.5, color: "#8a3a61", marginTop: 5 }}>Tell Genny your idea — she takes on custom requests and adds the popular ones to the menu.</div>

            {reqStage === "open" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
                <textarea
                  rows={3}
                  value={reqIdea}
                  onChange={(e) => {
                    setReqIdea(e.target.value);
                    setReqError(false);
                  }}
                  placeholder="What should Genny print? e.g. an articulated seahorse with a tiny crown"
                  aria-label="Your custom print idea"
                  aria-required="true"
                  style={{ ...textInput, resize: "vertical" }}
                />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
                  <input type="text" value={reqColors} onChange={(e) => setReqColors(e.target.value)} placeholder="Colors you'd want" aria-label="Colors you would want" style={{ ...textInput, borderRadius: 14, padding: "12px 13px", fontSize: 15 }} />
                  <input type="text" value={reqBudget} onChange={(e) => setReqBudget(e.target.value)} placeholder="Budget (optional)" aria-label="Budget, optional" style={{ ...textInput, borderRadius: 14, padding: "12px 13px", fontSize: 15 }} />
                  <input type="text" value={reqName} onChange={(e) => setReqName(e.target.value)} placeholder="Your name" aria-label="Your name" style={{ ...textInput, borderRadius: 14, padding: "12px 13px", fontSize: 15 }} />
                  <input
                    type="text"
                    value={reqContact}
                    onChange={(e) => {
                      setReqContact(e.target.value);
                      setReqError(false);
                    }}
                    placeholder="Email or phone"
                    aria-label="Email or phone"
                    aria-required="true"
                    style={{ ...textInput, borderRadius: 14, padding: "12px 13px", fontSize: 15 }}
                  />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                  <label style={{ background: "#fdeaf3", color: "#c22168", border: "3px solid #f9bcd9", borderRadius: 999, padding: "12px 18px", fontWeight: 800, fontSize: 14, cursor: "pointer", minHeight: 44, display: "flex", alignItems: "center" }}>
                    Add a reference photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onReqPhoto(file);
                      }}
                      style={{ display: "none" }}
                    />
                  </label>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#8a3a61" }}>{reqPhotoBusy ? "uploading…" : reqPhotoUrl ? "photo attached" : "optional"}</span>
                </div>
                {reqPhotoUrl && (
                  <div style={{ position: "relative", width: 132 }}>
                    <img src={reqPhotoUrl} alt="reference" style={{ width: "100%", borderRadius: 14, border: "3px solid #f9bcd9", display: "block" }} />
                  </div>
                )}
                <button
                  type="button"
                  onClick={sendRequest}
                  disabled={reqSubmitting}
                  style={{ background: "#b81a5c", color: "#fff", border: "none", borderBottom: "5px solid #b81a5c", borderRadius: 999, padding: "15px 22px", fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 18, cursor: reqSubmitting ? "default" : "pointer", minHeight: 52, opacity: reqSubmitting ? 0.7 : 1 }}
                >
                  {reqSubmitting ? "Sending…" : "Send my idea"}
                </button>
                {reqError && (
                  <div role="alert" style={{ background: "#fdeaf3", color: "#c22168", borderRadius: 14, padding: "11px 14px", fontWeight: 800, fontSize: 13.5 }}>
                    Add your idea and a way to reach you.
                  </div>
                )}
              </div>
            )}

            {reqStage === "closed" && (
              <button
                type="button"
                onClick={() => setReqStage("open")}
                style={{ marginTop: 14, background: "#b81a5c", color: "#fff", border: "none", borderBottom: "5px solid #b81a5c", borderRadius: 999, padding: "14px 22px", fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 17, cursor: "pointer", minHeight: 50 }}
              >
                Suggest a custom print
              </button>
            )}

            {reqStage === "sent" && (
              <div style={{ marginTop: 14, background: "#fdeaf3", border: "3px solid #f9bcd9", borderRadius: 18, padding: "14px 16px", textAlign: "center" }}>
                <div role="status" style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 20, color: "#c22168" }}>
                  Idea sent, thank you!
                </div>
                <div style={{ fontSize: 14, color: "#8a3a61", marginTop: 4 }}>Genny reviews requests weekly and will reach out with a quote.</div>
                <button type="button" onClick={() => setReqStage("open")} style={{ marginTop: 10, background: "none", border: "none", color: "#c22168", fontWeight: 800, fontSize: 13.5, textDecoration: "underline", cursor: "pointer", minHeight: 44 }}>
                  Suggest another
                </button>
              </div>
            )}
          </div>

          <div style={{ textAlign: "center", fontSize: 13, color: "#6d1740", padding: "4px 10px 0" }}>Pikaboo by Genny · handmade 3D prints · ship or local pickup</div>
          <div style={{ textAlign: "center", paddingTop: 2 }}>
            <a href="/studio/login" style={{ fontSize: 12.5, fontWeight: 700, color: "#6d1740", textDecoration: "none", borderBottom: "2px dotted #f9bcd9" }}>
              Studio login
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
