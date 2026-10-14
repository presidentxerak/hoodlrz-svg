/**
 * L'illustration d'un lien, calculee a la demande.
 *
 * ELLE N'EST PAS STOCKEE. La generation est deterministe : le meme titre
 * redonne exactement la meme image, aujourd'hui comme dans six mois. La
 * garder en base ajouterait 26 Ko par ligne pour un resultat qu'on sait
 * reproduire en quelques millisecondes - et qui, avec l'en-tete de cache
 * ci-dessous, n'est recalcule qu'une fois par lien.
 *
 * L'en-tete de cache est long et immuable pour cette raison exactement :
 * une illustration ne change jamais pour un lien donne, donc le reseau de
 * diffusion la sert sans jamais revenir jusqu'ici.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { illustrer } from "@/lib/news/illustration";

/** Un identifiant, et rien d'autre : ce champ entre dans une requete. */
const NOM = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.svg$/i;

export async function GET(_request: Request, { params }: { params: { file: string } }) {
  if (!NOM.test(params.file)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const id = params.file.replace(/\.svg$/i, "");
  const supabase = createClient();
  const { data } = await supabase
    .from("news_links")
    .select("title, category")
    .eq("id", id)
    .maybeSingle();

  if (!data) return new NextResponse("Not found", { status: 404 });

  const { svg } = illustrer(data.title, data.category);

  return new NextResponse(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=31536000, immutable",
      // Un SVG est un document : servi sans cette precaution, un SVG
      // hostile s'executerait dans le contexte du site. Le notre est
      // genere par nous, mais l'en-tete coute zero et survivra a un
      // changement de source.
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
