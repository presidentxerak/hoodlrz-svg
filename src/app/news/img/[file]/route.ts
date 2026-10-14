/**
 * L'illustration d'un article, servie en SVG.
 *
 * Elle est stockee avec l'article plutot que recalculee a chaque
 * requete : la generation est deterministe, donc le resultat serait
 * identique, mais le recalcul couterait un hachage et une boucle de
 * plusieurs centaines de rectangles par visite.
 *
 * L'en-tete de cache est long et immuable : une illustration ne change
 * jamais pour un article donne. C'est ce qui permet de la servir depuis
 * le cache de bordure sans jamais revenir jusqu'ici.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Le nom de fichier est borne : il entre dans une requete, et un champ
 *  libre ici serait une invitation a essayer autre chose. */
const NOM = /^[a-z0-9-]{1,120}\.svg$/;

export async function GET(_request: Request, { params }: { params: { file: string } }) {
  if (!NOM.test(params.file)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const slug = params.file.replace(/\.svg$/, "");
  const supabase = createClient();
  const { data } = await supabase
    .from("news_articles")
    .select("illustration")
    .eq("slug", slug)
    .maybeSingle();

  if (!data?.illustration) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(data.illustration, {
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
