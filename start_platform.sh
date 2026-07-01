#!/bin/bash

# Disable Angular analytics prompt to allow non-interactive start
export NG_CLI_ANALYTICS=false

# Terminate background services gracefully on Ctrl+C
cleanup() {
  echo ""
  echo "⏹️ Stopping services..."
  if [ ! -z "$BACKEND_PID" ]; then
    kill $BACKEND_PID 2>/dev/null
  fi
  if [ ! -z "$FRONTEND_PID" ]; then
    kill $FRONTEND_PID 2>/dev/null
  fi
  
  # Ensure ports are completely freed
  PID_5050=$(lsof -t -i:5050)
  if [ ! -z "$PID_5050" ]; then
    kill -9 $PID_5050 2>/dev/null
  fi
  PID_4200=$(lsof -t -i:4200)
  if [ ! -z "$PID_4200" ]; then
    kill -9 $PID_4200 2>/dev/null
  fi
  
  exit 0
}

trap cleanup SIGINT SIGTERM

echo "🚀 Starting .NET Web API Gateway Backend (Port 5050)..."
cd MageGateway
dotnet run &
BACKEND_PID=$!
cd ..

echo "💻 Starting Angular Frontend Dev Server (Port 4200)..."
cd mage-frontend
npx ng serve --port 4200 &
FRONTEND_PID=$!
cd ..

echo "🎉 Services are starting up in the background!"
echo "➡️ Gateway API: http://localhost:5050"
echo "➡️ UI Dashboard: http://localhost:4200"
echo "Press Ctrl+C to shut down all processes."

# Open browser automatically on macOS
sleep 3
open http://localhost:4200 2>/dev/null || true

# Keep script running to capture logs and wait for exit
wait
