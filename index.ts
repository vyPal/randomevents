import { Client, GatewayIntentBits, EmbedBuilder, ActivityType, PermissionFlagsBits, ModalBuilder, TextInputBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, Events, TextInputStyle } from 'discord.js';
import mongoose from 'mongoose';
import HypixelAPI from 'hypixel-api-reborn';

import config from './roomconfig.json';

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

function matchPath(path: string, pattern: string, matchFull: boolean): boolean {
  const pathSegments = path.split(".");
  const patternSegments = pattern.split(".");


  let regexPattern = "^";
  patternSegments.forEach((segment, index) => {
    if ((index >= pathSegments.length) && !matchFull) {
      return; // Přeskočit generování regex pro segmenty mimo rozsah cesty
    }

    if (segment === "*") {
      regexPattern += "[^\\.]+";
    } else if (segment === "**") {
      regexPattern += ".*";
    } else {
      if (index > 0) {
        regexPattern += "\\.";
      }
      const escapedSegment = segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      regexPattern += escapedSegment;

      if (index < patternSegments.length - 2) {
        regexPattern += "\\.";
      }
    }
  });

  regexPattern += "$";
  
  const regex = new RegExp(regexPattern);
  return regex.test(path);
}

function omitKeys(obj: any, patterns: string[]): any {
  const patternSegmentsList = patterns.map(pattern => pattern.split('.'));

  function omit(obj: any, path: string[] = []): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => omit(item, path));

    return Object.entries(obj).reduce((acc: { [key: string]: any }, [key, value]) => {
      const newPath = [...path, key];
      const fullPath = newPath.join(".");
      const shouldOmit = patternSegmentsList.some(patternSegments =>
        matchPath(fullPath, patternSegments.join("."), true)
      );
      if (!shouldOmit) acc[key] = omit(value, newPath);
      return acc;
    }, {});
  }

  return omit(obj);
}

function includeKeys(obj: any, patterns: string[]): any {
  const patternSegmentsList = patterns.map(pattern => pattern.split('.'));

  function include(obj: any, path: string[] = []): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => include(item, path));

    return Object.entries(obj).reduce((acc: { [key: string]: any }, [key, value]) => {
      const newPath = [...path, key];
      const fullPath = newPath.join(".");
      const shouldInclude = patternSegmentsList.some(patternSegments =>
        matchPath(fullPath, patternSegments.join("."), false)
      );
      if (shouldInclude) acc[key] = include(value, newPath);
      return acc;
    }, {});
  }

  return include(obj);
}

const partsToInclude = [
  "skywars.**",
  "bedwars.**",
  "duels.wins",
  "duels.losses",
  "pit.kills",
  "pit.deaths",
  "pit.assists",
  "pit.damageReceived",
  "pit.damageDealt",
  "pit.meleeAccuracy",
];
const partsToOmit = [
  "**.coins",
  "**.tokens",
  "**.souls",
  "**.packages",
  "bedwars.practice",
  "bedwars.totalSlumberTicket",
  "bedwars.slumberTickets",
  "bedwars.dream",
  "bedwars.castle",
  "**.avg",
  "bedwars.collectedItemsTotal",
  "**.experience",
  "**.prestige",
  "**.BLRatio",
  "**.winstreak",
  "skywars.heads",
  "skywars.levelFormatted",
  "skywars.prestigeIcon",
  "skywars.opals",
  "skywars.avarice",
  "skywars.tenacity",
  "skywars.shards",
  "skywars.angelOfDeathLevel",
  "skywars.shardsInMode",
  "**.normal",
  "**.insane",
  "**.mega",
  "**.lab",
  "skywars.levelProgress",
  "**.KDRatio",
  "**.WLRatio",
  "**.finalKDRatio"
];

const hypixel = new HypixelAPI.Client(process.env.HYPIXEL_API_KEY ?? '');

