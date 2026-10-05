# Knowletive Website

Official website for **Knowletive** — career guidance, training, placement services, overseas education, and business consulting.

## 🚀 Project Structure

```text
/
├── public/
│   ├── downloads/
│   │   └── Knowletive_Career_Guide.pdf
│   ├── images/
│   │   ├── logos/               # Hiring partner SVG logos
│   │   ├── ...                  # Course cards, hero images & collage
│   │   └── knowletive-logo-optimized.png
│   ├── videos/
│   │   └── testimonials/        # Student story reels & posters
│   ├── favicon.ico
│   ├── favicon.svg
│   └── robots.txt
├── src/
│   ├── components/              # Header, Footer, Hero, Services, Courses, etc.
│   ├── layouts/
│   │   └── BaseLayout.astro     # Core SEO, layout & styling shell
│   ├── pages/                   # All Astro routes & content pages
│   └── styles/
│       └── global.css           # Tailwind v4 configuration & theme tokens
├── astro.config.mjs
└── package.json
```

## 🧞 Commands

| Command           | Action                                       |
| :---------------- | :------------------------------------------- |
| `npm run dev`     | Starts local dev server at `localhost:4321`  |
| `npm run build`   | Build production static site into `./dist/`  |
| `npm run preview` | Preview production build locally             |
