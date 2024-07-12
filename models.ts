import mongoose from "mongoose";

export const playerSchema = new mongoose.Schema({
  mcUsername: String, // Minecraft username
  id: String, // Discord ID
  locked: Boolean, // Whether the player is locked
});

export const Player = mongoose.model('Player', playerSchema);

export const teamSchema = new mongoose.Schema({
  name: String, // Team name
  id: String, // Discord ID
  locked: Boolean, // Whether the team is locked
  players: [String], // Array of player IDs
});

export const Team = mongoose.model('Team', teamSchema);

export const gameSchema = new mongoose.Schema({
  game: String, // Game [BedWars, SkyWars, Other]
  gameId: String, // Game ID
  layout: String, // Layout [Solo, Doubles, Triples, Quads, 4v4, Other]
  teamCount: Number, // Number of teams
  assign: Boolean, // Assign players to teams
  started: Boolean, // Whether the game has started
  teams: [String], // Array of team IDs
  players: [String], // Array of player IDs
});

export const Game = mongoose.model('Game', gameSchema);