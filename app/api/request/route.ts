import { NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";

// --- Env vars ---

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM = process.env.SENDGRID_FROM;
const SENDGRID_TO = process.env.SENDGRID_TO || SENDGRID_FROM;

// Init SendGrid (si clé dispo)
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

// --- Types (mêmes structures que le front) ---

type Speaker = "client" | "assistant";

type Message = {
  id: number;
  from: Speaker;
  text: string;
};

type Contact = {
  lastName: string;
  firstName: string;
  email: string;
  phone: string;
};

type LocationForm = {
  number: string;
  street: string;
  postalCode: string;
  city: string;
  type: "Appartement" | "Maison";
  floor: string;
  accessCode1: string;
  accessCode2: string;
  notes: string;
  parking: "Oui" | "Non";
};

type AvailabilitySlot = {
  day: string;
  start: string;
  end: string;
};

type RequestBody = {
  messages: Message[];
  contact: Contact;
  location: LocationForm;
  availabilities: AvailabilitySlot[];
};

type ValidationErrors<T> = Partial<Record<keyof T, string>>;

// --- Regex identiques au front ---

const alphaRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/;
const alphanumRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9\s'-]+$/;
const numericRegex = /^[0-9]+$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// téléphone : exactement 10 chiffres
const phoneRegex = /^[0-9]{10}$/;
const textWithSymbolsRegex =
  /^[A-Za-zÀ-ÖØ-öø-ÿ0-9\s#*@\-_.:,;!'()/?]+$/;

// --- Fonctions de validation ---

function validateContact(contact: Contact): ValidationErrors<Contact> {
  const errors: ValidationErrors<Contact> = {};

  if (!contact.lastName?.trim()) {
    errors.lastName = "Nom requis";
  } else if (!alphaRegex.test(contact.lastName.trim())) {
    errors.lastName = "Nom : lettres uniquement";
  }

  if (!contact.firstName?.trim()) {
    errors.firstName = "Prénom requis";
  } else if (!alphaRegex.test(contact.firstName.trim())) {
    errors.firstName = "Prénom : lettres uniquement";
  }

  if (!contact.email?.trim()) {
    errors.email = "Email requis";
  } else if (!emailRegex.test(contact.email.trim())) {
    errors.email = "Format d’email invalide";
  }

  if (!contact.phone?.trim()) {
    errors.phone = "Téléphone requis";
  } else if (!phoneRegex.test(contact.phone.trim())) {
    errors.phone = "Téléphone : 10 chiffres requis";
  }

  return errors;
}

function validateLocation(
  location: LocationForm
): ValidationErrors<LocationForm> {
  const errors: ValidationErrors<LocationForm> = {};

  if (!location.number?.trim()) {
    errors.number = "Numéro requis";
  } else if (!alphanumRegex.test(location.number.trim())) {
    errors.number = "Numéro : alphanumérique uniquement";
  }

  if (!location.street?.trim()) {
    errors.street = "Rue requise";
  } else if (!alphanumRegex.test(location.street.trim())) {
    errors.street = "Rue : alphanumérique uniquement";
  }

  const cp = location.postalCode?.trim() ?? "";
  if (!cp) {
    errors.postalCode = "Code postal requis";
  } else if (!numericRegex.test(cp)) {
    errors.postalCode = "Code postal : chiffres uniquement";
  } else if (cp.length !== 5) {
    errors.postalCode = "Code postal : 5 chiffres";
  }

  if (!location.city?.trim()) {
    errors.city = "Ville requise";
  } else if (!alphaRegex.test(location.city.trim())) {
    errors.city = "Ville : lettres uniquement";
  }

  if (location.floor?.trim() && !numericRegex.test(location.floor.trim())) {
    errors.floor = "Étage : chiffres uniquement";
  }

  if (
    location.accessCode1?.trim() &&
    !textWithSymbolsRegex.test(location.accessCode1.trim())
  ) {
    errors.accessCode1 = "Code d’accès 1 : caractères non autorisés";
  }

  if (
    location.accessCode2?.trim() &&
    !textWithSymbolsRegex.test(location.accessCode2.trim())
  ) {
    errors.accessCode2 = "Code d’accès 2 : caractères non autorisés";
  }

  if (
    location.notes?.trim() &&
    !textWithSymbolsRegex.test(location.notes.trim())
  ) {
    errors.notes = "Description : caractères non autorisés";
  }

  return errors;
}

// --- GET pour test rapide dans le navigateur ---

export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/request", method: "GET" });
}

// --- Helper pour construire le contenu email ---

function buildEmailText(body: RequestBody): string {
  const lastClientMessage =
    [...(body.messages || [])].reverse().find((m) => m.from === "client")
      ?.text ?? "Non renseigné";

  const dispoLines =
    body.availabilities && body.availabilities.length > 0
      ? body.availabilities
          .map((a) => `- ${a.day} : ${a.start} → ${a.end}`)
          .join("\n")
      : "Non renseigné";

  const contact = body.contact;
  const loc = body.location;

  return [
    "Nouvelle demande d’intervention",
    "",
    "🧍 Client :",
    `- Nom : ${contact.lastName} ${contact.firstName}`,
    `- Email : ${contact.email}`,
    `- Téléphone : ${contact.phone}`,
    "",
    "📍 Lieu d’intervention :",
    `- Adresse : ${loc.number} ${loc.street}`,
    `- Code postal : ${loc.postalCode}`,
    `- Ville : ${loc.city}`,
    `- Type de logement : ${loc.type}`,
    loc.floor ? `- Étage : ${loc.floor}` : "",
    loc.accessCode1 ? `- Code d’accès 1 : ${loc.accessCode1}` : "",
    loc.accessCode2 ? `- Code d’accès 2 : ${loc.accessCode2}` : "",
    loc.notes ? `- Notes : ${loc.notes}` : "",
    "",
    "🛠 Description du problème (dernier message du client) :",
    lastClientMessage,
    "",
    "📆 Disponibilités proposées :",
    dispoLines,
    "",
    "— Message généré automatiquement par le formulaire Bob.",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildEmailHtml(body: RequestBody): string {
  const text = buildEmailText(body)
    .replace(/\n/g, "<br />")
    .replace(/  /g, "&nbsp;&nbsp;");

  return `<div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.4; font-size: 14px;">
    ${text}
  </div>`;
}

// --- POST principal ---

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;

    const contactErrors = validateContact(body.contact || ({} as Contact));
    const locationErrors = validateLocation(body.location || ({} as LocationForm));

    const hasContactErrors = Object.keys(contactErrors).length > 0;
    const hasLocationErrors = Object.keys(locationErrors).length > 0;

    if (hasContactErrors || hasLocationErrors) {
      return NextResponse.json(
        {
          ok: false,
          message: "Validation échouée",
          contactErrors,
          locationErrors,
        },
        { status: 400 }
      );
    }

    if (!SENDGRID_API_KEY || !SENDGRID_FROM || !SENDGRID_TO) {
      console.error("❌ Config SendGrid manquante");
      return NextResponse.json(
        {
          ok: false,
          message:
            "Configuration email manquante côté serveur. Contactez l’administrateur.",
        },
        { status: 500 }
      );
    }

    const subject = `Nouvelle demande d’intervention - ${body.contact.lastName} ${body.contact.firstName}`;
    const text = buildEmailText(body);
    const html = buildEmailHtml(body);

    const msg = {
      to: SENDGRID_TO,
      from: SENDGRID_FROM,
      subject,
      text,
      html,
    };

    await sgMail.send(msg);

    console.log("✅ Email SendGrid envoyé avec succès");

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erreur /api/request :", err);
    return NextResponse.json(
      { ok: false, message: "Erreur serveur pendant l’envoi de l’email" },
      { status: 500 }
    );
  }
}
