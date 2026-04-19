// Import SlashCommandBuilder
const { SlashCommandBuilder } = require('discord.js');

// Import supabase client
const supabase = require('../../lib/supabase');

module.exports = {
  // Define the /done command
  data: new SlashCommandBuilder()
    .setName('done')
    .setDescription('Mark a topic as complete')
    
    // User types the topic name they want to mark done
    .addStringOption(opt => opt
      .setName('topic')
      .setDescription('Name of the topic to mark done')
      .setRequired(true)                            // must provide a topic name
    ),

  // Runs when user types /done <topic>
  async execute(interaction) {
    
    // Get the topic name user typed
    const topicName = interaction.options.getString('topic');
    
    // Get who ran the command
    const discord_id = interaction.user.id;
    
    // Get which server
    const guild_id = interaction.guildId;

    // Find this topic in the database by name
    // We scope it to this user + this server so users don't affect each other
    const { data: topic, error: findError } = await supabase
      .from('categories')
      .select('*')
      .eq('name', topicName)                        // match topic name
      .eq('discord_id', discord_id)                 // only this user's topics
      .eq('guild_id', guild_id)                     // only this server
      .single();                                    // expect exactly one result

    // If topic not found, tell user
    if (!topic || findError) {
      return interaction.reply({
        content: `Topic **${topicName}** not found.`,
        ephemeral: true
      });
    }

    // If already marked done, no need to do it again
    if (topic.done) {
      return interaction.reply({
        content: `**${topicName}** is already marked as done.`,
        ephemeral: true
      });
    }

    // Update the topic: set done = true and record when it was completed
    await supabase
      .from('categories')
      .update({ 
        done: true,                                 // mark as complete
        done_at: new Date()                         // record completion timestamp
      })
      .eq('id', topic.id);                         // only update this specific topic

    // Get today's date in YYYY-MM-DD format for daily log
    const today = new Date().toISOString().split('T')[0];

    // Increment today's topics_done count in daily_logs
    // Uses atomic SQL function to prevent race conditions
    await supabase.rpc('increment_daily_topics', {
      p_discord_id: discord_id,
      p_guild_id: guild_id,
      p_date: today
    });

    // Reply publicly (ephemeral: false) so everyone sees the win
    // This builds accountability culture in the server
    await interaction.reply({
      content: `✅ **${topicName}** marked as done! Keep going 🔥`,
      ephemeral: false
    });
  }
};