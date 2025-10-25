# Troubleshooting Agent V1 & V2

## ❌ Erreur : "address already in use" (Port 8081)

### Symptômes
```
OSerror: [Errno 98] error while attempting to bind on address ('::', 8081, 0, 0): address already in use
```

### Cause
Un agent Python tourne déjà en arrière-plan.

### Solution Rapide ✅

```bash
# 1. Tuer tous les agents
pkill -f "python main"

# 2. Vérifier qu'ils sont arrêtés
ps aux | grep "python main" | grep -v grep

# 3. Relancer l'agent
./start-v2.sh
```

### Solution Automatique ✅

Le script `start-v2.sh` a été mis à jour pour tuer automatiquement les anciens agents !

---

## ❌ Erreur : "ModuleNotFoundError: livekit-plugins-elevenlabs"

### Solution
```bash
cd agent
source venv/bin/activate
pip install livekit-plugins-elevenlabs
```

---

## ❌ L'agent ne parle pas / pas de son

### Diagnostic
```bash
# 1. Vérifier que l'agent tourne
ps aux | grep mainV2

# 2. Vérifier les logs
tail -f /tmp/agent-v2.log

# 3. Vérifier ElevenLabs API key
grep ELEVENLABS_API_KEY .env
```

### Solutions possibles
- ✅ Vérifier `ELEVENLABS_API_KEY` dans `.env`
- ✅ Vérifier `OPENAI_API_KEY` dans `.env`
- ✅ Vérifier que le serveur LiveKit tourne : `ps aux | grep livekit-server`
- ✅ Relancer l'agent : `pkill -f mainV2 && ./start-v2.sh`

---

## ❌ L'agent ne rejoint pas la room

### Diagnostic
```bash
# Vérifier les logs de l'agent
tail -50 /tmp/agent-v2.log | grep "Starting agent for room"

# Si rien → L'agent n'a pas reçu le job
```

### Solutions
1. **Vérifier le serveur LiveKit**
   ```bash
   ps aux | grep livekit-server
   curl http://172.28.191.115:7880  # Doit retourner "OK"
   ```

2. **Vérifier le proxy Node.js**
   ```bash
   ps aux | grep "node server.js"
   lsof -i :3001  # Doit montrer le proxy
   ```

3. **Vérifier la configuration agent/.env**
   ```bash
   cat .env | grep LIVEKIT_URL
   # Doit être : ws://172.28.191.115:7880
   ```

---

## 🔍 Commandes de diagnostic utiles

### Vérifier tous les services
```bash
# Agent V2
ps aux | grep mainV2

# Serveur LiveKit
ps aux | grep livekit-server

# Proxy Node.js
ps aux | grep "node server.js"

# Ports utilisés
lsof -i :7880  # LiveKit
lsof -i :8081  # Agent
lsof -i :3001  # Proxy
```

### Logs en temps réel
```bash
# Agent V2
tail -f /tmp/agent-v2.log

# Serveur LiveKit (si logs activés)
tail -f /var/log/livekit.log
```

### Nettoyer tous les processus
```bash
# Tuer tous les agents
pkill -f "python main"

# Tuer le proxy
pkill -f "node server.js"

# Tuer le serveur LiveKit (attention !)
sudo pkill -f livekit-server
```

---

## 🚀 Démarrage complet propre

```bash
# Terminal 1 : Agent V2
cd agent
pkill -f "python main"  # Nettoyer d'abord
./start-v2.sh

# Terminal 2 : Proxy
pkill -f "node server.js"  # Nettoyer d'abord
npm run proxy

# Terminal 3 : App
npm start
```

---

## 📊 Checklist de debug

Quand quelque chose ne fonctionne pas :

- [ ] Serveur LiveKit tourne ? `ps aux | grep livekit-server`
- [ ] Agent V2 tourne ? `ps aux | grep mainV2`
- [ ] Proxy tourne ? `ps aux | grep "node server.js"`
- [ ] Port 7880 libre ou utilisé par LiveKit ? `lsof -i :7880`
- [ ] Port 8081 libre ou utilisé par agent ? `lsof -i :8081`
- [ ] Port 3001 libre ou utilisé par proxy ? `lsof -i :3001`
- [ ] `.env` configuré ? `cat agent/.env | grep API_KEY`
- [ ] Logs de l'agent visibles ? `tail /tmp/agent-v2.log`

---

## 💡 Tips

### Créer un alias pour redémarrer rapidement
Ajoutez dans votre `~/.bashrc` ou `~/.zshrc` :

```bash
# Redémarrer agent V2
alias restart-v2='cd ~/dev/projects/Eldora/agent && pkill -f "python main" && ./start-v2.sh'

# Redémarrer tout
alias restart-all='pkill -f "python main" && pkill -f "node server.js" && cd ~/dev/projects/Eldora && npm run proxy &'
```

Puis :
```bash
source ~/.bashrc
restart-v2  # Redémarre V2 en une commande !
```

---

**Dernière mise à jour :** 2024-10-24
