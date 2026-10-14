/**
 * Les briques de mise en page communes aux sections de l'application.
 *
 * Elles existent pour que six pages ecrites a six moments differents
 * aient la meme gouttiere, le meme rythme vertical et le meme titre. Sans
 * elles, chaque page reinvente son `max-w` et l'ensemble se decale d'un
 * ecran a l'autre - ce qui se voit immediatement sur un reseau social, ou
 * l'on passe son temps a naviguer entre les sections.
 *
 * La largeur est fluide : `max-w` plafonne la ligne de lecture sur grand
 * ecran, la gouttiere en `px` garantit les 16 px de marge sur telephone.
 */

import type { ReactNode } from "react";

export function PageShell({
  children,
  large = false,
}: {
  children: ReactNode;
  /** Pour les grilles et les tableaux, qui respirent mieux au large. */
  large?: boolean;
}) {
  return (
    <div className={`mx-auto w-full px-4 py-6 sm:px-6 sm:py-8 ${large ? "max-w-6xl" : "max-w-3xl"}`}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-hoodlrz text-[30px] font-bold leading-none tracking-wider text-foreground sm:text-[40px]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-[var(--border)] bg-[var(--surface)] ${className}`}>
      {children}
    </section>
  );
}

/**
 * L'ecran d'une section qui n'a encore rien a montrer.
 *
 * Il dit ce qui viendra et ce qui manque pour que ca vienne. Une zone
 * vide sans explication se lit comme une panne ; la meme zone avec une
 * phrase se lit comme une etape.
 */
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-[var(--border)] px-6 py-16 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {children && <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
