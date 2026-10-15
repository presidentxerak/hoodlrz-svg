"use client";

/**
 * La page de connexion. Une seule, et une seule facon d'entrer.
 *
 * CE QU'ELLE A REMPLACE
 * Un ecran a deux onglets d'egale importance, Wallet et Email, plus un
 * bloc du hero qui refaisait le meme parcours en parallele. Trois
 * surfaces pour une seule chose, dont une - le courriel - qui ne pouvait
 * PAS fonctionner : le statut de detenteur n'est inscrit que par la
 * verification de signature, donc un compte cree par courriel se faisait
 * refuser a la porte quoi qu'il arrive. D'ou l'impression d'avoir
 * plusieurs fenetres de connexion dont aucune ne marche. Elle etait
 * juste.
 *
 * Il reste quatre etats, dans l'ordre ou on les rencontre :
 *   recherche  - on cherche un wallet dans le navigateur
 *   pret       - un ou plusieurs wallets trouves, on propose de signer
 *   refuse     - signature valide, mais aucune piece detenue
 *   schema     - la base n'a pas encore les colonnes du reseau prive
 *
 * Chaque etat occupe tout l'ecran. Rien n'est affiche « au cas ou ».
 */

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { surWallets, type WalletDetecte } from "@/lib/web3/providers";
import { choisirWallet } from "@/lib/web3/signer";
import { IconCheck, IconShield, IconSpinner, IconWallet } from "@/components/ui/icons";

interface Detail {
  nom: string;
  contrat: string;
  chainId: number;
  via: string;
  solde?: number;
  erreur?: string;
}

type Etape = "repos" | "connexion" | "signature" | "verification" | "entre";

const TELECHARGEMENTS = [
  { nom: "MetaMask", url: "https://metamask.io/download/" },
  { nom: "Rabby", url: "https://rabby.io/" },
  { nom: "Phantom", url: "https://phantom.app/download" },
  { nom: "Rainbow", url: "https://rainbow.me/download" },
];

