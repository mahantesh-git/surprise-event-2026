import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ChatInputCommandInteraction, PermissionsBitField, Events, Message } from 'discord.js';
import { getTeamsCollection } from './db';
import { ChatMessage } from './types';

let discordClient: Client | null = null;
let adminChannelId: string | null = null;

/**
 * Initializes the Discord bridge with failsafe error handling.
 */
export async function initDiscordBridge() {
  const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
  const ADMIN_CHANNEL_ID = process.env.ADMIN_CHANNEL_ID;
  const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  const ADMIN_DISCORD_USER_ID = process.env.ADMIN_DISCORD_USER_ID;

  if (!DISCORD_BOT_TOKEN || !ADMIN_CHANNEL_ID || !DISCORD_CLIENT_ID) {
    console.warn('Discord Bridge: Missing configuration. Bridge disabled.');
    return;
  }

  adminChannelId = ADMIN_CHANNEL_ID;
  discordClient = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  const commands = [
    new SlashCommandBuilder()
      .setName('broadcast')
      .setDescription('Send a tactical message to ALL squadrons')
      .addStringOption(option => option.setName('message').setDescription('The tactical instruction').setRequired(true)),
    new SlashCommandBuilder()
      .setName('team')
      .setDescription('Target a specific squadron')
      .addStringOption(option => option.setName('name').setDescription('Squadron name').setRequired(true))
      .addStringOption(option => option.setName('message').setDescription('Tactical message').setRequired(true)),
    new SlashCommandBuilder()
      .setName('runner')
      .setDescription('Target only the field operative (Runner)')
      .addStringOption(option => option.setName('name').setDescription('Squadron name').setRequired(true))
      .addStringOption(option => option.setName('message').setDescription('Tactical message').setRequired(true)),
    new SlashCommandBuilder()
      .setName('solver')
      .setDescription('Target only the tactical analyst (Solver)')
      .addStringOption(option => option.setName('name').setDescription('Squadron name').setRequired(true))
      .addStringOption(option => option.setName('message').setDescription('Tactical message').setRequired(true)),
  ].map(command => command.toJSON());

  const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);

  try {
    if (DISCORD_CLIENT_ID) {
      await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body: commands });
    } else {
      console.warn('Discord Bridge: DISCORD_CLIENT_ID missing, skipping command registration.');
    }
  } catch (error) {
    console.error('Discord Bridge: Command registration failed', error);
  }

  discordClient.on(Events.ClientReady, () => {
    console.log(`Tactical Bridge Active: ${discordClient?.user?.tag}`);
  });

  // Handle Slash Commands
  discordClient.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.channelId !== adminChannelId) {
      await interaction.reply({ content: 'ACCESS DENIED: Restricted to Admin Channel.', ephemeral: true });
      return;
    }
    const isAdmin = interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator);
    const isSpecificUser = ADMIN_DISCORD_USER_ID ? interaction.user.id === ADMIN_DISCORD_USER_ID : true;
    if (!isAdmin || !isSpecificUser) {
      await interaction.reply({ content: 'UNAUTHORIZED: Insufficient clearance.', ephemeral: true });
      return;
    }
    try {
      await handleSlashCommand(interaction);
    } catch (error) {
      console.error('Discord Bridge Command Error:', error);
    }
  });

  // SMART RELY: Handle replies to help alerts
  discordClient.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || message.channelId !== adminChannelId) return;
    
    // Check if this is a reply to one of our messages
    if (message.reference && message.reference.messageId) {
      const repliedToId = message.reference.messageId;
      const teams = await getTeamsCollection();
      
      // Find the team that sent this specific help request
      const team = await teams.findOne({ lastHelpMessageId: repliedToId });
      
      if (team) {
        const lastMessage: ChatMessage = {
          text: message.content,
          senderRole: 'admin',
          timestamp: Date.now(),
          targetRole: (team as any).lastHelpRequesterRole || 'all' 
        };
        
        await teams.updateOne(
          { _id: team._id }, 
          { 
            $set: { 
              lastMessage, 
              updatedAt: new Date(),
              'gameState.helpRequested': false 
            } 
          }
        );
        await message.react('✅'); // Confirmation without symbols in text
      }
    }
  });

  try {
    await discordClient.login(DISCORD_BOT_TOKEN);
  } catch (error) {
    console.error('Discord Bridge: Login failed', error);
  }
}

/**
 * Sends an alert to the admin channel and returns the message ID for tracking.
 */
export async function sendAdminAlert(text: string, location?: { lat: number, lng: number }): Promise<string | null> {
  if (!discordClient || !adminChannelId) {
    console.warn('Discord Bridge: Cannot send alert. Bridge not initialized or channel missing.');
    return null;
  }
  
  try {
    const channel = await discordClient.channels.fetch(adminChannelId);
    if (channel && channel.isTextBased() && 'send' in channel) {
      let fullText = text;
      if (location) {
        fullText += `\n📍 LOCATION: ${location.lat}, ${location.lng}\n🗺️ MAP: https://www.google.com/maps?q=${location.lat},${location.lng}`;
      }
      const message = await (channel as any).send(fullText);
      return message.id;
    }
  } catch (error) {
    console.error('Discord Bridge: Failed to send alert', error);
  }
  return null;
}

async function handleSlashCommand(interaction: ChatInputCommandInteraction) {
  const teams = await getTeamsCollection();
  const commandName = interaction.commandName;
  const messageText = interaction.options.getString('message', true);
  const targetTeamName = interaction.options.getString('name');

  let targetRole: 'runner' | 'solver' | 'all' = 'all';
  if (commandName === 'runner') targetRole = 'runner';
  if (commandName === 'solver') targetRole = 'solver';

  const lastMessage: ChatMessage = {
    text: messageText,
    senderRole: 'admin',
    timestamp: Date.now(),
    targetRole
  };

  try {
    if (targetTeamName) {
      const team = await teams.findOne({ name: { $regex: new RegExp(`^${targetTeamName}$`, 'i') } });
      if (!team) {
        await interaction.reply({ content: `FAILED: Squadron "${targetTeamName}" not found.`, ephemeral: true });
        return;
      }
      await teams.updateOne(
        { _id: team._id }, 
        { 
          $set: { 
            lastMessage, 
            updatedAt: new Date(),
            'gameState.helpRequested': false
          } 
        }
      );
      await interaction.reply(`SUCCESS: Targeted ${targetRole.toUpperCase()} in Squadron ${team.name}.\n${messageText}`);
    } else {
      await teams.updateMany({}, { $set: { lastMessage, updatedAt: new Date(), 'gameState.helpRequested': false } });
      await interaction.reply(`GLOBAL SUCCESS: Transmitted to all squadrons.\n${messageText}`);
    }
  } catch (err) {
    console.error('Discord Bridge: Failed to handle slash command', err);
    try {
      await interaction.reply({ content: 'CRITICAL: Failed to transmit message to field operatives.', ephemeral: true });
    } catch (replyErr) {
      // Ignore if already replied
    }
  }
}
