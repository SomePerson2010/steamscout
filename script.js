// Global state
let currentProvider = 'openai';
let apiKey = null;
let selectedGenres = [];
let isSearching = false;

// Genre list
const GENRES = [
    'First Person Shooter', 'Platformer', 'RPG', 'Adventure', 'Sandbox', 'Horror',
    'Psychological Horror', 'Relaxing', 'Online', 'Story-Based', 'Puzzle', 'Strategy',
    'Fighting', 'Metroidvania', 'Fast-Paced', 'Open World', 'Exploration', 'Survival',
    'Single-Player', 'Multiplayer', 'Indie'
];

// Popular games data
const POPULAR_GAMES = [
    {
        id: '1',
        name: 'Counter-Strike 2',
        description: 'The legendary tactical shooter returns with enhanced graphics and refined gameplay mechanics.',
        logo: 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400',
        steamUrl: 'https://store.steampowered.com/app/730/CounterStrike_2/',
        genres: ['First Person Shooter', 'Online', 'Multiplayer', 'Fast-Paced'],
        rating: 4.8,
        players: '1.5M',
        releaseDate: '2023'
    },
    {
        id: '2',
        name: 'Baldur\'s Gate 3',
        description: 'An epic RPG adventure with deep storytelling and strategic turn-based combat.',
        logo: 'https://images.pexels.com/photos/1174746/pexels-photo-1174746.jpeg?auto=compress&cs=tinysrgb&w=400',
        steamUrl: 'https://store.steampowered.com/app/1086940/Baldurs_Gate_3/',
        genres: ['RPG', 'Story-Based', 'Adventure', 'Single-Player', 'Multiplayer'],
        rating: 4.9,
        players: '875K',
        releaseDate: '2023'
    },
    {
        id: '3',
        name: 'Hogwarts Legacy',
        description: 'Experience life as a student at Hogwarts in this immersive open-world RPG.',
        logo: 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=400',
        steamUrl: 'https://store.steampowered.com/app/990080/Hogwarts_Legacy/',
        genres: ['RPG', 'Open World', 'Adventure', 'Single-Player', 'Exploration'],
        rating: 4.7,
        players: '650K',
        releaseDate: '2023'
    }
];

// Utility functions
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

function getGameLogo(gameName) {
    const hash = simpleHash(gameName);
    const gameThemeImages = [
        'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400',
        'https://images.pexels.com/photos/163064/play-stone-network-networked-interactive-163064.jpeg?auto=compress&cs=tinysrgb&w=400',
        'https://images.pexels.com/photos/194511/pexels-photo-194511.jpeg?auto=compress&cs=tinysrgb&w=400',
        'https://images.pexels.com/photos/1174746/pexels-photo-1174746.jpeg?auto=compress&cs=tinysrgb&w=400',
        'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=400',
        'https://images.pexels.com/photos/735911/pexels-photo-735911.jpeg?auto=compress&cs=tinysrgb&w=400',
        'https://images.pexels.com/photos/1591447/pexels-photo-1591447.jpeg?auto=compress&cs=tinysrgb&w=400',
        'https://images.pexels.com/photos/1670977/pexels-photo-1670977.jpeg?auto=compress&cs=tinysrgb&w=400'
    ];
    return gameThemeImages[hash % gameThemeImages.length];
}

// AI Service functions
async function callOpenAI(prompt) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 1500
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenAI API request failed');
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

async function callGemini(prompt) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1500
            }
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Gemini API request failed');
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

function parseAIResponse(response) {
    try {
        return JSON.parse(response);
    } catch (error) {
        try {
            const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[1]);
            }

            const jsonStart = response.indexOf('{');
            const jsonEnd = response.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                const jsonStr = response.substring(jsonStart, jsonEnd + 1);
                return JSON.parse(jsonStr);
            }

            return createFallbackResponse(response);
        } catch (fallbackError) {
            console.error('Failed to parse AI response:', response);
            throw new Error('AI response could not be parsed. Please try again.');
        }
    }
}

