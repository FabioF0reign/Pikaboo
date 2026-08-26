import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendOrderConfirmedEmail, sendOrderDoneEmail } from "@/lib/email";
import type { Order, OrderStatus } from "@/lib/types";

const VALID: OrderStatus[] = ["new", "confirmed", "printing", "ready", "done"];

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json();
  const status = body.status as OrderStatus;
  const trackingNumber: string | null = typeof body.trackingNumber === "string" && body.trackingNumber.trim() ? body.trackingNumber.trim() : null;

  if (!VALID.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const patch: { status: OrderStatus; tracking_number?: string } = { status };
  if (status === "done" && trackingNumber) {
    patch.tracking_number = trackingNumber;
  }

  const { data, error } = await supabase.from("orders").update(patch).eq("id", id).select().single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not update the order." }, { status: 500 });
  }

  const order = data as Order;
  try {
    if (status === "confirmed") {
      await sendOrderConfirmedEmail(order);
    } else if (status === "done") {
      await sendOrderDoneEmail(order);
    }
  } catch {
    // Email is best-effort — the status change already went through.
  }

  return NextResponse.json({ order });
}
