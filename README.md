# HackHub

Event and hackathon management for tech communities like GDG.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Add viaSocket Embed

1. Copy `.env.example` to `.env`
2. Generate a JWT token at jwt.io with payload:
   ```json
   { "org_id": "...", "project_id": "...", "user_id": "gdg-indore" }
   ```
   Sign it with your viaSocket access key (HS256).
3. Paste the token in `.env` as `VITE_VIASOCKET_EMBED_TOKEN`
4. Restart: `npm run dev`
5. Go to the Workflows page and click "Open Workflows"

## Deploy on Embarki / Vercel / Netlify

```bash
npm run build
```
Upload the `dist/` folder, or connect your GitHub repo.
Set `VITE_VIASOCKET_EMBED_TOKEN` in the platform's environment settings.