function createFallbackResponse(response) {
    const games = [];
    const lines = response.split(/\n+/);
    let currentGame = null;
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        if (trimmedLine.match(/^\d+\.?\s+/) || trimmedLine.match(/^[*-]\s+/) || trimmedLine.includes('Game:') || trimmedLine.includes('Title:')) {
            if (currentGame) {
                games.push(currentGame);
            }
            currentGame = {
                name: trimmedLine.replace(/^\d+\.?\s+|^[*-]\s+|Game:\s*|Title:\s*/i, '').trim(),
                description: '',
                genres: []
            };
        } else if (currentGame && (trimmedLine.includes('Description:') || trimmedLine.includes('About:'))) {
            currentGame.description = trimmedLine.replace(/Description:\s*|About:\s*/i, '').trim();
        } else if (currentGame && (trimmedLine.includes('Genre') || trimmedLine.includes('Tag'))) {
            const genreText = trimmedLine.replace(/Genre[s]?:\s*|Tag[s]?:\s*/i, '').trim();
            currentGame.genres = genreText.split(/[,;]/).map(g => g.trim()).filter(g => g);
        } else if (currentGame && !currentGame.description && trimmedLine.length > 20) {
            currentGame.description = trimmedLine;
        }
    }
    
    if (currentGame) {
        games.push(currentGame);
    }
    
    if (games.length === 0) {
        games.push({
            name: 'Steam Game Recommendation',
            description: 'Unable to parse specific game recommendations from AI response. Please try rephrasing your query.',
            genres: ['Adventure']
        });
    }
    
    return { games: games.slice(0, 3) };
}

async function searchGames(query, genres) {
    const genreFilter = genres.length > 0 
        ? ` The games must include at least one of these genres: ${genres.join(', ')}.`
        : '';

    const prompt = `You are a Steam game recommendation expert. Based on the user's query: "${query}"${genreFilter}

Please recommend exactly 3 Steam games that match this request. For each game, provide:
1. The exact game name as it appears on Steam
2. A 2-3 sentence description explaining why it fits the request
3. The main genres from this list: First Person Shooter, Platformer, RPG, Adventure, Sandbox, Horror, Psychological Horror, Relaxing, Online, Story-Based, Puzzle, Strategy, Fighting, Metroidvania, Fast-Paced, Open World, Exploration, Survival, Single-Player, Multiplayer, Indie
4. The Steam App ID if you know it (the number in the Steam URL)

Respond in this exact JSON format:
{
  "games": [
    {
      "name": "Game Name",
      "description": "2-3 sentence description",
      "genres": ["Genre1", "Genre2"],
      "appId": "123456"
    }
  ]
}

Only recommend real games that exist on Steam. If you know the Steam App ID, include it. Make sure the descriptions are engaging and explain why each game fits the user's request.`;

    const aiResponse = currentProvider === 'openai' ? await callOpenAI(prompt) : await callGemini(prompt);
    const parsedResponse = parseAIResponse(aiResponse);

    return parsedResponse.games.map((game, index) => ({
        id: `ai-${Date.now()}-${index}`,
        name: game.name,
        description: game.description,
        logo: getGameLogo(game.name),
        steamUrl: game.appId ? 
            `https://store.steampowered.com/app/${game.appId}/` : 
            `https://store.steampowered.com/search/?term=${encodeURIComponent(game.name)}`,
        genres: game.genres
    }));
}

