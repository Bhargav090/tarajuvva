#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/web"

echo ""
echo "🧵  Tarajuvva — Starting up…"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Kill any existing processes
pkill -f "node server.js" 2>/dev/null || true
pkill -f "vite"           2>/dev/null || true
sleep 1

# Start Backend
echo "🚀 Starting backend on :4000 …"
cd "$BACKEND"
node server.js &
BACKEND_PID=$!
sleep 2
echo "   ✅  Backend PID $BACKEND_PID"

# Start Frontend
echo "🎨 Starting frontend on :5173 …"
cd "$FRONTEND"
npm run dev &
FRONTEND_PID=$!
sleep 2
echo "   ✅  Frontend PID $FRONTEND_PID"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐  App:     http://localhost:5173"
echo "🔧  API:     http://localhost:4000/api"
echo "⚙️   Admin:   http://localhost:5173/admin"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Press Ctrl+C to stop both servers."
echo ""

# Wait for both
wait $BACKEND_PID $FRONTEND_PID
