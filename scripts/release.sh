#!/usr/bin/env bash
set -euo pipefail

CHECK_ONLY=false
if [[ "${1:-}" == "--check" ]]; then
  CHECK_ONLY=true
  shift
fi
if [[ $# -ne 1 ]]; then
  echo "Usage: bash scripts/release.sh [--check] <version> (e.g. 1.0.0 or v1.1.0-beta.1)" >&2
  exit 1
fi
VERSION="${1#v}"
TAG="v${VERSION}"

# Reject invalid versions before touching package files or invoking Git mutations.
node --input-type=module - "$VERSION" <<'NODE'
const number = '(0|[1-9][0-9]*)';
const identifier = '(0|[1-9][0-9]*|[0-9]*[a-zA-Z-][0-9a-zA-Z-]*)';
const semver = new RegExp(`^${number}\\.${number}\\.${number}(?:-${identifier}(?:\\.${identifier})*)?(?:\\+[0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*)?$`);
if (!semver.test(process.argv[2])) throw new Error('Provide a valid semantic version.');
if (process.argv[2].includes('+')) throw new Error('Build metadata (+...) is not supported for container releases.');
NODE

cd "$(dirname "${BASH_SOURCE[0]}")/.."
BRANCH=$(git branch --show-current)
if [[ "$BRANCH" != main ]]; then
  echo "Error: merge dev into main and release from main (currently on ${BRANCH:-detached HEAD})." >&2
  exit 1
fi
if [[ -n "$(git status --porcelain --untracked-files=normal)" ]]; then
  echo "Error: working tree must be clean, including untracked files." >&2
  exit 1
fi
if git show-ref --verify --quiet "refs/tags/$TAG"; then
  echo "Error: tag $TAG already exists." >&2
  exit 1
fi
node --input-type=module - "$VERSION" <<'NODE'
import { readFileSync } from 'node:fs';
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
if (pkg.version !== lock.version || pkg.version !== lock.packages[''].version) {
  throw new Error('Package and lockfile versions are out of sync.');
}
if (pkg.version === process.argv[2]) throw new Error('Choose a new release version.');
NODE

if "$CHECK_ONLY"; then
  echo "Release preflight passed for $TAG; no files, commits, or tags changed."
  exit 0
fi

npm run lint
npm test
npm run build
npm version "$VERSION" --no-git-tag-version --ignore-scripts
git add -- package.json package-lock.json
git commit -m "chore: bump version to ${VERSION}"
git tag -a "$TAG" -m "BandApp $TAG"

echo "Created release commit and tag $TAG locally. Review them, then push both atomically:"
echo "  git push --atomic origin main $TAG"
echo "The tag push triggers CI and publishes ghcr.io/dcoffin88/bandapp."
