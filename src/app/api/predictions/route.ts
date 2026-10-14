/**
 * Les marches, pour la page Market.
 *
 * Trois volets, une seule lecture : ouverts, en attente de resolution,
 * et tranches. Les separer en trois requetes multiplierait les
 * aller-retours pour afficher un ecran qui tient en une page.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecte." }, { status: 401 });

  const { data: compte } = await supabase
    .from("accounts")
    .select("id, is_holder, hdlrz")
    .eq("auth_id", user.id)
    .single();
  if (!compte?.is_holder) {
    return NextResponse.json({ error: "Reserve aux detenteurs." }, { status: 403 });
  }

  const categorie = request.nextUrl.searchParams.get("categorie");

  let requete = supabase
    .from("predictions")
    .select(
      "id, question, category, closes_at, status, outcome, pool_yes, pool_no, created_at",
    )
    .order("closes_at", { ascending: true })
    .limit(100);

  if (categorie && ["crypto", "nft", "memecoin"].includes(categorie)) {
    requete = requete.eq("category", categorie as "crypto" | "nft" | "memecoin");
  }

  const { data, error } = await requete;
  if (error) return NextResponse.json({ error: "Marches indisponibles." }, { status: 500 });

  const maintenant = Date.now();
  const tous = data ?? [];

  const { data: miennes } = await supabase
    .from("prediction_stakes")
    .select("prediction_id, side, amount")
    .eq("account_id", compte.id);

  return NextResponse.json({
    hdlrz: compte.hdlrz,
    stakes: miennes ?? [],
    // Un marche dont l'echeance est passee mais que personne n'a tranche
    // est « en attente » : le dire evite qu'on le croie oublie.
    ouverts: tous.filter(
      (p) => p.status === "open" && new Date(p.closes_at).getTime() > maintenant,
    ),
    attente: tous.filter(
      (p) =>
        (p.status === "open" && new Date(p.closes_at).getTime() <= maintenant) ||
        p.status === "closed",
    ),
    tranches: tous.filter((p) => p.status === "resolved" || p.status === "void"),
  });
}
