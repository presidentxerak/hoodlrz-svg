/**
 * L'ancienne adresse de la page des pieces detenues.
 *
 * Elle a ete renommee /profile quand la navigation est passee en barre
 * laterale. Ce fichier reste parce que l'ancienne URL est partie dans des
 * courriels de confirmation Stripe, dans des liens de reveal et dans les
 * favoris des membres : la casser aurait transforme une renommage interne
 * en lien mort chez des gens.
 *
 * Redirection permanente : les moteurs et les navigateurs apprennent la
 * nouvelle adresse et cessent de demander l'ancienne.
 */

import { permanentRedirect } from "next/navigation";

export default function AncienneCollection() {
  permanentRedirect("/profile");
}
