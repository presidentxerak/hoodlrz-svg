/**
 * Ouverture d'un navigateur, portable d'une machine a l'autre.
 *
 * Les tests Kids ont besoin d'un vrai moteur de rendu : ils executent le
 * HTML sorti de la chaine et lisent les pixels obtenus. Rien ne remplace
 * un navigateur pour ca.
 *
 * Le premier jet codait en dur les chemins de l'environnement de
 * developpement (/opt/node22, /opt/pw-browsers). Ces chemins n'existent
 * nulle part ailleurs : la suite de tests echouait des la premiere ligne
 * sur un poste normal. On resout donc dans cet ordre :
 *
 *   1. playwright installe dans le projet          (le cas normal)
 *   2. playwright de l'environnement conteneurise  (le cas historique)
 *
 * et de meme pour l'executable Chromium : celui du conteneur s'il est
 * la, sinon on laisse Playwright trouver le sien.
 *
 * Quand rien n'est disponible, on le dit avec la commande a taper
 * plutot qu'avec une trace de resolution de module.
 */

import { existsSync } from 'node:fs';

const CONTAINER_PLAYWRIGHT = '/opt/node22/lib/node_modules/playwright/index.mjs';
const CONTAINER_CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    // Pas dans le projet : peut-etre dans l'environnement.
  }
  if (existsSync(CONTAINER_PLAYWRIGHT)) return import(CONTAINER_PLAYWRIGHT);

  throw new Error(
    'Playwright est introuvable. Les tests Kids executent le HTML sorti de\n' +
    '  la chaine dans un vrai navigateur, il leur en faut un.\n\n' +
    '    npm install\n' +
    '    npx playwright install chromium\n'
  );
}

/**
 * Lance Chromium.
 *
 * On essaie d'abord la resolution de Playwright lui-meme : chaque
 * version attend un build precis, et lui en imposer un autre expose a
 * des ecarts de rendu difficiles a imputer. Le binaire du conteneur ne
 * sert que de repli, quand Playwright ne trouve rien.
 *
 * Les options passees ici l'emportent, pour qu'un appelant puisse
 * toujours forcer son navigateur.
 */
export async function launchChromium(opts = {}) {
  const { chromium } = await loadPlaywright();

  try {
    return await chromium.launch(opts);
  } catch (e) {
    const missing = /Executable doesn't exist|Looks like Playwright/.test(String(e?.message));
    if (!missing) throw e;

    if (existsSync(CONTAINER_CHROMIUM)) {
      return chromium.launch({ executablePath: CONTAINER_CHROMIUM, ...opts });
    }
    // Le message de Playwright est bon mais arrive noye dans une trace.
    // On remonte la seule ligne qui compte.
    throw new Error(
      'Chromium n est pas installe pour Playwright.\n\n' +
      '    npx playwright install chromium\n'
    );
  }
}
