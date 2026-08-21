"use client";

/**
 * Page de mint Hoodlrz Kids.
 *
 * Trois etats se combinent et la page doit rester juste dans tous les
 * cas : la phase (avant / allowlist / public / termine), l'etat du
 * wallet (deconnecte / mauvaise chaine / pret), et l'appartenance a
 * l'allowlist. Le contrat reste l'arbitre - l'interface ne fait que
 * refleter ce qu'il autorise, elle ne le devine pas.
 *
 * Tant qu'aucune adresse n'est configuree, la page fonctionne en mode
 * vitrine : l'apercu du moteur tourne, les compteurs affichent les
 * parametres, et le bouton de mint explique qu'il n'y a rien a minter.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserProvider, Contract, JsonRpcProvider } from "ethers";
import Countdown from "@/components/kids/Countdown";
import EnginePreview from "@/components/kids/EnginePreview";
import {
  KIDS,
  PHASES,
  KIDS_CHAIN,
  KIDS_ADDRESS,
  isDeployed,
  chainParams,
  phaseAt,
  type Phase,
} from "@/lib/kids/config";
import { KIDS_ABI, humanError } from "@/lib/kids/abi";

type Eip1193 = {
  request: (a: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (e: string, cb: (...a: unknown[]) => void) => void;
  removeListener?: (e: string, cb: (...a: unknown[]) => void) => void;
};
declare global {
  interface Window { ethereum?: Eip1193 }
}

interface Allowlist {
  merkleRoot: string;
  proofs: Record<string, string[]>;
}

export default function KidsPage() {
  // La page est prerendue statiquement : lire l'horloge au premier rendu
  // donnerait un HTML serveur different du client, donc une erreur
  // d'hydratation. `now` reste a null jusqu'au montage, et tout ce qui
  // depend du temps attend cette valeur.
  const [now, setNow] = useState<number | null>(null);
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState<number | null>(null);
  const [allowlist, setAllowlist] = useState<Allowlist | null>(null);
  const [supply, setSupply] = useState<{ total: number; mine: number } | null>(null);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null);

  const mounted = now !== null;
  const phase: Phase = phaseAt(now ?? 0);
  const deployed = isDeployed();

  /* ── Horloge ─────────────────────────────────────────────────────── */
  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000));
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  /* ── Allowlist publiee ───────────────────────────────────────────── */
  // Publiee comme fichier statique pour que n'importe qui puisse
  // recalculer la racine et verifier le snapshot.
  useEffect(() => {
    fetch("/kids/allowlist.json")
      .then((r) => (r.ok ? r.json() : null))
      .then(setAllowlist)
      .catch(() => setAllowlist(null));
  }, []);

  const proof = useMemo(() => {
    if (!allowlist || !account) return null;
    return allowlist.proofs[account.toLowerCase()] ?? null;
  }, [allowlist, account]);

  const inAllowlist = proof !== null;

  /* ── Wallet ──────────────────────────────────────────────────────── */
  const readAccounts = useCallback(async () => {
    if (!window.ethereum) return;
    const accs = (await window.ethereum.request({ method: "eth_accounts" })) as string[];
    setAccount(accs?.[0] ?? "");
    const cid = (await window.ethereum.request({ method: "eth_chainId" })) as string;
    setChainId(parseInt(cid, 16));
  }, []);

  useEffect(() => {
    readAccounts();
    const eth = window.ethereum;
    if (!eth?.on) return;
    const onAcc = () => readAccounts();
    const onChain = () => readAccounts();
    eth.on("accountsChanged", onAcc);
    eth.on("chainChanged", onChain);
    return () => {
      eth.removeListener?.("accountsChanged", onAcc);
      eth.removeListener?.("chainChanged", onChain);
    };
  }, [readAccounts]);

  const connect = async () => {
    if (!window.ethereum) {
      setMsg({ kind: "err", text: "Aucun wallet détecté. Installe MetaMask pour minter." });
      return;
    }
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      await readAccounts();
    } catch (e) {
      setMsg({ kind: "err", text: humanError(e) });
    }
  };

  const switchChain = async () => {
    if (!window.ethereum) return;
    const hex = "0x" + KIDS_CHAIN.id.toString(16);
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
    } catch (e) {
      // 4902 = chaine inconnue du wallet : on propose de l'ajouter.
      if ((e as { code?: number })?.code === 4902) {
        try {
          await window.ethereum.request({ method: "wallet_addEthereumChain", params: [chainParams()] });
        } catch (e2) {
          setMsg({ kind: "err", text: humanError(e2) });
        }
      } else {
        setMsg({ kind: "err", text: humanError(e) });
      }
    }
    await readAccounts();
  };

  /* ── Etat de la collection ───────────────────────────────────────── */
  const refreshSupply = useCallback(async () => {
    if (!deployed) return;
    try {
      const provider = KIDS_CHAIN.rpcUrl
        ? new JsonRpcProvider(KIDS_CHAIN.rpcUrl)
        : window.ethereum
          ? new BrowserProvider(window.ethereum)
          : null;
      if (!provider) return;
      const c = new Contract(KIDS_ADDRESS, KIDS_ABI, provider);
      const total = Number(await c.totalMinted());
      const mine = account ? Number(await c.minted(account)) : 0;
      setSupply({ total, mine });
    } catch {
      // Un RPC injoignable ne doit pas casser la page : on garde
      // l'affichage precedent et on reessaiera au prochain tick.
    }
  }, [deployed, account]);

  useEffect(() => {
    refreshSupply();
    const id = setInterval(refreshSupply, 15000);
    return () => clearInterval(id);
  }, [refreshSupply]);

  /* ── Mint ────────────────────────────────────────────────────────── */
  const mint = async () => {
    if (!window.ethereum || !deployed) return;
    setBusy(true);
    setMsg({ kind: "info", text: "Confirme la transaction dans ton wallet…" });
    try {
      const signer = await new BrowserProvider(window.ethereum).getSigner();
      const c = new Contract(KIDS_ADDRESS, KIDS_ABI, signer);
      const tx =
        phase === "allowlist"
          ? await c.mintAllowlist(qty, proof ?? [])
          : await c.mintPublic(qty);
      setMsg({ kind: "info", text: "Transaction envoyée, en attente de confirmation…" });
      await tx.wait();
      setMsg({ kind: "ok", text: `${qty} Hoodlrz Kid${qty > 1 ? "s" : ""} minté${qty > 1 ? "s" : ""}.` });
      refreshSupply();
    } catch (e) {
      setMsg({ kind: "err", text: humanError(e) });
    } finally {
      setBusy(false);
    }
  };

  /* ── Rendu ───────────────────────────────────────────────────────── */
  const wrongChain = chainId !== null && chainId !== KIDS_CHAIN.id;
  const remaining = supply ? KIDS.maxSupply - supply.total : null;
  const myRemaining = supply ? Math.max(0, KIDS.maxPerWallet - supply.mine) : KIDS.maxPerWallet;

  const canMint =
    mounted &&
    deployed &&
    !!account &&
    !wrongChain &&
    !busy &&
    myRemaining > 0 &&
    (phase === "public" || (phase === "allowlist" && inAllowlist));

  return (
    <main className="mx-auto max-w-5xl px-5 pb-24 pt-12 md:pt-20">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
          Collection générative · intégralement on-chain
        </p>
        <h1 className="font-hoodlrz mt-3 text-5xl leading-none tracking-tight md:text-7xl">
          Hoodlrz Kids
        </h1>
        <p className="mt-5 max-w-[62ch] leading-relaxed text-[var(--muted)]">
          {KIDS.maxSupply.toLocaleString("fr")} pièces. Le moteur de rendu est
          stocké dans la blockchain, pas sur un serveur : chaque pièce se
          regénère depuis sa graine, indéfiniment. Free mint — tu ne paies que
          le gas.
        </p>
      </header>

      <div className="mt-12 grid gap-10 md:grid-cols-2 md:gap-14">
        {/* ── Aperçu ─────────────────────────────────────────────── */}
        <section>
          <EnginePreview />
        </section>

        {/* ── Mint ───────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          {mounted ? (
            <PhaseBanner phase={phase} now={now!} inAllowlist={inAllowlist} hasAccount={!!account} />
          ) : (
            <div className="h-[52px] border border-[var(--border)]" aria-hidden />
          )}

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-y border-[var(--border)] py-5 text-sm">
            <Row label="Supply">
              {remaining !== null
                ? `${(KIDS.maxSupply - remaining).toLocaleString("fr")} / ${KIDS.maxSupply.toLocaleString("fr")}`
                : `${KIDS.maxSupply.toLocaleString("fr")}`}
            </Row>
            <Row label="Prix">Gratuit · gas seul</Row>
            <Row label="Par wallet">{KIDS.maxPerWallet}</Row>
            <Row label="Réserve créateur">{KIDS.reserve}</Row>
            <Row label="Royalties">{KIDS.royaltyBps / 100} %</Row>
            <Row label="Chaîne">{KIDS_CHAIN.name}</Row>
          </dl>

          {!deployed && (
            <Notice kind="info">
              Les contrats ne sont pas encore déployés. L&apos;aperçu ci-contre
              tourne avec le moteur définitif — c&apos;est bien ce que tu
              recevras.
            </Notice>
          )}

          {deployed && !account && (
            <button onClick={connect} className="cta-gradient px-8 py-4 text-sm font-bold uppercase tracking-widest text-white">
              Connecter un wallet
            </button>
          )}

          {deployed && account && wrongChain && (
            <div className="flex flex-col gap-3">
              <Notice kind="err">
                Ton wallet est sur une autre chaîne. Bascule sur {KIDS_CHAIN.name} pour minter.
              </Notice>
              <button onClick={switchChain} className="border border-[var(--border)] px-6 py-3 text-sm font-semibold uppercase tracking-widest transition-colors hover:border-accent-red hover:text-accent-red">
                Changer de chaîne
              </button>
            </div>
          )}

          {deployed && account && !wrongChain && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <label htmlFor="qty" className="font-mono text-[11px] uppercase tracking-widest text-[var(--muted)]">
                  Quantité
                </label>
                <input
                  id="qty"
                  type="number"
                  min={1}
                  max={Math.max(1, myRemaining)}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Math.min(myRemaining, Number(e.target.value) || 1)))}
                  className="w-20 border border-[var(--border)] bg-transparent px-3 py-2 text-center font-mono tabular-nums
                             focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-red"
                />
                <span className="text-xs text-[var(--muted)]">
                  {myRemaining} restante{myRemaining > 1 ? "s" : ""} pour ce wallet
                </span>
              </div>

              <button
                onClick={mint}
                disabled={!canMint}
                className="cta-gradient px-8 py-4 text-sm font-bold uppercase tracking-widest text-white
                           disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? "En cours…" : phase === "allowlist" ? "Minter · allowlist" : "Minter"}
              </button>

              {mounted && phase === "allowlist" && !inAllowlist && (
                <Notice kind="info">
                  Ce wallet n&apos;est pas dans l&apos;allowlist des holders
                  Hoodlrz. Le mint public ouvre dans{" "}
                  <Countdown to={PHASES.publicStart} />.
                </Notice>
              )}
            </div>
          )}

          {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

          <p className="text-[11px] leading-relaxed text-[var(--muted)]">
            Collection intégralement on-chain sur {KIDS_CHAIN.name}. Cette
            chaîne est jeune : son séquenceur est centralisé et ses contrats
            système restent modifiables par son opérateur. Le moteur et son
            empreinte SHA-256 sont archivés hors chaîne, ce qui permet de
            redéployer l&apos;œuvre à l&apos;identique ailleurs si nécessaire.
          </p>
        </section>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ *
 *  Petits composants locaux
 * ------------------------------------------------------------------ */

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{label}</dt>
      <dd className="mt-0.5 font-semibold tabular-nums">{children}</dd>
    </div>
  );
}

