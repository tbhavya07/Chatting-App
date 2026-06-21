# Direct Line

A real-time, two-person chat room. No login, no signup, no database.
Open the URL, type a name and a room code, talk. Share the same code with
your friend and you're both in, live, over WebSockets.

## How it works

- `server.js` is a small Express + Socket.IO server. It keeps each room's
  messages in memory (not a database) — when the server restarts, history
  clears. That's intentional, per the brief: this is meant to be casual and
  ephemeral, not a permanent record.
- `public/index.html` is the entire front end — one file, no build step.
- A room holds at most 2 people. If a third person tries the same code,
  they're turned away with a message.
- Nothing is end-to-end encrypted. Treat it like a casual line, not a place
  for sensitive information.

## Run it locally (to try before deploying)

You'll need [Node.js](https://nodejs.org) 18+ installed.

```bash
npm install
npm start
```

Then open `http://localhost:3000` in two different browser tabs (or two
devices on the same network, using your computer's local IP instead of
`localhost`) to test both sides of a conversation.

## Deploy it for real (get a public URL)

You want the **whole `direct-line` folder** pushed to a free host that runs
Node.js servers continuously. Static hosts (Netlify, GitHub Pages, Vercel's
static tier) won't work here because this needs a live, always-on server for
the WebSocket connection — not just files.

### Option A: Render (recommended, free tier, simplest)

1. Create a free account at [render.com](https://render.com).
2. Push this folder to a new GitHub repository (or use Render's "Upload"
   flow if you don't want to use git).
3. In Render, click **New > Web Service**, connect the repo.
4. Settings:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Instance type:** Free
5. Click **Create Web Service**. After it builds (a minute or two), Render
   gives you a URL like `https://direct-line-xxxx.onrender.com` — that's
   the link you and your friend open.

Note: on Render's free tier, the server sleeps after inactivity and takes
~30-60 seconds to wake up on the next visit. Fine for casual use; if that's
annoying, a $7/mo instance keeps it always-on.

### Option B: Railway

1. Create a free account at [railway.app](https://railway.app).
2. **New Project > Deploy from GitHub repo** (push this folder to GitHub
   first), or use the Railway CLI to deploy directly from this folder:
   ```bash
   npm install -g @railway/cli
   railway login
   railway init
   railway up
   ```
3. Railway auto-detects Node.js, runs `npm install` and `npm start`.
4. In the project settings, click **Generate Domain** to get your public
   URL.

### Option C: Any VPS / your own server

This is a plain Node app — `npm install && npm start` on port 3000 (or
whatever `PORT` env var you set). Put it behind any reverse proxy (nginx,
Caddy) with a domain if you want `https://yourdomain.com` instead of a
generated subdomain.

## Customizing

- **Room capacity:** change `MAX_ROOM_SIZE` in `server.js` if you ever want
  more than 2 people in a room.
- **History length:** `HISTORY_LIMIT` in `server.js` controls how many
  messages are kept in memory per room.
- **Colors / look:** all in the `<style>` block at the top of
  `public/index.html` — CSS variables at the very top (`--bg`, `--amber`,
  `--teal`, etc.) control the whole palette.
