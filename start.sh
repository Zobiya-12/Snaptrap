#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# SNAPTRAP quick-start
# Run this once after cloning. After that, just boot your VM — everything
# starts automatically.
# ─────────────────────────────────────────────────────────────────────────────

set -e

echo ""
echo "🪤  SNAPTRAP Quick Start"
echo "──────────────────────────────────────────"

# 1. Install Node deps if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing Node.js dependencies..."
  npm install
fi

# 2. Install ws + uuid + ngrok for server.js if not present
node -e "require('ws')" 2>/dev/null || npm install ws uuid ngrok

# 3. Build and start Docker container (Flask backend on :5000)
echo ""
echo "🐳 Starting Flask backend (Docker)..."
docker compose up -d --build

echo ""
echo "✅ Flask backend running on http://localhost:5000"
echo "   Container will auto-start every time your VM boots."
echo ""

# 4. Start server.js in background
echo "🔌 Starting server.js (WebSocket + ngrok)..."
if [ -n "$NGROK_AUTHTOKEN" ]; then
  echo "   NGROK_AUTHTOKEN set — tunnel will start automatically"
else
  echo "   ⚠️  No NGROK_AUTHTOKEN — set it to get a public URL:"
  echo "      export NGROK_AUTHTOKEN=your_token"
  echo "      (get one free at https://dashboard.ngrok.com)"
fi

node server.js &
NODE_PID=$!
echo "   server.js PID: $NODE_PID"
echo ""

# 5. Start React dev server
echo "⚛️  Starting React dev server..."
echo "   Dashboard → http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop everything."
echo "──────────────────────────────────────────"
echo ""

trap "echo ''; echo 'Stopping...'; kill $NODE_PID 2>/dev/null; docker compose stop; exit 0" INT
npm start
