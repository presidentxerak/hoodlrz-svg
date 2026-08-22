/**
 * Charge .env.local dans process.env.
 *
 * hardhat.config.ts le fait deja pour tout ce qui passe par hardhat.
 * Les scripts .mjs lances directement par node, eux, ne voient rien :
 * Node ne lit aucun fichier d'environnement de lui-meme. D'ou ce module,
 * a importer en premiere ligne des scripts qui ont besoin d'un secret.
 *
 * Les variables deja presentes dans l'environnement l'emportent, pour
 * qu'un appel ponctuel puisse toujours surcharger le fichier :
 *
 *   ALCHEMY_API_KEY=autre npm run kids:snapshot -- --alchemy
 *
 * Aucune valeur n'est affichee. Le seul retour est la liste des noms
 * charges, pour qu'un script puisse dire ce qui manque sans jamais dire
 * ce qu'il a lu.
 */

import { existsSync, readFileSync } from 'node:fs';
import dotenv from 'dotenv';

const FILE = '.env.local';

export const loaded = [];

if (existsSync(FILE)) {
  const parsed = dotenv.parse(readFileSync(FILE));
  for (const [k, v] of Object.entries(parsed)) {
    if (process.env[k] === undefined) {
      process.env[k] = v;
      loaded.push(k);
    }
  }
}

/**
 * Recupere une variable, ou explique ou la mettre plutot que de lancer
 * une trace de pile. La valeur n'apparait jamais dans le message.
 */
export function need(name, hint = '') {
  const v = process.env[name];
  if (v) return v;

  const where = existsSync(FILE)
    ? `${FILE} existe mais ne definit pas ${name}.`
    : `${FILE} n'existe pas.\n    cp .env.local.example .env.local`;

  throw new Error(
    `${name} introuvable.\n\n    ${where}\n` +
    (hint ? `\n    ${hint}\n` : '')
  );
}
