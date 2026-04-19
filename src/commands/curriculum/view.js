const {SlashCommandBuilder}= require('discord.js')
const supabase=require('../../lib/supabase');


function buildTree(items,parentId=null,prefix=''){

    const children=items.filter(i=>i.parent_id===parentId)

    if(children.length===0)return '';

    let result='';

    children.forEach((child,index)=>{
        const isLast=index===children.length-1;

        const connector=isLast?'└── ' : '├── ';

        const status=child.done?'✅ ' : '⬜ ';

        result += `${prefix}${connector}${status}${child.name}\n`;


        const newPrefix = prefix + (isLast ? '    ' : '│   ');

        result+= buildTree(items,child.id,newPrefix);

    });
    return result;
}

module.exports={
    data:new SlashCommandBuilder()
    .setName('view')
    .setDescription('View your full study curriculum,'),

    //runs when user type/view
     async execute(interaction) {
    
    // Get who ran the command
    const discord_id = interaction.user.id;
    
    // Get which server it was run in
    const guild_id = interaction.guildId;

    // Fetch ALL categories for this user in this server in one query
    // More efficient than querying each level separately
    const { data, error } = await supabase
      .from('categories')
      .select('*')                                    // get all columns
      .eq('discord_id', discord_id)                   // only this user's items
      .eq('guild_id', guild_id)                       // only this server's items
      .order('created_at', { ascending: true });       // oldest first so tree order makes sense

    // If database error, tell user
    if (error) return interaction.reply({ 
      content: `${error.message}`, 
      ephemeral: true                                 // only visible to user
    });

    // If user has no curriculum yet
    if (!data || data.length === 0) {
      return interaction.reply({
        content: '📭 No curriculum yet. Use `/curriculum add` to start.',
        ephemeral: true
      });
    }

    // Build the visual tree starting from root level (parentId = null)
    const tree = buildTree(data);

    // Send the tree wrapped in code block for monospace font
    // Monospace makes the tree lines align properly
    await interaction.reply({
      content: `📚 **Your Curriculum**\n\`\`\`\n${tree}\`\`\``,
      ephemeral: true
    });
  }

};
