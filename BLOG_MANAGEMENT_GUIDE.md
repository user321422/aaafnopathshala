# Blog Management Guide

The blog system on aafnotech allows you to add and manage blog posts **without editing HTML or JavaScript**. All blog content is stored in a single JSON file that the website reads automatically.

## How It Works

- **Blog Data**: All blog posts are stored in `blogs.json`
- **Blog Listing**: `blog.html` displays all blogs from `blogs.json`
- **Individual Posts**: `blog-post.html` displays the full content of each blog post
- **Dynamic Loading**: JavaScript automatically fetches and renders blog posts from the JSON file

## Adding a New Blog Post

### Step 1: Open `blogs.json`

The file looks like this:
```json
[
  {
    "id": "web-development-guide",
    "title": "Web Development Guide for Nepal Startups",
    "excerpt": "A practical guide to building your first website in 2024...",
    "content": "## Getting Started...",
    "author": "Narayan Adhikari",
    "date": "2024-01-15",
    "category": "Web Development",
    "readTime": "5 min read"
  },
  ...
]
```

### Step 2: Add Your Blog Post

Copy the template below and add it to the `blogs.json` array:

```json
{
  "id": "your-blog-slug-here",
  "title": "Your Blog Title Here",
  "excerpt": "A short 1-2 sentence summary of your blog post (shows on listing page)",
  "content": "## Main Heading\n\nYour blog content here...",
  "author": "Your Name",
  "date": "2024-01-20",
  "category": "Category Name",
  "readTime": "5 min read"
}
```

### Field Descriptions

| Field | Description | Example |
|-------|-------------|---------|
| `id` | Unique slug (no spaces, lowercase, hyphens ok) | `"my-first-blog"` |
| `title` | Blog post title | `"Getting Started with SEO"` |
| `excerpt` | Short summary for the blog listing page | `"Learn the basics of SEO..."` |
| `content` | Full blog post content (markdown-style) | See content formatting below |
| `author` | Author name | `"Narayan Adhikari"` |
| `date` | Publication date (YYYY-MM-DD) | `"2024-01-20"` |
| `category` | Blog category/topic | `"Web Development"` |
| `readTime` | Estimated read time | `"5 min read"` |

## Content Formatting

The `content` field supports markdown-style formatting:

```
## Main Heading

Your paragraph text here. This will appear as a normal paragraph.

### Subheading

More content under the subheading.

1. First item
2. Second item
3. Third item

- Bullet point
- Another bullet
- One more
```

**Supported Formatting:**
- `##` → Main heading (h2)
- `###` → Subheading (h3)
- `1. 2. 3.` → Numbered lists
- `- • ◦` → Bullet points
- Regular text → Paragraph

## Complete Example

Here's a complete blog post example to copy:

```json
{
  "id": "seo-tips-for-nepal-businesses",
  "title": "10 SEO Tips for Nepal Businesses in 2024",
  "excerpt": "Practical SEO strategies to help your Nepali business rank higher in Google and reach more customers online.",
  "content": "## Why SEO Matters for Your Business\n\nSearch engine optimization (SEO) helps your website appear in Google search results when potential customers search for your services.\n\n### The Benefits\n\n1. More website traffic\n2. Better visibility online\n3. Higher conversion rates\n4. Long-term growth\n\n## Key SEO Strategies\n\n### On-Page SEO\n\n- Use relevant keywords in your title and headings\n- Write clear meta descriptions\n- Make sure your website loads fast\n- Use proper heading structure (h1, h2, h3)\n\n### Off-Page SEO\n\nBuild backlinks from reputable websites. Quality matters more than quantity.\n\n## Next Steps\n\nStart with keyword research for your business. Contact us if you need professional SEO help.",
  "author": "Narayan Adhikari",
  "date": "2024-01-20",
  "category": "SEO",
  "readTime": "7 min read"
}
```

## Important Notes

1. **JSON Syntax**: Make sure your JSON is valid. Use a JSON validator if needed: https://jsonlint.com/

2. **Date Format**: Always use `YYYY-MM-DD` format for dates (e.g., `2024-01-20`)

3. **Unique IDs**: Each blog post must have a unique `id`. This is used in the URL when someone clicks your blog.

4. **Read Time**: Estimate roughly 1 minute per 200 words (e.g., 1000 words = 5 min read)

5. **Order**: Posts are automatically sorted by date (newest first) on the blog listing page.

## Testing Your Blog Post

After adding a new blog post to `blogs.json`:

1. Go to `blog.html` — you should see your new post in the listing
2. Click on your post to view the full content on `blog-post.html`
3. Check that all formatting looks correct
4. Share the blog link!

## Troubleshooting

**Blog post doesn't appear in listing?**
- Check that `blogs.json` has valid JSON syntax (use https://jsonlint.com/)
- Make sure the file is saved

**Blog content formatting looks wrong?**
- Verify you used `##` for headings (not `#`)
- Check that list items start with `1.`, `2.`, etc. or `-` for bullets
- Make sure line breaks are included (`\n`)

**Browser shows "Error loading post"?**
- Check the browser console (F12) for errors
- Verify that `blogs.json` file exists and is valid JSON

## Dashboard/Admin Interface (Future)

For now, blog management is done by editing `blogs.json`. In the future, we can add:
- A simple admin interface to add blogs without editing JSON
- Draft/published status
- Featured blog section
- Author profiles

---

**Questions?** Contact aafnopathshala@gmail.com
