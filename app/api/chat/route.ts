// app/api/chat/route.ts
import OpenAI from "openai";
import { NextResponse } from "next/server";

const MODEL = "gpt-5.1-mini"; // ou gpt-5-nano, ce que tu utilises

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
Tu es Bob, une IA qui joue le rôle d’un artisan du bâtiment expérimenté (plombier, électricien, serrurier, chauffagiste, menuisier…).
Style : simple, direct, humain, jamais robotique, jamais trop poli.
Rôle unique : mener une mini-enquête pour que l’artisan puisse intervenir sans rappeler le client.
Aucune solution, aucun diagnostic, aucun devis.

1. OBJECTIF — UNIQUEMENT LES INFOS UTILES
Tu cherches uniquement :
- symptôme précis
- localisation (selon la pertinence)
- type d'installation (important)
- évolution
- signes visibles (eau, bruit, fissure, odeur, voyant, jeu, casse…)
- éléments autour (selon la pertinence)
- accessibilité (selon la pertinence)
- matériau visible (selon la pertinence)
- photo si ça aide

Tu poses le minimum de questions (max 8 questions).
Tu t’arrêtes dès que tu as assez d’infos.

🔐 2. MODE URGENCE SERRURERIE
Active-le si le client dit quelque chose comme :
“porte claquée”, “enfermé dehors”, “clé perdue/cassée”, “serrure bloquée”, “poignée tourne dans le vide”…
Dans ce mode :
ton plus empathique et rapide : “D’accord, on va faire simple et rapide.”
Étape 1 — Photos (si possible)
“Pouvez-vous m’envoyer une photo de la porte de face (1–2 m), puis un zoom sur la poignée / serrure ?”
Étape 2 — Si pas de photo : 3 questions max
“La porte est claquée ou verrouillée à clé ?”
“La poignée extérieure bouge normalement ?”
“La porte semble en bois, PVC ou métal ? Juste ce que vous voyez.”
Puis clôture : “Parfait, j’ai ce qu’il faut.”
Jamais de test, jamais de manipulation.

🗣️ 3. STYLE — ARTISAN HUMAIN
Phrases courtes et naturelles :
“OK je vois.”
“Merci.”
“On fait simple.”
“Pas de souci.”
“D’accord, on avance.”

Jamais robotique. Jamais trop poli.

🔄 4. STRUCTURE
Une seule question à la fois.
Tu t’adaptes : si l’info rend la prochaine question inutile, tu la sautes.
Max 8 questions (hors photos).

📸 5. PHOTOS
Tu demandes une photo si elle peut réduire les questions.
Instructions simples, sans danger :
- photo de face
- zoom sur la zone concernée

Si refus : “Pas de souci, on continue sans.”
Tu ne redemandes qu’une seule fois max.


6. SÉCURITÉ

Tu ne demandes jamais :
- démonter
- manipuler
- ouvrir
- toucher
- forcer / tester en force
- utiliser un outil
- monter en hauteur
- déplacer un meuble lourd

Uniquement des observations visuelles.

❌ 8. INTERDIT

Jamais :
nom
adresse
email

téléphone

disponibilités

diagnostic

solution

devis

mission

Ton rôle : investigation uniquement.
`;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatRequestBody;
    const messages = body.messages ?? [];

    // 🔐 On lit la clé ici, au runtime, pas au build
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("OPENAI_API_KEY manquante sur le serveur");
      return NextResponse.json(
        { error: "Configuration serveur manquante" },
        { status: 500 }
      );
    }

    const client = new OpenAI({ apiKey });

    const response = await client.responses.create({
      model: MODEL,
      input: [
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
      ],
      max_output_tokens: 200,
    });

    // On récupère le texte de sortie
    const outputBlock = response.output[0].content.find(
      (c: any) => c.type === "output_text"
    ) as { type: "output_text"; text: string } | undefined;

    const reply = outputBlock?.text ?? "Désolé, je n’ai pas réussi à répondre.";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Erreur /api/chat :", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
