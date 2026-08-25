export function GET() {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return Response.json({ ok: false, message: "Powiadomienia nie są jeszcze skonfigurowane." }, { status: 503 });
  return Response.json({ ok: true, publicKey: key }, { headers: { "Cache-Control": "public, max-age=3600" } });
}
