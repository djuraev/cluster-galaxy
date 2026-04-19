
---

## 🚀 Quick Start (Local Dev)

### Prerequisites

- Node.js 18+
- npm 9+

### Run

```bash
npm install
npm run dev
```

With pnpm
```bash
pnpm i
pnpm run dev
```


Open [http://localhost:3000](http://localhost:3000)

---

## 🐳 Docker

### Build

```bash
docker build -t YOUR_USERNAME/cluster-galaxy:latest .
```

### Run locally

```bash
docker run -p 8080:80 YOUR_USERNAME/cluster-galaxy:latest
```

Open [http://localhost:8080](http://localhost:8080)

---

## 📦 Publish to Docker Hub

### 1. Login

```bash
docker login
```

### 2. Build & tag

```bash
docker build -t YOUR_USERNAME/cluster-galaxy:latest .

# Optional: also tag with version
docker tag YOUR_USERNAME/cluster-galaxy:latest YOUR_USERNAME/cluster-galaxy:v1.0
```

### 3. Push

```bash
docker push YOUR_USERNAME/cluster-galaxy:latest
docker push YOUR_USERNAME/cluster-galaxy:v1.0   # if versioned
```

---

## ☸️ Deploy to Kubernetes

### 1. Edit the manifest

Open `k8s-deploy.yaml` and replace the image name:

```yaml
image: YOUR_USERNAME/cluster-galaxy:latest
```

### 2. Apply

```bash
kubectl apply -f k8s-deploy.yaml
```

### 3. Verify

```bash
kubectl get deployments
kubectl get pods
kubectl get svc cluster-galaxy-svc
```

### 4. Access

The Service is type `NodePort`. Get the port and open in browser:

```bash
# On K3s / single-node
kubectl get svc cluster-galaxy-svc
# Look for the NodePort (e.g. 80:31234/TCP) → open http://<NODE_IP>:31234

# Port-forward alternative
kubectl port-forward svc/cluster-galaxy-svc 8080:80
# → open http://localhost:8080
```

### 5. Scale the deployment (live demo)

```bash
# Scale up
kubectl scale deployment cluster-galaxy --replicas=4

# Watch pods
kubectl get pods -w

# Rollout status
kubectl rollout status deployment/cluster-galaxy

# Scale back down
kubectl scale deployment cluster-galaxy --replicas=1
```

### 6. Cleanup

```bash
kubectl delete -f k8s-deploy.yaml
```

---

## 🏗️ Dockerfile Explained

```dockerfile
# Stage 1: Build the React app with Node
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build          # outputs to /app/dist

# Stage 2: Serve with nginx (final image is tiny)
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
```

**Why multi-stage?**
The final image contains only nginx + static files — no Node, no source code.
Result is ~25 MB instead of ~400 MB.

---

## 📋 K8s Manifest Explained

```yaml
# Deployment — manages pod replicas
apiVersion: apps/v1
kind: Deployment
spec:
  replicas: 2              # Two instances for HA
  template:
    spec:
      containers:
        - image: YOUR_USERNAME/cluster-galaxy:latest
          resources:
            requests:      # Minimum guaranteed resources
              memory: "32Mi"
              cpu: "50m"
            limits:        # Hard cap
              memory: "64Mi"
              cpu: "100m"
---
# Service — exposes the deployment
apiVersion: v1
kind: Service
spec:
  type: NodePort           # Accessible from outside the cluster
  ports:
    - port: 80
      targetPort: 80
```

---

## 🔧 Customization

**Add a new namespace planet** — in `App.jsx`, add an entry to `NAMESPACE_CONFIGS`:

```js
{ name: 'staging', color: '#10b981', glowColor: '#10b98144', size: 44, orbitRadius: 760, speed: 0.00005 }
```

and add its initial pod count to `INITIAL_PODS`:

```js
'staging': 3
```

**Change initial pod counts** — edit `INITIAL_PODS` at the top of `App.jsx`:

```js
const INITIAL_PODS = {
  'default':       4,
  'kube-system':   6,
  'monitoring':    3,
  'ingress-nginx': 2,
  'production':    5,
}
```

---

## 📚 Teaching Suggestions

| Class Topic | Demo Action |
|---|---|
| Pods & Namespaces | Point to planets/moons, explain isolation |
| `kubectl scale` | Use Scale Up/Down buttons live |
| Self-healing | Kill a pod, explain K8s restarts it |
| Rolling update | Change replicas in the manifest, apply |
| Resource limits | Show the `resources` block in the manifest |
| CrashLoopBackOff | Hit "Kill Random Pod", show the ✕ marker |

---

## 🛠️ Tech Stack

- **React 18** — UI framework
- **Vite 5** — Build tool
- **HTML5 Canvas** — Galaxy rendering engine
- **nginx:alpine** — Production web server
- **Docker multi-stage** — Minimal final image

---

## 📄 License

MIT — free to use in any K8s course or workshop.
