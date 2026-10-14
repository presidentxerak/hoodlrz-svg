/**
 * Les cours, pour la page Market.
 *
 * Le navigateur ne peut pas appeler la source directement : la politique
 * de contenu du site n'autorise les appels sortants que vers nos propres
 * domaines. Cette route fait donc l'intermediaire, et la reponse mise en
 * cache sert tous les visiteurs plutot qu'un appel par onglet ouvert.
 *
 * ELLE EST OUVERTE, et c'est voulu : un cours du bitcoin n'est pas une
 * donnee privee, et le Market est aussi lu depuis la page d'accueil. Le
 * cache de cinq minutes et la liste fermee de paires suffisent a ce que
 * la route ne soit pas un relais utile pour autre chose.
 */

import { NextResponse, type NextRequest } from "next/server";
import { lireTous, FENETRES, type Fenetre } from "@/lib/market/cours";

export const revalidate = 300;

export async function GET(request: NextRequest) {
  const demandee = request.nextUrl.searchParams.get("fenetre");
  const fenetre: Fenetre =
    demandee && demandee in FENETRES ? (demandee as Fenetre) : "7j";

  const cours = await lireTous(fenetre);

  if (cours.length === 0) {
    // Rien n'est invente : l'interface dira que le cours est
    // indisponible. Un graphique simule se lit comme une information.
    return NextResponse.json(
      { error: "Cours indisponibles.", fenetre, cours: [] },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }

  return NextResponse.json(
    { fenetre, cours },
    {
      headers: {
        // Le cache partage garde cinq minutes et peut servir une version
        // un peu ancienne pendant qu'il rafraichit : un cours de cinq
        // minutes vaut mieux qu'une page qui attend.
        "cache-control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
