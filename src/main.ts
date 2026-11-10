// SPDX-License-Identifier: AGPL-3.0-or-later
import { composerLibelleVersion } from "./domaine/libelle-version";
import { lireVersionApplication } from "./enveloppe";

const NOM_APPLICATION = "DNMAX";

async function afficherVersion(): Promise<void> {
  const zoneVersion = document.querySelector("#version");
  if (zoneVersion === null) {
    return;
  }
  const version = await lireVersionApplication();
  zoneVersion.textContent = composerLibelleVersion(NOM_APPLICATION, version);
}

void afficherVersion();
