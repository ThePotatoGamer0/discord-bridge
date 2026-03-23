// backend/src/bot/index.js
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessagePolls,
  ]
});

client.once('clientReady', () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
});

async function startBot() {
  await client.login(process.env.DISCORD_BOT_TOKEN);
}

module.exports = { client, startBot };