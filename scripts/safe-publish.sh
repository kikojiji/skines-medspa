#!/usr/bin/env bash
# Publication sûre : push → attendre que la nouvelle page soit en ligne → vérifier les images.
# Usage : scripts/safe-publish.sh "message du commit" PAGE MARQUEUR
#   PAGE      ex. "/" ou "/facial"
#   MARQUEUR  un texte qui n'existe que dans la nouvelle version de la page (ex. "sk-hero-choreo")
# Règle d'or : on ne teste JAMAIS une image avant que la page soit en ligne
# (sinon la CDN garde un 404 en mémoire pour cette adresse).
set -euo pipefail
MSG="${1:?message du commit}"; PAGE="${2:?page, ex. / ou /facial}"; MARK="${3:?marqueur}"
SITE="https://skines.ca"
git add -A
git commit -m "$MSG" || echo "(rien à commiter)"
git push origin HEAD:main
echo "Attente de la mise en ligne de ${PAGE} (marqueur: ${MARK})…"
for i in $(seq 1 30); do
  if curl -s "${SITE}${PAGE}?cb=${RANDOM}${RANDOM}" | grep -q -- "$MARK"; then echo "Page en ligne (essai $i)."; break; fi
  [ "$i" = 30 ] && { echo "Page toujours pas en ligne après 5 min."; exit 1; }
  sleep 10
done
echo "Vérification des images utilisées par la page (avec une adresse neuve pour ne rien polluer)…"
curl -s "${SITE}${PAGE}?cb=${RANDOM}" | grep -oE '/assets/[A-Za-z0-9_./-]+\.(png|jpg|jpeg|webp|svg|css|js)' | sort -u | while read -r a; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "${SITE}${a}?chk=${RANDOM}${RANDOM}")
  [ "$code" = 200 ] && echo "  OK   $a" || echo "  ERREUR $code  $a"
done
echo "Terminé. Si une image est en erreur : vérifier qu'elle est dans git (git add -f pour .webp) puis changer le ?v= dans l'adresse."
