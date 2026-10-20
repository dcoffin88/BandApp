#!/usr/bin/env bash
set -euo pipefail

CHECK_ONLY=false
PUBLISH=true
while [[ "${1:-}" == --* ]]; do
  case "$1" in
    --check)
      CHECK_ONLY=true
      ;;
    --no-publish)
      PUBLISH=false
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
  shift
done
if [[ $# -ne 1 ]]; then
  echo "Usage: bash scripts/release.sh [--check] [--no-publish] <version> (e.g. 1.0.0 or v1.1.0-beta.1)" >&2
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
const versionFiles = ['server/app.ts', 'src/utils/versionService.ts'];
const versionPattern =
  /\b(?:export\s+)?const\s+CURRENT_APP_VERSION\s*=\s*['"]([^'"]+)['"]\s*;/;
for (const file of versionFiles) {
  const source = readFileSync(file, 'utf8');
  const match = source.match(versionPattern);
  if (!match) throw new Error(`Could not find CURRENT_APP_VERSION in ${file}.`);
  if (match[1] !== pkg.version) {
    throw new Error(`${file} reports ${match[1]}, but package.json reports ${pkg.version}.`);
  }
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

node --input-type=module - "$VERSION" <<'NODE'
import { readFileSync, writeFileSync } from 'node:fs';

const version = process.argv[2];
const files = [
  'server/app.ts',
  'src/utils/versionService.ts',
];

const pattern =
  /(\b(?:export\s+)?const\s+CURRENT_APP_VERSION\s*=\s*['"])([^'"]+)(['"]\s*;)/;

for (const file of files) {
  const source = readFileSync(file, 'utf8');

  if (!pattern.test(source)) {
    throw new Error(`Could not find CURRENT_APP_VERSION in ${file}.`);
  }

  const updated = source.replace(
    pattern,
    (_match, prefix, _current, suffix) =>
      `${prefix}${version}${suffix}`,
  );

  writeFileSync(file, updated);
}
NODE

git add -- \
  package.json \
  package-lock.json \
  server/app.ts \
  src/utils/versionService.ts
git commit -m "chore: bump version to ${VERSION}"
git tag -a "$TAG" -m "RehearsalHQ $TAG"

echo "Created release commit and tag $TAG locally."

if ! "$PUBLISH"; then
  echo "Publishing was skipped. To publish later:"
  echo "  git push --atomic origin main $TAG"
  echo "  gh release create $TAG --title \"RehearsalHQ $TAG\" --draft --generate-notes --verify-tag"
  exit 0
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: GitHub CLI (gh) is required to create the draft release." >&2
  echo "The release commit and tag remain local; nothing was pushed." >&2
  exit 1
fi
if ! gh auth status >/dev/null 2>&1; then
  echo "Error: authenticate GitHub CLI with 'gh auth login' before publishing." >&2
  echo "The release commit and tag remain local; nothing was pushed." >&2
  exit 1
fi

read -r -p "Press Enter to push main and $TAG atomically to origin..."
git push --atomic origin main "$TAG"
echo "The tag push triggered CI and the GHCR publish workflow."

read -r -p "Press Enter to create the draft GitHub release for $TAG..."
gh release create "$TAG" \
  --title "RehearsalHQ $TAG" \
  --draft \
  --generate-notes \
  --verify-tag
