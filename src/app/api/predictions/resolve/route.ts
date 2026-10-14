/**
 * Trancher un marche.
 *
 * POURQUOI CETTE ROUTE DOIT EXISTER DES LE PREMIER JOUR
 * Un marche qui ne se tranche jamais immobilise les mises de tout le
 * monde. Ouvrir les paris sans prevoir leur reglement, c'est prendre
 * l'argent des membres - meme s'il s'agit de points - et ne jamais le
 * rendre.
 *
 * La repartition elle-meme est faite par hdlrz_resolve, dans la base :
 * elle paie des dizaines de comptes et met a jour les reserves, et ces
 * ecritures doivent reussir ou echouer ensemble. Un paiement a moitie
 * applique serait impossible a rattraper.
 *
 * Le droit de trancher est verifie DEUX fois : ici, et dans la fonction.
 * La seconde est celle qui compte - une route oubliee demain heritera
 * quand meme du controle.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecte." }, { status: 401 });

  const { data: compte } = await supabase
    .from("accounts")
    .select("is_admin")
    .eq("auth_id", user.id)
    .single();
  if (!compte?.is_admin) {
    return NextResponse.json({ error: "Reserve aux administrateurs." }, { status: 403 });
  }

  const { predictionId, outcome, note } = (await request.json()) as {
    predictionId?: string;
    outcome?: boolean;
    note?: string;
  };

  if (!predictionId || !UUID.test(predictionId)) {
    return NextResponse.json({ error: "Prediction invalide." }, { status: 400 });
  }
  if (typeof outcome !== "boolean") {
    return NextResponse.json({ error: "Resultat manquant." }, { status: 400 });
  }
  // La note est obligatoire : un reglement sans justification demande
  // aux membres de croire sur parole celui qui encaisse.
  const justification = (note ?? "").trim();
  if (justification.length < 10 || justification.length > 500) {
    return NextResponse.json(
      { error: "Expliquer la resolution en 10 a 500 caracteres." },
      { status: 400 },
    );
  }

  const { error } = await supabase.rpc("hdlrz_resolve", {
    pred: predictionId,
    resultat: outcome,
    note: justification,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
