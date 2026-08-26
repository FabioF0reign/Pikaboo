import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNewRequestEmail } from "@/lib/email";
import type { CustomRequest } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json();

  const idea = String(body.idea || "").trim();
  const colors = String(body.colors || "").trim();
  const budget = String(body.budget || "").trim();
  const customerName = String(body.customerName || "").trim();
  const contact = String(body.contact || "").trim();
  const photoUrl = body.photoUrl ? String(body.photoUrl) : null;

  if (!idea || !contact) {
    return NextResponse.json({ error: "Add your idea and a way to reach you." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("custom_requests")
    .insert({
      idea,
      colors,
      budget,
      customer_name: customerName,
      contact,
      photo_url: photoUrl,
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not send your idea. Please try again." }, { status: 500 });
  }

  const req = data as CustomRequest;
  try {
    await sendNewRequestEmail(req);
  } catch {
    // Email is best-effort — the idea is already saved.
  }

  return NextResponse.json({ requestNo: req.request_no });
}