mongoose.connect(process.env.MONGODB_URI ?? '');

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  presence: {
    activities: [
      {
        name: 'Minecraft with da homies',
        type: ActivityType.Playing
      }
    ]
  }
});

type Player = {
  id: string;
  mcUsername: string;
  locked: boolean;
  hypixel: HypixelAPI.Player | null;
};

let players: Player[] = [];

client.on('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}!`);
  client.user?.setActivity({ name: 'Minecraft with da homies', type: ActivityType.Playing });
  const server = await client.guilds.fetch(process.env.GUILD_ID ?? '')
  const mainChannel = server.channels.cache.get(process.env.CHANNEL_ID ?? '');
  if (!mainChannel) {
    console.error("Channel not found.");
    return;
  }
  if (!mainChannel.isTextBased()) {
    console.error("Channel is not a text channel.");
    return;
  }
  const users = await server.members.fetch();
  for (const [id, user] of users) {
    if (user.user.bot) continue;

    let player = await Player.findOne({ id: user.id });
    if (!player) {
      player = new Player({ id: user.id });
    }

    let hypixelPlayer = null;
    if (player.mcUsername != '' && player.mcUsername != null && player.mcUsername != undefined) {
      hypixelPlayer = await hypixel.getPlayer(player.mcUsername);
    }

    players.push({ id: player.id, mcUsername: player.mcUsername ?? '', locked: player.locked ?? false, hypixel: hypixelPlayer });

    player.save();
  }
});

