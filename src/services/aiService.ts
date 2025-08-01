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
      const parsedResponse: AIResponse = this.parseAIResponse(aiResponse);

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

  private parseAIResponse(response: string): AIResponse {
    try {
      // First, try to parse as-is
      return JSON.parse(response);
    } catch (error) {
      try {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[1]);
        }

        // Try to find JSON object in the response
        const jsonStart = response.indexOf('{');
        const jsonEnd = response.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          const jsonStr = response.substring(jsonStart, jsonEnd + 1);
          return JSON.parse(jsonStr);
        }

        // If all else fails, try to create a structured response from text
        return this.createFallbackResponse(response);
      } catch (fallbackError) {
        console.error('Failed to parse AI response:', response);
        throw new Error('AI response could not be parsed. Please try again.');
      }
    }
  }

  private createFallbackResponse(response: string): AIResponse {
    // Try to extract game information from unstructured text
    const games: Array<{name: string; description: string; genres: string[]}> = [];
    
    // Split by common delimiters and look for game patterns
    const lines = response.split(/\n+/);
    let currentGame: any = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      // Look for game names (often numbered or have special formatting)
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
        currentGame.genres = genreText.split(/[,;]/).map((g: string) => g.trim()).filter((g: string) => g);
      } else if (currentGame && !currentGame.description && trimmedLine.length > 20) {
        // Assume longer lines are descriptions
        currentGame.description = trimmedLine;
      }
    }
    
    if (currentGame) {
      games.push(currentGame);
    }
    
    // Ensure we have at least some games, create fallback if needed
    if (games.length === 0) {
      games.push({
        name: 'Steam Game Recommendation',
        description: 'Unable to parse specific game recommendations from AI response. Please try rephrasing your query.',
        genres: ['Adventure']
      });
    }
    
    return { games: games.slice(0, 3) }; // Limit to 3 games
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
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`, {
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
      // Use Google Custom Search API to find game logos
      const searchQuery = `${gameName} logo`;
      const googleSearchUrl = `https://www.googleapis.com/customsearch/v1?key=YOUR_GOOGLE_API_KEY&cx=YOUR_SEARCH_ENGINE_ID&q=${encodeURIComponent(searchQuery)}&searchType=image&num=1`;
      
      // Since we can't make actual Google API calls without API keys,
      // we'll use a more reliable approach with gaming image placeholders
      // that are themed around the game name
      
      // Create a hash from the game name to consistently return the same image
      const hash = this.simpleHash(gameName);
      const gameThemeImages = [
        'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400', // Gaming setup
        'https://images.pexels.com/photos/163064/play-stone-network-networked-interactive-163064.jpeg?auto=compress&cs=tinysrgb&w=400', // Gaming controller
        'https://images.pexels.com/photos/194511/pexels-photo-194511.jpeg?auto=compress&cs=tinysrgb&w=400', // Gaming keyboard
        'https://images.pexels.com/photos/1174746/pexels-photo-1174746.jpeg?auto=compress&cs=tinysrgb&w=400', // Gaming atmosphere
        'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=400', // Story games
        'https://images.pexels.com/photos/735911/pexels-photo-735911.jpeg?auto=compress&cs=tinysrgb&w=400', // Tech/sci-fi
        'https://images.pexels.com/photos/1591447/pexels-photo-1591447.jpeg?auto=compress&cs=tinysrgb&w=400', // Adventure theme
        'https://images.pexels.com/photos/1670977/pexels-photo-1670977.jpeg?auto=compress&cs=tinysrgb&w=400' // Action theme
      ];
      
      return gameThemeImages[hash % gameThemeImages.length];
    } catch (error) {
      console.error('Error searching for game logo:', error);
      // Return a default gaming-themed placeholder
      const fallbackImages = [
        'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400',
        'https://images.pexels.com/photos/163064/play-stone-network-networked-interactive-163064.jpeg?auto=compress&cs=tinysrgb&w=400',
        'https://images.pexels.com/photos/194511/pexels-photo-194511.jpeg?auto=compress&cs=tinysrgb&w=400'
      ];
      return fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
    }
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}