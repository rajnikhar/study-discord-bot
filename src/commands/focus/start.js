// Import necessary discord.js classes
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// Import supabase client
const supabase = require('../../lib/supabase');

// Store active timers in memory — key is userId, value is timeout reference
// This lets us cancel a timer if user runs /focus stop later
const activeTimers = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('focus')
    .setDescription('Manage your focus timer')
    .addSubcommand(sub => sub
      .setName('start')
      .setDescription('Start a Pomodoro focus session')
    )
    .addSubcommand(sub => sub
      .setName('stop')
      .setDescription('Stop your current focus session')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const discord_id = interaction.user.id;
    const guild_id = interaction.guildId;

    if (sub === 'start') {
      // Don't allow starting if already in a session
      if (activeTimers.has(discord_id)) {
        return interaction.reply({
          content: 'You already have an active focus session. Use `/focus stop` to end it.',
          ephemeral: true
        });
      }

      // Fetch this server's custom focus settings from DB
      const { data: guildConfig } = await supabase
        .from('guilds')
        .select('focus_work_mins, focus_break_mins')
        .eq('id', guild_id)
        .single();

      // Use server settings or fall back to defaults
      const workMins = guildConfig?.focus_work_mins ?? 30;
      const breakMins = guildConfig?.focus_break_mins ?? 5;

      // Send start message immediately
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🍅 Focus Session Started!')
            .setDescription(`You have **${workMins} minutes** of focused work ahead.\nGood luck! 💪`)
            .setColor('#FF6B6B')
            .setFooter({ text: `Break: ${breakMins} mins after session` })
        ]
      });

      // Set timer for work period
      const workTimer = setTimeout(async () => {
        // Work period done — send break message
        await interaction.followUp({
          content: `<@${discord_id}> ⏰ **Focus session complete!** Take a ${breakMins} minute break. 🧘`,
        });

        // Set timer for break period
        const breakTimer = setTimeout(async () => {
          // Break done — prompt to start again
          await interaction.followUp({
            content: `<@${discord_id}> 🔔 **Break over!** Ready for another session? Type \`/focus start\``,
          });
          // Remove from active timers
          activeTimers.delete(discord_id);
        }, breakMins * 60 * 1000);

        // Store break timer so it can be cancelled too
        activeTimers.set(discord_id, breakTimer);

      }, workMins * 60 * 1000);

      // Store work timer reference so user can cancel it
      activeTimers.set(discord_id, workTimer);

      // Update focus sessions count in DB
      await supabase
        .from('users')
        .upsert(
          { discord_id, guild_id, focus_sessions: 1 },
          { onConflict: 'discord_id,guild_id' }
        );

    } else if (sub === 'stop') {
      // Check if user has an active timer
      if (!activeTimers.has(discord_id)) {
        return interaction.reply({
          content: 'You have no active focus session.',
          ephemeral: true
        });
      }

      // Cancel the timer
      clearTimeout(activeTimers.get(discord_id));
      activeTimers.delete(discord_id);

      await interaction.reply({
        content: '⏹️ Focus session stopped. Rest up! 😴',
        ephemeral: true
      });
    }
  }
};