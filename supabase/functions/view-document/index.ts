// Public document viewer: serves stored HTML documents (invoices, briefs,
// reports) with a proper text/html content type so browsers render them.
// Supabase Storage deliberately refuses to render HTML from its own domain,
// so emailed links route through this function instead.
//
// Auth: NOT a Supabase JWT — links are meant for external recipients (clients).
// Each URL carries an expiry + HMAC-SHA256 signature minted server-side by
// send-invoice-email using the service-role key. Unsigned/expired/tampered
// requests are rejected.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const te = new TextEncoder();

async function hmacHex(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", te.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, te.encode(msg));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Constant-time-ish comparison
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const path = url.searchParams.get("path") ?? "";
    const exp = url.searchParams.get("exp") ?? "";
    const sig = url.searchParams.get("sig") ?? "";

    if (!path || !exp || !sig) return new Response("Missing parameters", { status: 400 });
    // Only .html documents in known folders; no traversal.
    if (path.includes("..") || !/^[\w\-./ %()]+\.html$/.test(path)) {
      return new Response("Invalid path", { status: 400 });
    }
    if (!/^(invoices|mission-briefs|postflight-reports)\//.test(path)) {
      return new Response("Invalid path", { status: 400 });
    }
    const expNum = Number(exp);
    if (!Number.isFinite(expNum) || Date.now() / 1000 > expNum) {
      return new Response("This link has expired. Please request a new copy.", { status: 410 });
    }

    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const expected = await hmacHex(secret, `${path}:${exp}`);
    if (!safeEqual(sig, expected)) return new Response("Invalid signature", { status: 403 });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, secret);
    const { data, error } = await supabase.storage.from("project-documents").download(path);
    if (error || !data) return new Response("Document not found", { status: 404 });

    const html = await data.text();
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("view-document error:", err);
    return new Response("Internal error", { status: 500 });
  }
});
