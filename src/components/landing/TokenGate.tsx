"use client";

/**
 * Le controle d'acces, pose dans le hero.
 *
 * POURQUOI ICI PLUTOT QUE SUR UNE PAGE DE CONNEXION
 * La page d'accueil explique un reseau reserve aux detenteurs. Expliquer
 * puis renvoyer vers un formulaire ailleurs perd la moitie des gens au
 * changement de page. Le visiteur verifie donc son wallet a l'endroit
 * exact ou il vient de lire ce que ca lui ouvre.
 *
 * CE QU'IL PROUVE, DANS L'ORDRE
 *  1. que le wallet est bien le sien - une signature, pas une
 *     transaction, donc aucun gas et rien de depense ;
 *  2. qu'il detient une piece - lu sur la chaine par le serveur, apres
 *     la signature et jamais avant.
 *
 * La deuxieme lecture n'est pas faite dans le navigateur : un contrôle
 * cote client se contourne en changeant une variable dans la console.
 * Celui-ci decide seulement de ce qu'on affiche ; la porte reelle est
 * dans le middleware.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { IconCheck, IconShield, IconSpinner, IconWallet } from "@/components/ui/icons";
import {
  adresseConnectee,
  demanderConnexion,
  fournisseurCourant,
  signer,
  walletDisponible,
} from "@/lib/web3/signer";
import { surWallets } from "@/lib/web3/providers";
import WalletPicker from "./WalletPicker";

type Etape = "repos" | "connexion" | "signature" | "lecture" | "detenteur" | "refuse";

export default function TokenGate() {
  const [etape, setEtape] = useState<Etape>("repos");
  const [erreur, setErreur] = useState<string | null>(null);
  const [avoirs, setAvoirs] = useState<Record<string, number>>({});
  /**
   * `null` tant qu'on cherche encore.
   *
   * Cette nuance est tout le correctif : l'ancienne version decidait
   * « pas de wallet » au premier rendu, avant meme que les extensions
   * aient fini de s'injecter, et proposait un lien de telechargement a
   * des gens qui avaient deja MetaMask.
   */
  const [dispo, setDispo] = useState<boolean | null>(null);
  const [plusieurs, setPlusieurs] = useState(false);
  const [aChoisir, setAChoisir] = useState(false);

  useEffect(() => {
    let vivant = true;
    void walletDisponible().then((v) => vivant && setDispo(v));
    const stop = surWallets((l) => vivant && setPlusieurs(l.length > 1));
    return () => {
      vivant = false;
      stop();
    };
  }, []);

  // Un visiteur deja connecte ne doit pas resigner pour rien.
  useEffect(() => {
    fetch("/api/auth/holder")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!j) return;
        if (j.schema === "incomplet") return;
        setAvoirs(j.holdings ?? {});
        setEtape(j.holder ? "detenteur" : "refuse");
      })
      .catch(() => {});
  }, []);

  const verifier = useCallback(async () => {
    setErreur(null);
    try {
      setEtape("connexion");

      // Plusieurs wallets installes et aucun choix memorise : on demande
      // lequel plutot que d'en ouvrir un au hasard.
      if (!(await fournisseurCourant())) {
        setAChoisir(true);
        setEtape("repos");
        return;
      }

      const adresse = (await adresseConnectee()) ?? (await demanderConnexion());
      if (!adresse) throw new Error("La connexion a ete fermee sans choisir de compte.");

      setEtape("signature");
      const r1 = await fetch("/api/auth/wallet/nonce", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: adresse }),
      });
      if (!r1.ok) throw new Error("Impossible de preparer la verification.");
      const { nonce, message } = await r1.json();

      const signature = await signer(message, adresse);

      setEtape("lecture");
      const r2 = await fetch("/api/auth/wallet/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: adresse, signature, nonce }),
      });
      const j = await r2.json();
      if (!r2.ok) throw new Error(j.error ?? "Verification refusee.");

      // La base n'a pas encore les colonnes du reseau prive : la session
      // est ouverte, mais le statut n'a pas pu etre enregistre. On
      // envoie vers l'ecran qui le dit, plutot que d'annoncer a tort que
      // le wallet ne detient rien.
      if (j.schema === "incomplet") {
        window.location.href = "/access?gate=schema";
        return;
      }

      setAvoirs(j.holdings ?? {});

      // Une lecture incomplete n'est pas un refus : on le dit et on
      // laisse reessayer, plutot que d'annoncer a tort que le wallet ne
      // detient rien.
      if (!j.holder && j.reliable === false) {
        setEtape("repos");
        setErreur("Une des chaines n'a pas repondu. Reessayez dans un instant.");
        return;
      }

      if (j.holder) {
        setEtape("detenteur");
        // Le membre vient de signer et le serveur a dit oui : lui
        // demander un clic de plus pour « entrer » est une etape pour
        // rien. On montre le resultat une seconde, puis on l'emmene.
        setTimeout(() => {
          window.location.href = "/feed";
        }, 1100);
        return;
      }
      setEtape("refuse");
    } catch (e) {
      const m = (e as Error).message ?? "";
      setErreur(
        /reject|denied|cancel|4001/i.test(m) ? "Signature refusee dans le wallet." : m || "Echec.",
      );
      setEtape("repos");
    }
  }, []);

  const total = Object.values(avoirs).reduce((n, v) => n + v, 0);
  const occupe = etape === "connexion" || etape === "signature" || etape === "lecture";

  return (
    <div className="w-full border border-white/15 bg-black/60 p-6 backdrop-blur-md sm:p-8">
      <p className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/50">
        <IconShield size={12} />
        Holders only
      </p>

      <h2 className="font-hoodlrz mt-3 text-[30px] font-bold leading-none tracking-wider text-white sm:text-[44px]">
        Check your wallet
      </h2>

      <p className="mx-auto mt-4 max-w-[46ch] text-sm leading-relaxed text-white/70">
        One Hoodlrz PFP opens the private network: encrypted groups, the feed,
        Yes / No markets and the weekly read. Ownership is read from the chain,
        never from a list.
      </p>

      {/* ── Detenteur ─────────────────────────────────────────────── */}
      {etape === "detenteur" ? (
        <div className="mt-6">
          <p className="flex items-center justify-center gap-2 text-sm font-medium text-[#c6f24e]">
            <IconCheck size={16} />
            {total > 0
              ? `${total} piece${total > 1 ? "s" : ""} found. You are in.`
              : "Verified. You are in."}
          </p>
          {/* La redirection part toute seule ; ce bouton est le filet
              pour les navigateurs integres aux applications, qui
              bloquent parfois une navigation programmee. */}
          <Link
            href="/feed"
            className="mt-5 inline-flex w-full items-center justify-center bg-accent-magenta px-6 py-3
                       text-xs font-bold uppercase tracking-widest text-white sm:w-auto"
          >
            Enter the network
          </Link>
        </div>
      ) : etape === "refuse" ? (
        /* ── Verifie, mais sans piece ─────────────────────────────── */
        <div className="mt-6">
          <p className="text-sm text-white/80">
            Wallet verified. It does not hold a Hoodlrz PFP yet.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href="/kids"
              className="border border-white/25 px-5 py-2.5 text-xs font-bold uppercase
                         tracking-widest text-white transition-colors hover:bg-white/10"
            >
              Gen Kids
            </Link>
            <Link
              href="/collection/hoodlrz"
              className="border border-white/25 px-5 py-2.5 text-xs font-bold uppercase
                         tracking-widest text-white transition-colors hover:bg-white/10"
            >
              OG Hoodlrz
            </Link>
          </div>
          <button
            onClick={async () => {
              setErreur(null);
              const r = await fetch("/api/auth/holder", { method: "POST" });
              const j = await r.json().catch(() => ({ holder: false }));
              if (j.holder) {
                window.location.href = "/feed";
                return;
              }
              setErreur(
                j.reliable === false
                  ? "Une des chaines n'a pas repondu. Reessayez dans un instant."
                  : "Still no Hoodlrz PFP on this wallet.",
              );
            }}
            className="mt-4 text-xs text-white/50 underline underline-offset-4 hover:text-white"
          >
            I just bought one — check again
          </button>
        </div>
      ) : (
        /* ── Point de depart ───────────────────────────────────────── */
        <div className="mt-6">
          <button
            onClick={verifier}
            disabled={occupe || dispo === false}
            className="inline-flex w-full items-center justify-center gap-2 bg-accent-magenta px-6 py-3
                       text-xs font-bold uppercase tracking-widest text-white disabled:opacity-50 sm:w-auto"
          >
            {occupe ? <IconSpinner size={14} /> : <IconWallet size={14} />}
            {etape === "connexion"
              ? "Opening your wallet…"
              : etape === "signature"
                ? "Waiting for signature…"
                : etape === "lecture"
                  ? "Reading the chain…"
                  : "Connect wallet"}
          </button>

          {(aChoisir || plusieurs) && (
            <WalletPicker onChoix={() => { setAChoisir(false); void verifier(); }} />
          )}

          <p className="mt-4 text-xs leading-relaxed text-white/45">
            {dispo === null
              ? "Looking for your wallet…"
              : dispo
                ? "A signature, not a transaction. No gas, nothing spent, nothing approved."
                : "No wallet extension answered. Open this page inside your wallet app, or install one."}
          </p>

          {erreur && <p className="mt-3 text-xs text-accent-red">{erreur}</p>}
        </div>
      )}
    </div>
  );
}
