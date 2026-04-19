require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const commands = [];
const folders = fs.readdirSync(path.join(__dirname, 'commands'));
for (const folder of folders) {
  const files = fs.readdirSync(path.join(__dirname, `commands/${folder}`))
    .filter(f => f.endsWith('.js'));
  for (const file of files) {
    const cmd = require(`./commands/${folder}/${file}`);
    if (cmd.data) commands.push(cmd.data.toJSON());
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
  console.log('Registering slash commands...');
  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    { body: commands }
  );
  console.log('✅ Commands registered.');
})();