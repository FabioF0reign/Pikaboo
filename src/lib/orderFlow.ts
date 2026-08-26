import type { OrderStatus } from "./types";

export const FLOW: { key: OrderStatus; label: string; color: string; next: OrderStatus | null; nextLabel: string | null }[] = [
  { key: "new", label: "NEW", color: "#c22168", next: "confirmed", nextLabel: "Confirm order" },
  { key: "confirmed", label: "CONFIRMED", color: "#7b3d9c", next: "printing", nextLabel: "Start printing" },
  { key: "printing", label: "PRINTING", color: "#1f6d96", next: "ready", nextLabel: "Mark ready" },
  { key: "ready", label: "READY", color: "#8a5c04", next: "done", nextLabel: "Mark picked up / shipped" },
  { key: "done", label: "DONE", color: "#456020", next: null, nextLabel: null },
];

export function flowOf(status: OrderStatus) {
  return FLOW.find((f) => f.key === status) || FLOW[0];
}

export function suggestPrice(budget: string): number {
  const nums = String(budget || "").match(/\d+(\.\d+)?/g);
  if (!nums || !nums.length) return 20;
  const vals = nums.map(Number).filter((n) => n > 0);
  if (!vals.length) return 20;
  return Math.max(1, Math.round(Math.max(...vals)));
}