function Notice({ kind, children }: { kind: "ok" | "err" | "info"; children: React.ReactNode }) {
  const border =
    kind === "err" ? "border-l-accent-red" : kind === "ok" ? "border-l-green-500" : "border-l-[var(--muted)]";
  return (
    <p className={`border border-[var(--border)] border-l-2 ${border} bg-[var(--surface)] px-4 py-3 text-sm leading-relaxed`}>
      {children}
    </p>
  );
}

function PhaseBanner({
  phase, now, inAllowlist, hasAccount,
}: { phase: Phase; now: number; inAllowlist: boolean; hasAccount: boolean }) {
  const base =
    "flex items-baseline justify-between gap-4 border border-[var(--border)] px-4 py-3";

  if (phase === "avant") {
    const target = now < PHASES.snapshot ? PHASES.snapshot : PHASES.allowlistStart;
    const label = now < PHASES.snapshot ? "Snapshot des holders dans" : "Allowlist dans";
    return (
      <div className={base}>
        <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--muted)]">{label}</span>
        <strong className="text-lg"><Countdown to={target} /></strong>
      </div>
    );
  }
  if (phase === "allowlist") {
    return (
      <div className={base}>
        <span className="font-mono text-[11px] uppercase tracking-widest text-accent-red">
          Allowlist ouverte{hasAccount && (inAllowlist ? " · tu en es" : " · wallet non listé")}
        </span>
        <strong className="text-lg">
          Public dans <Countdown to={PHASES.publicStart} />
        </strong>
      </div>
    );
  }
  if (phase === "public") {
    return (
      <div className={base}>
        <span className="font-mono text-[11px] uppercase tracking-widest text-accent-red">Mint public ouvert</span>
        <strong className="text-lg">
          Clôture dans <Countdown to={PHASES.mintEnd} />
        </strong>
      </div>
    );
  }
  return (
    <div className={base}>
      <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--muted)]">Mint terminé</span>
      <strong className="text-lg">Marché secondaire</strong>
    </div>
  );
}
