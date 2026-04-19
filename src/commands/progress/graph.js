// Import SlashCommandBuilder for defining the command
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// Import supabase client
const supabase = require('../../lib/supabase');

// Import our chart URL builder
const { stockChart } = require('../../lib/charts');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('progress')
    .setDescription('View your study progress chart')
    // Add weekly/monthly/yearly as subcommands
    .addSubcommand(sub => sub
      .setName('weekly')
      .setDescription('View last 7 days of study activity')
    )
    .addSubcommand(sub => sub
      .setName('monthly')
      .setDescription('View last 30 days of study activity')
    )
    .addSubcommand(sub => sub
      .setName('yearly')
      .setDescription('View last 365 days of study activity')
    ),

  async execute(interaction) {
    const discord_id = interaction.user.id;
    const guild_id = interaction.guildId;

    // Find out which subcommand user ran
    const sub = interaction.options.getSubcommand();

    // Calculate how many days to look back based on subcommand
    const days = sub === 'weekly' ? 7 : sub === 'monthly' ? 30 : 365;

    // Calculate the start date by going back 'days' number of days from today
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Query daily_logs for this user in this server from startDate to today
    const { data, error } = await supabase
      .from('daily_logs')
      .select('date, voice_mins, messages, topics_done')
      .eq('discord_id', discord_id)
      .eq('guild_id', guild_id)
      // Only get rows from startDate onwards
      .gte('date', startDate.toISOString().split('T')[0])
      // Sort oldest to newest so chart flows left to right
      .order('date', { ascending: true });

    if (error) {
      return interaction.reply({
        content: `${error.message}`,
        ephemeral: true
      });
    }

    // If no data yet tell user
    if (!data || data.length === 0) {
      return interaction.reply({
        content: '📭 No study data yet. Join a voice channel or mark topics done to start tracking.',
        ephemeral: true
      });
    }

    // Build labels array from dates e.g. ['2025-06-01', '2025-06-02'...]
    const labels = data.map(d => d.date);

    // Build data array from voice minutes e.g. [30, 45, 0, 90...]
    const values = data.map(d => d.voice_mins);

    // Build the chart URL using our helper
    const chartUrl = stockChart(labels, values, `Study Activity — Last ${days} Days`);

    // Build a Discord embed with the chart image
    const embed = new EmbedBuilder()
      // Title of the embed
      .setTitle(`${sub.charAt(0).toUpperCase() + sub.slice(1)} Progress`)
      // Shows chart image inside the embed
      .setImage(chartUrl)
      // Stats summary below the chart
      .addFields(
        { name: '⏱️ Total Voice Mins', value: `${values.reduce((a, b) => a + b, 0)}`, inline: true },
        { name: '✅ Topics Done', value: `${data.reduce((a, b) => a + b.topics_done, 0)}`, inline: true },
        { name: '💬 Messages', value: `${data.reduce((a, b) => a + b.messages, 0)}`, inline: true },
      )
      // Discord blurple color
      .setColor('#5865F2')
      .setFooter({ text: 'Keep studying! 🔥' });

    await interaction.reply({ embeds: [embed] });
  }
};