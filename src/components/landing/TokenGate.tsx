"use client";

/**
 * Le bloc d'entree du hero.
 *
 * IL N'IMPLEMENTE PLUS LA CONNEXION, ET C'EST LE CORRECTIF.
 *
 * Il y avait deux implementations du meme parcours : celle-ci, dans le
 * hero, et celle de /access. Deux codes pour une seule chose, donc deux
 * comportements qui divergent - l'un redirige, l'autre affiche, l'un
 * gere un cas d'erreur que l'autre ignore - et un membre qui passe de
 * l'un a l'autre voit des reponses contradictoires. C'est exactement ce
 * qui se produisait : « vos pieces sont la », puis « connectez-vous »
 * une seconde apres.
 *
 * Il ne reste donc qu'UNE page de connexion, /access. Ce bloc se
 * contente de lire l'etat et d'y envoyer. Trois etats, trois
 * affichages :
 *
 *  - on ne sait pas encore : on le dit, sans rien promettre ;
 *  - detenteur verifie : un bouton vers le reseau ;
 *  - tout le reste : un bouton vers la page de connexion.
 *
 * La lecture d'etat est une simple requete a notre propre serveur. Elle
 * ne touche ni au wallet, ni a la chaine, et ne peut donc rien casser.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconCheck, IconShield, IconSpinner, IconWallet } from "@/components/ui/icons";

type Etat = "inconnu" | "visiteur" | "detenteur";

export default function TokenGate() {
  const [etat, setEtat] = useState<Etat>("inconnu");
  const [pieces, setPieces] = useState(0);

  useEffect(() => {
    let vivant = true;
    fetch("/api/auth/holder")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!vivant || !j) {
          if (vivant) setEtat("visiteur");
          return;
        }
        // Base pas encore migree : la page de connexion saura
        // l'expliquer, ce bloc n'a pas a le faire deux fois.
        if (j.schema === "incomplet") {
          setEtat("visiteur");
          return;
        }
        const total = Object.values((j.holdings ?? {}) as Record<string, number>).reduce(
          (n, v) => n + v,
          0,
        );
        setPieces(total);
        setEtat(j.holder ? "detenteur" : "visiteur");
      })
      .catch(() => vivant && setEtat("visiteur"));
    return () => {
      vivant = false;
    };
  }, []);

  return (
    <div className="w-full border border-white/15 bg-black/60 p-6 backdrop-blur-md sm:p-8">
      <p className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/50">
        <IconShield size={12} />
        Holders only
      </p>

      <h2 className="font-hoodlrz mt-3 text-[30px] font-bold leading-none tracking-wider text-white sm:text-[44px]">
        {etat === "detenteur" ? "You are in" : "Check your wallet"}
      </h2>

      <p className="mx-auto mt-4 max-w-[46ch] text-sm leading-relaxed text-white/70">
        One Hoodlrz PFP opens the private network: encrypted groups, the feed,
        Yes / No markets and the weekly read. Ownership is read from the chain,
        never from a list.
      </p>

      <div className="mt-6">
        {etat === "inconnu" ? (
          <p className="flex items-center justify-center gap-2 text-sm text-white/50">
            <IconSpinner size={14} />
            Checking…
          </p>
        ) : etat === "detenteur" ? (
          <>
            <p className="flex items-center justify-center gap-2 text-sm font-medium text-[#c6f24e]">
              <IconCheck size={16} />
              {pieces > 0
                ? `${pieces} piece${pieces > 1 ? "s" : ""} on this wallet.`
                : "Verified."}
            </p>
            <Link
              href="/feed"
              className="mt-5 inline-flex w-full items-center justify-center bg-accent-magenta px-6 py-3
                         text-xs font-bold uppercase tracking-widest text-white sm:w-auto"
            >
              Enter the network
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/access"
              className="inline-flex w-full items-center justify-center gap-2 bg-accent-magenta px-6 py-3
                         text-xs font-bold uppercase tracking-widest text-white sm:w-auto"
            >
              <IconWallet size={14} />
              Connect wallet
            </Link>
            <p className="mt-4 text-xs leading-relaxed text-white/45">
              A signature, not a transaction. No gas, nothing spent, nothing
              approved.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
