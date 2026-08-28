import { Resend } from "resend";
import { pickupLocationByKey } from "./pickupLocations";
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

function productLabel(order: Order) {
  return order.variant_name ? `${order.product_name} — ${order.variant_name}` : order.product_name;
}

// Strips a leading @ or $ in case the handle was pasted in with it, e.g. "@FabianArellano" or "$WitheredSprout".
function cleanHandle(handle: string) {
  return handle.replace(/^[@$]/, "").trim();
}

// Formats a 10-digit US number like "4093007446" as "(409) 300-7446". Leaves
// anything else (already formatted, non-US, etc.) alone.
function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 10) return phone;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// & must be encoded as &amp; inside an HTML attribute — some mail clients'
// stricter parsers (Outlook desktop in particular) mangle a raw "&" in an
// href and truncate the URL there, which makes the whole link a dead tap.
function escAttr(url: string) {
  return url.replace(/&/g, "&amp;");
}

// If the order's been claimed by a worker (Fabian or Thalia — see the claim
// buttons in the Studio Orders tab), prefer that worker's own payment
// handles so the customer pays whoever's actually making their order. Falls
// back to the shop-wide handles when unclaimed or the worker hasn't set up
// their own handle for that method.
function workerPrefix(order: Order): "FABIAN" | "THALIA" | null {
  if (order.assigned_to === "Fabian") return "FABIAN";
  if (order.assigned_to === "Thalia") return "THALIA";
  return null;
}

function pickEnv(order: Order, suffix: string, fallbackName: string) {
  const prefix = workerPrefix(order);
  if (prefix) {
    const v = process.env[`${prefix}_${suffix}`];
    if (v) return v;
  }
  return process.env[fallbackName];
}

function paymentLinksHtml(order: Order) {
  const amount = Math.round(Number(order.total) || 0);
  const note = `Pikaboo order ${order.order_no}`;
  const links: { label: string; url: string; color: string }[] = [];
  let anyWithoutNote = false;

  const venmoHandle = pickEnv(order, "VENMO_HANDLE", "VENMO_HANDLE");
  if (venmoHandle) {
    links.push({
      label: "Pay with Venmo",
      url: `https://venmo.com/?txn=pay&recipients=${cleanHandle(venmoHandle)}&amount=${amount}&note=${encodeURIComponent(note)}`,
      color: "#3d95ce",
    });
  }

  const paypalHandle = pickEnv(order, "PAYPAL_ME_HANDLE", "PAYPAL_ME_HANDLE");
  if (paypalHandle) {
    links.push({ label: "Pay with PayPal", url: `https://paypal.me/${cleanHandle(paypalHandle)}/${amount}`, color: "#0070ba" });
    anyWithoutNote = true;
  }

  const cashAppHandle = pickEnv(order, "CASHAPP_CASHTAG", "CASHAPP_CASHTAG");
  if (cashAppHandle) {
    links.push({ label: "Pay with Cash App", url: `https://cash.app/$${cleanHandle(cashAppHandle)}/${amount}`, color: "#00c244" });
    anyWithoutNote = true;
  }

  const buttons = links
    .map(
      (l) =>
        `<a href="${escAttr(l.url)}" style="display:inline-block;margin:6px 8px 6px 0;padding:12px 20px;background:${l.color};color:#fff;font-weight:bold;text-decoration:none;border-radius:999px;">${l.label} — ${money(amount)}</a>`
    )
    .join("");

  const zelleHandle = pickEnv(order, "ZELLE_HANDLE", "ZELLE_HANDLE");
  const zelleLine = zelleHandle
    ? `<p><b>Zelle:</b> send ${money(amount)} to <b>${zelleHandle}</b> from your banking app (Zelle doesn't support payment links, sorry!) — please note "${order.order_no}" so it's easy to match up.</p>`
    : "";

  const contactName = workerPrefix(order) ? order.assigned_to! : "Genny";
  const shopPhone = pickEnv(order, "PHONE", "SHOP_PHONE");
  const applePayLine =
    process.env.OFFER_APPLE_PAY_NOTE !== "false" && shopPhone
      ? `<p>Prefer Apple Cash? <a href="sms:${shopPhone.replace(/\D/g, "")}" style="color:#3d95ce;font-weight:bold;">Text ${contactName} at ${formatPhone(shopPhone)}</a> and they'll send you a request through Messages.</p>`
      : "";

  if (!links.length && !zelleLine && !applePayLine) return "";

  const noteReminder = anyWithoutNote
    ? `<p style="font-size:13px;color:#666;">PayPal and Cash App don't let us pre-fill a note, so please add "${order.order_no}" as the note/message when you send it.</p>`
    : "";

  return `${links.length ? `<p>${buttons}</p>` : ""}${zelleLine}${applePayLine}${noteReminder}`;
}

