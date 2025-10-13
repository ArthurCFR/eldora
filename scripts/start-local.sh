#!/bin/bash
# Script pour démarrer tout en local (self-hosted)

echo "🚀 Démarrage de Voyaltis V2 (Self-hosted)"
echo ""

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Démarrer LiveKit
echo -e "${BLUE}1. Démarrage LiveKit Server (Docker)...${NC}"
export NODE_IP=$(hostname -I | awk '{print $1}' || echo "127.0.0.1")
docker-compose up -d livekit

# Attendre que LiveKit démarre
sleep 3

# Vérifier LiveKit
if curl -s http://localhost:7880 > /dev/null; then
    echo -e "${GREEN}✓ LiveKit est prêt sur ws://$NODE_IP:7880${NC}"
else
    echo "❌ Erreur: LiveKit n'a pas démarré"
    exit 1
fi

echo ""
echo -e "${BLUE}2. Configuration:${NC}"
echo "   URL LiveKit: ws://$NODE_IP:7880"
echo "   API Key: devkey"
echo "   API Secret: secret"
echo ""
echo -e "${BLUE}3. Prochaines étapes:${NC}"
echo ""
echo "   Terminal 1 (Agent Python):"
echo "   $ cd agent && source venv/bin/activate && python main.py start"
echo ""
echo "   Terminal 2 (Proxy Node.js):"
echo "   $ npm run proxy"
echo ""
echo "   Terminal 3 (App React Native):"
echo "   $ npm start"
echo ""
echo -e "${GREEN}✓ LiveKit self-hosted est prêt!${NC}"
echo ""
echo "Pour voir les logs: npm run livekit:logs"
echo "Pour arrêter: npm run livekit:stop"