export default function AccessPage() {
  const [wallets, setWallets] = useState<WalletDetecte[]>([]);
  /** Vrai quand la detection a eu le temps de tourner. C'est lui, et non
   *  la longueur de la liste, qui autorise a dire « aucun wallet » : une
   *  extension met parfois 300 ms a s'injecter, et accuser l'utilisateur
   *  pendant ce temps-la etait le premier bug de cette page. */
  const [cherche, setCherche] = useState(false);

  const [etape, setEtape] = useState<Etape>("repos");
  const [erreur, setErreur] = useState("");
  const [refuse, setRefuse] = useState(false);
  const [schemaKo, setSchemaKo] = useState(false);
  const [details, setDetails] = useState<Detail[]>([]);
  const [pieces, setPieces] = useState(0);

  const occupe = etape !== "repos" && etape !== "entre";

  /* ── Detection des wallets ───────────────────────────────────────── */
  useEffect(() => {
    const stop = surWallets(setWallets);
    const t = setTimeout(() => setCherche(true), 1600);
    return () => {
      stop();
      clearTimeout(t);
    };
  }, []);

  /* ── Deja connecte ? ─────────────────────────────────────────────── */
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("gate") === "schema") setSchemaKo(true);

    createClient()
      .auth.getSession()
      .then(async ({ data }) => {
        if (!data.session?.user) return;
        try {
          const r = await fetch("/api/auth/holder");
          const j = await r.json();
          if (j.schema === "incomplet") {
            setSchemaKo(true);
            return;
          }
          if (Array.isArray(j.details)) setDetails(j.details);
          if (j.holder) {
            entrer();
            return;
          }
          setRefuse(true);
        } catch {
          // Statut illisible : on laisse la page de connexion ouverte
          // plutot que d'envoyer vers une porte qui refusera.
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function entrer() {
    const vers = new URLSearchParams(window.location.search).get("redirect");
    window.location.href = vers && vers.startsWith("/") ? vers : "/feed";
  }

  /* ── Le parcours, en une fonction ────────────────────────────────── */
  const connecter = useCallback(async (w: WalletDetecte) => {
    setErreur("");
    choisirWallet(w);
    const eth = w.fournisseur;

    try {
      setEtape("connexion");
      // Sondage silencieux d'abord : si le site est deja autorise, on
      // evite une fenetre de plus. C'est la premiere des « plusieurs
      // fenetres » que l'on supprime.
      let comptes: string[] = [];
      try {
        comptes = (await eth.request({ method: "eth_accounts" })) as string[];
      } catch {
        /* on demandera */
      }
      if (!comptes?.length) {
        comptes = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      }
      const adresse = comptes?.[0];
      if (!adresse) {
        setErreur("No account selected. Unlock your wallet and try again.");
        setEtape("repos");
        return;
      }

      const r1 = await fetch("/api/auth/wallet/nonce", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: adresse }),
      });
      if (!r1.ok) {
        // Le message du serveur, et non un « impossible » qui n'apprend
        // rien : c'est lui qui dit si le probleme vient de la base, de
        // la limite de debit, ou d'une adresse mal formee.
        const d = await r1.json().catch(() => ({}));
        throw new Error(d.error ?? `The server refused the request (HTTP ${r1.status}).`);
      }
      const { nonce, message } = await r1.json();

      setEtape("signature");
      const signature = await eth.request({ method: "personal_sign", params: [message, adresse] });

      setEtape("verification");
      const r2 = await fetch("/api/auth/wallet/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: adresse, signature, nonce }),
      });
      const j = await r2.json();
      if (!r2.ok) throw new Error(j.error ?? "Verification refused.");

      if (Array.isArray(j.details)) setDetails(j.details);
      if (j.schema === "incomplet") {
        setSchemaKo(true);
        setEtape("repos");
        return;
      }
      if (j.holder) {
        setPieces(
          Object.values((j.holdings ?? {}) as Record<string, number>).reduce((n, v) => n + v, 0),
        );
        setEtape("entre");
        setTimeout(entrer, 900);
        return;
      }
      setRefuse(true);
      setEtape("repos");
    } catch (e) {
      const m = String((e as Error)?.message ?? e);
      setErreur(
        /reject|denied|cancel|4001/i.test(m) ? "Signature rejected in the wallet." : m,
      );
      setEtape("repos");
    }
  }, []);

  const reverifier = useCallback(async () => {
    setErreur("");
    const r = await fetch("/api/auth/holder", { method: "POST" });

    // 401 ne veut pas dire « ce wallet ne detient rien » : il veut dire
    // « vous n'etes pas connecte ». Les confondre affichait un refus de
    // detention a quelqu'un dont la session n'avait simplement pas ete
    // ouverte - exactement ce qui se passait.
    if (r.status === 401) {
      setRefuse(false);
      setErreur("Votre session a expire. Reconnectez votre wallet.");
      return;
    }

    const j = await r.json().catch(() => ({ holder: false }));
    if (Array.isArray(j.details)) setDetails(j.details);
    if (j.holder) {
      entrer();
      return;
    }
    setErreur(
      j.reliable === false
        ? "A chain did not answer. Status unchanged, try again in a moment."
        : "Still no Hoodlrz piece on this wallet.",
    );
  }, []);

  /* ── Rendu ───────────────────────────────────────────────────────── */
  const Cadre = ({ children }: { children: React.ReactNode }) => (
    <div className="flex min-h-dvh items-center justify-center px-5 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">{children}</div>
    </div>
  );

  if (schemaKo) {
    return (
      <Cadre>
        <h1 className="font-hoodlrz text-[30px] font-bold leading-none tracking-wider sm:text-[40px]">
          Almost there
        </h1>
        <p className="text-sm leading-relaxed text-muted">
          Your wallet is verified. The database has not been migrated yet, so the network
          cannot read who holds what.
        </p>
        <pre className="w-full overflow-x-auto border border-[var(--border)] bg-[var(--surface)] p-4 text-left text-xs">
{`npm run db:migrate -- --baseline 007
npm run db:migrate`}
        </pre>
      </Cadre>
    );
  }

  if (etape === "entre") {
    return (
      <Cadre>
        <IconCheck size={28} className="text-[#c6f24e]" />
        <h1 className="font-hoodlrz text-[30px] font-bold leading-none tracking-wider sm:text-[40px]">
          You are in
        </h1>
        <p className="text-sm text-muted">
          {pieces > 0 ? `${pieces} piece${pieces > 1 ? "s" : ""} on this wallet.` : "Verified."}
        </p>
        <a href="/feed" className="bg-accent-magenta px-6 py-3 text-xs font-bold uppercase tracking-widest text-white">
          Enter
        </a>
      </Cadre>
    );
  }

  if (refuse) {
    return (
      <Cadre>
        <h1 className="font-hoodlrz text-[30px] font-bold leading-none tracking-wider sm:text-[40px]">
          Holders only
        </h1>
        <p className="text-sm leading-relaxed text-muted">
          Your wallet is connected and verified. No Hoodlrz piece was found on it.
        </p>

        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <a
            href="/kids"
            className="flex-1 border border-[var(--border)] px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors hover:bg-[var(--surface)]"
          >
            Gen Kids
          </a>
          <a
            href="/collection/hoodlrz"
            className="flex-1 border border-[var(--border)] px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors hover:bg-[var(--surface)]"
          >
            OG Hoodlrz
          </a>
        </div>

        <button
          onClick={reverifier}
          className="bg-accent-magenta px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white"
        >
          Check again
        </button>

        {erreur && <p className="text-xs text-accent-red">{erreur}</p>}

        {/*
          CE QUI A ETE LU, CONTRAT PAR CONTRAT.
          Un refus sans justification est intenable : le membre voit ses
          pieces dans son wallet et le site dit non. Le detail montre
          laquelle des trois causes est la bonne - mauvaise adresse,
          mauvaise chaine, ou fournisseur muet. Rien de prive n'en sort :
          des adresses publiques et un nom d'hote.
        */}
        {details.length > 0 && (
          <details className="w-full text-left">
            <summary className="cursor-pointer text-xs uppercase tracking-widest text-muted">
              What was checked
            </summary>
            <ul className="mt-3 flex flex-col gap-2">
              {details.map((d) => (
                <li
                  key={d.nom + d.contrat}
                  className="border border-[var(--border)] bg-[var(--surface)] p-3 text-[11px] leading-relaxed"
                >
                  <span className="font-medium text-foreground">{d.nom}</span>
                  <span className="text-muted">
                    {" "}
                    · chain {d.chainId} · {d.via}
                  </span>
                  <span className="mt-1 block break-all font-mono text-muted">{d.contrat}</span>
                  {d.erreur ? (
                    <span className="mt-1 block text-accent-red">{d.erreur}</span>
                  ) : (
                    <span className="mt-1 block text-foreground">balance {d.solde ?? 0}</span>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}
      </Cadre>
    );
  }

  return (
    <Cadre>
      <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-accent-magenta">
        <IconShield size={12} />
        Holders only
      </p>
      <h1 className="font-hoodlrz text-[32px] font-bold leading-none tracking-wider sm:text-[44px]">
        Sign in
      </h1>
      <p className="max-w-[40ch] text-sm leading-relaxed text-muted">
        A signature proves the wallet is yours. No gas, no transaction, nothing approved.
      </p>

      {/* Un bouton par wallet installe. Avec un seul, il n'y a pas de
          choix a faire : le bouton porte directement son nom. */}
      {wallets.length > 0 ? (
        <div className="flex w-full flex-col gap-2">
          {wallets.map((w) => (
            <button
              key={w.id}
              onClick={() => connecter(w)}
              disabled={occupe}
              className="flex items-center justify-center gap-2.5 bg-accent-magenta px-6 py-3.5 text-xs
                         font-bold uppercase tracking-widest text-white disabled:opacity-50"
            >
              {occupe ? (
                <IconSpinner size={15} />
              ) : w.icone ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={w.icone} alt="" className="h-5 w-5" />
              ) : (
                <IconWallet size={15} />
              )}
              {etape === "connexion"
                ? "Opening your wallet…"
                : etape === "signature"
                  ? "Waiting for signature…"
                  : etape === "verification"
                    ? "Reading the chain…"
                    : `Continue with ${w.nom}`}
            </button>
          ))}
        </div>
      ) : cherche ? (
        <div className="flex w-full flex-col gap-3">
          <p className="text-sm text-muted">
            No wallet extension answered. Open this page inside your wallet app, or install one.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {TELECHARGEMENTS.map((t) => (
              <a
                key={t.nom}
                href={t.url}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-[var(--border)] px-3 py-2.5 text-xs font-bold uppercase tracking-widest text-muted transition-colors hover:text-foreground"
              >
                {t.nom}
              </a>
            ))}
          </div>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted">
          <IconSpinner size={14} />
          Looking for your wallet…
        </p>
      )}

      {erreur && <p className="text-xs text-accent-red">{erreur}</p>}
    </Cadre>
  );
}
