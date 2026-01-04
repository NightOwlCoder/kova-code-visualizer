/**
 * GitHub Stats Visualizer
 * A beautiful visualization of GitHub user statistics
 */

// ============================================
// Constants & Configuration
// ============================================

const API_BASE = 'https://api.github.com';
const DEFAULT_USERNAME = 'kovadj-dev';
const MAX_REPOS_FOR_COMMITS = 5;
const COMMITS_PER_REPO = 30;

// Language colors (matching GitHub's colors)
const LANGUAGE_COLORS = {
    JavaScript: '#f1e05a',
    TypeScript: '#3178c6',
    Python: '#3572A5',
    Java: '#b07219',
    'C++': '#f34b7d',
    C: '#555555',
    'C#': '#178600',
    Go: '#00ADD8',
    Rust: '#dea584',
    Ruby: '#701516',
    PHP: '#4F5D95',
    Swift: '#F05138',
    Kotlin: '#A97BFF',
    Dart: '#00B4AB',
    HTML: '#e34c26',
    CSS: '#563d7c',
    SCSS: '#c6538c',
    Vue: '#41b883',
    Shell: '#89e051',
    Lua: '#000080',
    R: '#198CE7',
    Scala: '#c22d40',
    Haskell: '#5e5086',
    Elixir: '#6e4a7e',
    Clojure: '#db5855',
    Other: '#8b8b8b'
};

// Chart.js theme configuration
const CHART_THEME = {
    fontFamily: "'Inter', sans-serif",
    textColor: '#a0a0a0',
    gridColor: 'rgba(255, 255, 255, 0.05)',
    primaryColor: '#bf5af2',
    primaryGlow: 'rgba(191, 90, 242, 0.4)'
};

// ============================================
// DOM Elements
// ============================================

const elements = {
    usernameInput: document.getElementById('username-input'),
    fetchBtn: document.getElementById('fetch-btn'),
    btnText: document.querySelector('.btn-text'),
    btnLoader: document.querySelector('.btn-loader'),
    errorMessage: document.getElementById('error-message'),
    dashboard: document.getElementById('dashboard'),
    loadingSkeleton: document.getElementById('loading-skeleton'),
    
    // Profile
    userAvatar: document.getElementById('user-avatar'),
    userName: document.getElementById('user-name'),
    userLogin: document.getElementById('user-login'),
    userBio: document.getElementById('user-bio'),
    statRepos: document.getElementById('stat-repos'),
    statStars: document.getElementById('stat-stars'),
    statFollowers: document.getElementById('stat-followers'),
    statFollowing: document.getElementById('stat-following'),
    
    // Sections
    reposList: document.getElementById('repos-list'),
    languagesChart: document.getElementById('languages-chart'),
    languagesLegend: document.getElementById('languages-legend'),
    commitsChart: document.getElementById('commits-chart'),
    contributionsGraph: document.getElementById('contributions-graph')
};

// Chart instances (for cleanup)
let languageChartInstance = null;
let commitsChartInstance = null;

// ============================================
// API Functions
// ============================================

async function fetchWithErrorHandling(url) {
    const response = await fetch(url);
    
    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('User not found. Please check the username and try again.');
        }
        if (response.status === 403) {
            const rateLimitReset = response.headers.get('X-RateLimit-Reset');
            if (rateLimitReset) {
                const resetTime = new Date(parseInt(rateLimitReset) * 1000);
                const minutes = Math.ceil((resetTime - new Date()) / 60000);
                throw new Error(`API rate limit exceeded. Please wait ${minutes} minute(s) and try again.`);
            }
            throw new Error('API rate limit exceeded. Please wait a few minutes and try again.');
        }
        throw new Error(`Failed to fetch data (${response.status}). Please try again.`);
    }
    
    return response.json();
}

async function fetchUserProfile(username) {
    return fetchWithErrorHandling(`${API_BASE}/users/${username}`);
}

async function fetchUserRepos(username) {
    return fetchWithErrorHandling(`${API_BASE}/users/${username}/repos?per_page=100&sort=stars`);
}

async function fetchRepoLanguages(owner, repo) {
    try {
        return await fetchWithErrorHandling(`${API_BASE}/repos/${owner}/${repo}/languages`);
    } catch {
        return {}; // Return empty on error (non-critical)
    }
}

