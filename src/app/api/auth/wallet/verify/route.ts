import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { limiter } from "@/lib/security/ratelimit";
import { verifierDetention } from "@/lib/security/gate";
import { nouveauPseudonyme } from "@/lib/app/pseudonym";
import {
  colonneManquante,
  signalerSchemaComplet,
  signalerSchemaIncomplet,
} from "@/lib/security/schema";

export async function POST(request: NextRequest) {
  try {
    // Une signature se force par rejeu : dix tentatives par minute et par
    // appelant suffisent largement a un humain, et rendent le balayage
    // d'adresses sans interet.
    const trop = limiter(request, { nom: "wallet-verify", par: 10, fenetre: 60 });
    if (trop) return trop;

    const { address, signature, nonce } = (await request.json()) as {
      address?: string;
      signature?: string;
      nonce?: string;
    };

    if (!address || !signature || !nonce) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: "Invalid address." }, { status: 400 });
    }

    const admin = createAdminClient();
    const addrLower = address.toLowerCase();

    // ── 1. Validate nonce (server-side, single-use) ──
    const { data: nonceRecord } = await admin
      .from("wallet_nonces")
      .select("*")
      .eq("nonce", nonce)
      .eq("address", addrLower)
      .is("used_at", null)
      .single();

    if (!nonceRecord) {
      return NextResponse.json({ error: "Invalid or expired nonce." }, { status: 400 });
    }

    if (new Date(nonceRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: "Nonce expired. Please try again." }, { status: 400 });
    }

    // Mark nonce as used immediately (prevents replay)
    await admin.from("wallet_nonces").update({ used_at: new Date().toISOString() }).eq("nonce", nonce);

    // ── 2. Verify signature ──
    const { verifyMessage } = await import("ethers");
    const expectedMessage = `Welcome to Hoodlrz!\n\nSign this message to verify ownership of your wallet.\n\nWallet: ${addrLower}\nNonce: ${nonce}`;

    let recoveredAddress: string;
    try {
      recoveredAddress = verifyMessage(expectedMessage, signature);
    } catch {
      return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
    }

    if (recoveredAddress.toLowerCase() !== addrLower) {
      return NextResponse.json({ error: "Signature does not match address." }, { status: 400 });
    }

    // ── 3. La porte : ce wallet detient-il une PFP Hoodlrz ? ──
    // La lecture se fait ici, une fois la signature prouvee : interroger
    // la chaine avant la preuve ferait de cette route un service gratuit
    // de consultation de soldes pour n'importe qui.
    const verdict = await verifierDetention(addrLower);

    // ── 4. Find or create user (1 wallet = 1 account) ──
    const walletEmail = `${addrLower}@wallet.hoodlrz.com`;
    // Generate a strong random password (not derived from secrets)
    const walletPassword = crypto.randomBytes(32).toString("hex");

    // Look up existing account by wallet email (direct DB query, scalable)
    const { data: existingAccount } = await admin
      .from("accounts")
      .select("auth_id")
      .eq("email", walletEmail)
      .single();

    let userId: string;

    /**
     * LA CONNEXION NE DOIT JAMAIS DEPENDRE DES COLONNES RECENTES.
     *
     * Les colonnes du reseau prive - wallet_address, is_holder, holdings,
     * hdlrz - arrivent avec les migrations 008 a 012. Un deploiement qui
     * part avant qu'elles soient passees est le cas normal : le code se
     * deploie tout seul, les migrations se lancent a la main.
     *
     * Les ecrire dans la MEME requete que la creation du compte faisait
     * donc echouer la creation entiere sur une colonne inconnue, et la
     * connexion par wallet avec elle. C'est exactement ce qui s'est
     * produit. Le compte est donc cree avec les seules colonnes qui ont
     * toujours existe, puis enrichi dans une seconde requete dont
     * l'echec est signale mais n'empeche rien.
     */
    let schemaOk = true;

    const enrichir = async (id: string, nouveau: boolean) => {
      const { error } = await admin
        .from("accounts")
        .update({
          wallet_address: addrLower,
          is_holder: verdict.detenteur,
          holder_checked_at: verdict.verifieA,
          holdings: verdict.pieces,
          ...(nouveau ? { hdlrz: 1200 } : {}),
        })
        .eq("auth_id", id);

      if (!error) {
        signalerSchemaComplet();
        return true;
      }
      if (colonneManquante(error)) {
        signalerSchemaIncomplet();
        schemaOk = false;
        return false;
      }
      console.error("[auth/wallet/verify] Enrichissement refuse :", error.message);
      return false;
    };

    if (existingAccount?.auth_id) {
      userId = existingAccount.auth_id;
      // Update password for this session (random each time = no predictable password)
      await admin.auth.admin.updateUserById(userId, { password: walletPassword });
      await enrichir(userId, false);
    } else {
      // Create new user with random password
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email: walletEmail,
        password: walletPassword,
        email_confirm: true,
        user_metadata: { wallet_address: addrLower, auth_method: "wallet" },
      });

      if (createError || !newUser?.user) {
        console.error("[auth/wallet/verify] Create user error:", createError);
        return NextResponse.json({ error: "Failed to create account." }, { status: 500 });
      }

      userId = newUser.user.id;

      // Le pseudonyme est tire au sort : il ne doit rien laisser deviner
      // de l'adresse, sans quoi l'anonymat du reseau n'existe pas.
      // Quelques essais en cas de collision sur l'index unique.
      let pseudonyme = nouveauPseudonyme();
      let cree = false;
      for (let essai = 0; essai < 5 && !cree; essai++) {
        const { error } = await admin
          .from("accounts")
          .upsert(
            { auth_id: userId, email: walletEmail, pseudonym: pseudonyme },
            { onConflict: "auth_id" },
          );
        if (!error) cree = true;
        else pseudonyme = nouveauPseudonyme();
      }

      if (!cree) {
        console.error("[auth/wallet/verify] Compte non cree apres 5 essais.");
        return NextResponse.json({ error: "Failed to create account." }, { status: 500 });
      }

      // Le don de bienvenue accompagne la creation : un reseau de
      // predictions ou le nouvel arrivant ne peut rien miser avant le
      // lendemain ne donne pas envie de revenir.
      if (await enrichir(userId, true)) {
        const { data: compte } = await admin
          .from("accounts")
          .select("id")
          .eq("auth_id", userId)
          .single();
        if (compte) {
          await admin
            .from("hdlrz_ledger")
            .insert({ account_id: compte.id, delta: 1200, reason: "welcome" });
        }
      }
    }

    // ── 5. Create session ──
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const cookieStore = cookies();

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // May fail in certain contexts
          }
        },
      },
    });

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: walletEmail,
      password: walletPassword,
    });

    if (signInError) {
      console.error("[auth/wallet/verify] Sign in error:", signInError.message);
      return NextResponse.json({ error: "Failed to create session." }, { status: 500 });
    }

    // La session est creee meme pour un non-detenteur : il faut pouvoir
    // lui dire ce qui lui manque, et lui laisser relancer la verification
    // apres un achat sans recommencer la signature.
    return NextResponse.json({
      success: true,
      address: addrLower,
      // Schema incomplet : la session est bien ouverte, mais le statut de
      // detenteur n'a pas pu etre enregistre. L'interface le dit plutot
      // que de renvoyer l'utilisateur vers une porte qui refusera sans
      // explication.
      holder: schemaOk ? verdict.detenteur : false,
      holdings: verdict.pieces,
      partial: verdict.partiel,
      schema: schemaOk ? "ok" : "incomplet",
    });
  } catch (err) {
    console.error("[auth/wallet/verify] Error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
