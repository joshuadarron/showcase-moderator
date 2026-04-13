require('dotenv/config');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const TRACK_COLORS = {
  'Startup':       0x5865F2,
  'Internal Tool': 0xFEE75C,
  'AI System':     0x57F287,
};

const STATUS_EMOJI = {
  'Prototype': '🔧',
  'MVP':       '🚀',
  'Production': '✅',
};

const FOOTER_TEXT = 'RocketRide Project Showcase · #submissions';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const channel = await client.channels.fetch(process.env.SHOWCASE_CHANNEL_ID);
  const messages = await channel.messages.fetch({ limit: 100 });

  const userMessages = [...messages.filter(m => !m.author.bot).values()]
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  let migrated = 0;

  for (const message of userMessages) {
    try {
      const content = message.content;

      const projectName = content.match(/project name:\s*(.+)/i)?.[1]?.trim();
      const track       = content.match(/track:\s*(.+)/i)?.[1]?.trim();
      const problem     = content.match(/problem:\s*([\s\S]*?)(?=what i built:|$)/i)?.[1]?.trim();
      const built       = content.match(/what i built:\s*([\s\S]*?)(?=how it uses|demo|$)/i)?.[1]?.trim();
      const howItUses   = content.match(/how it uses[^:]*:\s*([\s\S]*?)(?=demo|$)/i)?.[1]?.trim();
      const demoRepo    = content.match(/demo\s*\/?\s*repo:\s*([\s\S]*?)(?=current status:|$)/i)?.[1]?.trim();
      const status      = content.match(/current status:\s*(.+)/i)?.[1]?.trim();
      const feedback    = content.match(/feedback wanted:\s*([\s\S]*?)$/i)?.[1]?.trim();

      if (!projectName || !track) {
        console.warn(`Skipping message ${message.id} — missing required fields`);
        continue;
      }

      const matchedTrack = Object.keys(TRACK_COLORS).find(
        t => t.toLowerCase() === track.toLowerCase()
      ) ?? 'Startup';

      const builtValue = howItUses
        ? `${built}\n\n**How it uses RocketRide:** ${howItUses}`
        : (built || 'N/A');

      const statusClean = status?.replace(/[()]/g, '').trim() || 'Prototype';

      const embed = new EmbedBuilder()
        .setColor(TRACK_COLORS[matchedTrack])
        .setAuthor({
          name: `${message.author.displayName} submitted a project`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setTitle(projectName)
        .addFields(
          { name: 'Track',    value: `\`${matchedTrack}\``,                                    inline: true },
          { name: 'Status',   value: `${STATUS_EMOJI[statusClean] ?? ''} \`${statusClean}\``,  inline: true },
          { name: '\u200b',   value: '\u200b',                                                  inline: true },
          { name: 'Problem',  value: problem || 'N/A' },
          { name: 'What I built + how it uses RocketRide', value: builtValue },
          { name: 'Demo / Repo',     value: demoRepo || 'N/A', inline: true },
          { name: 'Feedback wanted', value: feedback || 'N/A' },
        )
        .setFooter({ text: FOOTER_TEXT, iconURL: client.user.displayAvatarURL() })
        .setTimestamp(message.createdAt);

      const sent = await channel.send({ embeds: [embed] });
      await sent.startThread({
        name: `Feedback: ${projectName}`,
        autoArchiveDuration: 1440,
      });
      await message.delete();
      console.log(`Migrated: ${projectName} by ${message.author.displayName}`);
      migrated++;
    } catch (err) {
      console.warn(`Failed to migrate message ${message.id}:`, err.message);
    }
  }

  console.log(`Migration complete. ${migrated} posts migrated.`);
  client.destroy();
});

client.login(process.env.BOT_TOKEN);