async function fetchRepoCommits(owner, repo) {
    try {
        return await fetchWithErrorHandling(`${API_BASE}/repos/${owner}/${repo}/commits?per_page=${COMMITS_PER_REPO}`);
    } catch {
        return []; // Return empty on error (non-critical)
    }
}

// ============================================
// Data Processing
// ============================================

function calculateTotalStars(repos) {
    return repos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
}

function getTopRepos(repos, limit = 6) {
    return repos
        .filter(repo => !repo.fork) // Exclude forks
        .slice(0, limit);
}

async function aggregateLanguages(repos, username) {
    const languageTotals = {};
    
    // Get languages from top 10 repos to avoid too many API calls
    const topRepos = repos.slice(0, 10);
    
    const languagePromises = topRepos.map(repo => 
        fetchRepoLanguages(username, repo.name)
    );
    
    const results = await Promise.all(languagePromises);
    
    results.forEach(languages => {
        Object.entries(languages).forEach(([lang, bytes]) => {
            languageTotals[lang] = (languageTotals[lang] || 0) + bytes;
        });
    });
    
    // Sort by bytes and get top 8
    const sorted = Object.entries(languageTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
    
    const total = sorted.reduce((sum, [, bytes]) => sum + bytes, 0);
    
    return sorted.map(([name, bytes]) => ({
        name,
        bytes,
        percentage: ((bytes / total) * 100).toFixed(1),
        color: LANGUAGE_COLORS[name] || LANGUAGE_COLORS.Other
    }));
}

async function analyzeCommitHours(repos, username) {
    const hourCounts = new Array(24).fill(0);
    
    // Only analyze top repos to avoid rate limits
    const topRepos = repos.slice(0, MAX_REPOS_FOR_COMMITS);
    
    const commitPromises = topRepos.map(repo => 
        fetchRepoCommits(username, repo.name)
    );
    
    const results = await Promise.all(commitPromises);
    
    results.flat().forEach(commit => {
        if (commit.commit?.author?.date) {
            const hour = new Date(commit.commit.author.date).getHours();
            hourCounts[hour]++;
        }
    });
    
    return hourCounts;
}

// ============================================
// UI Rendering
// ============================================

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
}

function setLoading(loading) {
    elements.fetchBtn.disabled = loading;
    elements.btnText.classList.toggle('hidden', loading);
    elements.btnLoader.classList.toggle('hidden', !loading);
    
    if (loading) {
        elements.dashboard.classList.add('hidden');
        elements.loadingSkeleton.classList.remove('hidden');
    } else {
        elements.loadingSkeleton.classList.add('hidden');
    }
}

function renderProfile(user, totalStars) {
    elements.userAvatar.src = user.avatar_url;
    elements.userAvatar.alt = `${user.login}'s avatar`;
    elements.userName.textContent = user.name || user.login;
    elements.userLogin.textContent = `@${user.login}`;
    elements.userLogin.href = user.html_url;
    elements.userBio.textContent = user.bio || 'No bio available';
    
    // Animate stat numbers
    animateNumber(elements.statRepos, user.public_repos);
    animateNumber(elements.statStars, totalStars);
    animateNumber(elements.statFollowers, user.followers);
    animateNumber(elements.statFollowing, user.following);
}

function animateNumber(element, target) {
    const duration = 1000;
    const start = 0;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(start + (target - start) * eased);
        
        element.textContent = formatNumber(current);
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

function formatNumber(num) {
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
}

function renderRepos(repos) {
    const topRepos = getTopRepos(repos);
    
    elements.reposList.innerHTML = topRepos.map(repo => `
        <a href="${repo.html_url}" target="_blank" class="repo-item">
            <div class="repo-info">
                <div class="repo-name">${escapeHtml(repo.name)}</div>
                <div class="repo-description">${escapeHtml(repo.description || 'No description')}</div>
            </div>
            <div class="repo-stats">
                <span class="repo-stat stars">
                    ★ ${formatNumber(repo.stargazers_count)}
                </span>
                <span class="repo-stat forks">
                    ⑂ ${formatNumber(repo.forks_count)}
                </span>
            </div>
        </a>
    `).join('');
}

function renderLanguageChart(languages) {
    // Destroy existing chart
    if (languageChartInstance) {
        languageChartInstance.destroy();
    }
    
    const ctx = elements.languagesChart.getContext('2d');
    
    languageChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: languages.map(l => l.name),
            datasets: [{
                data: languages.map(l => l.bytes),
                backgroundColor: languages.map(l => l.color),
                borderWidth: 0,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(26, 26, 26, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#a0a0a0',
                    borderColor: 'rgba(191, 90, 242, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        label: (ctx) => {
                            const lang = languages[ctx.dataIndex];
                            return ` ${lang.name}: ${lang.percentage}%`;
                        }
                    }
                }
            }
        }
    });
    
    // Custom legend
    elements.languagesLegend.innerHTML = languages.map(lang => `
        <div class="legend-item">
            <span class="legend-color" style="background: ${lang.color}"></span>
            <span>${lang.name} (${lang.percentage}%)</span>
        </div>
    `).join('');
}

