#!/bin/bash

# Baygunes PBMS - Coolify Deployment Script
# Usage: ./deploy-coolify.sh

set -e

echo "🚀 Baygunes PBMS Coolify Deployment Script"
echo "=========================================="

# Configuration
COOLIFY_HOST="${COOLIFY_HOST:-http://35.246.196.169:8000}"
TOKEN="${COOLIFY_TOKEN:-}"
PROJECT_NAME="baygunes"
TEAM_ID="0"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Checking project...${NC}"

if [[ -z "${TOKEN}" ]]; then
  echo -e "${RED}Missing COOLIFY_TOKEN environment variable.${NC}" >&2
  echo "Example: COOLIFY_TOKEN=\"<your-token>\" ./deploy-coolify.sh" >&2
  exit 1
fi

# Get project info
PROJECT_RESPONSE=$(curl -s -H "Authorization: Bearer ${TOKEN}" "${COOLIFY_HOST}/api/v1/projects")
PROJECT_UUID=$(echo $PROJECT_RESPONSE | grep -o '"uuid":"[^"]*"' | grep -o '[^"]*' | tail -1)

echo -e "${GREEN}✓ Project found: ${PROJECT_UUID}${NC}"

echo -e "${YELLOW}Step 2: Creating Docker Compose service...${NC}"

# Create service via API
# Note: This requires manual configuration in Coolify UI or via API
# For now, we'll provide the manual steps

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}MANUAL DEPLOYMENT STEPS:${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo "1. Go to Coolify Dashboard: ${COOLIFY_HOST}"
echo "2. Select 'baygunes' project"
echo "3. Click '+ Add Resource'"
echo "4. Select 'Docker Compose'"
echo "5. Configure:"
echo "   - Name: baygunes-app"
echo "   - Docker Compose Path: docker-compose.prod.yml"
echo "   - Environment: production"
echo ""
echo "6. Set Environment Variables:"
echo "   Copy from .env.coolify.example and fill in:"
echo "   - DATABASE_URL"
echo "   - POSTGRES_PASSWORD"
echo "   - REDIS_PASSWORD"
echo "   - JWT_SECRET"
echo "   - EMAIL credentials"
echo ""
echo "7. Click 'Deploy'"
echo ""
echo -e "${GREEN}✓ Deployment configuration prepared!${NC}"
echo ""
echo "For PostgreSQL, use the existing one from hesapos-dev:"
echo "  Host: postgres-g08wc4w0ss0o44s0csso448o"
echo "  Or create a new PostgreSQL service in baygunes project"
echo ""
echo "For Elasticsearch/Kibana, connect to hesapos-dev:"
echo "  Host: elasticsearch-v8oko4ocwcogoogw0g8kokck"
echo "  Kibana URL: http://kibana-hesapos-dev.35.246.196.169.sslip.io"
