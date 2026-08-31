import { createClient } from "@supabase/supabase-js";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    })[character] ?? character,
  );
}

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!apiKey || !supabaseUrl || !supabaseAnonKey)
    return Response.json(
      { error: "Notificações por e-mail ainda não estão configuradas." },
      { status: 503 },
    );

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Não autenticado." }, { status: 401 });

  const client = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error: authError } = await client.auth.getUser(token);
  if (authError || !data.user?.email)
    return Response.json({ error: "Sessão inválida." }, { status: 401 });

  const payload = await request.json().catch(() => null);
  const title = typeof payload?.title === "string" ? payload.title.trim() : "";
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";
  if (!title || !body)
    return Response.json({ error: "Título e mensagem são obrigatórios." }, { status: 400 });

  const resend = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(payload?.idempotencyKey
        ? { "Idempotency-Key": String(payload.idempotencyKey).slice(0, 128) }
        : {}),
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Ninho <onboarding@resend.dev>",
      to: [data.user.email],
      subject: `Ninho · ${title}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#263832"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(body)}</p><p style="color:#7c8982;font-size:12px">Mensagem enviada pelo Ninho.</p></div>`,
    }),
  });
  if (!resend.ok)
    return Response.json(
      { error: "Não foi possível enviar o e-mail.", details: await resend.text() },
      { status: 502 },
    );
  return Response.json({ sent: true });
}
