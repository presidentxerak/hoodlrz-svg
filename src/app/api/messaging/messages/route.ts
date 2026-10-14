/**
 * Lire et ecrire les messages d'une conversation.
 *
 * Tout ce qui transite ici est chiffre. Le serveur ne sait pas ce qu'il
 * stocke, ne peut pas le modifier sans que le destinataire le voie, et
 * l'appartenance a la conversation est verifiee par les politiques de la
 * base - pas seulement par ce fichier. Les deux comptent : une route
 * oubliee demain heritera quand meme de la politique.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { limiter } from "@/lib/security/ratelimit";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";

/** Plafond de taille du chiffre, en caracteres hexadecimaux. 64 Kio de
 *  texte clair : largement au-dela d'un message, assez bas pour qu'on ne
 *  se serve pas de la table comme d'un hebergement de fichiers. */
const MAX_HEX = 131_072;

function corpsValide(v: unknown): boolean {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  if (Object.keys(s).length !== 2) return false;
  return (
    typeof s.iv === "string" &&
    /^[0-9a-f]{24}$/.test(s.iv) &&
    typeof s.c === "string" &&
    /^[0-9a-f]+$/.test(s.c) &&
    s.c.length <= MAX_HEX
  );
}

async function moi() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("accounts")
    .select("id, is_holder")
    .eq("auth_id", user.id)
    .single();
  return data?.is_holder ? { supabase, id: data.id } : null;
}

export async function GET(request: NextRequest) {
  const session = await moi();
  if (!session) return NextResponse.json({ error: "Reserve aux detenteurs." }, { status: 403 });

  const conversationId = request.nextUrl.searchParams.get("conversation");
  if (!conversationId) {
    return NextResponse.json({ error: "Conversation manquante." }, { status: 400 });
  }

  // `avant` pagine vers le passe : un fil se lit du plus recent vers le
  // plus ancien, et un decalage numerique se decale a chaque message
  // recu pendant la lecture.
  const avant = request.nextUrl.searchParams.get("avant");

  let requete = session.supabase
    .from("messages")
    .select("id, author_id, body_enc, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (avant) requete = requete.lt("created_at", avant);

  const { data, error } = await requete;
  if (error) return NextResponse.json({ error: "Lecture refusee." }, { status: 500 });

  return NextResponse.json({ messages: (data ?? []).reverse() });
}

export async function POST(request: NextRequest) {
  const session = await moi();
  if (!session) return NextResponse.json({ error: "Reserve aux detenteurs." }, { status: 403 });

  const trop = limiter(request, {
    nom: "message-send",
    par: 60,
    fenetre: 60,
    identite: session.id,
  });
  if (trop) return trop;

  const { conversationId, bodyEnc } = (await request.json()) as {
    conversationId?: string;
    bodyEnc?: unknown;
  };

  if (!conversationId || typeof conversationId !== "string") {
    return NextResponse.json({ error: "Conversation manquante." }, { status: 400 });
  }
  if (!corpsValide(bodyEnc)) {
    return NextResponse.json({ error: "Message chiffre invalide." }, { status: 400 });
  }

  const { data, error } = await session.supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      author_id: session.id,
      body_enc: bodyEnc as Json,
    })
    .select("id, created_at")
    .single();

  // Un refus vient presque toujours de la politique : l'auteur n'est pas
  // membre. On ne distingue pas « conversation inexistante » de « vous
  // n'y etes pas » : la difference renseignerait sur l'existence de
  // conversations auxquelles on n'appartient pas.
  if (error || !data) {
    return NextResponse.json({ error: "Envoi refuse." }, { status: 403 });
  }

  // Remonte la conversation dans la liste. Un echec ici est sans gravite:
  // le message est deja ecrit, seul l'ordre d'affichage en patit.
  await session.supabase
    .from("conversations")
    .update({ last_at: data.created_at })
    .eq("id", conversationId);

  return NextResponse.json({ id: data.id, createdAt: data.created_at });
}
