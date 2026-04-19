// Import SlashCommandBuilder
const { SlashCommandBuilder } = require('discord.js');

// Import supabase
const supabase = require('../../lib/supabase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('focus-config')
    .setDescription('Customize focus timer for this server')
    // Work duration option
    .addIntegerOption(opt => opt
      .setName('work')
      .setDescription('Work duration in minutes (default: 30)')
      .setRequired(true)
      // Minimum 5 mins, maximum 120 mins
      .setMinValue(5)
      .setMaxValue(120)
    )
    // Break duration option
    .addIntegerOption(opt => opt
      .setName('break')
      .setDescription('Break duration in minutes (default: 5)')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(30)
    ),

  async execute(interaction) {
    const guild_id = interaction.guildId;
    const workMins = interaction.options.getInteger('work');
    const breakMins = interaction.options.getInteger('break');

    // Update guild settings in DB
    await supabase
      .from('guilds')
      .upsert(
        {
          id: guild_id,
          focus_work_mins: workMins,
          focus_break_mins: breakMins
        },
        { onConflict: 'id' }
      );

    await interaction.reply({
      content: `✅ Focus timer updated — Work: **${workMins} mins** | Break: **${breakMins} mins**`,
      ephemeral: true
    });
  }
};