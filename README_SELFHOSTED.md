# 🏠 Voyaltis V2 - Mode Self-Hosted

Guide rapide pour utiliser LiveKit en **auto-hébergé** au lieu de LiveKit Cloud.

---

## ✅ Pourquoi Self-Hosted ?

- **Gratuit** (sauf coûts serveur)
- **Contrôle total** de vos données
- **Pas de limites** d'utilisation
- **Aucune dépendance externe**

---

## 🚀 Quick Start (5 minutes)

### Option 1: Docker Compose (Recommandé)

**1. Démarrer LiveKit:**
```bash
npm run livekit:local
```

**2. Vérifier que ça tourne:**
```bash
curl http://localhost:7880
# Devrait retourner: {"version":"..."}
```

**3. Configurer `.env`:**
```bash
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

**4. Lancer l'app (3 terminaux):**
```bash
# Terminal 1
cd agent && source venv/bin/activate && python main.py start

# Terminal 2
npm run proxy

# Terminal 3
npm start
```

**✅ C'est tout !** Vous utilisez maintenant LiveKit self-hosted.

---

### Option 2: Script automatique

```bash
bash scripts/start-local.sh
```

Ce script:
- Démarre LiveKit en Docker
- Affiche la configuration
- Guide pour les prochaines étapes

---

## 📦 Configuration

### `livekit.yaml` (déjà configuré)

```yaml
port: 7880
keys:
  devkey: secret    # Changez en production!
room:
  auto_create: true
  max_participants: 10
```

### `docker-compose.yml` (déjà configuré)

```yaml
services:
  livekit:
    image: livekit/livekit-server:latest
    ports:
      - "7880:7880"
      - "50000-50100:50000-50100/udp"
```

---

## 🔧 Commandes Utiles

```bash
# Démarrer LiveKit
npm run livekit:local

# Voir les logs
npm run livekit:logs

# Arrêter LiveKit
npm run livekit:stop

# Redémarrer
npm run livekit:stop && npm run livekit:local
```

---

## 🌐 Accès depuis le réseau local

Si vous voulez tester depuis un autre appareil (smartphone):

**1. Obtenir votre IP locale:**
```bash
# Linux/Mac
hostname -I | awk '{print $1}'

# Windows
ipconfig
```

**2. Mettre à jour `.env`:**
```bash
LIVEKIT_URL=ws://192.168.1.100:7880  # Remplacez par votre IP
```

**3. Redémarrer le proxy:**
```bash
npm run proxy
```

---

## 🚀 Déploiement Production

Voir **[LIVEKIT_SELFHOSTED.md](./LIVEKIT_SELFHOSTED.md)** pour:
- VPS avec SSL
- Kubernetes
- Monitoring
- Haute disponibilité

---

## 🆚 Cloud vs Self-Hosted

| Aspect | Self-Hosted | LiveKit Cloud |
|--------|-------------|---------------|
| **Setup** | 5 min (Docker) | 2 min |
| **Coût** | Gratuit* | $20-50/mois |
| **Maintenance** | Vous | LiveKit |
| **Scalabilité** | Manuel | Auto |
| **Données** | Chez vous | Cloud |

*Sauf si VPS pour production

---

## 🐛 Troubleshooting

**LiveKit ne démarre pas:**
```bash
docker ps | grep livekit
# Si rien, vérifier:
docker-compose logs livekit
```

**Connexion échoue:**
```bash
# Vérifier URL dans .env (ws:// pas wss:// pour local)
grep LIVEKIT_URL .env

# Tester connexion
curl http://localhost:7880
```

**Erreur de ports:**
```bash
# Ports déjà utilisés
sudo lsof -i :7880

# Arrêter le processus ou changer le port dans livekit.yaml
```

---

## 📝 Checklist Migration Cloud → Self-Hosted

- [ ] `npm run livekit:local` pour démarrer LiveKit
- [ ] Vérifier `curl http://localhost:7880`
- [ ] Mettre à jour `.env` avec `ws://localhost:7880`
- [ ] Copier `.env` vers `agent/.env`
- [ ] Redémarrer tous les services
- [ ] Tester l'app

---

## 🔐 Sécurité Production

**⚠️ IMPORTANT:** Les clés par défaut sont pour le développement uniquement!

**Pour production:**

1. Générer de nouvelles clés:
```bash
openssl rand -hex 32  # API Key
openssl rand -hex 64  # API Secret
```

2. Mettre à jour `livekit.yaml`:
```yaml
keys:
  votre_nouvelle_key: votre_nouveau_secret
```

3. Mettre à jour `.env`:
```bash
LIVEKIT_API_KEY=votre_nouvelle_key
LIVEKIT_API_SECRET=votre_nouveau_secret
```

---

## ✅ Avantages Self-Hosted pour Voyaltis

1. **Gratuit** - Pas de frais LiveKit Cloud
2. **Données locales** - Conversations restent chez vous
3. **Personnalisable** - Contrôle total de la config
4. **Scalable** - Ajoutez des serveurs selon besoins
5. **Fiable** - Pas de dépendance externe

---

**🎉 Vous êtes maintenant autonome avec LiveKit self-hosted!**

Pour aller plus loin: [LIVEKIT_SELFHOSTED.md](./LIVEKIT_SELFHOSTED.md)
