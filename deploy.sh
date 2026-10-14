#!/usr/bin/env bash
set -e

echo "========================================================"
echo "       OCEANSCOPE - UNIVERSAL DEPLOYMENT SCRIPT"
echo "========================================================"
echo ""
echo "Select deployment option:"
echo " [1] Deploy Frontend to Firebase Hosting"
echo " [2] Deploy Firestore Rules & Indexes"
echo " [3] Deploy Frontend + Firestore to Firebase"
echo " [4] Deploy Backend to Vercel"
echo " [5] Deploy with Docker Compose"
echo " [6] Test Backend Health"
echo " [7] Exit"
echo ""
read -p "Enter choice (1-7): " opt

case $opt in
  1)
    echo "Building frontend..."
    cd OceanScope/frontend && npm run build && cd ../..
    firebase deploy --only hosting
    ;;
  2)
    firebase deploy --only firestore:rules,firestore:indexes
    ;;
  3)
    cd OceanScope/frontend && npm run build && cd ../..
    firebase deploy --only hosting,firestore:rules,firestore:indexes
    ;;
  4)
    vercel --prod
    ;;
  5)
    docker compose up -d --build
    ;;
  6)
    curl -s http://localhost:8000/health | jq . || curl -s http://localhost:8000/health
    ;;
  *)
    echo "Exiting."
    exit 0
    ;;
esac
