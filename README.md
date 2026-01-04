# GitHub Stats Visualizer

A beautiful, interactive visualization of GitHub user statistics. Built as a portfolio piece showcasing modern web development with a stunning purple/neon aesthetic.

![Preview](preview.png)

## Features

- 🔍 **User Search** - Look up any GitHub user's stats
- 👤 **Profile Card** - Avatar, name, bio, and key metrics
- 📊 **Language Distribution** - Doughnut chart of programming languages
- ⏰ **Commit Activity** - Bar chart showing coding hours
- 📈 **Contribution Graph** - Yearly activity heatmap
- ⭐ **Top Repositories** - Most starred repos with descriptions

## Tech Stack

- **HTML5** - Semantic, accessible markup
- **CSS3** - Modern styling with CSS variables, Grid, Flexbox
- **Vanilla JavaScript** - No framework dependencies
- **Chart.js** - Beautiful, responsive charts (loaded from CDN)
- **Google Fonts** - Inter & JetBrains Mono

## Design

- **Primary Color**: `#bf5af2` (Neon Purple)
- **Secondary Color**: `#9b4dca` (Deep Purple)
- **Background**: `#0d0d0d` (Near Black)
- **Aesthetic**: Dark mode with glowing accents

## Usage

1. Open `index.html` in a browser
2. Enter a GitHub username (default: `kovadj-dev`)
3. Click "Fetch Stats" or press Enter
4. Explore the visualizations!

## API Rate Limits

This app uses GitHub's public API (no authentication required):
- 60 requests per hour per IP
- If rate limited, wait message with remaining time is shown

## File Structure

```
code-visualizer/
├── index.html      # Main HTML structure (~7KB)
├── styles.css      # Purple/neon theme (~12KB)
├── app.js          # All JavaScript logic (~17KB)
└── README.md       # This file
```

**Total Size**: ~36KB (excluding README)

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT License - Feel free to use for your portfolio!

---

Built with 💜 by [Kova](https://github.com/kovadj-dev)
