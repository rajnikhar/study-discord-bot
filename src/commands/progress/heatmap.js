const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const supabase = require('../../lib/supabase');
const { heatmap } = require('../../lib/charts');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('heatmap')
    .setDescription('View your study heatmap — last 30 days'),

  async execute(interaction) {
    const discord_id = interaction.user.id;
    const guild_id = interaction.guildId;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const { data, error } = await supabase
      .from('daily_logs')
      .select('date, voice_mins')
      .eq('discord_id', discord_id)
      .eq('guild_id', guild_id)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) return interaction.reply({ content: `${error.message}`, ephemeral: true });

    if (!data || data.length === 0) {
      return interaction.reply({
        content: '📭 No data yet. Study in voice channels to start tracking.',
        ephemeral: true
      });
    }

    const chartData = data.map(d => ({
      date: d.date,
      value: d.voice_mins
    }));

    const chartUrl = heatmap(chartData, 'Study Heatmap — Last 30 Days');

    const embed = new EmbedBuilder()
      .setTitle('🟩 Study Heatmap')
      .setImage(chartUrl)
      .setColor('#39d353')  
      .setFooter({ text: 'Darker = more study time 🔥' });

    await interaction.reply({ embeds: [embed] });
  }
};