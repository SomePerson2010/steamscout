import React, { useState, useEffect } from 'react';
import { Search, Filter, ExternalLink, Gamepad2, Star, Users, Calendar, Settings } from 'lucide-react';
import { ApiKeyModal } from './components/ApiKeyModal';
import { AIService } from './services/aiService';

interface Game {
  id: string;
  name: string;
  description: string;
  logo: string;
  steamUrl: string;
  genres: string[];
  rating?: number;
  players?: string;
  releaseDate?: string;
}

const GENRES = [
  'First Person Shooter', 'Platformer', 'RPG', 'Adventure', 'Sandbox', 'Horror',
  'Psychological Horror', 'Relaxing', 'Online', 'Story-Based', 'Puzzle', 'Strategy',
  'Fighting', 'Metroidvania', 'Fast-Paced', 'Open World', 'Exploration', 'Survival',
  'Single-Player', 'Multiplayer', 'Indie'
];

// Popular games data (static for demo)
const POPULAR_GAMES: Game[] = [
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

function App() {
  const [query, setQuery] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<Game[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showApiModal, setShowApiModal] = useState(true);
  const [aiService, setAiService] = useState<AIService | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check for stored API key on component mount
  useEffect(() => {
    const storedApiKey = localStorage.getItem('steamscout_api_key');
    const storedProvider = localStorage.getItem('steamscout_provider') as 'openai' | 'gemini';
    
    if (storedApiKey && storedProvider) {
      setAiService(new AIService(storedApiKey, storedProvider));
      setShowApiModal(false);
    }
  }, []);

  const handleApiKeySubmit = (apiKey: string, provider: 'openai' | 'gemini') => {
    // Store API key locally
    localStorage.setItem('steamscout_api_key', apiKey);
    localStorage.setItem('steamscout_provider', provider);
    
    setAiService(new AIService(apiKey, provider));
    setShowApiModal(false);
    setError(null);
  };

  const handleGenreToggle = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre) 
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const handleSearch = async () => {
    if (!query.trim() || !aiService) return;
    
    setIsSearching(true);
    setError(null);
    
    try {
      const results = await aiService.searchGames(query, selectedGenres);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while searching for games.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const clearFilters = () => {
    setSelectedGenres([]);
    setQuery('');
    setSearchResults([]);
    setError(null);
  };

  const resetApiKey = () => {
    localStorage.removeItem('steamscout_api_key');
    localStorage.removeItem('steamscout_provider');
    setAiService(null);
    setShowApiModal(true);
    setSearchResults([]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {/* API Key Modal */}
      <ApiKeyModal 
        isOpen={showApiModal} 
        onSubmit={handleApiKeySubmit}
      />

      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-center flex-1">
              <Gamepad2 className="w-8 h-8 text-blue-400 mr-3" />
              <h1 className="text-3xl font-bold text-white">SteamScout</h1>
              <span className="ml-3 px-3 py-1 bg-blue-500 text-white text-sm rounded-full">AI-Powered</span>
            </div>
            {aiService && (
              <button
                onClick={resetApiKey}
                className="flex items-center text-slate-400 hover:text-white transition-colors"
                title="Change API Key"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
          </div>
          <p className="text-center text-slate-300 mt-2">Discover your next gaming adventure with intelligent AI recommendations</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Popular Games Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <Star className="w-6 h-6 text-yellow-400 mr-2" />
            Trending on Steam
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {POPULAR_GAMES.map((game) => (
              <a
                key={game.id}
                href={game.steamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group block bg-slate-800/50 backdrop-blur-sm rounded-xl overflow-hidden border border-slate-700 hover:border-blue-500 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/20"
              >
                <div className="aspect-video overflow-hidden">
                  <img
                    src={game.logo}
                    alt={game.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors">
                      {game.name}
                    </h3>
                    <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors flex-shrink-0 ml-2" />
                  </div>
                  <p className="text-slate-300 text-sm mb-4 line-clamp-2">{game.description}</p>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 mr-1" />
                      {game.rating}
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      {game.players}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {game.releaseDate}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Search Section */}
        <section className="mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Search className="w-6 h-6 text-blue-400 mr-2" />
              Find Your Perfect Game
            </h2>
            
            {/* Search Input */}
            <div className="relative mb-6">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Describe what kind of game you're looking for... (e.g., 'I want a relaxing farming game' or 'Show me fast-paced multiplayer shooters')"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                disabled={!aiService}
              />
              <button
                onClick={handleSearch}
                disabled={!query.trim() || isSearching || !aiService}
                className="absolute right-2 top-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-md transition-colors flex items-center"
              >
                {isSearching ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Genre Filters */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center text-white hover:text-blue-400 transition-colors"
                  disabled={!aiService}
                >
                  <Filter className="w-5 h-5 mr-2" />
                  Filter by Genre ({selectedGenres.length} selected)
                </button>
                {selectedGenres.length > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
              
              {showFilters && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pt-4">
                  {GENRES.map((genre) => (
                    <label
                      key={genre}
                      className="flex items-center space-x-2 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={selectedGenres.includes(genre)}
                        onChange={() => handleGenreToggle(genre)}
                        disabled={!aiService}
                        className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                        {genre}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {!aiService && (
              <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-yellow-400 text-sm">
                  Please enter your API key to start using AI-powered game recommendations.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Error Display */}
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-white mb-6">AI Recommended Games</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchResults.map((game) => (
                <a
                  key={game.id}
                  href={game.steamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block bg-slate-800/50 backdrop-blur-sm rounded-xl overflow-hidden border border-slate-700 hover:border-blue-500 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/20"
                >
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={game.logo}
                      alt={game.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        // Fallback to a gaming placeholder if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400';
                      }}
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors">
                        {game.name}
                      </h3>
                      <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors flex-shrink-0 ml-2" />
                    </div>
                    <p className="text-slate-300 text-sm mb-4">{game.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {game.genres.slice(0, 3).map((genre) => (
                        <span
                          key={genre}
                          className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded-md"
                        >
                          {genre}
                        </span>
                      ))}
                      {game.genres.length > 3 && (
                        <span className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded-md">
                          +{game.genres.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {query && searchResults.length === 0 && !isSearching && !error && aiService && (
          <div className="text-center py-12">
            <Gamepad2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No games found</h3>
            <p className="text-slate-400">Try adjusting your search query or removing some genre filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;