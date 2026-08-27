import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendIdeaReplyEmail } from "@/lib/email";
import type { CustomRequest } from "@/lib/types";

const EMAIL_RE = /\S+@\S+\.\S+/;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json();
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!message) {
    return NextResponse.json({ error: "Write a reply first." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: existing, error: fetchError } = await supabase.from("custom_requests").select("*").eq("id", id).single();
  if (fetchError || !existing) {
    return NextResponse.json({ error: "Could not find that idea." }, { status: 404 });
  }

  const req = existing as CustomRequest;
  if (!EMAIL_RE.test(req.contact)) {
    return NextResponse.json({ error: "That contact isn't an email address — reply to them directly instead." }, { status: 400 });
  }

  try {
    await sendIdeaReplyEmail(req, message);
  } catch {
    return NextResponse.json({ error: "Could not send the email. Please try again." }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("custom_requests")
    .update({ status: "replied", reply_message: message })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Email sent, but couldn't update the idea's status." }, { status: 500 });
  }

  return NextResponse.json({ request: data });
}
