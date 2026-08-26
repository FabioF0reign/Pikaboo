export default function StudioHeader({ right }: { right?: React.ReactNode }) {
  return (
    <div
      style={{
        position: "relative",
        zIndex: 1,
        width: "100%",
        maxWidth: 760,
        background: "#fff7fa",
        border: "5px solid #ec3d84",
        borderRadius: 30,
        boxShadow: "0 8px 0 #f7a8cc",
        padding: "18px 18px 16px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
      }}
    >
      <img src="/pikaboo-logo.jpeg" alt="Pikaboo by Genny logo" style={{ width: "min(88px, 22vw)", height: "auto", flex: "none", mixBlendMode: "multiply" }} />
      <div>
        <h1 style={{ margin: 0, fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: "clamp(26px, 7vw, 38px)", lineHeight: 1, color: "#ec3d84" }}>Studio</h1>
        <div style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 15, color: "#c22168" }}>order desk · Pikaboo by Genny</div>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>{right}</div>
    </div>
  );
}
