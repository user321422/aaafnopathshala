require('dotenv').config();
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const morgan = require('morgan');

const app = express();
const BLOGS_FILE = path.join(__dirname, 'blogs.json');
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'please-change-this-secret';
let writeQueue = Promise.resolve();
const publishStatus = {
  lastAttemptAt: null,
  lastSuccessAt: null,
  lastError: null,
  lastMethod: null,
  lastTarget: null
};

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Serve admin static UI
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Helper: read and write blogs.json
async function readBlogs(){
  const raw = await fs.readFile(BLOGS_FILE, 'utf8');
  return JSON.parse(raw);
}
async function writeBlogs(data){
  // Serialize writes to avoid tmp-file rename races under concurrent requests.
  writeQueue = writeQueue.then(async () => {
    await fs.mkdir(path.dirname(BLOGS_FILE), { recursive: true });
    const tmp = `${BLOGS_FILE}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
    await fs.rename(tmp, BLOGS_FILE);
  });
  return writeQueue;
}

async function pushToGit(){
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO; // e.g. user321422/aaafnopathshala
  const branch = process.env.GITHUB_BRANCH || 'main';
  if (!token || !repo) {
    publishStatus.lastMethod = 'skip';
    publishStatus.lastTarget = 'blogs.json';
    publishStatus.lastError = 'Missing GITHUB_TOKEN or GITHUB_REPO';
    return;
  }
  publishStatus.lastAttemptAt = new Date().toISOString();
  publishStatus.lastMethod = 'github-contents-api';
  publishStatus.lastTarget = 'blogs.json';
  publishStatus.lastError = null;

  try {
    const normalizedRepo = repo
      .replace(/^https?:\/\/github\.com\//, '')
      .replace(/\.git$/, '')
      .replace(/^\/+/, '')
      .trim();

    if (!normalizedRepo.includes('/')) {
      throw new Error('GITHUB_REPO must be in the format "owner/repo"');
    }

    const apiBase = `https://api.github.com/repos/${normalizedRepo}/contents/blogs.json`;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'aafnotech-blog-admin',
      'X-GitHub-Api-Version': '2022-11-28'
    };

    // Get existing file SHA (required by GitHub API to update existing files)
    let currentSha;
    const getRes = await fetch(`${apiBase}?ref=${encodeURIComponent(branch)}`, { headers });
    if (getRes.ok) {
      const current = await getRes.json();
      currentSha = current.sha;
    } else if (getRes.status !== 404) {
      const details = await getRes.text();
      throw new Error(`Failed to read current blogs.json from GitHub (${getRes.status}): ${details}`);
    }

    const blogsRaw = await fs.readFile(BLOGS_FILE, 'utf8');
    const contentBase64 = Buffer.from(blogsRaw, 'utf8').toString('base64');

    const body = {
      message: 'Auto-update blogs.json [render]',
      content: contentBase64,
      branch
    };
    if (currentSha) body.sha = currentSha;

    const putRes = await fetch(apiBase, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body)
    });

    if (!putRes.ok) {
      const details = await putRes.text();
      throw new Error(`Failed to publish blogs.json to GitHub (${putRes.status}): ${details}`);
    }

    publishStatus.lastSuccessAt = new Date().toISOString();
    publishStatus.lastError = null;
    console.log('blogs.json published to GitHub via Contents API');
  } catch (err) {
    publishStatus.lastError = err.message || String(err);
    console.error('Failed to publish blogs.json to GitHub:', err.message || err);
  }
}

// Auth
function authMiddleware(req, res, next){
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({error:'Missing authorization header'});
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({error:'Invalid authorization header'});
  const token = parts[1];
  try{
    const payload = jwt.verify(token, ADMIN_SECRET);
    req.user = payload;
    next();
  } catch (err){
    return res.status(401).json({error:'Invalid or expired token'});
  }
}

// Login: returns JWT
app.post('/api/login', async (req, res) => {
  const {password} = req.body;
  if (!password) return res.status(400).json({error:'Password required'});
  if (password !== ADMIN_PASSWORD) return res.status(401).json({error:'Invalid password'});
  const token = jwt.sign({role:'admin'}, ADMIN_SECRET, {expiresIn:'8h'});
  res.json({token});
});

// Public: get all blogs
app.get('/api/blogs', async (req, res) => {
  try{
    const blogs = await readBlogs();
    res.json(blogs);
  } catch (err){
    console.error(err);
    res.status(500).json({error:'Failed to read blogs'});
  }
});

// Protected: check publish diagnostics
app.get('/api/push-status', authMiddleware, async (req, res) => {
  res.json(publishStatus);
});

// Protected: create blog
app.post('/api/blogs', authMiddleware, async (req, res) => {
  try{
    const blogs = await readBlogs();
    const post = req.body;
    if (!post || !post.id) return res.status(400).json({error:'Post must have an id'});
    if (blogs.find(b=>b.id===post.id)) return res.status(400).json({error:'Post id already exists'});
    blogs.push(post);
    // sort by date desc
    blogs.sort((a,b)=> new Date(b.date) - new Date(a.date));
    await writeBlogs(blogs);
    res.json({ok:true, post});
    // attempt to push updated blogs.json to GitHub if configured (async)
    pushToGit().catch(e=>console.error(e));
  } catch (err){
    console.error(err);
    res.status(500).json({error:'Failed to create post'});
  }
});

// Protected: update blog by id
app.put('/api/blogs/:id', authMiddleware, async (req, res) => {
  const id = req.params.id;
  try{
    const blogs = await readBlogs();
    const idx = blogs.findIndex(b=>b.id===id);
    if (idx === -1) return res.status(404).json({error:'Post not found'});
    const updated = Object.assign({}, blogs[idx], req.body);
    blogs[idx] = updated;
    blogs.sort((a,b)=> new Date(b.date) - new Date(a.date));
    await writeBlogs(blogs);
    res.json({ok:true, post:updated});
    pushToGit().catch(e=>console.error(e));
  } catch (err){
    console.error(err);
    res.status(500).json({error:'Failed to update post'});
  }
});

// Protected: delete blog
app.delete('/api/blogs/:id', authMiddleware, async (req, res) => {
  const id = req.params.id;
  try{
    let blogs = await readBlogs();
    const idx = blogs.findIndex(b=>b.id===id);
    if (idx === -1) return res.status(404).json({error:'Post not found'});
    const removed = blogs.splice(idx,1)[0];
    await writeBlogs(blogs);
    res.json({ok:true, removed});
    pushToGit().catch(e=>console.error(e));
  } catch (err){
    console.error(err);
    res.status(500).json({error:'Failed to delete post'});
  }
});

app.listen(PORT, ()=>{
  console.log(`Blog admin server running on http://localhost:${PORT}`);
  console.log(`Admin UI: http://localhost:${PORT}/admin`);
});

// Redirect root to the admin UI so visiting the service hostname shows the admin
app.get('/', (req, res) => {
  res.redirect('/admin');
});
