"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import PageDecor from "@/components/PageDecor";
import StudioHeader from "@/components/StudioHeader";
import OrdersTab from "@/components/studio/OrdersTab";
import IdeasTab from "@/components/studio/IdeasTab";
import CatalogTab from "@/components/studio/CatalogTab";
import ShippingTab from "@/components/studio/ShippingTab";

type Tab = "orders" | "ideas" | "catalog" | "shipping";

export default function StudioDashboard() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("orders");
  const [newIdeaCount, setNewIdeaCount] = useState(0);

  const refreshIdeaCount = useCallback(async () => {
    const { count } = await supabase.from("custom_requests").select("id", { count: "exact", head: true }).eq("status", "new");
    setNewIdeaCount(count || 0);
  }, [supabase]);

  useEffect(() => {
    (async () => {
      await refreshIdeaCount();
    })();
    const channel = supabase
      .channel("idea-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "custom_requests" }, () => refreshIdeaCount())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, refreshIdeaCount]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/studio/login");
    router.refresh();
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "orders", label: "Orders" },
    { key: "ideas", label: newIdeaCount ? `Ideas (${newIdeaCount})` : "Ideas" },
    { key: "catalog", label: "Prints & colors" },
    { key: "shipping", label: "Shipping" },
  ];

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
        gap: 16,
      }}
    >
      <PageDecor pageHeight={3200} />
      <StudioHeader
        right={
          <>
            <Link
              href="/"
              style={{ background: "#fdeaf3", color: "#b81a5c", fontWeight: 800, fontSize: 13, padding: "11px 16px", borderRadius: 999, textDecoration: "none", border: "3px solid #f9bcd9", minHeight: 44, display: "flex", alignItems: "center" }}
            >
              View order form
            </Link>
            <button
              type="button"
              onClick={signOut}
              style={{ background: "#fff", color: "#8a3a61", fontWeight: 800, fontSize: 13, padding: "11px 16px", borderRadius: 999, border: "3px solid #f9bcd9", minHeight: 44, cursor: "pointer" }}
            >
              Sign out
            </button>
          </>
        }
      />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 760, display: "flex", flexDirection: "column", gap: 16 }}>
        <div role="group" aria-label="Studio sections" style={{ display: "flex", gap: 8, background: "#fff7fa", border: "4px solid #f9bcd9", borderRadius: 999, padding: 5 }}>
          {tabs.map((t) => {
            const selected = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                aria-pressed={selected}
                style={{ position: "relative", flex: "1 1 0", background: "none", border: "none", borderRadius: 999, padding: "12px 10px", fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 16, cursor: "pointer", minHeight: 46, color: selected ? "#ffffff" : "#8a3a61" }}
              >
                {selected && <span style={{ position: "absolute", inset: 0, borderRadius: 999, background: "#b81a5c" }} />}
                <span style={{ position: "relative" }}>{t.label}</span>
              </button>
            );
          })}
        </div>

        {tab === "orders" && <OrdersTab />}
        {tab === "ideas" && <IdeasTab onAddedToMenu={() => setTab("catalog")} />}
        {tab === "catalog" && <CatalogTab />}
        {tab === "shipping" && <ShippingTab />}

        <div style={{ textAlign: "center", fontSize: 12.5, color: "#6d1740", paddingTop: 4 }}>Orders and menu changes are saved to your Pikaboo database and sync across devices.</div>
      </div>
    </div>
  );
}