// DOM manipulation functions
function createGameCard(game, showStats = false) {
    const card = document.createElement('a');
    card.href = game.steamUrl;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.className = 'game-card';

    const statsHtml = showStats ? `
        <div class="game-stats">
            <div class="game-stat rating">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                </svg>
                ${game.rating}
            </div>
            <div class="game-stat">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                ${game.players}
            </div>
            <div class="game-stat">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                ${game.releaseDate}
            </div>
        </div>
    ` : '';

    const genresHtml = game.genres ? `
        <div class="game-genres">
            ${game.genres.slice(0, 3).map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
            ${game.genres.length > 3 ? `<span class="genre-tag">+${game.genres.length - 3} more</span>` : ''}
        </div>
    ` : '';

    card.innerHTML = `
        <div class="game-image">
            <img src="${game.logo}" alt="${game.name}" onerror="this.src='https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400'">
        </div>
        <div class="game-content">
            <div class="game-header">
                <h3 class="game-title">${game.name}</h3>
                <svg class="external-link" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15,3 21,3 21,9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
            </div>
            <p class="game-description">${game.description}</p>
            ${statsHtml}
            ${genresHtml}
        </div>
    `;

    return card;
}

function populatePopularGames() {
    const container = document.getElementById('popularGames');
    container.innerHTML = '';
    
    POPULAR_GAMES.forEach(game => {
        const card = createGameCard(game, true);
        container.appendChild(card);
    });
}

function createGenreFilters() {
    const container = document.getElementById('genreFilters');
    container.innerHTML = '';
    
    GENRES.forEach(genre => {
        const wrapper = document.createElement('div');
        wrapper.className = 'genre-checkbox';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `genre-${genre.replace(/\s+/g, '-').toLowerCase()}`;
        checkbox.value = genre;
        checkbox.addEventListener('change', handleGenreToggle);
        
        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.textContent = genre;
        
        wrapper.appendChild(checkbox);
        wrapper.appendChild(label);
        container.appendChild(wrapper);
    });
}

function updateGenreCount() {
    document.getElementById('genreCount').textContent = selectedGenres.length;
    const clearBtn = document.getElementById('clearFilters');
    clearBtn.style.display = selectedGenres.length > 0 ? 'block' : 'none';
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.querySelector('p').textContent = message;
    errorDiv.style.display = 'block';
}

function hideError() {
    document.getElementById('errorMessage').style.display = 'none';
}

function showResults(games) {
    const resultsSection = document.getElementById('searchResults');
    const resultsGrid = document.getElementById('resultsGrid');
    const emptyState = document.getElementById('emptyState');
    
    resultsGrid.innerHTML = '';
    
    if (games.length > 0) {
        games.forEach(game => {
            const card = createGameCard(game);
            resultsGrid.appendChild(card);
        });
        resultsSection.style.display = 'block';
        emptyState.style.display = 'none';
    } else {
        resultsSection.style.display = 'none';
        emptyState.style.display = 'block';
    }
}

function hideResults() {
    document.getElementById('searchResults').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
}

function updateUIState() {
    const hasApiKey = !!apiKey;
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const toggleFilters = document.getElementById('toggleFilters');
    const apiWarning = document.getElementById('apiWarning');
    const settingsBtn = document.getElementById('settingsBtn');
    const genreCheckboxes = document.querySelectorAll('#genreFilters input');
    
    searchInput.disabled = !hasApiKey;
    searchBtn.disabled = !hasApiKey;
    toggleFilters.disabled = !hasApiKey;
    
    genreCheckboxes.forEach(checkbox => {
        checkbox.disabled = !hasApiKey;
    });
    
    apiWarning.style.display = hasApiKey ? 'none' : 'block';
    settingsBtn.style.display = hasApiKey ? 'block' : 'none';
}

// Event handlers
function handleProviderChange(provider) {
    currentProvider = provider;
    const buttons = document.querySelectorAll('.provider-btn');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const openaiLink = document.getElementById('openaiLink');
    const geminiLink = document.getElementById('geminiLink');
    
    buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.provider === provider);
    });
    
    apiKeyInput.placeholder = `Enter your ${provider === 'openai' ? 'OpenAI' : 'Google Gemini'} API key`;
    
    if (provider === 'openai') {
        openaiLink.style.display = 'flex';
        geminiLink.style.display = 'none';
    } else {
        openaiLink.style.display = 'none';
        geminiLink.style.display = 'flex';
    }
}

