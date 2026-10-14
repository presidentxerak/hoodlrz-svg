/**
 * Le feed : lire les posts, en publier un.
 *
 * Un post peut porter une PREDICTION, c'est-a-dire une question binaire
 * sur laquelle les membres prennent position en Hdlrz. La question vit
 * dans sa propre table ; le corps du post sert d'argumentaire.
 *
 * Contrairement aux groupes, rien n'est chiffre ici : un post s'adresse
 * a tout le reseau, et le chiffrer pour quelques milliers de membres
 * dont chacun peut recopier le texte ne protegerait rien tout en
 * interdisant la recherche et la moderation.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { limiter } from "@/lib/security/ratelimit";

export const dynamic = "force-dynamic";

/** Une prediction doit laisser le temps de prendre position, et ne pas
 *  s'etendre au point que plus personne ne s'en souvienne. */
const FENETRE_MIN_MS = 10 * 60 * 1000;
const FENETRE_MAX_MS = 365 * 24 * 60 * 60 * 1000;

async function moi() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("accounts")
    .select("id, is_holder, hdlrz")
    .eq("auth_id", user.id)
    .single();
  return data?.is_holder ? { supabase, id: data.id, hdlrz: data.hdlrz } : null;
}

export async function GET(request: NextRequest) {
  const session = await moi();
  if (!session) return NextResponse.json({ error: "Reserve aux detenteurs." }, { status: 403 });

  const avant = request.nextUrl.searchParams.get("avant");

  let requete = session.supabase
    .from("posts")
    .select(
      `id, body, created_at, author_id,
       author:accounts!posts_author_id_fkey(pseudonym, avatar_image),
       prediction:predictions(id, question, category, closes_at, status,
                              outcome, pool_yes, pool_no)`,
    )
    .order("created_at", { ascending: false })
    .limit(30);

  if (avant) requete = requete.lt("created_at", avant);

  const { data, error } = await requete;
  if (error) {
    return NextResponse.json({ error: "Feed indisponible." }, { status: 500 });
  }

  // Les positions du lecteur, pour que chaque carte sache si elle est
  // deja engagee. Une requete, pas une par carte.
  const ids = (data ?? [])
    .map((p) => (Array.isArray(p.prediction) ? p.prediction[0]?.id : p.prediction?.id))
    .filter((v): v is string => Boolean(v));

  let miennes: { prediction_id: string; side: boolean; amount: number }[] = [];
  if (ids.length) {
    const { data: s } = await session.supabase
      .from("prediction_stakes")
      .select("prediction_id, side, amount")
      .eq("account_id", session.id)
      .in("prediction_id", ids);
    miennes = s ?? [];
  }

  return NextResponse.json({
    posts: data ?? [],
    stakes: miennes,
    hdlrz: session.hdlrz,
    accountId: session.id,
  });
}

export async function POST(request: NextRequest) {
  const session = await moi();
  if (!session) return NextResponse.json({ error: "Reserve aux detenteurs." }, { status: 403 });

  const trop = limiter(request, {
    nom: "feed-post",
    par: 20,
    fenetre: 600,
    identite: session.id,
  });
  if (trop) return trop;

  const { body, prediction } = (await request.json()) as {
    body?: string;
    prediction?: { question?: string; category?: string; closesAt?: string };
  };

  const texte = (body ?? "").trim();
  if (!texte || texte.length > 2000) {
    return NextResponse.json({ error: "Post vide ou trop long." }, { status: 400 });
  }

  let predictionId: string | null = null;

  if (prediction) {
    const question = (prediction.question ?? "").trim();
    const categorie = prediction.category ?? "crypto";
    const ferme = new Date(prediction.closesAt ?? "");

    if (question.length < 8 || question.length > 240) {
      return NextResponse.json({ error: "Question trop courte ou trop longue." }, { status: 400 });
    }
    if (!["crypto", "nft", "memecoin"].includes(categorie)) {
      return NextResponse.json({ error: "Categorie inconnue." }, { status: 400 });
    }
    const delai = ferme.getTime() - Date.now();
    if (!Number.isFinite(delai) || delai < FENETRE_MIN_MS || delai > FENETRE_MAX_MS) {
      return NextResponse.json(
        { error: "La fermeture doit tomber entre 10 minutes et un an." },
        { status: 400 },
      );
    }

    const { data, error } = await session.supabase
      .from("predictions")
      .insert({
        author_id: session.id,
        question,
        category: categorie as "crypto" | "nft" | "memecoin",
        closes_at: ferme.toISOString(),
      })
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Prediction refusee." }, { status: 500 });
    }
    predictionId = data.id;
  }

  const { data, error } = await session.supabase
    .from("posts")
    .insert({ author_id: session.id, body: texte, prediction_id: predictionId })
    .select("id")
    .single();

  if (error || !data) {
    // La prediction existe deja : sans post pour la porter, elle serait
    // invisible et increvable. On la retire.
    if (predictionId) {
      await session.supabase.from("predictions").delete().eq("id", predictionId);
    }
    return NextResponse.json({ error: "Publication refusee." }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, predictionId });
}
