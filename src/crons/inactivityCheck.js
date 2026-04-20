module.exports = {
  // Runs every hour
  schedule: '0 * * * *',

  async execute(client) {
    const supabase = require('../lib/supabase')

    // Fetch pending DMs queued by edge function
    const { data: pending } = await supabase
      .from('pending_dms')
      .select('*')

    if (!pending || pending.length === 0) return

    for (const dm of pending) {
      try {
        // Fetch the Discord user object by ID
        const user = await client.users.fetch(dm.discord_id)

        // Send them a DM
        await user.send(
          `👋 Hey! You haven't been active in your study server for 3+ days.\n\nDon't break your streak — jump back in and keep going! 💪\n\nType \`/progress weekly\` to see how far you've come.`
        )

        // Delete from pending once DM is sent
        await supabase
          .from('pending_dms')
          .delete()
          .eq('discord_id', dm.discord_id)
          .eq('guild_id', dm.guild_id)

      } catch (err) {
        // User might have DMs disabled — just skip them
        console.log(`Could not DM ${dm.discord_id}:`, err.message)
      }
    }
  }
}