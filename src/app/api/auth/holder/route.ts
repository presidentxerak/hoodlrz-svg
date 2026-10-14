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
import {
  colonneManquante,
  signalerSchemaComplet,
  signalerSchemaIncomplet,
} from "@/lib/security/schema";

export const dynamic = "force-dynamic";

async function compte() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("accounts")
    .select(
      "id, auth_id, wallet_address, is_holder, holder_checked_at, holdings, pseudonym, avatar_image",
    )
    .eq("auth_id", user.id)
    .single();

  if (data) {
    signalerSchemaComplet();
    // La colonne auth_id est nullable dans le schema ; ici elle vaut
    // forcement l'identifiant de la session, mais le typage ne le sait
    // pas. On renvoie celui de la session plutot que de forcer le type.
    return { ...data, auth_id: user.id, schemaOk: true };
  }

  /**
   * Repli quand les migrations du reseau prive ne sont pas passees.
   *
   * Sans ce repli, la requete ci-dessus echoue sur « column
   * wallet_address does not exist », cette route rend 401, et TOUTE
   * l'application se comporte comme si personne n'etait connecte - y
   * compris apres une signature de wallet reussie. L'utilisateur voit
   * une page qui ne repond pas, sans un mot d'explication.
   */
  if (!colonneManquante(error)) return null;
  signalerSchemaIncomplet();

  const { data: minimal } = await supabase
    .from("accounts")
    .select("id, pseudonym")
    .eq("auth_id", user.id)
    .single();
  if (!minimal) return null;

  return {
    id: minimal.id,
    auth_id: user.id,
    pseudonym: minimal.pseudonym,
    wallet_address: null,
    is_holder: false,
    holder_checked_at: null,
    holdings: {},
    avatar_image: null,
    schemaOk: false,
  };
}

export async function GET() {
  const c = await compte();
  if (!c) return NextResponse.json({ error: "Non connecte." }, { status: 401 });

  const age = c.holder_checked_at
    ? (Date.now() - new Date(c.holder_checked_at).getTime()) / 1000
    : Infinity;

  return NextResponse.json({
    // L'identifiant de compte sert de donnee associee au chiffrement des
    // messages : un message est lie a son auteur et ne se dechiffre pas
    // ailleurs. Il n'est renvoye qu'a son proprietaire.
    accountId: c.id,
    holder: Boolean(c.is_holder),
    holdings: c.holdings ?? {},
    pseudonym: c.pseudonym,
    avatar: c.avatar_image,
    stale: age > FRAICHEUR_SECONDES,
    schema: c.schemaOk ? "ok" : "incomplet",
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

  if (!c.schemaOk) {
    return NextResponse.json(
      {
        error:
          "La base n'a pas encore les colonnes du reseau prive. Migrations 008 a 012 a passer.",
        holder: false,
        schema: "incomplet",
      },
      { status: 503 },
    );
  }

  if (!c.wallet_address) {
    return NextResponse.json(
      { error: "Ce compte n'est pas rattache a un wallet.", holder: false },
      { status: 400 },
    );
  }

  const verdict = await verifierDetention(c.wallet_address);

  // Un « non » rendu alors qu'une source n'a pas repondu n'est pas
  // inscrit : il degraderait un detenteur sur un hoquet de fournisseur.
  // On rend alors l'ancien statut, qui lui a ete verifie.
  if (!verdict.fiable) {
    return NextResponse.json({
      holder: Boolean(c.is_holder),
      holdings: c.holdings ?? {},
      partial: true,
      reliable: false,
      details: verdict.details,
      error: "Une des chaines n'a pas repondu. Statut inchange, reessayez.",
    });
  }

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
    reliable: true,
    // Renvoye au proprietaire du compte seulement, et sans cle : c'est
    // ce qui permet de voir d'un coup d'oeil quel contrat a ete lu, sur
    // quelle chaine, et ce qu'il a repondu.
    details: verdict.details,
  });
}
