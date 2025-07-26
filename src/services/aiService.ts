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

interface AIResponse {
  games: Array<{
    name: string;
    description: string;
    genres: string[];
    steamUrl?: string;
  }>;
}

export class AIService {
  private apiKey: string;
  private provider: 'openai' | 'gemini';

  constructor(apiKey: string, provider: 'openai' | 'gemini') {
    this.apiKey = apiKey;
    this.provider = provider;
  }

  async searchGames(query: string, selectedGenres: string[]): Promise<Game[]> {
    try {
      const genreFilter = selectedGenres.length > 0 
        ? ` The games must include at least one of these genres: ${selectedGenres.join(', ')}.`
        : '';

      const prompt = `You are a Steam game recommendation expert. Based on the user's query: "${query}"${genreFilter}

Please recommend exactly 3 Steam games that match this request. For each game, provide:
1. The exact game name as it appears on Steam
2. A 2-3 sentence description explaining why it fits the request
3. The main genres from this list: First Person Shooter, Platformer, RPG, Adventure, Sandbox, Horror, Psychological Horror, Relaxing, Online, Story-Based, Puzzle, Strategy, Fighting, Metroidvania, Fast-Paced, Open World, Exploration, Survival, Single-Player, Multiplayer, Indie

Respond in this exact JSON format:
{
  "games": [
    {
      "name": "Game Name",
      "description": "2-3 sentence description",
      "genres": ["Genre1", "Genre2"],
      "steamUrl": "https://store.steampowered.com/app/APPID/Game_Name/"
    }
  ]
}

Only recommend real games that exist on Steam. Make sure the descriptions are engaging and explain why each game fits the user's request.`;

      const aiResponse = await this.callAI(prompt);
      const parsedResponse: AIResponse = JSON.parse(aiResponse);

      // Convert AI response to Game objects with logos
      const games: Game[] = await Promise.all(
        parsedResponse.games.map(async (game, index) => {
          const logoUrl = await this.searchGameLogo(game.name);
          return {
            id: `ai-${Date.now()}-${index}`,
            name: game.name,
            description: game.description,
            logo: logoUrl,
            steamUrl: game.steamUrl || `https://store.steampowered.com/search/?term=${encodeURIComponent(game.name)}`,
            genres: game.genres
          };
        })
      );

      return games;
    } catch (error) {
      console.error('Error searching games:', error);
      throw error;
    }
  }

  private async callAI(prompt: string): Promise<string> {
    if (this.provider === 'openai') {
      return this.callOpenAI(prompt);
    } else {
      return this.callGemini(prompt);
    }
  }

  private async callOpenAI(prompt: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
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

  private async callGemini(prompt: string): Promise<string> {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
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

  private async searchGameLogo(gameName: string): Promise<string> {
    try {
      // Use a web search to find game logos
      const searchQuery = `${gameName} steam game logo`;
      const logoPrompt = `Find a high-quality logo or cover image for the Steam game "${gameName}". Provide a direct URL to an image that represents this game well. The image should be suitable for display as a game logo.

Respond with just the URL, nothing else.`;

      const logoResponse = await this.callAI(logoPrompt);
      const logoUrl = logoResponse.trim();

      // Validate if it looks like a URL
      if (logoUrl.startsWith('http') && (logoUrl.includes('.jpg') || logoUrl.includes('.png') || logoUrl.includes('.jpeg') || logoUrl.includes('.webp'))) {
        return logoUrl;
      }

      // Fallback to a gaming-themed placeholder from Pexels
      const fallbackImages = [
        'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400',
        'https://images.pexels.com/photos/163064/play-stone-network-networked-interactive-163064.jpeg?auto=compress&cs=tinysrgb&w=400',
        'https://images.pexels.com/photos/194511/pexels-photo-194511.jpeg?auto=compress&cs=tinysrgb&w=400',
        'https://images.pexels.com/photos/1174746/pexels-photo-1174746.jpeg?auto=compress&cs=tinysrgb&w=400',
        'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=400'
      ];

      return fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
    } catch (error) {
      console.error('Error searching for game logo:', error);
      // Return a random gaming-themed placeholder
      const fallbackImages = [
        'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400',
        'https://images.pexels.com/photos/163064/play-stone-network-networked-interactive-163064.jpeg?auto=compress&cs=tinysrgb&w=400',
        'https://images.pexels.com/photos/194511/pexels-photo-194511.jpeg?auto=compress&cs=tinysrgb&w=400'
      ];
      return fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
    }
  }
}