/**
 * Relire la chaine pour le membre connecte.
 *
 * POURQUOI CETTE ROUTE EXISTE
 * Le verdict de detention est inscrit sur le compte a la connexion. Un
 * membre qui achete sa premiere piece juste apres s'etre connecte serait
 * donc refuse jusqu'a sa prochaine session, ce qui est exactement le
 * moment ou il faut l'accueillir. Cette route relit la chaine a la
 * demande et met le compte a jour.
 *
 * GET  renvoie le verdict en cache, sans toucher a la chaine.
 * POST force une relecture.
 *
 * L'adresse interrogee n'est jamais celle que le client envoie : elle est
 * lue sur le compte de la session. Sinon n'importe qui demanderait
 * l'ouverture de la porte au nom d'un wallet qui n'est pas le sien.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifierDetention, FRAICHEUR_SECONDES } from "@/lib/security/gate";
import { limiter } from "@/lib/security/ratelimit";

export const dynamic = "force-dynamic";

async function compte() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("accounts")
    .select("auth_id, wallet_address, is_holder, holder_checked_at, holdings, pseudonym")
    .eq("auth_id", user.id)
    .single();
  // La colonne auth_id est nullable dans le schema ; ici elle vaut
  // forcement l'identifiant de la session, mais le typage ne le sait pas.
  // On renvoie celui de la session plutot que de forcer le type.
  return data ? { ...data, auth_id: user.id } : null;
}

export async function GET() {
  const c = await compte();
  if (!c) return NextResponse.json({ error: "Non connecte." }, { status: 401 });

  const age = c.holder_checked_at
    ? (Date.now() - new Date(c.holder_checked_at).getTime()) / 1000
    : Infinity;

  return NextResponse.json({
    holder: Boolean(c.is_holder),
    holdings: c.holdings ?? {},
    pseudonym: c.pseudonym,
    stale: age > FRAICHEUR_SECONDES,
  });
}

export async function POST(request: NextRequest) {
  const c = await compte();
  if (!c) return NextResponse.json({ error: "Non connecte." }, { status: 401 });

  // Une relecture coute deux appels RPC : on la borne par compte, pas par
  // adresse IP, pour qu'un membre derriere un reseau partage ne soit pas
  // bloque par ses voisins.
  const trop = limiter(request, {
    nom: "holder-refresh",
    par: 6,
    fenetre: 60,
    identite: c.auth_id,
  });
  if (trop) return trop;

  if (!c.wallet_address) {
    return NextResponse.json(
      { error: "Ce compte n'est pas rattache a un wallet.", holder: false },
      { status: 400 },
    );
  }

  const verdict = await verifierDetention(c.wallet_address);

  // L'ecriture passe par le client administrateur : les politiques RLS
  // interdisent au membre de modifier son propre statut de detenteur, ce
  // qui est precisement le but.
  await createAdminClient()
    .from("accounts")
    .update({
      is_holder: verdict.detenteur,
      holder_checked_at: verdict.verifieA,
      holdings: verdict.pieces,
    })
    .eq("auth_id", c.auth_id);

  return NextResponse.json({
    holder: verdict.detenteur,
    holdings: verdict.pieces,
    partial: verdict.partiel,
  });
}
