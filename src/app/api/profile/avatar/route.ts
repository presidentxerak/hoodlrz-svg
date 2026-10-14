/**
 * Choisir sa photo de profil parmi ses pieces.
 *
 * GET   liste les pieces reellement detenues, lues sur la chaine.
 * POST  pose l'une d'elles comme avatar, apres l'avoir reverifiee.
 *
 * LA REVERIFICATION N'EST PAS UNE FORMALITE. Le client envoie un contrat
 * et un numero ; sans la relire sur la chaine, n'importe qui se donnerait
 * la piece la plus rare de la collection comme photo. Et l'URL de l'image
 * n'est jamais celle que le client propose : elle est RECALCULEE a partir
 * du contrat et du numero, sinon l'avatar devient un moyen d'afficher
 * l'image de son choix sur le profil - y compris celle d'un domaine
 * tiers, qui saurait alors qui regarde.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { limiter } from "@/lib/security/ratelimit";
import { piecesDe, detientPiece, imageDe } from "@/lib/security/pieces";

export const dynamic = "force-dynamic";
// La lecture des pieces peut demander plusieurs dizaines d'appels RPC.
export const maxDuration = 60;

async function moi() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("accounts")
    .select("id, is_holder, wallet_address, avatar_contract, avatar_token_id, avatar_image")
    .eq("auth_id", user.id)
    .single();
  return data?.is_holder ? data : null;
}

export async function GET(request: NextRequest) {
  const c = await moi();
  if (!c) return NextResponse.json({ error: "Reserve aux detenteurs." }, { status: 403 });
  if (!c.wallet_address) {
    return NextResponse.json({ error: "Ce compte n'est pas rattache a un wallet." }, { status: 400 });
  }

  const trop = limiter(request, { nom: "avatar-list", par: 10, fenetre: 120, identite: c.id });
  if (trop) return trop;

  const pieces = await piecesDe(c.wallet_address);

  return NextResponse.json({
    pieces,
    actuel:
      c.avatar_contract && c.avatar_token_id !== null
        ? { contract: c.avatar_contract, tokenId: c.avatar_token_id, image: c.avatar_image }
        : null,
  });
}

export async function POST(request: NextRequest) {
  const c = await moi();
  if (!c) return NextResponse.json({ error: "Reserve aux detenteurs." }, { status: 403 });
  if (!c.wallet_address) {
    return NextResponse.json({ error: "Ce compte n'est pas rattache a un wallet." }, { status: 400 });
  }

  const trop = limiter(request, { nom: "avatar-set", par: 20, fenetre: 300, identite: c.id });
  if (trop) return trop;

  const { contract, tokenId, image } = (await request.json()) as {
    contract?: string;
    tokenId?: number;
    image?: string;
  };

  if (!contract || !/^0x[a-fA-F0-9]{40}$/.test(contract)) {
    return NextResponse.json({ error: "Contrat invalide." }, { status: 400 });
  }
  if (!Number.isInteger(tokenId) || tokenId! < 0 || tokenId! > 1_000_000) {
    return NextResponse.json({ error: "Numero de piece invalide." }, { status: 400 });
  }

  const possede = await detientPiece(c.wallet_address, contract, tokenId!);
  if (!possede) {
    return NextResponse.json(
      { error: "Cette piece n'est pas detenue par ce wallet." },
      { status: 403 },
    );
  }

  // L'URL est recalculee quand on sait la fabriquer. Pour OG Hoodlrz elle
  // vient d'Alchemy, donc du client : on ne la garde qu'apres avoir
  // verifie qu'elle pointe vers un hote connu, et que la piece est bien
  // detenue - ce qui vient d'etre fait.
  const HOTES = ["nft-cdn.alchemy.com", "i.seadn.io", "openseauserdata.com", "www.hoodlrz.com"];
  let url = imageDe(contract, tokenId!);
  if (!url && typeof image === "string") {
    try {
      const u = new URL(image);
      if (u.protocol === "https:" && HOTES.includes(u.hostname)) url = u.toString();
    } catch {
      /* URL illisible : on laisse vide */
    }
  }
  if (!url) {
    return NextResponse.json({ error: "Image indisponible pour cette piece." }, { status: 400 });
  }

  const { error } = await createAdminClient()
    .from("accounts")
    .update({
      avatar_contract: contract.toLowerCase(),
      avatar_token_id: tokenId!,
      avatar_image: url,
      avatar_checked_at: new Date().toISOString(),
    })
    .eq("id", c.id);

  if (error) return NextResponse.json({ error: "Enregistrement refuse." }, { status: 500 });
  return NextResponse.json({ ok: true, image: url });
}
