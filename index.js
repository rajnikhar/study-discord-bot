require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ]
});

client.commands = new Collection();

// Load commands
const commandFolders = fs.readdirSync(path.join(__dirname, 'src/commands'));
for (const folder of commandFolders) {
  const files = fs.readdirSync(path.join(__dirname, `src/commands/${folder}`))
    .filter(f => f.endsWith('.js'));
  for (const file of files) {
    const cmd = require(`./src/commands/${folder}/${file}`);
    if (cmd.data && cmd.execute) client.commands.set(cmd.data.name, cmd);
  }
}

// Load events
const eventFiles = fs.readdirSync(path.join(__dirname, 'src/events'))
  .filter(f => f.endsWith('.js'));
for (const file of eventFiles) {
  const event = require(`./src/events/${file}`);
  if (event.once) client.once(event.name, (...args) => event.execute(...args));
  else client.on(event.name, (...args) => event.execute(...args));
}

// Handle slash commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const cmd = client.commands.get(interaction.commandName);
  if (!cmd) return;
  try {
    await cmd.execute(interaction);
  } catch (err) {
    console.error(err);
    const msg = { content: '❌ Something went wrong.', ephemeral: true };
    interaction.replied
      ? await interaction.followUp(msg)
      : await interaction.reply(msg);
  }
});

client.once('ready', () => console.log(`✅ Bot online as ${client.user.tag}`));
client.login(process.env.DISCORD_TOKEN);