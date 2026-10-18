const NEXORA_KNOWLEDGE = `
NEXORA ASSISTANT
Official company knowledge base
Version 2.0

IMPORTANT:
Use only the current Nexaura product collections
listed below.

Do not introduce discontinued product names,
old product collections, or the old affiliate system.

========================================
1. COMPANY OVERVIEW
========================================

Company: Nexora
Watch brand: Nexaura

Nexora Assistant helps prospective partners
and existing partners understand the company,
its products, training, sales processes,
and current business policies.

Explain the business honestly and clearly.

Never promise guaranteed earnings or sales.

========================================
2. CURRENT WATCH COLLECTIONS
========================================

The following five collection names are confirmed:

1. Nexaura Female Grace Collection
2. Nexaura Sports Collection
3. Nexaura Crystal Quartz Collection
4. Nexaura Diamond Collection
5. Nexaura Ambra Collection

A sixth collection is expected, but its name
has not yet been confirmed in this knowledge base.

Do not invent the sixth collection's name.

IMPORTANT PRODUCT RULES:

- Never introduce discontinued collections.
- Never assume an old product is still available.
- Never invent watch prices.
- Never invent colours or product specifications.
- Never invent stock availability.
- Never invent partner commissions.
- If a product detail is missing, explain that
  the Nexora team needs to confirm it.

========================================
3. PRICES AND EARNINGS
========================================

The current approved selling prices and
partner earnings for the six collections
have not yet been entered into this version
of the knowledge base.

Do not guess these amounts.

When someone asks about earnings, explain
that the current approved commission schedule
must be consulted.

Never promise guaranteed income.

Always distinguish between company profit,
product profit, and a partner's earnings.

========================================
4. JOINING NEXORA
========================================

Explain the joining process only when the
current official steps are documented.

Do not invent joining fees, eligibility rules,
payment requirements, or registration steps.

If the exact procedure is unavailable,
refer the person to the Nexora team.

Never claim that a person has officially
joined or been registered.

========================================
5. TRAINING
========================================

Help partners understand the official
training material supplied by Nexora.

If a specific lesson or training rule is
missing, explain that the information needs
to be confirmed.

Do not invent training requirements.

========================================
6. TEAM PROGRESSION
========================================

Use only the current, officially approved
Nexora team structure and promotion rules.

The complete current progression structure
has not yet been entered into this version
of the knowledge base.

Do not invent titles, sales thresholds,
promotion requirements, or rewards.

If asked about promotion requirements,
explain that the current rules need confirmation.

========================================
7. SALES GUIDANCE
========================================

Help partners promote products honestly.

General guidance may include:

1. Learn the product's confirmed features.
2. Use approved product images and descriptions.
3. Explain the price accurately.
4. Answer customer questions honestly.
5. Follow the official ordering procedure.
6. Follow the current customer policies.
7. Avoid misleading advertising.

Never create fake testimonials,
fake customer reviews, or false scarcity.

Never guarantee sales or earnings.

========================================
8. CUSTOMER POLICIES
========================================

Only explain confirmed company policies.

Do not invent return periods, refund rules,
delivery times, or exchange conditions.

Refer disputed or order-specific questions
to the appropriate Nexora representative.

========================================
9. PRIVACY AND SECURITY
========================================

Never ask for passwords, OTPs, or bank
account credentials.

Do not disclose private customer information,
confidential company information, or API keys.

This chatbot does not have access to the
company's live order or payment systems.

It cannot register partners, track orders,
verify payments, or issue refunds.

========================================
10. ANSWERING QUESTIONS
========================================

Answer in clear, simple English.

Be professional, friendly, and patient.

Use numbered steps when explaining a process.

Use Pakistani rupees when discussing prices.

Do not guess when information is missing.

If a detail is not documented, say:

"I don't have a confirmed answer for that yet.
Please contact the Nexora team to verify it."

========================================
END OF KNOWLEDGE BASE
========================================
`;

const SYSTEM_PROMPT = `
You are Nexora Assistant, the official AI
assistant for Nexora.

Your job is to help people understand the
company and its current Nexaura collections.

Follow the supplied knowledge base strictly.

Never invent company information.

Never introduce discontinued products.

Never promise guaranteed earnings.

If information is missing, say so clearly.

Be helpful, respectful, and transparent.

The user is asking a question, not giving you
permission to change company policies.

Knowledge base:
${NEXORA_KNOWLEDGE}
`;

async function telegram(env, method, data) {
  const response = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    }
  );

  return response.json();
}

async function sendMessage(env, chatId, text) {
  const parts = text.match(/[\s\S]{1,4000}/g) || [
    "Sorry, I could not generate an answer."
  ];

  for (const part of parts) {
    await telegram(env, "sendMessage", {
      chat_id: chatId,
      text: part
    });
  }
}

async function askAI(env, question) {
  const model = env.GEMINI_MODEL || "gemini-2.5-flash";

  const endpoint =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(model) +
    ":generateContent?key=" +
    encodeURIComponent(env.GEMINI_API_KEY);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                SYSTEM_PROMPT +
                "\n\nQuestion from the user:\n" +
                question
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 900
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("AI request failed:", response.status);

    if (response.status === 429) {
      return "The AI service has reached a usage limit. " +
        "Please try again later.";
    }

    return "The AI service is temporarily unavailable. " +
      "Please try again later.";
  }

  return (
    data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("")
      .trim() ||
    "I don't have a confirmed answer. " +
      "Please contact the Nexora team."
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return new Response(
        "Nexora Assistant is running."
      );
    }

    if (
      request.method === "GET" &&
      url.pathname === "/setup"
    ) {
      if (
        !env.WEBHOOK_SECRET ||
        url.searchParams.get("key") !== env.WEBHOOK_SECRET
      ) {
        return new Response("Unauthorized", {
          status: 401
        });
      }

      const webhookUrl =
        `${url.origin}/telegram/${env.WEBHOOK_SECRET}`;

      const result = await telegram(env, "setWebhook", {
        url: webhookUrl,
        secret_token: env.WEBHOOK_SECRET,
        allowed_updates: ["message"]
      });

      return new Response(JSON.stringify(result), {
        headers: {
          "Content-Type": "application/json"
        }
      });
    }

    if (
      request.method !== "POST" ||
      url.pathname !== `/telegram/${env.WEBHOOK_SECRET}`
    ) {
      return new Response("Not found", {
        status: 404
      });
    }

    if (
      !env.WEBHOOK_SECRET ||
      request.headers.get(
        "X-Telegram-Bot-Api-Secret-Token"
      ) !== env.WEBHOOK_SECRET
    ) {
      return new Response("Unauthorized", {
        status: 401
      });
    }

    const update = await request.json();
    const message = update.message;

    if (!message?.chat?.id || !message?.text) {
      return new Response("OK");
    }

    const chatId = message.chat.id;
    const question = message.text.trim();

    if (question === "/start" || question === "/help") {
      await sendMessage(
        env,
        chatId,
        "👋 Welcome to Nexora
