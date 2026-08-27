import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNewOrderEmail } from "@/lib/email";
import { PICKUP_LOCATIONS } from "@/lib/pickupLocations";
import type { Order, OrderColor, Address, PaymentPreference } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json();

  const productName = String(body.productName || "").trim();
  const sizeLabel = String(body.sizeLabel || "").trim();
  const qty = Math.max(1, Math.min(20, Number(body.qty) || 1));
  const rush = !!body.rush;
  const resin = !!body.resin;
  const colors: OrderColor[] = Array.isArray(body.colors)
    ? body.colors.map((c: OrderColor) => ({ name: String(c.name || ""), hex: String(c.hex || "#f9b8d6"), note: String(c.note || "") }))
    : [];
  const customerName = String(body.customerName || "").trim();
  const customerEmail = String(body.customerEmail || "").trim();
  const customerPhone = String(body.customerPhone || "").trim();
  const method = body.method === "pickup" ? "pickup" : "ship";
  const notes = String(body.notes || "").trim();
  const total = Math.max(0, Number(body.total) || 0);

  if (!productName || !customerName || !customerEmail) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const paymentPreference: PaymentPreference | null = method === "pickup" && body.paymentPreference === "in_person" ? "in_person" : method === "pickup" ? "electronic" : null;
  const pickupLocation: string | null =
    method === "pickup" ? PICKUP_LOCATIONS.find((l) => l.key === body.pickupLocation)?.key || PICKUP_LOCATIONS[0].key : null;

  let address: Address | null = null;
  if (method === "ship") {
    const a = body.address || {};
    address = {
      street: String(a.street || "").trim(),
      street2: String(a.street2 || "").trim(),
      city: String(a.city || "").trim(),
      state: String(a.state || "").trim(),
      zip: String(a.zip || "").trim(),
    };
    if (!address.street || !address.city || !address.zip) {
      return NextResponse.json({ error: "Please fill in your shipping address." }, { status: 400 });
    }
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .insert({
      product_name: productName,
      size_label: sizeLabel,
      qty,
      rush,
      resin,
      colors,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      method,
      address,
      payment_preference: paymentPreference,
      pickup_location: pickupLocation,
      notes,
      total,
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not save your order. Please try again." }, { status: 500 });
  }

  const order = data as Order;
  try {
    await sendNewOrderEmail(order);
  } catch {
    // Email is best-effort — the order is already saved.
  }

  return NextResponse.json({ orderNo: order.order_no });
}
