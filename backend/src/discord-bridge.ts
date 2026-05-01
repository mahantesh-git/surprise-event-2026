import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ChatInputCommandInteraction, PermissionsBitField, Events, AttachmentBuilder } from 'discord.js';
import { getTeamsCollection } from './db';
import { ChatMessage } from './types';

let discordClient: Client | null = null;
let adminChannelId: string | null = null;
let authChannelId: string | null = null;

/**
 * Initializes the Discord bridge with failsafe error handling.
 */
export async function initDiscordBridge() {
  const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
  const ADMIN_CHANNEL_ID = process.env.ADMIN_CHANNEL_ID;
  const ADMIN_CHANNEL_ID_AUTH = process.env.ADMIN_CHANNEL_ID_AUTH || process.env.ADMIN_CHANNEL_ID;
  const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  const ADMIN_DISCORD_USER_ID = process.env.ADMIN_DISCORD_USER_ID;

  console.log('Discord Bridge init check:', {
    hasToken: !!DISCORD_BOT_TOKEN,
    hasChannelId: !!ADMIN_CHANNEL_ID,
    hasAuthChannelId: !!ADMIN_CHANNEL_ID_AUTH,
    hasClientId: !!DISCORD_CLIENT_ID,
    tokenLength: DISCORD_BOT_TOKEN?.length ?? 0,
  });

  if (!DISCORD_BOT_TOKEN || !ADMIN_CHANNEL_ID || !DISCORD_CLIENT_ID) {
    console.warn('Discord Bridge: Missing configuration. Bridge disabled.');
    return;
  }

  adminChannelId = ADMIN_CHANNEL_ID;
  authChannelId = ADMIN_CHANNEL_ID_AUTH || null;

  const pendingClient = new Client({
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

  // Register slash commands
  try {
    const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);
    await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body: commands });
    console.log('Discord Bridge: Slash commands registered.');
  } catch (error) {
    console.error('Discord Bridge: Command registration failed', error);
  }

  pendingClient.on(Events.ClientReady, () => {
    console.log(`Tactical Bridge Active: ${pendingClient.user?.tag}`);
  });

  pendingClient.on(Events.InteractionCreate, async (interaction) => {
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

  pendingClient.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || message.channelId !== adminChannelId) return;
    if (message.reference && message.reference.messageId) {
      const repliedToId = message.reference.messageId;
      const teams = await getTeamsCollection();
      const team = await teams.findOne({ lastHelpMessageId: repliedToId });
      if (team) {
        const lastMessage: ChatMessage = {
          text: message.content,
          senderRole: 'admin',
          timestamp: Date.now(),
          targetRole: (team as any).lastHelpRequesterRole || 'all',
        };
        await teams.updateOne(
          { _id: team._id },
          { $set: { lastMessage, updatedAt: new Date(), 'gameState.helpRequested': false } }
        );
        await message.react('✅');
      }
    }
  });

  // Login — only expose client after successful login to prevent race conditions
  try {
    await pendingClient.login(DISCORD_BOT_TOKEN);
    discordClient = pendingClient;
    console.log('Discord Bridge: Login successful.');
  } catch (error) {
    adminChannelId = null;
    console.error('Discord Bridge: Login failed.', error);
  }
}

/**
 * Sends an alert to the admin channel.
 */
export async function sendAdminAlert(text: string, location?: { lat: number; lng: number }, category: 'help' | 'auth' = 'help'): Promise<string | null> {
  const targetChannelId = category === 'auth' && authChannelId ? authChannelId : adminChannelId;

  if (!discordClient || !targetChannelId) {
    console.warn('Discord Bridge: Cannot send alert. Bridge not initialized or channel not configured.');
    return null;
  }
  try {
    let fullText = text;
    if (location) {
      fullText += `\nLOCATION: ${location.lat}, ${location.lng}\n MAP: https://www.google.com/maps?q=${location.lat},${location.lng}`;
    }

    // force: false uses cache if available, avoids extra API calls
    const channel = await discordClient.channels.fetch(targetChannelId, { force: false });

    if (!channel) {
      console.error(`Discord Bridge: Channel ${targetChannelId} not found.`);
      return null;
    }
    if (!channel.isTextBased()) {
      console.error(`Discord Bridge: Channel ${targetChannelId} is not a text channel (type: ${channel.type}).`);
      return null;
    }
    if (!('send' in channel)) {
      console.error(`Discord Bridge: Channel does not have a send method.`);
      return null;
    }

    const message = await (channel as any).send(fullText);
    console.log(`Discord Bridge: Alert sent, messageId: ${message.id}`);
    return message.id;
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
    targetRole,
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
        { $set: { lastMessage, updatedAt: new Date(), 'gameState.helpRequested': false } }
      );
      await interaction.reply(`SUCCESS: Targeted ${targetRole.toUpperCase()} in Squadron ${team.name}.\n${messageText}`);
    } else {
      await teams.updateMany({}, { $set: { lastMessage, updatedAt: new Date(), 'gameState.helpRequested': false } });
      await interaction.reply(`GLOBAL SUCCESS: Transmitted to all squadrons.\n${messageText}`);
    }
  } catch (err) {
    console.error('Discord Bridge: Failed to handle slash command', err);
    try {
      await interaction.reply({ content: 'CRITICAL: Failed to transmit message.', ephemeral: true });
    } catch { /* ignore */ }
  }
}

export async function sendQRToDiscord(
  qrCodePath: string,
  sequence: number,
  lat: string | number,
  lng: string | number,
  place: string,
) {
  if (!discordClient) return;
  const channelId = process.env.ADMIN_CHANNEL_ID_QR || process.env.ADMIN_CHANNEL_ID;
  if (!channelId) {
    console.warn('Discord Bridge: ADMIN_CHANNEL_ID_QR not set, cannot send QR code.');
    return;
  }

  try {
    const channel = await discordClient.channels.fetch(channelId, { force: false });
    if (!channel || !channel.isTextBased() || !('send' in channel)) {
      console.error(`Discord Bridge: Channel ${channelId} not found or not text-based.`);
      return;
    }

    const attachment = new AttachmentBuilder(qrCodePath, { name: `qr_seq_${sequence}.png` });
    
    await channel.send({
      content: `**NEW QR CODE GENERATED**\n**Sequence**: ${sequence}\n**Location**: ${place}\n**Coordinates**: ${lat}, ${lng}\n**Map**: <https://www.google.com/maps?q=${lat},${lng}>`,
      files: [attachment]
    });
  } catch (error) {
    console.error('Discord Bridge: Failed to send QR code to Discord', error);
  }
}
