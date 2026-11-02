// Adds a contact to your Brevo list. API key stays server-side.
// Set these in Netlify > Site configuration > Environment variables:
//   BREVO_API_KEY  – your Brevo API key (SMTP & API > API keys)
//   BREVO_LIST_ID  – the numeric ID of your Christmas guide list

export default async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Something went wrong sending your details. Try again." }, 400);
  }

  const firstName = (body.firstName || "").trim();
  const lastName = (body.lastName || "").trim();
  const email = (body.email || "").trim().toLowerCase();

  // Honeypot: bots fill the hidden field. Pretend it worked.
  if (body.company) return json({ ok: true }, 200);

  if (!firstName || !lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Check your name and email and try again." }, 400);
  }

  const apiKey = process.env.BREVO_API_KEY;
  const listId = Number(process.env.BREVO_LIST_ID);
  if (!apiKey || !listId) {
    console.error("Missing BREVO_API_KEY or BREVO_LIST_ID");
    return json({ error: "Sign-ups aren't set up yet. Try again soon." }, 500);
  }

  const res = await fetch("https://api.brevo.com/v3/contacts", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      email,
      attributes: { FIRSTNAME: firstName, LASTNAME: lastName },
      listIds: [listId],
      updateEnabled: true, // existing contacts get added to the list instead of erroring
    }),
  });

  // 201 = created, 204 = existing contact updated
  if (res.status === 201 || res.status === 204) {
    return json({ ok: true }, 200);
  }

  const detail = await res.text();
  console.error("Brevo error", res.status, detail);
  return json({ error: "Something went wrong sending your details. Try again in a moment." }, 502);
};

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
