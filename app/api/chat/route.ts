// app/api/chat/route.ts
import OpenAI from "openai";
import { NextResponse } from "next/server";

const MODEL = "gpt-5.1-mini"; // ou "gpt-5-nano" si tu préfères

type Speaker = "client" | "assistant";

type Message = {
  id: number;
  from: Speaker;
  text: string;
};

type ChatRequestBody = {
  messages: Message[];
};

const SYSTEM_PROMPT = `
Tu es Bob, un assistant technique pour des artisans du bâtiment (plombier, électricien, serrurier, chauffagiste, menuisier…).

Ton rôle :
- parler simplement, comme un artisan sympa, direct, humain
- ne jamais donner de solution technique détaillée ni de diagnostic final
- ton but est de poser les bonnes questions pour préparer l’intervention
- tu cherches uniquement :
  • le symptôme précis
  • la localisation
  • depuis quand / évolution
  • signes visibles (eau, bruit, odeur, voyant…)
  • l’environnement (autre prise, autre robinet…)
  • accessibilité
  • type de logement
- une seule question à la fois
- style simple
`;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatRequestBody;
    const messages = body?.messages ?? [];

    // 🔐 On lit la clé ici, au runtime
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("OPENAI_API_KEY manquante sur le serveur");
      return NextResponse.json(
        { error: "Configuration serveur manquante" },
        { status: 500 }
      );
    }

    const client = new OpenAI({ apiKey });

    // On construit l'input pour l'API Responses
    const input: any[] = [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: SYSTEM_PROMPT,
          },
        ],
      },
      ...messages.map((m) => ({
        role: m.from === "client" ? "user" : "assistant",
        content: [
          {
            type: "input_text",
            text: m.text,
          },
        ],
      })),
    ];

    const response: any = await client.responses.create({
      model: MODEL,
      input,
      max_output_tokens: 200,
    });

    // Récupération du texte de sortie
    let reply = "Désolé, je n’ai pas réussi à répondre.";

    const output = response?.output;
    if (Array.isArray(output) && output.length > 0) {
      const firstItem = output[0];
      const content = firstItem?.content;

      if (Array.isArray(content)) {
        const textBlock = content.find(
          (c: any) => c.type === "output_text"
        );
        if (textBlock && typeof textBlock.text === "string") {
          reply = textBlock.text;
        }
      }
    }

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Erreur /api/chat :", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