function renderCommitsChart(hourCounts) {
    // Destroy existing chart
    if (commitsChartInstance) {
        commitsChartInstance.destroy();
    }
    
    const ctx = elements.commitsChart.getContext('2d');
    const labels = Array.from({ length: 24 }, (_, i) => {
        if (i === 0) return '12am';
        if (i === 12) return '12pm';
        return i > 12 ? `${i - 12}pm` : `${i}am`;
    });
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 180);
    gradient.addColorStop(0, 'rgba(191, 90, 242, 0.8)');
    gradient.addColorStop(1, 'rgba(191, 90, 242, 0.1)');
    
    commitsChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data: hourCounts,
                backgroundColor: gradient,
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(26, 26, 26, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#a0a0a0',
                    borderColor: 'rgba(191, 90, 242, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        title: (ctx) => `Commits at ${ctx[0].label}`,
                        label: (ctx) => ` ${ctx.raw} commits`
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: CHART_THEME.textColor,
                        font: { size: 10 },
                        maxRotation: 0,
                        callback: function(val, idx) {
                            // Show every 4th label
                            return idx % 4 === 0 ? this.getLabelForValue(val) : '';
                        }
                    }
                },
                y: {
                    grid: {
                        color: CHART_THEME.gridColor
                    },
                    ticks: {
                        color: CHART_THEME.textColor,
                        font: { size: 10 },
                        stepSize: Math.max(1, Math.ceil(Math.max(...hourCounts) / 5))
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

function renderContributionGraph(username) {
    // Using GitHub's contribution graph via a third-party service
    // ghchart.rshah.org provides contribution graphs as images
    elements.contributionsGraph.src = `https://ghchart.rshah.org/bf5af2/${username}`;
    elements.contributionsGraph.alt = `${username}'s contribution graph`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// Main Controller
// ============================================

async function fetchAndDisplayStats(username) {
    hideError();
    setLoading(true);
    
    try {
        // Fetch user profile first
        const user = await fetchUserProfile(username);
        
        // Fetch repos
        const repos = await fetchUserRepos(username);
        const totalStars = calculateTotalStars(repos);
        
        // Render profile immediately
        renderProfile(user, totalStars);
        renderRepos(repos);
        renderContributionGraph(username);
        
        // Show dashboard
        elements.dashboard.classList.remove('hidden');
        setLoading(false);
        
        // Fetch and render charts (can complete async)
        const [languages, hourCounts] = await Promise.all([
            aggregateLanguages(repos, username),
            analyzeCommitHours(repos, username)
        ]);
        
        renderLanguageChart(languages);
        renderCommitsChart(hourCounts);
        
    } catch (error) {
        setLoading(false);
        showError(error.message);
        elements.dashboard.classList.add('hidden');
    }
}

// ============================================
// Event Handlers
// ============================================

function handleFetch() {
    const username = elements.usernameInput.value.trim();
    
    if (!username) {
        showError('Please enter a GitHub username');
        return;
    }
    
    // Basic validation
    if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(username)) {
        showError('Invalid username format');
        return;
    }
    
    fetchAndDisplayStats(username);
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        handleFetch();
    }
}

// ============================================
// Initialization
// ============================================

function init() {
    // Event listeners
    elements.fetchBtn.addEventListener('click', handleFetch);
    elements.usernameInput.addEventListener('keypress', handleKeyPress);
    
    // Auto-fetch default user on load (optional - uncomment to enable)
    // fetchAndDisplayStats(DEFAULT_USERNAME);
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