function handleApiKeySubmit(event) {
    event.preventDefault();
    const apiKeyInput = document.getElementById('apiKeyInput');
    const key = apiKeyInput.value.trim();
    
    if (key) {
        apiKey = key;
        localStorage.setItem('steamscout_api_key', key);
        localStorage.setItem('steamscout_provider', currentProvider);
        
        document.getElementById('apiModal').style.display = 'none';
        updateUIState();
        hideError();
    }
}

function handleGenreToggle(event) {
    const genre = event.target.value;
    if (event.target.checked) {
        if (!selectedGenres.includes(genre)) {
            selectedGenres.push(genre);
        }
    } else {
        selectedGenres = selectedGenres.filter(g => g !== genre);
    }
    updateGenreCount();
}

function clearFilters() {
    selectedGenres = [];
    const checkboxes = document.querySelectorAll('#genreFilters input');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    updateGenreCount();
    
    document.getElementById('searchInput').value = '';
    hideResults();
    hideError();
}

function resetApiKey() {
    localStorage.removeItem('steamscout_api_key');
    localStorage.removeItem('steamscout_provider');
    apiKey = null;
    document.getElementById('apiModal').style.display = 'flex';
    updateUIState();
    hideResults();
    hideError();
}

async function handleSearch() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query || !apiKey || isSearching) return;
    
    isSearching = true;
    hideError();
    hideResults();
    
    const searchBtn = document.getElementById('searchBtn');
    const searchIcon = searchBtn.querySelector('.search-icon');
    const loadingSpinner = searchBtn.querySelector('.loading-spinner');
    
    searchIcon.style.display = 'none';
    loadingSpinner.style.display = 'block';
    searchBtn.disabled = true;
    
    try {
        const results = await searchGames(query, selectedGenres);
        showResults(results);
    } catch (error) {
        console.error('Search error:', error);
        showError(error.message || 'An error occurred while searching for games.');
    } finally {
        isSearching = false;
        searchIcon.style.display = 'block';
        loadingSpinner.style.display = 'none';
        searchBtn.disabled = false;
    }
}

// Initialize the application
function init() {
    // Check for stored API key
    const storedApiKey = localStorage.getItem('steamscout_api_key');
    const storedProvider = localStorage.getItem('steamscout_provider');
    
    if (storedApiKey && storedProvider) {
        apiKey = storedApiKey;
        currentProvider = storedProvider;
        document.getElementById('apiModal').style.display = 'none';
        handleProviderChange(currentProvider);
    }
    
    // Populate initial content
    populatePopularGames();
    createGenreFilters();
    updateUIState();
    
    // Set up event listeners
    document.querySelectorAll('.provider-btn').forEach(btn => {
        btn.addEventListener('click', () => handleProviderChange(btn.dataset.provider));
    });
    
    document.getElementById('toggleApiKey').addEventListener('click', () => {
        const input = document.getElementById('apiKeyInput');
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        
        const eyeIcon = document.querySelector('.eye-icon');
        if (isPassword) {
            eyeIcon.innerHTML = `
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v6m0 6v6"/>
            `;
        } else {
            eyeIcon.innerHTML = `
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                <circle cx="12" cy="12" r="3"/>
            `;
        }
    });
    
    document.getElementById('apiForm').addEventListener('submit', handleApiKeySubmit);
    
    document.getElementById('settingsBtn').addEventListener('click', resetApiKey);
    
    document.getElementById('toggleFilters').addEventListener('click', () => {
        const filters = document.getElementById('genreFilters');
        const isVisible = filters.style.display !== 'none';
        filters.style.display = isVisible ? 'none' : 'grid';
    });
    
    document.getElementById('clearFilters').addEventListener('click', clearFilters);
    
    document.getElementById('searchBtn').addEventListener('click', handleSearch);
    
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    
    // Initialize provider selection
    handleProviderChange(currentProvider);
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);