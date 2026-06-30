#!/usr/bin/env bash
# Deploy Yuse profile-photo S3 infrastructure and wire env vars locally + Vercel.
#
# Prerequisites:
#   - AWS CLI v2 installed and authenticated (aws sts get-caller-identity)
#   - Vercel CLI logged in (vercel whoami) for production env sync
#
# Usage:
#   ./scripts/setup-s3-profile-photos.sh
#   AWS_REGION=eu-west-1 ./scripts/setup-s3-profile-photos.sh
#   ./scripts/setup-s3-profile-photos.sh --skip-vercel
#   ./scripts/setup-s3-profile-photos.sh --skip-local-env
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STACK_NAME="${STACK_NAME:-yuse-profile-photos}"
REGION="${AWS_REGION:-eu-west-1}"
TEMPLATE="${ROOT}/infra/aws/profile-photos.yaml"
BACKEND_ENV="${ROOT}/backend/.env"
SKIP_VERCEL=false
SKIP_LOCAL=false

for arg in "$@"; do
  case "$arg" in
    --skip-vercel) SKIP_VERCEL=true ;;
    --skip-local-env) SKIP_LOCAL=true ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 1
      ;;
  esac
done

if ! command -v aws >/dev/null 2>&1; then
  echo "AWS CLI not found. Install it, then configure credentials:" >&2
  echo "  brew install awscli" >&2
  echo "  aws configure   # or export AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY" >&2
  exit 1
fi

if ! aws sts get-caller-identity --region "$REGION" >/dev/null 2>&1; then
  echo "AWS credentials are not configured or lack sts:GetCallerIdentity." >&2
  echo "Run: aws configure" >&2
  exit 1
fi

if [[ ! -f "$TEMPLATE" ]]; then
  echo "Missing template: $TEMPLATE" >&2
  exit 1
fi

echo "Deploying CloudFormation stack '${STACK_NAME}' in ${REGION}..."
aws cloudformation deploy \
  --stack-name "$STACK_NAME" \
  --template-file "$TEMPLATE" \
  --region "$REGION" \
  --no-fail-on-empty-changeset \
  --capabilities CAPABILITY_NAMED_IAM

outputs() {
  aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='${1}'].OutputValue" \
    --output text
}

BUCKET="$(outputs BucketName)"
ACCESS_KEY_ID="$(outputs AccessKeyId)"
SECRET_ACCESS_KEY="$(outputs SecretAccessKey)"
URL_PATTERN="$(outputs DirectObjectURLPattern)"

echo ""
echo "=== S3 profile photos ready ==="
echo "Region:      ${REGION}"
echo "Bucket:      ${BUCKET}"
echo "Public URLs: ${URL_PATTERN}<object-key>"
echo ""

set_env_var() {
  local file="$1"
  local key="$2"
  local value="$3"
  touch "$file"
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    if [[ "$(uname)" == "Darwin" ]]; then
      sed -i '' "s|^${key}=.*|${key}=${value}|" "$file"
    else
      sed -i "s|^${key}=.*|${key}=${value}|" "$file"
    fi
  else
    printf '\n%s=%s\n' "$key" "$value" >>"$file"
  fi
}

add_vercel_env() {
  local name="$1"
  local value="$2"
  if vercel env ls production 2>/dev/null | grep -q " ${name} "; then
    echo "  ${name} already exists, remove with: vercel env rm ${name} production"
  else
    printf '%s' "$value" | vercel env add "$name" production
    echo "  added ${name}"
  fi
}

if [[ "$SKIP_LOCAL" == "false" ]]; then
  echo "Writing AWS vars to ${BACKEND_ENV} (not committed)..."
  set_env_var "$BACKEND_ENV" "AWS_REGION" "$REGION"
  set_env_var "$BACKEND_ENV" "AWS_S3_BUCKET" "$BUCKET"
  set_env_var "$BACKEND_ENV" "AWS_ACCESS_KEY_ID" "$ACCESS_KEY_ID"
  set_env_var "$BACKEND_ENV" "AWS_SECRET_ACCESS_KEY" "$SECRET_ACCESS_KEY"
  # Leave AWS_S3_PUBLIC_URL_PREFIX unset, direct S3 URLs match backend defaults.
  echo "Local backend/.env updated. Restart Docker backend: docker compose up -d --build backend"
fi

if [[ "$SKIP_VERCEL" == "false" ]]; then
  if ! command -v vercel >/dev/null 2>&1; then
    echo "Vercel CLI not found; skipping production env sync." >&2
  elif ! vercel whoami >/dev/null 2>&1; then
    echo "Not logged into Vercel; skipping production env sync (run: vercel login)." >&2
  else
    echo "Setting Vercel production env vars on backend service..."
    cd "$ROOT"
    add_vercel_env "AWS_REGION" "$REGION"
    add_vercel_env "AWS_S3_BUCKET" "$BUCKET"
    add_vercel_env "AWS_ACCESS_KEY_ID" "$ACCESS_KEY_ID"
    add_vercel_env "AWS_SECRET_ACCESS_KEY" "$SECRET_ACCESS_KEY"
    echo "Redeploy production after env changes: vercel --prod"
  fi
fi

echo ""
echo "Upload flow: browser PUT via presigned URL; photos served via public GetObject."
echo "Verify: upload a profile photo in the CV editor after restarting the backend."
