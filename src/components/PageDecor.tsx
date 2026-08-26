// Decorative daisies, hearts, and sparkles floating in the checkered
// background margins — matches the Pikaboo logo's motifs. Purely decorative,
// hidden from screen readers, and scrolls with the page background.

type Daisy = { kind: "daisy"; top: number; left: string; size: number; rotate: number };
type Heart = { kind: "heart"; top: number; left: string; size: number; rotate: number; color: string };
type Sparkle = { kind: "sparkle"; top: number; left: string; size: number; rotate: number; color: string };
type DecorItem = Daisy | Heart | Sparkle;

const LEFT_X = ["2%", "7%", "5.5%", "2.5%", "1%", "6.5%"];
const RIGHT_X = ["92%", "88%", "95%", "94%", "89.5%", "91.5%"];
const SIZES = [62, 30, 46, 22, 38, 26, 54, 34, 42, 20, 34, 28];
const ROTATES = [8, 10, -14, -16, 22, 6, -6, -8, 15, 18, -20, -12];
const HEART_COLORS = ["#ec3d84", "#f9779f", "#fbd0e2"];
const SPARKLE_LEFT_X = ["9%", "3.5%", "8.5%", "9%", "3.5%", "8.5%"];
const SPARKLE_RIGHT_X = ["86%", "96.5%", "90%", "86%", "96.5%", "90%"];
const SPARKLE_ROTATES = [12, -18, 5, 24, -10, 16];

function buildDecor(bottom: number): DecorItem[] {
  const items: DecorItem[] = [];
  let i = 0;
  for (let top = 40; top <= bottom; top += 150, i++) {
    const onRight = i % 2 === 1;
    const left = onRight ? RIGHT_X[(i >> 1) % RIGHT_X.length] : LEFT_X[(i >> 1) % LEFT_X.length];
    const size = SIZES[i % SIZES.length];
    const rotate = ROTATES[i % ROTATES.length];
    if (i % 2 === 0) {
      items.push({ kind: "daisy", top, left, size, rotate });
    } else {
      items.push({ kind: "heart", top, left, size: Math.round(size * 0.62), rotate, color: HEART_COLORS[(i >> 1) % HEART_COLORS.length] });
    }
  }
  i = 0;
  for (let top = 190; top <= bottom; top += 300, i++) {
    const onRight = i % 2 === 1;
    const left = onRight ? SPARKLE_RIGHT_X[(i >> 1) % SPARKLE_RIGHT_X.length] : SPARKLE_LEFT_X[(i >> 1) % SPARKLE_LEFT_X.length];
    items.push({
      kind: "sparkle",
      top,
      left,
      size: i % 2 === 0 ? 22 : 15,
      rotate: SPARKLE_ROTATES[i % SPARKLE_ROTATES.length],
      color: i % 2 === 0 ? "#ffd84d" : "#fff",
    });
  }
  return items;
}

function Daisy({ top, left, size, rotate }: Daisy) {
  const petal = size * 0.21;
  const center = size * 0.16;
  const bg = [
    `radial-gradient(circle ${petal}px at 50% 17%, #fff 99%, transparent 100%)`,
    `radial-gradient(circle ${petal}px at 83% 42%, #fff 99%, transparent 100%)`,
    `radial-gradient(circle ${petal}px at 69% 84%, #fff 99%, transparent 100%)`,
    `radial-gradient(circle ${petal}px at 31% 84%, #fff 99%, transparent 100%)`,
    `radial-gradient(circle ${petal}px at 17% 42%, #fff 99%, transparent 100%)`,
    `radial-gradient(circle ${center}px at 50% 50%, #ffd84d 99%, transparent 100%)`,
  ].join(", ");
  return (
    <span
      style={{
        position: "absolute",
        top,
        left,
        width: size,
        height: size,
        transform: `rotate(${rotate}deg)`,
        opacity: 0.9,
        backgroundRepeat: "no-repeat",
        backgroundImage: bg,
      }}
    />
  );
}

function Heart({ top, left, size, rotate, color }: Heart) {
  const half = size * 0.7;
  return (
    <span style={{ position: "absolute", top, left, width: size, height: size, transform: `rotate(${rotate}deg)` }}>
      <span style={{ position: "absolute", inset: 0, transform: "rotate(-45deg)" }}>
        <span style={{ position: "absolute", left: 0, bottom: 0, width: half, height: half, background: color }} />
        <span style={{ position: "absolute", width: half, height: half, borderRadius: "50%", background: color, left: 0, top: 0 }} />
        <span style={{ position: "absolute", width: half, height: half, borderRadius: "50%", background: color, right: 0, bottom: 0 }} />
      </span>
    </span>
  );
}

function Sparkle({ top, left, size, rotate, color }: Sparkle) {
  const thick = Math.max(3, Math.round(size * 0.17));
  return (
    <span style={{ position: "absolute", top, left, width: size, height: size, transform: `rotate(${rotate}deg)` }}>
      <span style={{ position: "absolute", left: "50%", top: 0, width: thick, height: "100%", marginLeft: -thick / 2, borderRadius: "50%", background: color }} />
      <span style={{ position: "absolute", top: "50%", left: 0, height: thick, width: "100%", marginTop: -thick / 2, borderRadius: "50%", background: color }} />
    </span>
  );
}

export default function PageDecor({ pageHeight = 3200 }: { pageHeight?: number }) {
  const items = buildDecor(pageHeight);
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {items.map((item, idx) =>
        item.kind === "daisy" ? (
          <Daisy key={idx} {...item} />
        ) : item.kind === "heart" ? (
          <Heart key={idx} {...item} />
        ) : (
          <Sparkle key={idx} {...item} />
        )
      )}
    </div>
  );
}
