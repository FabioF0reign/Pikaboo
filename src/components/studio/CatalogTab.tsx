"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resizeImageToBlob, uploadPhoto } from "@/lib/image";
import type { Product, FilamentColor } from "@/lib/types";

const smallInput: React.CSSProperties = { border: "3px solid #f9bcd9", borderRadius: 14, padding: "11px 13px", fontSize: 14, color: "#5a1c3a", background: "#fff7fa" };

export default function CatalogTab() {
  const supabase = useMemo(() => createClient(), []);
  const [products, setProducts] = useState<Product[]>([]);
  const [colors, setColors] = useState<FilamentColor[]>([]);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  async function load() {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from("products").select("*").order("sort_order"),
      supabase.from("colors").select("*").order("sort_order"),
    ]);
    setProducts(p || []);
    setColors(c || []);
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

  const availableCount = colors.filter((c) => c.available).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
