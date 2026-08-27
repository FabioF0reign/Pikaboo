"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resizeImageToBlob, uploadPhoto } from "@/lib/image";
import type { Product, ProductVariant, FilamentColor, ShopSettings } from "@/lib/types";

const smallInput: React.CSSProperties = { border: "3px solid #f9bcd9", borderRadius: 14, padding: "11px 13px", fontSize: 14, color: "#5a1c3a", background: "#fff7fa" };

export default function CatalogTab() {
  const supabase = useMemo(() => createClient(), []);
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [colors, setColors] = useState<FilamentColor[]>([]);
  const [settings, setSettings] = useState<Pick<ShopSettings, "resin_available">>({ resin_available: true });
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  async function load() {
    const [{ data: p }, { data: v }, { data: c }, { data: s }] = await Promise.all([
      supabase.from("products").select("*").order("sort_order"),
      supabase.from("product_variants").select("*").order("sort_order"),
      supabase.from("colors").select("*").order("sort_order"),
      supabase.from("shop_settings").select("resin_available").eq("id", 1).single(),
    ]);
    setProducts(p || []);
    setVariants(v || []);
    setColors(c || []);
    if (s) setSettings(s);
  }

  async function toggleResin() {
    const next = !settings.resin_available;
    setSettings({ resin_available: next });
    await supabase.from("shop_settings").update({ resin_available: next }).eq("id", 1);
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function patchProductLocal(id: string, patch: Partial<Product>) {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  async function commitProduct(id: string, patch: Partial<Product>) {
    await supabase.from("products").update(patch).eq("id", id);
  }

  function patchColorLocal(id: string, patch: Partial<FilamentColor>) {
    setColors((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  async function commitColor(id: string, patch: Partial<FilamentColor>) {
    await supabase.from("colors").update(patch).eq("id", id);
  }

  async function addProduct() {
    const nextSort = products.length ? Math.max(...products.map((p) => p.sort_order)) + 1 : 1;
    const { data } = await supabase
      .from("products")
      .insert({ name: "New print", blurb: "Describe it for customers", price: 15, sort_order: nextSort })
      .select()
      .single();
    if (data) setProducts((prev) => prev.concat(data));
  }

  async function removeProduct(id: string) {
    if (!confirm("Remove this print from the menu?")) return;
    await supabase.from("products").delete().eq("id", id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  async function addColor() {
    const nextSort = colors.length ? Math.max(...colors.map((c) => c.sort_order)) + 1 : 1;
    const { data } = await supabase.from("colors").insert({ name: "New color", hex: "#f9b8d6", available: true, sort_order: nextSort }).select().single();
    if (data) setColors((prev) => prev.concat(data));
  }

  async function removeColor(id: string) {
    if (!confirm("Remove this filament color?")) return;
    await supabase.from("colors").delete().eq("id", id);
    setColors((prev) => prev.filter((c) => c.id !== id));
  }

  async function onProductPhoto(id: string, file: File) {
    setUploadingId(id);
    try {
      const blob = await resizeImageToBlob(file);
      const url = await uploadPhoto(supabase, "product-photos", blob);
      patchProductLocal(id, { photo_url: url });
      await commitProduct(id, { photo_url: url });
    } finally {
      setUploadingId(null);
    }
  }

  function patchVariantLocal(id: string, patch: Partial<ProductVariant>) {
    setVariants((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }

  async function commitVariant(id: string, patch: Partial<ProductVariant>) {
    await supabase.from("product_variants").update(patch).eq("id", id);
  }

  async function addVariant(productId: string) {
    const existing = variants.filter((v) => v.product_id === productId);
    const nextSort = existing.length ? Math.max(...existing.map((v) => v.sort_order)) + 1 : 1;
    const { data } = await supabase
      .from("product_variants")
      .insert({ product_id: productId, name: "New design", sort_order: nextSort })
      .select()
      .single();
    if (data) setVariants((prev) => prev.concat(data));
  }

  async function removeVariant(id: string) {
    await supabase.from("product_variants").delete().eq("id", id);
    setVariants((prev) => prev.filter((v) => v.id !== id));
  }

  async function onVariantPhoto(id: string, file: File) {
    setUploadingId(id);
    try {
      const blob = await resizeImageToBlob(file);
      const url = await uploadPhoto(supabase, "product-photos", blob);
      patchVariantLocal(id, { photo_url: url });
      await commitVariant(id, { photo_url: url });
    } finally {
      setUploadingId(null);
    }
  }

  const availableCount = colors.filter((c) => c.available).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: "#fff7fa", border: "5px solid #ec3d84", borderRadius: 28, boxShadow: "0 7px 0 #f7a8cc", padding: "18px 16px" }}>
        <h2 style={{ margin: 0, fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 23, color: "#c22168" }}>Shop settings</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 11, background: "#fff", border: "3px solid #fbd6e7", borderRadius: 18, padding: "9px 11px", marginTop: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14.5 }}>Resin add-on</div>
            <div style={{ fontSize: 12.5, color: "#8a3a61" }}>Turn off while you&apos;re out of resin — hides the option on the order form.</div>
          </div>
          <button
            type="button"
            onClick={toggleResin}
            aria-pressed={settings.resin_available}
            aria-label={settings.resin_available ? "Resin add-on is on, tap to turn off" : "Resin add-on is off, tap to turn on"}
            style={{ marginLeft: "auto", flex: "none", background: settings.resin_available ? "#3a5119" : "#f1e4ea", color: settings.resin_available ? "#ffffff" : "#8a3a61", border: "none", borderRadius: 999, padding: "11px 16px", fontWeight: 800, fontSize: 13, cursor: "pointer", minHeight: 44, minWidth: 60 }}
          >
            {settings.resin_available ? "On" : "Off"}
          </button>
        </div>
      </div>

      <div style={{ background: "#fff7fa", border: "5px solid #ec3d84", borderRadius: 28, boxShadow: "0 7px 0 #f7a8cc", padding: "18px 16px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <h2 style={{ margin: 0, fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 23, color: "#c22168" }}>Prints on the menu</h2>
          <button
            type="button"
            onClick={addProduct}
            style={{ marginLeft: "auto", background: "#b81a5c", color: "#fff", border: "none", borderBottom: "4px solid #b81a5c", borderRadius: 999, padding: "11px 18px", fontWeight: 800, fontSize: 14, cursor: "pointer", minHeight: 44 }}
          >
            + Add a print
          </button>
        </div>
        <div style={{ fontSize: 13.5, color: "#8a3a61", marginTop: 6 }}>Edit the name, description, base price, and photo. Changes show on the order form right away.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
          {products.map((p) => (
            <div key={p.id} style={{ background: "#fff", border: "3px solid #fbd6e7", borderRadius: 22, padding: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div style={{ position: "relative", width: 110, flex: "none" }}>
                <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 3", borderRadius: 15, overflow: "hidden", background: "repeating-linear-gradient(135deg, #fce0ec 0 9px, #fbc9e0 9px 18px)", display: "grid", placeItems: "center" }}>
                  {p.photo_url ? (
                    <img src={p.photo_url} alt={p.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#8f1049", textAlign: "center", padding: "0 5px" }}>
                      {uploadingId === p.id ? "uploading…" : "no photo yet"}
                    </span>
                  )}
                </div>
                <label style={{ display: "block", marginTop: 7, textAlign: "center", background: "#fdeaf3", color: "#c22168", border: "3px solid #f9bcd9", borderRadius: 999, padding: "8px 6px", fontWeight: 800, fontSize: 12.5, cursor: "pointer" }}>
                  Upload photo
                  <input
                    type="file"
                    accept="image/*"
                    aria-label="Upload a photo of this print"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onProductPhoto(p.id, file);
                    }}
                  />
                </label>
                {p.photo_url && (
                  <button
                    type="button"
                    onClick={() => {
                      patchProductLocal(p.id, { photo_url: null });
                      commitProduct(p.id, { photo_url: null });
                    }}
                    style={{ width: "100%", marginTop: 5, background: "none", border: "none", color: "#8a3a61", fontWeight: 700, fontSize: 12, cursor: "pointer", textDecoration: "underline" }}
                  >
                    remove photo
                  </button>
                )}
              </div>
              <div style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  type="text"
                  value={p.name}
                  onChange={(e) => patchProductLocal(p.id, { name: e.target.value })}
                  onBlur={(e) => commitProduct(p.id, { name: e.target.value })}
                  placeholder="Print name"
                  aria-label="Print name"
                  style={{ ...smallInput, fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 16 }}
                />
                <input
                  type="text"
                  value={p.blurb}
                  onChange={(e) => patchProductLocal(p.id, { blurb: e.target.value })}
                  onBlur={(e) => commitProduct(p.id, { blurb: e.target.value })}
                  placeholder="Short description shown to customers"
                  aria-label="Print description shown to customers"
                  style={smallInput}
                />
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 800, fontSize: 13.5, color: "#8a3a61" }}>Base price $</span>
                  <input
                    type="number"
                    value={p.price}
                    min={1}
                    onChange={(e) => patchProductLocal(p.id, { price: Math.max(1, Number(e.target.value) || 1) })}
                    onBlur={(e) => commitProduct(p.id, { price: Math.max(1, Number(e.target.value) || 1) })}
                    aria-label="Base price in dollars"
                    style={{ ...smallInput, width: 92, fontWeight: 800, fontSize: 15 }}
                  />
                  <button
                    type="button"
                    onClick={() => removeProduct(p.id)}
                    style={{ marginLeft: "auto", background: "#fff", color: "#c22168", border: "3px solid #f9bcd9", borderRadius: 999, padding: "9px 15px", fontWeight: 800, fontSize: 13, cursor: "pointer", minHeight: 44 }}
                  >
                    Remove print
                  </button>
                </div>
              </div>

              <div style={{ width: "100%", marginTop: 4, borderTop: "2px dashed #fbd6e7", paddingTop: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 800, fontSize: 13, color: "#8a3a61" }}>Design options</span>
                  <span style={{ fontSize: 12, color: "#8a3a61" }}>customers pick one, like Amazon&apos;s color swatches — leave empty for no picker</span>
                  <button
                    type="button"
                    onClick={() => addVariant(p.id)}
                    style={{ marginLeft: "auto", background: "#fdeaf3", color: "#c22168", border: "3px solid #f9bcd9", borderRadius: 999, padding: "7px 13px", fontWeight: 800, fontSize: 12.5, cursor: "pointer", minHeight: 36 }}
                  >
                    + Add a design
                  </button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
                  {variants
                    .filter((v) => v.product_id === p.id)
                    .map((v) => (
                      <div key={v.id} style={{ width: 96, flex: "none" }}>
                        <div style={{ position: "relative", width: "100%", aspectRatio: "1", borderRadius: 12, overflow: "hidden", background: "repeating-linear-gradient(135deg, #fce0ec 0 7px, #fbc9e0 7px 14px)", display: "grid", placeItems: "center" }}>
                          {v.photo_url ? (
                            <img src={v.photo_url} alt={v.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#8f1049", textAlign: "center", padding: "0 3px" }}>
                              {uploadingId === v.id ? "uploading…" : "no photo"}
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={v.name}
                          onChange={(e) => patchVariantLocal(v.id, { name: e.target.value })}
                          onBlur={(e) => commitVariant(v.id, { name: e.target.value })}
                          placeholder="Design name"
                          aria-label="Design option name"
                          style={{ ...smallInput, marginTop: 5, padding: "6px 8px", fontSize: 12, textAlign: "center" }}
                        />
                        <label style={{ display: "block", marginTop: 4, textAlign: "center", background: "#fdeaf3", color: "#c22168", border: "2px solid #f9bcd9", borderRadius: 999, padding: "5px 4px", fontWeight: 800, fontSize: 11, cursor: "pointer" }}>
                          Photo
                          <input
                            type="file"
                            accept="image/*"
                            aria-label={`Upload a photo for ${v.name}`}
                            style={{ display: "none" }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) onVariantPhoto(v.id, file);
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => removeVariant(v.id)}
                          style={{ display: "block", width: "100%", marginTop: 4, background: "none", border: "none", color: "#8a3a61", fontWeight: 700, fontSize: 11, cursor: "pointer", textDecoration: "underline" }}
                        >
                          remove
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "#fff7fa", border: "5px solid #ec3d84", borderRadius: 28, boxShadow: "0 7px 0 #f7a8cc", padding: "18px 16px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <h2 style={{ margin: 0, fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 23, color: "#c22168" }}>Filament in stock</h2>
          <span style={{ marginLeft: "auto", background: "#fdeaf3", color: "#c22168", fontWeight: 800, fontSize: 13, padding: "8px 13px", borderRadius: 999 }}>
            {availableCount} of {colors.length} available
          </span>
        </div>
        <div style={{ fontSize: 13.5, color: "#8a3a61", marginTop: 6 }}>Switch a color off and customers stop seeing it on the form.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
          {colors.map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 11, background: "#fff", border: "3px solid #fbd6e7", borderRadius: 18, padding: "9px 11px", flexWrap: "wrap" }}>
              <span style={{ width: 30, height: 30, flex: "none", borderRadius: 10, border: "3px solid #fff", boxShadow: "0 0 0 2px #fbd6e7", background: c.hex }} />
              <input
                type="text"
                value={c.name}
                onChange={(e) => patchColorLocal(c.id, { name: e.target.value })}
                onBlur={(e) => commitColor(c.id, { name: e.target.value })}
                aria-label="Filament color name"
                style={{ ...smallInput, flex: "1 1 120px", fontWeight: 800 }}
              />
              <input
                type="color"
                value={c.hex}
                onChange={(e) => {
                  patchColorLocal(c.id, { hex: e.target.value });
                  commitColor(c.id, { hex: e.target.value });
                }}
                aria-label="Color"
                style={{ width: 52, height: 44, flex: "none", border: "3px solid #f9bcd9", borderRadius: 13, background: "#fff7fa", padding: 3, cursor: "pointer" }}
              />
              <button
                type="button"
                onClick={() => {
                  const next = !c.available;
                  patchColorLocal(c.id, { available: next });
                  commitColor(c.id, { available: next });
                }}
                aria-pressed={c.available}
                aria-label={`${c.name} is ${c.available ? "in stock, tap to mark out of stock" : "out of stock, tap to mark in stock"}`}
                style={{ flex: "none", background: c.available ? "#3a5119" : "#f1e4ea", color: c.available ? "#ffffff" : "#8a3a61", border: "none", borderRadius: 999, padding: "11px 16px", fontWeight: 800, fontSize: 13, cursor: "pointer", minHeight: 44, minWidth: 108 }}
              >
                {c.available ? "In stock" : "Out of stock"}
              </button>
              <button
                type="button"
                onClick={() => removeColor(c.id)}
                aria-label="Delete color"
                style={{ flex: "none", width: 44, height: 44, border: "3px solid #f9bcd9", borderRadius: "50%", background: "#fff", color: "#c22168", fontSize: 17, fontWeight: 800, cursor: "pointer" }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addColor}
          style={{ marginTop: 12, background: "#b81a5c", color: "#fff", border: "none", borderBottom: "4px solid #b81a5c", borderRadius: 999, padding: "11px 18px", fontWeight: 800, fontSize: 14, cursor: "pointer", minHeight: 44 }}
        >
          + Add a filament color
        </button>
      </div>
    </div>
  );
}
