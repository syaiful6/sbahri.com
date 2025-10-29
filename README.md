# Sbahri Blog

A modern developer blog built with Hugo, custom theme, and deployed to Cloudflare Pages.

## Features

- **Hugo** - Fast static site generator
- **Custom Theme** - Minimal, developer-focused design
- **Nix Flakes** - Reproducible development environment
- **Bun** - Fast JavaScript runtime for build tools
- **SCSS** - Modern CSS with Sass
- **Shiki** - Build-time syntax highlighting (VS Code tokenizer)
- **Markdown Linting** - Consistent markdown formatting
- **GitHub Actions** - Automated CI/CD
- **Cloudflare Pages** - Global CDN hosting with custom domain support

## Getting Started

### Prerequisites

- [Nix](https://nixos.org/download.html) with flakes enabled

### Development

Enter the Nix development shell (automatically installs Hugo, Bun, Node.js, and markdownlint):

```bash
nix develop
```

Build CSS and start the Hugo development server:

```bash
bun run dev
```

Visit `http://localhost:1313` to see your site.

### Creating Content

Create a new post:

```bash
hugo new posts/my-new-post.md
```

Edit the file in `content/posts/my-new-post.md` and set `draft: false` when ready to publish.

### Building

Full production build with CSS compilation and syntax highlighting:

```bash
bun run build
```

The generated site will be in the `public/` directory.

#### Build Scripts

- `bun run build` - Full production build (CSS + Hugo + Shiki highlighting)
- `bun run dev` - Development server with live reload
- `bun run build:css` - Compile SCSS to CSS
- `bun run highlight` - Apply Shiki syntax highlighting to generated HTML
- `bun run lint:md` - Lint markdown files

## Theme Development

The custom theme is located in `themes/sbahri/` with the following structure:

```
themes/sbahri/
├── assets/
│   ├── scss/           # SCSS source files
│   │   ├── _variables.scss
│   │   ├── _base.scss
│   │   ├── _layout.scss
│   │   └── main.scss
│   └── css/            # Generated CSS (gitignored)
├── layouts/
│   ├── _default/
│   │   ├── baseof.html
│   │   ├── list.html
│   │   └── single.html
│   ├── partials/
│   │   ├── header.html
│   │   └── footer.html
│   └── index.html
└── theme.toml
```

### Styling

Edit SCSS files in `themes/sbahri/assets/scss/` and run:

```bash
bun run build:css
```

## Syntax Highlighting

This blog uses Shiki for build-time syntax highlighting with the VS Code tokenizer. Code blocks are highlighted during the build process for optimal performance.

Supported languages: TypeScript, JavaScript, Python, Rust, Go, Bash, JSON, YAML, TOML, Markdown, HTML, CSS, SCSS.

To add more languages, edit `scripts/highlight.ts`.

## Deployment

This site is automatically deployed to Cloudflare Pages via GitHub Actions when you push to the `main` branch.

### Setup Cloudflare Pages

1. Create a Cloudflare Pages project (e.g., `sbahri-blog`)
2. Connect your GitHub repository
3. Add the following secrets to your GitHub repository:
   - `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token with Pages edit permissions
   - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID
4. Update `projectName` in `.github/workflows/deploy.yml` if needed

### Custom Domain

Cloudflare Pages fully supports custom domains:

1. Go to your Cloudflare Pages project settings
2. Add your custom domain under "Custom domains"
3. Cloudflare will automatically handle DNS and SSL
4. Update the `baseURL` in `hugo.toml` to match your domain

## Project Structure

```
.
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions workflow
├── content/                    # Blog content
│   ├── posts/                 # Blog posts
│   │   ├── _index.md
│   │   └── *.md
│   └── about.md               # About page
├── scripts/                   # Build scripts
│   ├── build-css.ts          # SCSS compilation
│   └── highlight.ts           # Shiki syntax highlighting
├── themes/sbahri/             # Custom theme
│   ├── assets/
│   ├── layouts/
│   └── static/
├── flake.nix                  # Nix flake configuration
├── package.json               # Bun dependencies & scripts
├── hugo.toml                  # Hugo configuration
├── .markdownlint.json         # Markdown linting rules
└── README.md
```

## Development Tools

### Markdown Linting

Lint all markdown files:

```bash
bun run lint:md
```

Configuration in `.markdownlint.json`.

### Nix Environment

The `flake.nix` provides a reproducible development environment with:
- Hugo (static site generator)
- Bun (JavaScript runtime)
- Node.js (for compatibility)
- markdownlint-cli (markdown linting)
- Git (version control)

## License

MIT
