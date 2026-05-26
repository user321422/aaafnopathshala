aafnotech - Local Blog Admin

This repository includes a small admin app to manage `blogs.json` locally.

Requirements
- Node.js 16+ (recommended)

Setup
1. Install dependencies:

```bash
npm install
```

2. Create `.env` (copy `.env.example`) and set a secure `ADMIN_PASSWORD` and `ADMIN_SECRET`.

3. Start the server:

```bash
npm start
```

4. Open the admin UI in your browser:

```
http://localhost:3000/admin
```

Usage
- Log in with the `ADMIN_PASSWORD` you set in `.env`.
- Use the UI to create, edit, or delete posts.
- Changes are written directly to `blogs.json`.

Security notes
- This admin app writes to `blogs.json` on disk. Do not expose the admin server to public networks without proper HTTPS and stronger authentication.
- For production, consider using a proper CMS or adding HTTPS, user management, and logging.

If you want, I can:
- Add `systemd` or `pm2` instructions to run the admin as a background service.
- Add validation and richer WYSIWYG editing.
