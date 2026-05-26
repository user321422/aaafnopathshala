require('dotenv').config();
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const morgan = require('morgan');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const app = express();
const BLOGS_FILE = path.join(__dirname, 'blogs.json');
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'please-change-this-secret';

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
  const tmp = BLOGS_FILE + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmp, BLOGS_FILE);
}

async function pushToGit(){
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO; // e.g. user321422/aaafnopathshala
  const branch = process.env.GITHUB_BRANCH || 'main';
  if (!token || !repo) {
    return;
  }
  // Use HTTPS remote with token for authenticated push
  const remoteUrl = `https://x-access-token:${token}@github.com/${repo}.git`;
  try{
    // configure git user
    const out1 = await exec('git config user.email "render@aafnotech"', {cwd: __dirname});
    const out2 = await exec('git config user.name "aafnotech-bot"', {cwd: __dirname});
    console.log('git config set:', out1.stdout || '', out2.stdout || '');
    // set remote temporarily
    const outRemote = await exec(`git remote set-url origin ${remoteUrl}`, {cwd: __dirname});
    console.log('git remote set-url:', outRemote.stdout || outRemote.stderr || '');
    // add, commit if there are changes, and push
    const outAdd = await exec('git add blogs.json', {cwd: __dirname});
    console.log('git add:', outAdd.stdout || outAdd.stderr || '');
    // commit may fail if no changes; capture output
    try{
      const outCommit = await exec('git commit -m "Auto-update blogs.json [render]"', {cwd: __dirname});
      console.log('git commit:', outCommit.stdout || outCommit.stderr || '');
    } catch(commitErr){
      console.log('git commit (no changes or commit error):', commitErr.message || commitErr.stderr || commitErr);
    }
    const outPush = await exec(`git push origin ${branch}`, {cwd: __dirname});
    console.log('git push stdout:', outPush.stdout || '');
    console.log('blogs.json pushed to GitHub');
  } catch (err){
    console.error('Failed to push blogs.json to GitHub:', err.message || err);
    if (err.stdout) console.error('stdout:', err.stdout);
    if (err.stderr) console.error('stderr:', err.stderr);
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
