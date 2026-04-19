const supabase = require('../lib/supabase');

const sessions = new Map();

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    const userId = newState.member?.id;
    const guildId = newState.guild.id;
    if (!userId) return;

    const key = `${userId}-${guildId}`;

    if (!oldState.channelId && newState.channelId) {
      sessions.set(key, Date.now());
    } else if (oldState.channelId && !newState.channelId) {
      const joinedAt = sessions.get(key);
      if (!joinedAt) return;
      sessions.delete(key);

      const mins = Math.floor((Date.now() - joinedAt) / 60000);
      if (mins < 1) return;

      const today = new Date().toISOString().split('T')[0];

      await supabase.from('users').upsert(
        { discord_id: userId, guild_id: guildId, last_active: new Date() },
        { onConflict: 'discord_id,guild_id' }
      );

      await supabase.rpc('increment_daily_voice', {
        p_discord_id: userId,
        p_guild_id: guildId,
        p_date: today,
        p_mins: mins
      });
    }
  }
};