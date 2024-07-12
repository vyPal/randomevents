import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
  new SlashCommandBuilder()
    .setName('game')
    .setDescription('Manage games')
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create a game')
        .addStringOption(option =>
          option
            .setName('game')
            .setDescription('The game type')
            .setRequired(true)
            .addChoices({name: 'Bed Wars', value: 'bedwars'}, {name: 'Sky Wars', value: 'skywars'}, {name: 'Other', value: 'other'})
        )
        .addStringOption(option =>
          option
            .setName('layout')
            .setDescription('The team layout')
            .setRequired(true)
            .addChoices({name: 'Solo', value: 'solo'}, {name: 'Doubles', value: 'doubles'}, {name: 'Triples', value: 'triples'}, {name: 'Quads', value: 'quads'}, {name: '4v4', value: '4v4'}, {name: 'Other', value: 'other'})
        )
        .addNumberOption(option =>
          option
            .setName('teams')
            .setDescription('The number of teams')
            .setRequired(true)
            .setMinValue(2)
            .setMaxValue(16)
        )
        .addBooleanOption(option =>
          option
            .setName('assign')
            .setDescription('Assign players to teams')
            .setRequired(false)
        )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('delete')
          .setDescription('Delete a game')
          .addNumberOption(option =>
            option
              .setName('gameid')
              .setDescription('The game to delete')
              .setRequired(true)
          )
        )
      .addSubcommand(subcommand =>
        subcommand
          .setName('list')
          .setDescription('List all games')
        )
      .addSubcommand(subcommand =>
        subcommand
          .setName('info')
          .setDescription('Get info on a game')
          .addNumberOption(option =>
            option
              .setName('gameid')
              .setDescription('The game to get info on')
              .setRequired(false)
          )
        )
      .addSubcommand(subcommand =>
        subcommand
          .setName('edit')
          .setDescription('Edit a game')
        )
      .addSubcommand(subcommand =>
        subcommand
          .setName('start')
          .setDescription('Start a game')
        )
      .addSubcommand(subcommand =>
        subcommand
          .setName('end')
          .setDescription('End a game')
        )
      .addSubcommand(subcommand =>
        subcommand
          .setName('focus')
          .setDescription('Focus on a game')
          .addNumberOption(option =>
            option
              .setName('gameid')
              .setDescription('The game to focus on')
              .setRequired(false)
          )
        ),
  new SlashCommandBuilder()
    .setName('team')
    .setDescription('Manage teams')
    .addSubcommand(subcommand => 
      subcommand
        .setName('add')
        .setDescription('Add a player to a team')
        .addStringOption(option =>
          option
            .setName('team')
            .setDescription('The team to add to')
            .setRequired(true)
        )
        .addUserOption(option =>
          option
            .setName('player')
            .setDescription('The player to add')
            .setRequired(true)
        )
      )
    .addSubcommand(subcommand => 
      subcommand
        .setName('remove')
        .setDescription('Remove a player from a team')
        .addStringOption(option =>
          option
            .setName('team')
            .setDescription('The team to get info on')
            .setRequired(true)
        )
        .addUserOption(option =>
          option
            .setName('player')
            .setDescription('The player to remove')
            .setRequired(true)
        )
      )
    .addSubcommand(subcommand =>
      subcommand
        .setName('clear')
        .setDescription('Clear all players from a team')
        .addStringOption(option =>
          option
            .setName('team')
            .setDescription('The team to clear')
            .setRequired(true)
        )
      )
    .addSubcommand(subcommand =>
      subcommand
        .setName('clearall')
        .setDescription('Clear all teams')
      )
    .addSubcommand(subcommand => 
      subcommand
        .setName('list')
        .setDescription('List all teams')
      )
    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('Get info on a team')
        .addStringOption(option =>
          option
            .setName('team')
            .setDescription('The team to get info on')
            .setRequired(true)
        )
      )
    .addSubcommand(subcommand =>
      subcommand
        .setName('edit')
        .setDescription('Edit a team')
      ),
  new SlashCommandBuilder()
    .setName('player')
    .setDescription('Manage players')
    .addSubcommand(subcommand => 
      subcommand
        .setName('link')
        .setDescription('Set your Minecraft username')
        .addStringOption(option =>
          option
            .setName('player')
            .setDescription('Your Minecraft username')
            .setRequired(true)
        )
      )
    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('Get info on a player')
        .addStringOption(option =>
          option
            .setName('player')
            .setDescription('The player to get info on')
            .setRequired(true)
        )
      )
    .addSubcommand(subcommand =>
      subcommand
        .setName('edit')
        .setDescription('Edit a player')
        .addUserOption(option => 
          option
            .setName('player')
            .setDescription('The player to edit')
            .setRequired(true)
        )
      )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all players')
      )
    .addSubcommand(subcommand =>
      subcommand
        .setName('overwrite')
        .setDescription('Overwrite a player\'s Minecraft username')
        .addUserOption(option =>
          option
            .setName('player')
            .setDescription('The player to overwrite')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('username')
            .setDescription('The new Minecraft username')
            .setRequired(true)
        )
        .addBooleanOption(option =>
          option
            .setName('lock')
            .setDescription('Prevent the player from changing their username')
            .setRequired(false)
        )
      )
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN ?? '');

try {
  console.log('Started refreshing application (/) commands.');

  await rest.put(Routes.applicationCommands(process.env.CLIENT_ID ?? ''), { body: commands });

  console.log('Successfully reloaded application (/) commands.');
} catch (error) {
  console.error(error);
}