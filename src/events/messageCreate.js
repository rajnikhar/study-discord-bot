const supabase = require('../lib/supabase');

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot) return;
    const discord_id = message.author.id;
    const guild_id = message.guild?.id;
    //it is a DM
    if (!guild_id) return;

    const today = new Date().toISOString().split('T')[0];

    await supabase.from('users').upsert(
      { discord_id, guild_id, last_active: new Date() },
      { onConflict: 'discord_id,guild_id' }
    );

    await supabase.rpc('increment_daily_messages', {
      p_discord_id: discord_id,
      p_guild_id: guild_id,
      p_date: today
    });
  }
};