export async function sendNewOrderEmail(order: Order) {
  const client = getClient();
  if (!client || !STUDIO_EMAIL) return;

  const colorLines = order.colors
    .map((c) => `${c.name}${c.note ? " — " + c.note : ""}`)
    .join("<br>");
  const pickupLoc = pickupLocationByKey(order.pickup_location);
  const addr = order.address
    ? [order.address.street, order.address.street2, [order.address.city, order.address.state].filter(Boolean).join(", "), order.address.zip]
        .filter((v) => v && v.trim())
        .join(", ")
    : pickupLoc
      ? `${pickupLoc.label} — ${pickupLoc.address}`
      : "Local pickup";

  await client.emails.send({
    from: FROM,
    to: STUDIO_EMAIL,
    subject: `New order ${order.order_no} — ${productLabel(order)}`,
    html: `
      <h2>New order: ${order.order_no}</h2>
      <p><b>${productLabel(order)}</b> · ${order.size_label} · qty ${order.qty}${order.rush ? " · RUSH" : ""}${order.resin ? " · RESIN" : ""}</p>
      <p><b>Colors</b><br>${colorLines || "none picked"}</p>
      <p><b>From</b><br>${order.customer_name}<br>${order.customer_email}<br>${order.customer_phone || ""}</p>
      <p><b>${order.method === "ship" ? "Ship to" : "Pickup"}</b><br>${addr}</p>
      ${order.method === "pickup" ? `<p><b>Payment:</b> ${order.payment_preference === "in_person" ? "in person at pickup" : "electronic"}</p>` : ""}
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

export async function sendIdeaReplyEmail(req: CustomRequest, message: string) {
  const client = getClient();
  if (!client) return;

  await client.emails.send({
    from: FROM,
    to: req.contact,
    subject: `Genny replied about your custom print idea ${req.request_no}`,
    html: `
      <h2>${req.customer_name?.trim() ? `Hi ${req.customer_name}!` : "Hi there!"}</h2>
      <p>Genny replied to your custom print idea (<b>${req.request_no}</b>):</p>
      <p style="white-space: pre-wrap;">${message}</p>
      <p style="margin-top: 20px; font-size: 13px; color: #666;">Your idea: "${req.idea}"</p>
    `,
  });
}

export async function sendOrderConfirmedEmail(order: Order) {
  const client = getClient();
  if (!client) return;

  const payInPerson = order.method === "pickup" && order.payment_preference === "in_person";
  const paymentSection = payInPerson
    ? `<p>You chose to pay in person — nothing to do now, just bring cash, card, or whatever's easiest when you pick up.</p>`
    : `${paymentLinksHtml(order)}`;
  const confirmedPickupLoc = pickupLocationByKey(order.pickup_location);
  const pickupLine =
    order.method === "pickup" && confirmedPickupLoc
      ? `<p><b>Pickup location:</b> ${confirmedPickupLoc.label} — Genny will send the exact address once it's ready.</p>`
      : "";

  await client.emails.send({
    from: FROM,
    to: order.customer_email,
    subject: `Your Pikaboo order ${order.order_no} is confirmed!`,
    html: `
      <h2>Your order is confirmed, ${order.customer_name}!</h2>
      <p>Genny has confirmed your order <b>${order.order_no}</b> — a <b>${productLabel(order)}</b> (${order.size_label}, qty ${order.qty}).</p>
      ${pickupLine}
      <p>Total due: <b>${money(order.total)}</b></p>
      ${paymentSection}
      <p>Thanks for ordering from Pikaboo!</p>
    `,
  });
}

export async function sendOrderReadyEmail(order: Order) {
  const client = getClient();
  if (!client) return;

  const readyPickupLoc = pickupLocationByKey(order.pickup_location);
  const pickupLine = readyPickupLoc ? `<p><b>Pickup address:</b> ${readyPickupLoc.address}</p>` : "";

  await client.emails.send({
    from: FROM,
    to: order.customer_email,
    subject: `Your Pikaboo order ${order.order_no} is ready for pickup!`,
    html: `
      <h2>It's ready, ${order.customer_name}!</h2>
      <p>Your order <b>${order.order_no}</b> — <b>${productLabel(order)}</b> (${order.size_label}, qty ${order.qty}) — is ready.</p>
      <p><b>It'll be left outside for you to pick up.</b></p>
      ${pickupLine}
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
        <p>Your order <b>${order.order_no}</b> — <b>${productLabel(order)}</b> (${order.size_label}, qty ${order.qty}) — has shipped.</p>
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
        <p>Your order <b>${order.order_no}</b> — <b>${productLabel(order)}</b> (${order.size_label}, qty ${order.qty}) — is all yours now.</p>
        <p>Thanks for ordering from Pikaboo!</p>
      `,
    });
  }
}
