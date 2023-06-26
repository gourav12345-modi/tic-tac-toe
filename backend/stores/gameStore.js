/* abstract */ class GameStore {
    findGame(id) {}
    saveGame(id, game) {}
    findAllGames() {}
  }
  
  class InMemoryGameStore extends GameStore {
    constructor() {
      super();
      this.games = new Map();
    }
  
    findGame(id) {
      return this.games.get(id);
    }
  
    saveGame(id, game) {
      this.games.set(id,game);
    }
  
  }
  
  module.exports = {
    InMemoryGameStore
  };
  