function calculateELO(stats: any): number {
  // Adjusted Constants for ELO calculation to lower max ELO
  const winMultiplier = 5;
  const lossMultiplier = 0.5;
  const killMultiplier = 0.1;
  const deathMultiplier = -0.02;
  const levelMultiplier = 2;
  const finalKillMultiplier = 0.2;
  const finalDeathMultiplier = -0.05;
  const bedMultiplier = 1;
  const assistMultiplier = 0.05;
  const damageDealtMultiplier = 0.001;
  const damageReceivedMultiplier = -0.0005;
  const meleeAccuracyMultiplier = 10;

  // Calculate ELO for SkyWars
  let skywarsELO = (stats.skywars.kills * killMultiplier) + (stats.skywars.wins * winMultiplier) - 
                   (stats.skywars.losses * lossMultiplier) - (stats.skywars.deaths * deathMultiplier) + 
                   (stats.skywars.level * levelMultiplier);

  // Calculate ELO for BedWars
  let bedwarsELO = (stats.bedwars.kills * killMultiplier) + (stats.bedwars.finalKills * finalKillMultiplier) - 
                   (stats.bedwars.finalDeaths * finalDeathMultiplier) + (stats.bedwars.wins * winMultiplier) - 
                   (stats.bedwars.losses * lossMultiplier) - (stats.bedwars.deaths * deathMultiplier) + 
                   (stats.bedwars.beds.broken * bedMultiplier) - (stats.bedwars.beds.lost * bedMultiplier) + 
                   (stats.bedwars.level * levelMultiplier);

  // Calculate ELO for Duels
  let duelsELO = (stats.duels.wins * winMultiplier) - (stats.duels.losses * lossMultiplier);

  // Calculate ELO for Pit
  let pitELO = (stats.pit?.kills * killMultiplier) + (stats.pit?.assists * assistMultiplier) - 
               (stats.pit?.deaths * deathMultiplier) + (stats.pit?.damageDealt * damageDealtMultiplier) - 
               (stats.pit?.damageReceived * damageReceivedMultiplier) + 
               (stats.pit?.meleeAccuracy * meleeAccuracyMultiplier);

  // Sum all ELOs to get the final ELO
  let totalELO = skywarsELO / (stats.skywars.playedGames * 0.3) + bedwarsELO / (stats.bedwars.playedGames * 0.7) + duelsELO ?? 0 + pitELO ?? 0;
  return totalELO;
}

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply('Pong!');
  }
  // ------------------------------------ TEAM COMMANDS ------------------------------------
  else if (interaction.commandName === "team") {

  }
  // ----------------------------------- PLAYER COMMANDS -----------------------------------
  else if (interaction.commandName === "player") {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === "link") {
      const mcUsername = interaction.options.getString("player");
      if (!mcUsername) {
        await interaction.reply("You must provide a Minecraft username.");
        return;
      }
      await interaction.deferReply();
      const player = await hypixel.getPlayer(mcUsername);
      if (!player) {
        await interaction.editReply("That player does not exist.");
        return;
      }
      let playerdb = await Player.findOne({ id: interaction.user.id });
      if (!playerdb) {
        playerdb = new Player({ id: interaction.user.id });
      }
      if (playerdb.locked) {
        await interaction.editReply("You are not allowed to change your Minecraft username. Your username was locked by an admin.");
        return;
      }
      playerdb.mcUsername = mcUsername;
      players = players.map(p => p.id === playerdb.id ? { ...p, mcUsername, player } : p);
      await playerdb.save();
      await interaction.editReply(`Successfully linked your Minecraft username to ${mcUsername}.`);
    } else if (subcommand === "info") {
      const username = interaction.options.getString("player");
      if (!username) {
        await interaction.reply("You must provide a player.");
        return;
      }
      await interaction.deferReply();
      const player = await hypixel.getPlayer(username, {recentGames: true});
      if (!player) {
        await interaction.reply("That player does not exist.");
        return;
      }
      //saveStatsAndStructure(player.stats, ["*"], []);
      const currentGame = player.recentGames?.[0]?.ongoing == true ? player.recentGames?.[0] : null;
      const embed = new EmbedBuilder()
        .setAuthor({
          name: "RandomEvents Player Stats",
        })
        .setTitle("Player: "+player.nickname)
        .setDescription(`Hypixel Level: ${player.level}
          Rank: ${player.rank}
          Karma: ${player.karma}
          First Login: ${new Date(player.firstLogin).toDateString()}
          Last Login: ${new Date(player.lastLogin??'').toDateString()}
          
          **BedWars Stats**
          Wins: ${player.stats?.bedwars?.wins}
          Losses: ${player.stats?.bedwars?.losses}
          WLR: ${player.stats?.bedwars?.WLRatio}
          FKDR: ${player.stats?.bedwars?.finalKDRatio}
          Final Kills: ${player.stats?.bedwars?.finalKills}
          Final Deaths: ${player.stats?.bedwars?.finalDeaths}
          Beds Broken: ${player.stats?.bedwars?.beds.broken}
          Beds Lost: ${player.stats?.bedwars?.beds.lost}
          BLR: ${player.stats?.bedwars?.beds.BLRatio}${currentGame?`\nCurrent Game: ${currentGame.mode} - ${currentGame.map} - ${currentGame.ongoing?`Started at ${currentGame.date?.toTimeString()}`:`Ended`}`:``}
          
          **SkyWars Stats**
          Wins: ${player.stats?.skywars?.wins}
          Losses: ${player.stats?.skywars?.losses}
          WLR: ${player.stats?.skywars?.WLRatio}
          Kills: ${player.stats?.skywars?.kills}
          Deaths: ${player.stats?.skywars?.deaths}
          KDR: ${player.stats?.skywars?.KDRatio}
          Souls: ${player.stats?.skywars?.souls}
          
          **Estimated ELO**
          ${calculateELO(omitKeys(includeKeys(player.stats, partsToInclude), partsToOmit))}`);

      await interaction.editReply({ embeds: [embed] });
    } else if (subcommand === "edit") {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply("You do not have permission to use this command.");
        return;
      }
      const pl = interaction.options.getUser("player");
      if (!pl) {
        await interaction.reply("You must provide a player.");
        return;
      }

      let player = await Player.findOne({ id: pl.id });
      if (!player) {
        player = new Player({ id: pl.id });
        await player.save();
      }
      const modal = new ModalBuilder()
        .setTitle("Edit Player")
        .setCustomId("edit-"+pl.id)

      const mcUsernameInput = new TextInputBuilder()
        .setLabel("Minecraft Username")
        .setPlaceholder("Minecraft Username")
        .setCustomId("mcUsername")
        .setRequired(true)
        .setStyle(TextInputStyle.Short)
        .setValue(player.mcUsername ?? '');
      
      const lockInput = new TextInputBuilder()
        .setLabel("Lock")
        .setPlaceholder("Lock")
        .setCustomId("lock")
        .setRequired(false)
        .setStyle(TextInputStyle.Short)
        .setValue(player.locked ? "true" : "false")

      const firstActionRow = new ActionRowBuilder<TextInputBuilder>()
        .addComponents(mcUsernameInput)
      
      const secondActionRow = new ActionRowBuilder<TextInputBuilder>()
        .addComponents(lockInput)
      
      modal.addComponents([firstActionRow, secondActionRow]);

      await interaction.showModal(modal);
    } else if (subcommand === "list") {
      const users = await interaction.guild?.members.fetch();
      if (!users) {
        await interaction.reply("An error occurred.");
        return;
      }
      players = [];
      for (const [id, user] of users) {
        if (user.user.bot) continue;

        let player = await Player.findOne({ id: user.id });
        if (!player) {
          player = new Player({ id: user.id });
        }

        let hypixelPlayer = null;
        if (player.mcUsername != '' && player.mcUsername != null && player.mcUsername != undefined) {
          hypixelPlayer = await hypixel.getPlayer(player.mcUsername);
        }

        players.push({ id: player.id, mcUsername: player.mcUsername ?? '', locked: player.locked ?? false, hypixel: hypixelPlayer });

        player.save();
      }

      const embed = new EmbedBuilder()
        .setAuthor({
          name: "RandomEvents",
        })
        .setTitle("Players")
        .setDescription("List of all players in the server.")
        .addFields(players.map(player => ({name: interaction.guild?.members.cache.get(player.id)?.displayName ?? "User "+player.id, value: `MC: ${player.mcUsername == '' ? 'Not linked' : player.mcUsername}
          Estimated ELO: ${player.hypixel ? Math.floor(calculateELO(omitKeys(includeKeys(player.hypixel.stats, partsToInclude), partsToOmit))) : 'Unable to calculate'}
          ${player.locked ? '(Locked by admin)' : ''}`, inline: true})));
      
      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === "overwrite") {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply("You do not have permission to use this command.");
        return;
      }
      const pl = interaction.options.getUser("player");
      if (!pl) {
        await interaction.reply("You must provide a player.");
        return;
      }
      const uname = interaction.options.getString("username");
      if (!uname) {
        await interaction.reply("You must provide a new username.");
        return;
      }
      const lock = interaction.options.getBoolean("lock") ?? false;
      await interaction.deferReply();

      const mc = await hypixel.getPlayer(uname);
      if (!mc) {
        await interaction.editReply("That player does not exist.");
        return;
      }

      let player = await Player.findOne({ id: pl.id });
      if (!player) {
        player = new Player({ id: pl.id });
      }

      player.mcUsername = uname;
      player.locked = lock;

      await player.save();
      await interaction.editReply(`Successfully overwrote ${pl.username}'s Minecraft username to ${uname}. ${lock ? 'The player is now locked.' : ''}`);
    }
  }
});

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isModalSubmit()) return;
	if (interaction.customId.startsWith('edit-')){
    const id = interaction.customId.split('-')[1];
    let player = await Player.findOne({ id: id });
    if (!player) {
      interaction.reply("An error occurred.");
      return;
    }

    const mcUsername = interaction.fields.getTextInputValue('mcUsername');
    const lock = interaction.fields.getTextInputValue('lock') == 'true';

    player.mcUsername = mcUsername;
    player.locked = lock;

    await player.save();
    await interaction.reply("Player edited successfully.");
	}
});

client.login(process.env.TOKEN);