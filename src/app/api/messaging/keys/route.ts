/**
 * Publier sa cle publique de chiffrement, et lire celles des autres.
 *
 * POST  enregistre la cle publique du membre connecte.
 * GET   renvoie l'annuaire : pseudonyme et cle publique, rien de plus.
 *
 * L'annuaire passe par la vue member_directory et non par la table des
 * comptes : une politique RLS filtre des lignes, pas des colonnes, et
 * ouvrir la ligne ouvrirait aussi l'adresse du wallet. Sur un reseau
 * anonyme, c'est la seule chose a ne jamais laisser sortir.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { limiter } from "@/lib/security/ratelimit";

export const dynamic = "force-dynamic";

/** 32 octets en hexadecimal : la taille exacte d'une cle publique X25519.
 *  Refuser tout le reste evite qu'un champ texte libre serve a stocker
 *  autre chose dans une colonne lue par tous les membres. */
const CLE_VALIDE = /^[0-9a-f]{64}$/;

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

  const { data, error } = await session.supabase
    .from("member_directory")
    .select("id, pseudonym, e2e_public_key")
    .limit(500);

  if (error) return NextResponse.json({ error: "Annuaire indisponible." }, { status: 500 });
  return NextResponse.json({ members: data ?? [] });
}

export async function POST(request: NextRequest) {
  const session = await moi();
  if (!session) return NextResponse.json({ error: "Reserve aux detenteurs." }, { status: 403 });

  const trop = limiter(request, {
    nom: "e2e-key",
    par: 5,
    fenetre: 300,
    identite: session.id,
  });
  if (trop) return trop;

  const { publicKey } = (await request.json()) as { publicKey?: string };
  if (!publicKey || !CLE_VALIDE.test(publicKey)) {
    return NextResponse.json({ error: "Cle publique invalide." }, { status: 400 });
  }

  const { error } = await session.supabase
    .from("accounts")
    .update({ e2e_public_key: publicKey, e2e_key_set_at: new Date().toISOString() })
    .eq("id", session.id);

  if (error) return NextResponse.json({ error: "Enregistrement refuse." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
