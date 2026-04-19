// Import necessary classes
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

// Import supabase client
const supabase = require("../../lib/supabase");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View the server study leaderboard"),

  async execute(interaction) {
    const guild_id = interaction.guildId;

    // Defer reply because fetching + building embed takes time
    // Without this Discord will show "interaction failed" after 3 seconds
    await interaction.deferReply();

    // Fetch this server's leaderboard mode (voice or messages)
    const { data: guildConfig } = await supabase
      .from("guilds")
      .select("leaderboard_mode")
      .eq("id", guild_id)
      .single();

    // Default to voice if not configured
    const mode = guildConfig?.leaderboard_mode ?? "voice";

    // Pick which column to sort by based on mode
    const sortColumn = mode === "voice" ? "total_voice_mins" : "total_messages";
    const modeLabel = mode === "voice" ? "⏱️ Voice Minutes" : "💬 Messages";

    // Fetch top 10 users for this server sorted by score
    // Sort by voice mins by default
    const { data, error } = await supabase
      .from("users")
      .select("discord_id, total_voice_mins, total_messages, focus_sessions")
      .eq("guild_id", guild_id)
      .order("total_voice_mins", { ascending: false })
      .limit(10);

    if (error) {
      return interaction.editReply({ content: `${error.message}` });
    }

    if (!data || data.length === 0) {
      return interaction.editReply({
        content:
          "📭 No activity yet. Study in voice channels or send messages to appear here.",
      });
    }

    // Build leaderboard rows
    // Medal emojis for top 3
    const medals = ["🥇", "🥈", "🥉"];

    // Map each user to a leaderboard row string
    const rows = data.map((user, index) => {
      const rank = medals[index] || `**${index + 1}.**`;
      // Show both voice mins AND messages for each user
      return `${rank} <@${user.discord_id}>\n⏱️ ${user.total_voice_mins} mins | 💬 ${user.total_messages} msgs | 🍅 ${user.focus_sessions} sessions`;
    });

    const embed = new EmbedBuilder()
      .setTitle("🏆 Study Leaderboard")
      .setDescription(rows.join("\n\n")) // extra spacing between users
      .setColor("#FFD700")
      .setFooter({ text: "Ranked by voice minutes" })
      .setTimestamp(); // Shows when leaderboard was generated

    await interaction.editReply({ embeds: [embed] });
  },
};
