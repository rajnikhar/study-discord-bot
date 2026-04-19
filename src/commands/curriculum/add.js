const { SlashCommandBuilder } = require('discord.js');
const supabase = require('../../lib/supabase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('curriculum')
    .setDescription('Manage your study curriculum')
    .addSubcommand(sub => sub
      .setName('add')
      .setDescription('Add a category, subcategory or topic')
      .addStringOption(opt => opt
        .setName('name')
        .setDescription('Name of the item')
        .setRequired(true)
      )
      // parent is now a string (name) instead of integer (ID)
      .addStringOption(opt => opt
        .setName('parent')
        .setDescription('Parent category name (leave empty for root category)')
        .setRequired(false)
      )
    ),

  async execute(interaction) {
    const name = interaction.options.getString('name');
    const parentName = interaction.options.getString('parent');
    const discord_id = interaction.user.id;
    const guild_id = interaction.guildId;

    // Ensure guild exists in DB before inserting
    await supabase.from('guilds').upsert(
      { id: guild_id },
      { onConflict: 'id' }
    );

    // If parent name provided, look up its ID internally
    let parent_id = null;
    if (parentName) {
      const { data: parentData } = await supabase
        .from('categories')
        .select('id')
        .eq('name', parentName)
        .eq('discord_id', discord_id)
        .eq('guild_id', guild_id)
        .single();

      // If parent name doesn't exist, tell user clearly
      if (!parentData) {
        return interaction.reply({
          content: ` Parent category **${parentName}** not found.`,
          ephemeral: true
        });
      }

      parent_id = parentData.id;
    }

    // Insert the new item
    const { error } = await supabase.from('categories').insert({
      discord_id,
      guild_id,
      name,
      parent_id
    });

    if (error) {
      return interaction.reply({
        content: `Error: ${error.message}`,
        ephemeral: true
      });
    }

    // Clean reply — no IDs shown to user
    await interaction.reply({
      content: `Added **${name}**${parentName ? ` under **${parentName}**` : ' as root category'}`,
      ephemeral: true
    });
  }
};