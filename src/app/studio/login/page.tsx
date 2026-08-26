"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import PageDecor from "@/components/PageDecor";
import StudioHeader from "@/components/StudioHeader";

export default function StudioLogin() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError("Wrong email or password — try again.");
      return;
    }
    router.push("/studio");
    router.refresh();
  }

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
      <PageDecor pageHeight={900} />
      <StudioHeader
        right={
          <Link
            href="/"
            style={{ background: "#fdeaf3", color: "#b81a5c", fontWeight: 800, fontSize: 13, padding: "11px 16px", borderRadius: 999, textDecoration: "none", border: "3px solid #f9bcd9", minHeight: 44, display: "flex", alignItems: "center" }}
          >
            View order form
          </Link>
        }
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 420,
          background: "#fff7fa",
          border: "5px solid #ec3d84",
          borderRadius: 30,
          boxShadow: "0 8px 0 #f7a8cc",
          padding: "26px 20px",
          textAlign: "center",
        }}
      >
        <h2 style={{ margin: 0, fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 24, color: "#c22168" }}>Genny only!</h2>
        <div style={{ fontSize: 14, color: "#8a3a61", marginTop: 6 }}>Sign in to open the desk.</div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && signIn()}
          placeholder="you@pikaboo.com"
          aria-label="Studio email"
          aria-required="true"
          style={{ width: "100%", marginTop: 14, textAlign: "center", border: "3px solid #f9bcd9", borderRadius: 16, padding: 14, fontSize: 16, color: "#5a1c3a", background: "#fff" }}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && signIn()}
          placeholder="password"
          aria-label="Studio password"
          aria-required="true"
          style={{ width: "100%", marginTop: 10, textAlign: "center", border: "3px solid #f9bcd9", borderRadius: 16, padding: 14, fontSize: 16, color: "#5a1c3a", background: "#fff" }}
        />
        <button
          type="button"
          onClick={signIn}
          disabled={busy}
          style={{ width: "100%", marginTop: 12, background: "#b81a5c", color: "#fff", border: "none", borderBottom: "5px solid #b81a5c", borderRadius: 999, padding: 15, fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 18, cursor: busy ? "default" : "pointer", minHeight: 52, opacity: busy ? 0.7 : 1 }}
        >
          {busy ? "Signing in…" : "Open the desk"}
        </button>
        {error && (
          <div role="alert" style={{ marginTop: 10, fontWeight: 800, fontSize: 13.5, color: "#c22168" }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
