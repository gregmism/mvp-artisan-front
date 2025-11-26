// app/api/chat/route.ts
import OpenAI from "openai";
import { NextResponse } from "next/server";

const MODEL = "gpt-4.1-mini"; // tu peux mettre un autre modèle compatible chat.completions si tu veux

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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("OPENAI_API_KEY manquante sur le serveur");
      return NextResponse.json(
        { error: "Configuration serveur manquante" },
        { status: 500 }
      );
    }

    const client = new OpenAI({ apiKey });

    // On construit les messages pour l'API en assouplissant le typage
    const chatMessages: any[] = [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      ...messages.map((m) => ({
        role: m.from === "client" ? "user" : "assistant",
        content: m.text,
      })),
    ];

    const completion: any = await client.chat.completions.create({
      model: MODEL,
      messages: chatMessages as any,
      max_tokens: 200,
    });

    const reply =
      completion?.choices?.[0]?.message?.content?.trim() ??
      "Désolé, je n’ai pas réussi à répondre.";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Erreur /api/chat :", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
