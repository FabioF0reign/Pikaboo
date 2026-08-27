export const PICKUP_LOCATIONS = [
  { key: "port_arthur", label: "Port Arthur", address: "2708 35th St, Port Arthur, TX 77640" },
  { key: "nederland", label: "Nederland", address: "3045 N Twin City Hwy, TRLR 34, Nederland, TX 77627" },
] as const;

export function pickupLocationByKey(key: string | null | undefined) {
  return PICKUP_LOCATIONS.find((l) => l.key === key) || null;
}
