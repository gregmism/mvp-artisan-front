"use client";

import React, {
  useState,
  useRef,
  FormEvent,
  TouchEvent,
  MouseEvent,
  ChangeEvent,
} from "react";

type Step =
  | "welcome"
  | "chat"
  | "contact"
  | "location"
  | "availability"
  | "confirmation";

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
  day: string; // "2025-11-26"
  start: string; // "09:00"
  end: string; // "10:30"
};

type ValidationErrors<T> = Partial<Record<keyof T, string>>;

const ARTISAN_PLACEHOLDER = "{artisan}";

// --- REGEX DE VALIDATION ---

const alphaRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/; // lettres + espaces + accents + tirets + apostrophes
const alphanumRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9\s'-]+$/; // lettres + chiffres
const numericRegex = /^[0-9]+$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Téléphone : exactement 10 chiffres
const phoneRegex = /^[0-9]{10}$/;
// alphabet + numérique + quelques symboles (# * @ - _ . , : ; ! ' ( ) / ?)
const textWithSymbolsRegex =
  /^[A-Za-zÀ-ÖØ-öø-ÿ0-9\s#*@\-_.:,;!'()/?]+$/;

// --- HELPERS GLOBAUX ---

function formatDateLocal(d: Date): string {
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// --- FONCTIONS DE VALIDATION ---

function validateContact(contact: Contact): ValidationErrors<Contact> {
  const errors: ValidationErrors<Contact> = {};

  if (!contact.lastName.trim()) {
    errors.lastName = "Nom requis";
  } else if (!alphaRegex.test(contact.lastName.trim())) {
    errors.lastName = "Nom : lettres uniquement";
  }

  if (!contact.firstName.trim()) {
    errors.firstName = "Prénom requis";
  } else if (!alphaRegex.test(contact.firstName.trim())) {
    errors.firstName = "Prénom : lettres uniquement";
  }

  if (!contact.email.trim()) {
    errors.email = "Email requis";
  } else if (!emailRegex.test(contact.email.trim())) {
    errors.email = "Format d’email invalide";
  }

  if (!contact.phone.trim()) {
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

  if (!location.number.trim()) {
    errors.number = "Numéro requis";
  } else if (!alphanumRegex.test(location.number.trim())) {
    errors.number = "Numéro : alphanumérique uniquement";
  }

  if (!location.street.trim()) {
    errors.street = "Rue requise";
  } else if (!alphanumRegex.test(location.street.trim())) {
    errors.street = "Rue : alphanumérique uniquement";
  }

  const cp = location.postalCode.trim();
  if (!cp) {
    errors.postalCode = "Code postal requis";
  } else if (!numericRegex.test(cp)) {
    errors.postalCode = "Code postal : chiffres uniquement";
  } else if (cp.length !== 5) {
    errors.postalCode = "Code postal : 5 chiffres";
  }

  if (!location.city.trim()) {
    errors.city = "Ville requise";
  } else if (!alphaRegex.test(location.city.trim())) {
    errors.city = "Ville : lettres uniquement";
  }

  if (location.floor.trim() && !numericRegex.test(location.floor.trim())) {
    errors.floor = "Étage : chiffres uniquement";
  }

  if (
    location.accessCode1.trim() &&
    !textWithSymbolsRegex.test(location.accessCode1.trim())
  ) {
    errors.accessCode1 = "Code d’accès 1 : caractères non autorisés";
  }

  if (
    location.accessCode2.trim() &&
    !textWithSymbolsRegex.test(location.accessCode2.trim())
  ) {
    errors.accessCode2 = "Code d’accès 2 : caractères non autorisés";
  }

  if (
    location.notes.trim() &&
    !textWithSymbolsRegex.test(location.notes.trim())
  ) {
    errors.notes = "Description : caractères non autorisés";
  }

  return errors;
}

export default function App() {
  const [step, setStep] = useState<Step>("welcome");

  // --- CHAT ---
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, from: "assistant", text: "Dites-moi ce qui se passe." },
    {
      id: 2,
      from: "assistant",
      text: "Si vous pouvez envoyer une photo, c’est encore mieux.",
    },
    { id: 3, from: "assistant", text: "Pas d’inquiétude, ça sera rapide." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSendChat = async (e: FormEvent) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || isChatLoading) return;

    const newMsg: Message = {
      id: Date.now(),
      from: "client",
      text,
    };

    const updatedMessages = [...messages, newMsg];

    // On affiche tout de suite le message du client
    setMessages(updatedMessages);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        console.error("Erreur /api/chat :", data);
        const errorMsg: Message = {
          id: Date.now() + 1,
          from: "assistant",
          text:
            data?.message ??
            "Je rencontre un problème pour répondre, pouvez-vous réessayer dans un instant ?",
        };
        setMessages((prev) => [...prev, errorMsg]);
        return;
      }

      const assistantMsg: Message = {
        id: Date.now() + 1,
        from: "assistant",
        text: data.reply,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Erreur réseau /api/chat :", err);
      const errorMsg: Message = {
        id: Date.now() + 1,
        from: "assistant",
        text:
          "Je n’arrive pas à joindre le serveur pour l’instant. Merci de réessayer un peu plus tard.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handlePickImage = () => fileInputRef.current?.click();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    console.log("Image sélectionnée :", file.name);
  };

  // --- CONTACT FORM ---
  const [contact, setContact] = useState<Contact>({
    lastName: "",
    firstName: "",
    email: "",
    phone: "",
  });
  const [contactErrors, setContactErrors] = useState<ValidationErrors<Contact>>(
    {}
  );

  // --- LOCATION FORM ---
  const [location, setLocation] = useState<LocationForm>({
    number: "",
    street: "",
    postalCode: "",
    city: "",
    type: "Appartement",
    floor: "",
    accessCode1: "",
    accessCode2: "",
    notes: "",
    parking: "Oui",
  });
  const [locationErrors, setLocationErrors] =
    useState<ValidationErrors<LocationForm>>({});

  // --- AVAILABILITY GRID ---
  const startHour = 8;
  const endHour = 20; // 20 non inclus
  const slotCountPerHour = 4; // 15 min
  const totalSlots = (endHour - startHour) * slotCountPerHour;

  const dayDates = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const days = dayDates.map((d, idx) => ({
    dayNumber: d.getDate(),
    label:
      idx === 0
        ? "Aujourd’hui"
        : d.toLocaleDateString("fr-FR", { weekday: "short" }),
  }));

  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(
    () => new Set()
  );
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"add" | "remove">("add");

  // tooltip flottant à côté de la souris
  const [hoverTooltip, setHoverTooltip] = useState<{
    label: string;
    x: number;
    y: number;
  } | null>(null);

  const slotIdFromIndex = (rowIdx: number, colIdx: number) =>
    `${rowIdx}-${colIdx}`;

  const toggleSlot = (slotId: string, mode?: "add" | "remove") => {
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      const isSelected = next.has(slotId);
      const effectiveMode =
        mode ?? (isSelected ? ("remove" as const) : ("add" as const));
      if (effectiveMode === "add") next.add(slotId);
      else next.delete(slotId);
      return next;
    });
  };

  const handleMouseDownSlot = (slotId: string) => (e: MouseEvent) => {
    e.preventDefault();
    const willAdd = !selectedSlots.has(slotId);
    setDragMode(willAdd ? "add" : "remove");
    setIsDragging(true);
    toggleSlot(slotId, willAdd ? "add" : "remove");
  };

  const handleMouseEnterSlot =
    (slotId: string, rowIdx: number) =>
    (e: MouseEvent<HTMLDivElement>) => {
      if (isDragging) {
        e.preventDefault();
        toggleSlot(slotId, dragMode);
      }
      const label = getSlotRangeLabel(rowIdx);
      setHoverTooltip({
        label,
        x: e.clientX + 10,
        y: e.clientY + 10,
      });
    };

  const handleMouseMoveSlot =
    (rowIdx: number) => (e: MouseEvent<HTMLDivElement>) => {
      if (!hoverTooltip) return;
      const label = getSlotRangeLabel(rowIdx);
      setHoverTooltip({
        label,
        x: e.clientX + 10,
        y: e.clientY + 10,
      });
    };

  const handleMouseLeaveSlot = () => {
    if (!isDragging) setHoverTooltip(null);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStartSlot = (slotId: string) => (e: TouchEvent) => {
    e.preventDefault();
    const willAdd = !selectedSlots.has(slotId);
    setDragMode(willAdd ? "add" : "remove");
    setIsDragging(true);
    toggleSlot(slotId, willAdd ? "add" : "remove");
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const target = document.elementFromPoint(
      touch.clientX,
      touch.clientY
    ) as HTMLElement | null;
    if (!target) return;
    const slotId = target.dataset.slotId;
    if (!slotId) return;
    toggleSlot(slotId, dragMode);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // --- TIME HELPERS ---

  const formatTime = (totalMinutes: number) => {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}`;
  };

  const getTimeFromRowIndex = (rowIdx: number) => {
    const totalMinutes = startHour * 60 + rowIdx * 15;
    return formatTime(totalMinutes);
  };

  const getSlotRangeLabel = (rowIdx: number) => {
    const start = getTimeFromRowIndex(rowIdx);
    const end = getTimeFromRowIndex(rowIdx + 1);
    return `${start} - ${end}`;
  };

  const getBlockLabelForCell = (
    rowIdx: number,
    colIdx: number
  ): { startLabel: string; endLabel: string } | null => {
    const slotId = slotIdFromIndex(rowIdx, colIdx);
    if (!selectedSlots.has(slotId)) return null;

    let top = rowIdx;
    while (top > 0 && selectedSlots.has(slotIdFromIndex(top - 1, colIdx))) {
      top--;
    }

    let bottom = rowIdx + 1;
    while (
      bottom < totalSlots &&
      selectedSlots.has(slotIdFromIndex(bottom, colIdx))
    ) {
      bottom++;
    }

    const mid = Math.floor((top + (bottom - 1)) / 2);
    if (rowIdx !== mid) return null;

    const startLabel = getTimeFromRowIndex(top);
    const endLabel = getTimeFromRowIndex(bottom);
    return { startLabel, endLabel };
  };

  // --- AVAILABILITIES : regrouper les créneaux sélectionnés ---

  const buildAvailabilities = (selected: Set<string>): AvailabilitySlot[] => {
    const result: AvailabilitySlot[] = [];

    for (let col = 0; col < days.length; col++) {
      const rows: number[] = [];

      // On récupère tous les rowIdx sélectionnés pour cette colonne (jour)
      for (let row = 0; row < totalSlots; row++) {
        const id = slotIdFromIndex(row, col);
        if (selected.has(id)) rows.push(row);
      }

      if (rows.length === 0) continue;

      rows.sort((a, b) => a - b);

      let startRow = rows[0];
      let prevRow = rows[0];

      for (let i = 1; i <= rows.length; i++) {
        const current = rows[i];

        // Si on casse la continuité ou qu'on est à la fin -> on clôt un bloc
        if (current !== prevRow + 1) {
          const startMinutes = startHour * 60 + startRow * 15;
          const endMinutes = startHour * 60 + (prevRow + 1) * 15;

          const startTime = formatTime(startMinutes);
          const endTime = formatTime(endMinutes);
          const dayStr = formatDateLocal(dayDates[col]);

          result.push({
            day: dayStr,
            start: startTime,
            end: endTime,
          });

          if (current != null) {
            startRow = current;
            prevRow = current;
          }
        } else {
          prevRow = current;
        }
      }
    }

    return result;
  };

  // --- NAVIGATION AVEC VALIDATION ---

  const handleNextFromContact = () => {
    const errors = validateContact(contact);
    setContactErrors(errors);

    if (Object.keys(errors).length === 0) {
      setStep("location");
    }
  };

  const handleNextFromLocation = () => {
    const errors = validateLocation(location);
    setLocationErrors(errors);

    if (Object.keys(errors).length === 0) {
      setStep("availability");
    }
  };

  const handleSubmitAll = async () => {
    const availabilities = buildAvailabilities(selectedSlots);

    const payload = {
      messages,
      contact,
      location,
      availabilities,
    };

    console.log("Payload prêt à être envoyé à /api/request :", payload);

    try {
      const res = await fetch("/api/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      console.log("Réponse /api/request :", data);

      if (!res.ok) {
        alert(
          data?.message ??
            "Une erreur est survenue lors de l’envoi de votre demande."
        );
        return;
      }

      // Succès : on affiche l'écran de confirmation
      setStep("confirmation");
    } catch (err) {
      console.error("Erreur réseau /api/request :", err);
      alert("Impossible de contacter le serveur. Merci de réessayer plus tard.");
    }
  };

  // --- UI HELPERS ---

  const baseContainer = (
    content: React.ReactNode,
    bottomButton?: React.ReactNode,
    header?: React.ReactNode
  ) => (
    <main className="min-h-screen bg-white flex justify-center">
      <div className="w-full max-w-[420px] h-screen flex flex-col px-5 pt-6 pb-4">
        {header && <div className="mb-4">{header}</div>}
        <div className="flex-1 flex flex-col items-center text-center overflow-hidden">
          {content}
        </div>
        {bottomButton && <div className="pt-3">{bottomButton}</div>}
      </div>
    </main>
  );

  const formHeader = (
    title: string,
    opts?: { showBack?: boolean; onBack?: () => void }
  ) => <Header title={title} showBack={opts?.showBack} onBack={opts?.onBack} />;

  // --- SCREENS ---

  const renderWelcome = () =>
    baseContainer(
      <div className="flex flex-col items-center justify-center h-full px-4 text-center">
        <div className="text-6xl mb-6">👨‍🔧</div>

        <p className="text-xl font-semibold mb-2">
          Bonjour ! Moi, c’est Bob.
        </p>

        <p className="text-base mb-4">
          Je prépare votre intervention pour{" "}
          <span className="font-semibold">{ARTISAN_PLACEHOLDER}</span>.
        </p>

        <p className="text-base mb-4 leading-relaxed">
          En 2–3 min, on clarifie votre problème, puis je prends vos
          coordonnées et disponibilités.
        </p>

        <p className="text-base mb-6 leading-relaxed">
          Ensuite, <span className="font-semibold">{ARTISAN_PLACEHOLDER}</span>{" "}
          vous rappelle pour confirmer la date.
        </p>

        <p className="text-lg font-medium">On y va ?</p>
      </div>,
      <PrimaryButton onClick={() => setStep("chat")}>Commencer</PrimaryButton>
    );

  const renderChat = () =>
    baseContainer(
      <>
        <header className="w-full flex flex-col items-center mb-4">
          <div className="text-4xl mb-1">👨‍🔧</div>
          <div className="text-base font-semibold">
            Bob - {ARTISAN_PLACEHOLDER}
          </div>
        </header>

        <div className="w-full flex-1 overflow-y-auto border-t border-b py-3">
          <div className="space-y-2 px-3">
            {messages.map((msg, index) => {
              const isClient = msg.from === "client";
              const isLastAssistant =
                msg.from === "assistant" && index === messages.length - 1;

              if (isClient) {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div
                      className="
                        max-w-[75%] rounded-2xl px-3 py-2 text-sm
                        bg-black text-white rounded-br-sm
                      "
                    >
                      <p>{msg.text}</p>
                    </div>
                  </div>
                );
              }

              // Assistant message
              return (
                <div key={msg.id} className="flex justify-start">
                  {/* Colonne avatar */}
                  <div className="mr-2 flex items-end">
                    {isLastAssistant ? (
                      <img
                        src="/bob-avatar.png"
                        alt="Avatar Bob"
                        className="w-7 h-7 rounded-full border border-zinc-300"
                      />
                    ) : (
                      <div className="w-7 h-7" />
                    )}
                  </div>

                  <div
                    className="
                      max-w-[75%] rounded-2xl px-3 py-2 text-sm
                      bg-zinc-100 text-black rounded-bl-sm
                    "
                  >
                    <p>{msg.text}</p>
                  </div>
                </div>
              );
            })}

            {isChatLoading && (
              <div className="px-3 pt-1 text-xs text-zinc-500 text-left">
                Bob réfléchit…
              </div>
            )}
          </div>
        </div>

        <form
          onSubmit={handleSendChat}
          className="w-full flex items-center gap-2 pt-3"
        >
          <div className="flex-1 flex items-center border rounded-full px-3 py-2 bg-white">
            <input
              type="text"
              className="flex-1 text-sm outline-none"
              placeholder="Écrire un message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={isChatLoading}
            />
            <button
              type="button"
              className="cursor-pointer ml-2 text-xl transition-all duration-150 hover:scale-110 hover:opacity-80"
              aria-label="Ajouter une photo"
              onClick={handlePickImage}
              disabled={isChatLoading}
            >
              📷
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </form>
      </>,
      <PrimaryButton onClick={() => setStep("contact")}>Suivant</PrimaryButton>
    );

  const renderContact = () =>
    baseContainer(
      <>
        <div className="w-full space-y-4 text-left text-sm mt-4">
          <Field
            label="Nom"
            placeholder="Dupont"
            value={contact.lastName}
            error={contactErrors.lastName}
            onChange={(v) => {
              setContact((c) => ({ ...c, lastName: v }));
              setContactErrors((e) => ({ ...e, lastName: undefined }));
            }}
          />
          <Field
            label="Prénom"
            placeholder="Jean"
            value={contact.firstName}
            error={contactErrors.firstName}
            onChange={(v) => {
              setContact((c) => ({ ...c, firstName: v }));
              setContactErrors((e) => ({ ...e, firstName: undefined }));
            }}
          />
          <Field
            label="Email"
            placeholder="jean.dupont@email.com"
            value={contact.email}
            error={contactErrors.email}
            onChange={(v) => {
              setContact((c) => ({ ...c, email: v }));
              setContactErrors((e) => ({ ...e, email: undefined }));
            }}
          />
          <Field
            label="Mobile"
            placeholder="0612345678"
            value={contact.phone}
            error={contactErrors.phone}
            numeric
            maxLength={10}
            onChange={(v) => {
              setContact((c) => ({ ...c, phone: v }));
              setContactErrors((e) => ({ ...e, phone: undefined }));
            }}
          />
        </div>
      </>,
      <PrimaryButton onClick={handleNextFromContact}>Suivant</PrimaryButton>,
      formHeader("Contact")
    );

  const renderLocation = () =>
    baseContainer(
      <>
        <div className="w-full space-y-4 text-left text-sm mt-4">
          <div className="flex gap-3">
            <div className="w-[70px] flex-shrink-0">
              <Field
                label="N°"
                placeholder="24"
                value={location.number}
                error={locationErrors.number}
                onChange={(v) => {
                  setLocation((l) => ({ ...l, number: v }));
                  setLocationErrors((e) => ({ ...e, number: undefined }));
                }}
              />
            </div>
            <div className="flex-1">
              <Field
                label="Rue"
                placeholder="Rue de la Paix"
                value={location.street}
                error={locationErrors.street}
                onChange={(v) => {
                  setLocation((l) => ({ ...l, street: v }));
                  setLocationErrors((e) => ({ ...e, street: undefined }));
                }}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-[70px] flex-shrink-0">
              <Field
                label="Code postal"
                placeholder="75010"
                value={location.postalCode}
                error={locationErrors.postalCode}
                numeric
                maxLength={5}
                onChange={(v) => {
                  setLocation((l) => ({ ...l, postalCode: v }));
                  setLocationErrors((e) => ({ ...e, postalCode: undefined }));
                }}
              />
            </div>
            <div className="flex-1">
              <Field
                label="Ville"
                placeholder="Paris"
                value={location.city}
                error={locationErrors.city}
                onChange={(v) => {
                  setLocation((l) => ({ ...l, city: v }));
                  setLocationErrors((e) => ({ ...e, city: undefined }));
                }}
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-medium mb-1">Logement</p>
            <div className="flex items-center gap-4 text-sm">
              <Radio
                label="Appartement"
                checked={location.type === "Appartement"}
                onChange={() =>
                  setLocation((l) => ({ ...l, type: "Appartement" }))
                }
              />
              <Radio
                label="Maison"
                checked={location.type === "Maison"}
                onChange={() =>
                  setLocation((l) => ({ ...l, type: "Maison" }))
                }
              />
            </div>
          </div>

          {location.type === "Appartement" && (
            <Field
              label="Étage"
              placeholder="3"
              value={location.floor}
              error={locationErrors.floor}
              numeric
              onChange={(v) => {
                setLocation((l) => ({ ...l, floor: v }));
                setLocationErrors((e) => ({ ...e, floor: undefined }));
              }}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Code d’accès 1"
              placeholder="B12#"
              value={location.accessCode1}
              error={locationErrors.accessCode1}
              onChange={(v) => {
                setLocation((l) => ({ ...l, accessCode1: v }));
                setLocationErrors((e) => ({
                  ...e,
                  accessCode1: undefined,
                }));
              }}
            />
            <Field
              label="Code d’accès 2"
              placeholder="1234"
              value={location.accessCode2}
              error={locationErrors.accessCode2}
              onChange={(v) => {
                setLocation((l) => ({ ...l, accessCode2: v }));
                setLocationErrors((e) => ({
                  ...e,
                  accessCode2: undefined,
                }));
              }}
            />
          </div>

          <Field
            label="Description additionnelle"
            placeholder="Interphone en panne, 3e étage sans ascenseur..."
            value={location.notes}
            error={locationErrors.notes}
            onChange={(v) => {
              setLocation((l) => ({ ...l, notes: v }));
              setLocationErrors((e) => ({ ...e, notes: undefined }));
            }}
            multiline
          />
        </div>
      </>,
      <PrimaryButton onClick={handleNextFromLocation}>
        Suivant
      </PrimaryButton>,
      formHeader("Lieu", { showBack: true, onBack: () => setStep("contact") })
    );

  const renderAvailability = () => (
    <main className="min-h-screen bg-white flex justify-center">
      <div
        className="w-full max-w-[420px] h-screen flex flex-col px-5 pt-6 pb-4"
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeaveSlot}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {formHeader("Disponibilités", {
          showBack: true,
          onBack: () => setStep("location"),
        })}

        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Tooltip flottant */}
          {hoverTooltip && (
            <div
              className="
                pointer-events-none
                fixed
                z-50
                bg-white
                border border-black
                rounded-[8px]
                px-2
                py-0.5
                text-[11px]
                font-semibold
                leading-tight
                text-black
                shadow-sm
              "
              style={{
                top: hoverTooltip.y,
                left: hoverTooltip.x,
                transform: "translate(0, -50%)",
              }}
            >
              {hoverTooltip.label}
            </div>
          )}

          {/* En-têtes de colonnes (dates) */}
          <div className="flex text-[10px] mt-4 mb-0">
            <div className="w-10" />
            {days.map((d, idx) => (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center justify-center leading-tight px-1 text-center font-semibold"
              >
                <span className="text-[14px]">{d.dayNumber}</span>
                <span className="text-[10px] mt-[2px]">{d.label}</span>
              </div>
            ))}
          </div>

          <div className="flex-1 overflow-hidden mt-0.5">
            <div className="h-full flex">
              {/* Colonne des heures */}
              <div className="flex flex-col text-[10px] font-semibold text-right pr-1 w-10">
                {Array.from({ length: totalSlots }).map((_, idx) => {
                  const hour =
                    startHour + Math.floor(idx / slotCountPerHour);
                  const minutes = (idx % slotCountPerHour) * 15;
                  const label =
                    minutes === 0
                      ? `${hour.toString().padStart(2, "0")}:00`
                      : "";
                  return (
                    <div
                      key={idx}
                      className="flex-1 flex items-center justify-end"
                    >
                      {label && (
                        <span className="leading-none">{label}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Grille */}
              <div className="flex-1 grid grid-cols-6 grid-rows-[repeat(48,1fr)] border border-zinc-300">
                {Array.from({ length: totalSlots }).map((_, rowIdx) =>
                  days.map((_, colIdx) => {
                    const slotId = slotIdFromIndex(rowIdx, colIdx);
                    const isSelected = selectedSlots.has(slotId);
                    const blockInfo = getBlockLabelForCell(rowIdx, colIdx);

                    return (
                      <div
                        key={slotId}
                        data-slot-id={slotId}
                        className={`cursor-pointer relative border border-zinc-200 ${
                          isSelected ? "bg-blue-500/60" : "bg-white"
                        }`}
                        onMouseDown={handleMouseDownSlot(slotId)}
                        onMouseEnter={handleMouseEnterSlot(slotId, rowIdx)}
                        onMouseMove={handleMouseMoveSlot(rowIdx)}
                        onMouseLeave={handleMouseLeaveSlot}
                        onTouchStart={handleTouchStartSlot(slotId)}
                      >
                        {blockInfo && (
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10">
                            <div className="bg-white rounded-[8px] border border-black px-3 py-1 text-[12px] font-bold text-black leading-tight text-center">
                              <div>{blockInfo.startLabel}</div>
                              <div>{blockInfo.endLabel}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Mention explicative sous le tableau */}
          <p className="mt-2 text-[11px] text-center">
            Glissez votre doigt sur les plages horaires disponibles.
          </p>
        </div>

        <div className="pt-3">
          <PrimaryButton onClick={handleSubmitAll}>
            Envoyer
          </PrimaryButton>
        </div>
      </div>
    </main>
  );

  const renderConfirmation = () =>
    baseContainer(
      <div className="flex flex-col items-center justify-center h-full px-4 text-center">
        <div className="text-5xl mb-4">✅</div>
        <p className="text-xl font-semibold mb-2">
          Merci, c’est bien envoyé !
        </p>
        <p className="text-base mb-3 leading-relaxed">
          {ARTISAN_PLACEHOLDER} a reçu votre demande avec :
        </p>
        <ul className="text-sm mb-4 text-left space-y-1">
          <li>• votre description du problème,</li>
          <li>• vos coordonnées,</li>
          <li>• l’adresse du lieu d’intervention,</li>
          <li>• vos disponibilités.</li>
        </ul>
        <p className="text-base leading-relaxed">
          {ARTISAN_PLACEHOLDER} vous recontactera pour confirmer la date
          d’intervention.
        </p>
      </div>,
      <PrimaryButton
        onClick={() => {
          setStep("welcome");
        }}
      >
        Fermer
      </PrimaryButton>
    );

  // --- MAIN SWITCH ---

  switch (step) {
    case "welcome":
      return renderWelcome();
    case "chat":
      return renderChat();
    case "contact":
      return renderContact();
    case "location":
      return renderLocation();
    case "availability":
      return renderAvailability();
    case "confirmation":
      return renderConfirmation();
    default:
      return renderWelcome();
  }
}

// --- PRESENTATIONAL COMPONENTS ---

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  error?: string;
  numeric?: boolean;
  maxLength?: number;
};

function Field({
  label,
  value,
  onChange,
  multiline,
  placeholder,
  error,
  numeric,
  maxLength,
}: FieldProps) {
  const baseClass =
    "w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 placeholder:text-zinc-400";
  const borderClass = error
    ? "border-red-500 focus:ring-red-500"
    : "border-zinc-300 focus:ring-black";

  if (multiline) {
    return (
      <div className="w-full">
        <label className="block text-xs font-medium mb-1">{label}</label>
        <textarea
          className={`${baseClass} ${borderClass} min-h-[60px]`}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
        {error && (
          <p className="mt-1 text-[11px] text-red-600 leading-tight">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full">
      <label className="block text-xs font-medium mb-1">{label}</label>
      <input
        className={`${baseClass} ${borderClass}`}
        value={value}
        placeholder={placeholder}
        inputMode={numeric ? "numeric" : "text"}
        onKeyDown={(e) => {
          if (numeric) {
            const allowedKeys = [
              "Backspace",
              "Tab",
              "ArrowLeft",
              "ArrowRight",
              "Delete",
            ];
            if (!/[0-9]/.test(e.key) && !allowedKeys.includes(e.key)) {
              e.preventDefault();
            }
          }
        }}
        onChange={(e) => {
          let v = e.target.value;
          if (numeric) {
            v = v.replace(/[^0-9]/g, ""); // chiffres uniquement
          }
          if (typeof maxLength === "number") {
            v = v.slice(0, maxLength); // coupe à maxLength
          }
          onChange(v);
        }}
      />
      {error && (
        <p className="mt-1 text-[11px] text-red-600 leading-tight">{error}</p>
      )}
    </div>
  );
}

type RadioProps = {
  label: string;
  checked: boolean;
  onChange: () => void;
};

function Radio({ label, checked, onChange }: RadioProps) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="cursor-pointer flex items-center gap-1 transition-colors duration-150 hover:text-blue-600"
    >
      <span
        className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors duration-150 ${
          checked ? "border-blue-600" : "border-zinc-400"
        } ${!checked ? "hover:border-blue-400" : ""}`}
      >
        {checked && <span className="w-2 h-2 rounded-full bg-blue-600" />}
      </span>
      <span>{label}</span>
    </button>
  );
}

type PrimaryButtonProps = {
  onClick: () => void;
  children: React.ReactNode;
};

function PrimaryButton({ onClick, children }: PrimaryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer w-full h-11 rounded-xl bg-black text-white text-base font-medium flex items-center justify-center transition-all duration-150 hover:bg-white hover:text-black hover:border hover:border-black"
    >
      {children}
    </button>
  );
}

type BackButtonProps = {
  onClick: () => void;
};

function BackButton({ onClick }: BackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer text-sm text-blue-600 flex items-center gap-1"
    >
      <span className="text-lg">‹</span>
      <span>Retour</span>
    </button>
  );
}

type HeaderProps = {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
};

function Header({ title, showBack, onBack }: HeaderProps) {
  return (
    <div className="flex items-center">
      <div className="w-[60px] flex justify-start">
        {showBack && onBack && <BackButton onClick={onBack} />}
      </div>
      <div className="flex-1 flex justify-center">
        <h1 className="text-xl font-semibold text-center">{title}</h1>
      </div>
      <div className="w-[60px]" />
    </div>
  );
}
