import { Resend } from "resend";
import type { Order, CustomRequest } from "./types";

// All email is best-effort: a failure here should never block an order or
// idea from being saved. Every call is wrapped in try/catch by the caller.
function getClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const FROM = process.env.RESEND_FROM_EMAIL || "Pikaboo <orders@resend.dev>";
const STUDIO_EMAIL = process.env.STUDIO_NOTIFY_EMAIL;

function money(n: number) {
  return "$" + Number(n || 0).toFixed(0);
}

// Strips a leading @ or $ in case the handle was pasted in with it, e.g. "@FabianArellano" or "$WitheredSprout".
function cleanHandle(handle: string) {
  return handle.replace(/^[@$]/, "").trim();
}

function paymentLinksHtml(order: Order) {
  const amount = Math.round(Number(order.total) || 0);
  const links: { label: string; url: string; color: string }[] = [];

  const paypalHandle = process.env.PAYPAL_ME_HANDLE;
  if (paypalHandle) {
    links.push({ label: "Pay with PayPal", url: `https://paypal.me/${cleanHandle(paypalHandle)}/${amount}`, color: "#0070ba" });
  }

  const cashAppHandle = process.env.CASHAPP_CASHTAG;
  if (cashAppHandle) {
    links.push({ label: "Pay with Cash App", url: `https://cash.app/$${cleanHandle(cashAppHandle)}/${amount}`, color: "#00c244" });
  }

  if (!links.length) return "";

  const buttons = links
    .map(
      (l) =>
        `<a href="${l.url}" style="display:inline-block;margin:6px 8px 6px 0;padding:12px 20px;background:${l.color};color:#fff;font-weight:bold;text-decoration:none;border-radius:999px;">${l.label} — ${money(amount)}</a>`
    )
    .join("");

  return `<p>${buttons}</p><p style="font-size:13px;color:#666;">Neither app lets us pre-fill a note, so please add "${order.order_no}" as the note/message when you send it — that's how Genny will match your payment to your order.</p>`;
}

export async function sendNewOrderEmail(order: Order) {
  const client = getClient();
  if (!client || !STUDIO_EMAIL) return;

  const colorLines = order.colors
    .map((c) => `${c.name}${c.note ? " — " + c.note : ""}`)
    .join("<br>");
  const addr = order.address
    ? [order.address.street, order.address.street2, [order.address.city, order.address.state].filter(Boolean).join(", "), order.address.zip]
        .filter((v) => v && v.trim())
        .join(", ")
    : "Local pickup";

  await client.emails.send({
    from: FROM,
    to: STUDIO_EMAIL,
    subject: `New order ${order.order_no} — ${order.product_name}`,
    html: `
      <h2>New order: ${order.order_no}</h2>
      <p><b>${order.product_name}</b> · ${order.size_label} · qty ${order.qty}${order.rush ? " · RUSH" : ""}${order.resin ? " · RESIN" : ""}</p>
      <p><b>Colors</b><br>${colorLines || "none picked"}</p>
      <p><b>From</b><br>${order.customer_name}<br>${order.customer_email}<br>${order.customer_phone || ""}</p>
      <p><b>${order.method === "ship" ? "Ship to" : "Pickup"}</b><br>${addr}</p>
      ${order.notes ? `<p><b>Notes</b><br>${order.notes}</p>` : ""}
      <p><b>Estimate:</b> ${money(order.total)}</p>
    `,
  });
}

export async function sendNewRequestEmail(req: CustomRequest) {
  const client = getClient();
  if (!client || !STUDIO_EMAIL) return;

  await client.emails.send({
    from: FROM,
    to: STUDIO_EMAIL,
    subject: `New custom print idea ${req.request_no}`,
    html: `
      <h2>New custom print idea: ${req.request_no}</h2>
      <p>${req.idea}</p>
      <p><b>Colors wanted:</b> ${req.colors || "open"}</p>
      <p><b>Budget:</b> ${req.budget || "not said"}</p>
      <p><b>From</b><br>${req.customer_name || "no name"}<br>${req.contact}</p>
    `,
  });
}

export async function sendOrderConfirmedEmail(order: Order) {
  const client = getClient();
  if (!client) return;

  await client.emails.send({
    from: FROM,
    to: order.customer_email,
    subject: `Your Pikaboo order ${order.order_no} is confirmed!`,
    html: `
      <h2>Your order is confirmed, ${order.customer_name}!</h2>
      <p>Genny has confirmed your order <b>${order.order_no}</b> — a <b>${order.product_name}</b> (${order.size_label}, qty ${order.qty}).</p>
      <p>Total due: <b>${money(order.total)}</b></p>
      ${paymentLinksHtml(order)}
      <p>Thanks for ordering from Pikaboo!</p>
    `,
  });
}

export async function sendOrderReadyEmail(order: Order) {
  const client = getClient();
  if (!client) return;

  await client.emails.send({
    from: FROM,
    to: order.customer_email,
    subject: `Your Pikaboo order ${order.order_no} is ready for pickup!`,
    html: `
      <h2>It's ready, ${order.customer_name}!</h2>
      <p>Your order <b>${order.order_no}</b> — <b>${order.product_name}</b> (${order.size_label}, qty ${order.qty}) — is ready.</p>
      <p><b>It'll be left outside for you to pick up.</b></p>
      <p>Thanks for ordering from Pikaboo!</p>
    `,
  });
}

export async function sendOrderDoneEmail(order: Order) {
  const client = getClient();
  if (!client) return;

  if (order.method === "ship") {
    const trackingLine = order.tracking_number
      ? `<p><b>Tracking number:</b> ${order.tracking_number}</p>`
      : `<p>Genny will follow up with tracking details separately.</p>`;
    await client.emails.send({
      from: FROM,
      to: order.customer_email,
      subject: `Your Pikaboo order ${order.order_no} has shipped!`,
      html: `
        <h2>It's on its way, ${order.customer_name}!</h2>
        <p>Your order <b>${order.order_no}</b> — <b>${order.product_name}</b> (${order.size_label}, qty ${order.qty}) — has shipped.</p>
        ${trackingLine}
        <p>Thanks for ordering from Pikaboo!</p>
      `,
    });
  } else {
    await client.emails.send({
      from: FROM,
      to: order.customer_email,
      subject: `Thanks for picking up your Pikaboo order ${order.order_no}!`,
      html: `
        <h2>Thanks for stopping by, ${order.customer_name}!</h2>
        <p>Your order <b>${order.order_no}</b> — <b>${order.product_name}</b> (${order.size_label}, qty ${order.qty}) — is all yours now.</p>
        <p>Thanks for ordering from Pikaboo!</p>
      `,
    });
  }
}
