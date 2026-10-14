/**
 * Les Hdlrz : solde, don quotidien, et prise de position.
 *
 * GET              solde et journal recent.
 * POST { daily }   reclame le don du jour.
 * POST { stake }   mise sur une prediction.
 *
 * Aucun de ces mouvements n'est calcule ici. Tout passe par des
 * fonctions de la base, qui s'executent d'un bloc : debiter un solde
 * puis inserer une mise depuis deux requetes separees laisse une fenetre
 * ou deux onglets lisent le meme solde et depensent deux fois. Cette
 * route valide les entrees et transmet, rien de plus.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { limiter } from "@/lib/security/ratelimit";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function moi() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("accounts")
    .select("id, is_holder, hdlrz, hdlrz_claimed_on")
    .eq("auth_id", user.id)
    .single();
  return data?.is_holder ? { supabase, ...data } : null;
}

export async function GET() {
  const session = await moi();
  if (!session) return NextResponse.json({ error: "Reserve aux detenteurs." }, { status: 403 });

  const { data: journal } = await session.supabase
    .from("hdlrz_ledger")
    .select("delta, reason, created_at")
    .eq("account_id", session.id)
    .order("created_at", { ascending: false })
    .limit(30);

  // La comparaison se fait sur la date, comme dans la fonction : « une
  // fois par jour » doit vouloir dire la meme chose des deux cotes.
  const aujourdhui = new Date().toISOString().slice(0, 10);

  return NextResponse.json({
    hdlrz: session.hdlrz,
    dailyAvailable: session.hdlrz_claimed_on !== aujourdhui,
    ledger: journal ?? [],
  });
}

export async function POST(request: NextRequest) {
  const session = await moi();
  if (!session) return NextResponse.json({ error: "Reserve aux detenteurs." }, { status: 403 });

  const corps = (await request.json()) as {
    action?: string;
    predictionId?: string;
    side?: boolean;
    amount?: number;
  };

  if (corps.action === "daily") {
    const trop = limiter(request, { nom: "hdlrz-daily", par: 5, fenetre: 60, identite: session.id });
    if (trop) return trop;

    const { data, error } = await session.supabase.rpc("hdlrz_daily");
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ hdlrz: data });
  }

  if (corps.action === "stake") {
    const trop = limiter(request, { nom: "hdlrz-stake", par: 30, fenetre: 60, identite: session.id });
    if (trop) return trop;

    if (!corps.predictionId || !UUID.test(corps.predictionId)) {
      return NextResponse.json({ error: "Prediction invalide." }, { status: 400 });
    }
    if (typeof corps.side !== "boolean") {
      return NextResponse.json({ error: "Choisir Yes ou No." }, { status: 400 });
    }
    const montant = Number(corps.amount);
    if (!Number.isInteger(montant) || montant < 10 || montant > 1_000_000) {
      return NextResponse.json({ error: "Mise entre 10 et 1 000 000 Hdlrz." }, { status: 400 });
    }

    const { data, error } = await session.supabase.rpc("hdlrz_stake", {
      pred: corps.predictionId,
      cote: corps.side,
      montant,
    });
    // Les messages viennent des `raise exception` de la fonction : ils
    // sont ecrits pour etre lus par un membre, pas par un journal.
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ hdlrz: data });
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}
