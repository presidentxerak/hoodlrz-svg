/**
 * Les conversations du membre connecte.
 *
 * GET   liste ses conversations, avec la cle de groupe scellee pour lui.
 * POST  cree une conversation et y scelle la cle pour chaque membre.
 *
 * Le serveur ne fabrique AUCUNE cle. Le client tire la cle du groupe, la
 * scelle lui-meme pour chaque destinataire a partir des cles publiques de
 * l'annuaire, et n'envoie ici que des conteneurs scelles. Si cette route
 * fabriquait la cle, elle la connaitrait - et le chiffrement de bout en
 * bout ne serait qu'une etiquette.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { limiter } from "@/lib/security/ratelimit";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";

/** Un sceau bien forme : trois champs hexadecimaux, rien d'autre. Le
 *  serveur ne peut pas verifier qu'un sceau s'ouvre - c'est le principe -
 *  mais il peut refuser ce qui n'a meme pas la forme d'un sceau. */
function sceauValide(v: unknown): boolean {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  const champs = ["e", "iv", "c"];
  if (Object.keys(s).length !== champs.length) return false;
  return champs.every(
    (k) => typeof s[k] === "string" && /^[0-9a-f]{2,4096}$/.test(s[k] as string),
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

export async function GET() {
  const session = await moi();
  if (!session) return NextResponse.json({ error: "Reserve aux detenteurs." }, { status: 403 });

  // Une seule requete : les conversations passent par l'appartenance, et
  // la cle scellee du membre voyage avec. Sans elle, le client devrait
  // rappeler le serveur une fois par conversation avant d'afficher quoi
  // que ce soit.
  const { data, error } = await session.supabase
    .from("conversation_members")
    .select(
      "key_sealed, role, conversation:conversations(id, kind, title_enc, last_at, created_at)",
    )
    .eq("account_id", session.id)
    .order("joined_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: "Lecture refusee." }, { status: 500 });

  // Une jointure imbriquee peut remonter un objet ou un tableau d'un
  // element selon la relation ; on normalise plutot que de parier.
  const conversations = (data ?? [])
    .map((l) => {
      const c = Array.isArray(l.conversation) ? l.conversation[0] : l.conversation;
      return c ? { ...c, keySealed: l.key_sealed, role: l.role } : null;
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => String(b.last_at).localeCompare(String(a.last_at)));

  return NextResponse.json({ conversations });
}

export async function POST(request: NextRequest) {
  const session = await moi();
  if (!session) return NextResponse.json({ error: "Reserve aux detenteurs." }, { status: 403 });

  const trop = limiter(request, {
    nom: "conversation-create",
    par: 20,
    fenetre: 3600,
    identite: session.id,
  });
  if (trop) return trop;

  const { kind, titleEnc, members } = (await request.json()) as {
    kind?: string;
    titleEnc?: unknown;
    members?: { accountId: string; keySealed: unknown }[];
  };

  if (kind !== "group" && kind !== "direct") {
    return NextResponse.json({ error: "Type de conversation inconnu." }, { status: 400 });
  }
  if (!Array.isArray(members) || members.length === 0 || members.length > 100) {
    return NextResponse.json({ error: "Liste de membres invalide." }, { status: 400 });
  }
  if (!members.every((m) => typeof m.accountId === "string" && sceauValide(m.keySealed))) {
    return NextResponse.json({ error: "Cle scellee invalide." }, { status: 400 });
  }
  // Le createur doit se sceller la cle a lui-meme, sinon il cree un
  // groupe qu'il ne peut pas lire - erreur silencieuse et irreversible.
  if (!members.some((m) => m.accountId === session.id)) {
    return NextResponse.json(
      { error: "Le createur doit figurer parmi les membres." },
      { status: 400 },
    );
  }

  const { data: conv, error: erreurConv } = await session.supabase
    .from("conversations")
    .insert({
      kind,
      title_enc: (titleEnc as Json) ?? null,
      created_by: session.id,
    })
    .select("id")
    .single();

  if (erreurConv || !conv) {
    return NextResponse.json({ error: "Creation refusee." }, { status: 500 });
  }

  const { error: erreurMembres } = await session.supabase.from("conversation_members").insert(
    members.map((m) => ({
      conversation_id: conv.id,
      account_id: m.accountId,
      key_sealed: m.keySealed as Json,
      role: (m.accountId === session.id ? "owner" : "member") as "owner" | "member",
    })),
  );

  if (erreurMembres) {
    // Une conversation sans membre est invisible et inutilisable : on la
    // retire plutot que de laisser une ligne orpheline derriere soi.
    await session.supabase.from("conversations").delete().eq("id", conv.id);
    return NextResponse.json({ error: "Ajout des membres refuse." }, { status: 500 });
  }

  return NextResponse.json({ id: conv.id });
}
