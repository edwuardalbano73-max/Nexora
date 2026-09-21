// ============================================================
// 🌌 NEXORA — DISCORD BOT
// PREFIX: n.
// discord.js v14
// ============================================================

const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  AuditLogEvent,
  Events
} = require("discord.js");

const fs = require("fs");
const path = require("path");
const http = require("http");

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const PREFIX = "n.";
const DATA_FILE = path.join(__dirname, "data.json");

// ============================================================
// 🤖 CLIENTE DE DISCORD
// ============================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration
  ],
  partials: [Partials.Channel]
});

// ============================================================
// 💾 DATOS
// ============================================================

let data = {
  users: {},
  guilds: {}
};

try {
  if (fs.existsSync(DATA_FILE)) {
    data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  }
} catch (error) {
  console.error("❌ Error leyendo data.json:", error.message);
}

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("❌ Error guardando data.json:", error.message);
  }
}

function getUserData(userId) {
  if (!data.users[userId]) {
    data.users[userId] = {
      balance: 0,
      xp: 0,
      level: 1,
      daily: 0,
      warnings: []
    };

    saveData();
  }

  return data.users[userId];
}

function getGuildData(guildId) {
  if (!data.guilds[guildId]) {
    data.guilds[guildId] = {
      welcomeChannel: null,
      logsChannel: null,
      autoRole: null,
      tickets: null
    };

    saveData();
  }

  return data.guilds[guildId];
}

// ============================================================
// 🎨 COLORES
// ============================================================

const COLORS = {
  main: 0x5865F2,
  galaxy: 0x8B5CF6,
  success: 0x57F287,
  danger: 0xED4245,
  warning: 0xFEE75C,
  dark: 0x18191C
};

// ============================================================
// 🧩 EMBEDS
// ============================================================

function createEmbed(title, description, color = COLORS.main) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setFooter({
      text: "🌌 Nexora"
    })
    .setTimestamp();
}

// ============================================================
// 📚 CATEGORÍAS
// ============================================================

const categories = {
  general: {
    name: "🌌 General",
    commands: [
      "help",
      "ping",
      "botinfo",
      "serverinfo",
      "userinfo",
      "avatar",
      "stats",
      "id",
      "created",
      "icon"
    ]
  },

  moderation: {
    name: "🛡️ Moderación",
    commands: [
      "kick",
      "ban",
      "unban",
      "timeout",
      "untimeout",
      "clear",
      "slowmode",
      "lock",
      "unlock",
      "warn"
    ]
  },

  security: {
    name: "🔐 Seguridad",
    commands: [
      "warnings",
      "clearwarns",
      "permissions",
      "membercheck",
      "roleinfo",
      "channelinfo",
      "audit",
      "lockdown",
      "unlockdown",
      "security"
    ]
  },

  server: {
    name: "🏠 Servidor",
    commands: [
      "channels",
      "roles",
      "members",
      "emojis",
      "owner",
      "serverinfo",
      "created",
      "icon",
      "banner"
    ]
  },

  economy: {
    name: "💰 Economía",
    commands: [
      "balance",
      "daily",
      "work",
      "beg",
      "pay",
      "rich",
      "deposit",
      "withdraw",
      "reverse",
      "stats"
    ]
  },

  fun: {
    name: "🎮 Diversión",
    commands: [
      "coinflip",
      "dice",
      "8ball",
      "choose",
      "joke",
      "rate",
      "random",
      "ship",
      "say",
      "avatar"
    ]
  },

  levels: {
    name: "⭐ Niveles",
    commands: [
      "rank",
      "leaderboard",
      "xp",
      "level",
      "addxp",
      "resetxp",
      "setlevel",
      "levels",
      "resetconfig",
      "stats"
    ]
  },

  config: {
    name: "⚙️ Configuración",
    commands: [
      "config",
      "setwelcome",
      "setlogs",
      "setautorole",
      "testwelcome",
      "testlogs",
      "testautorole",
      "admin",
      "panel",
      "permissions"
    ]
  },

  tickets: {
    name: "🎫 Tickets",
    commands: [
      "ticket",
      "add",
      "remove",
      "rename",
      "claim",
      "unclaim",
      "ticketinfo",
      "support",
      "close",
      "panel"
    ]
  }
};

// ============================================================
// 📖 MENÚ PRINCIPAL
// ============================================================

function mainMenu() {
  const embed = createEmbed(
    "🌌 NEXORA",
    "Bienvenido al centro de comandos de **Nexora**.\n\n" +
      "Selecciona una categoría en el menú de abajo.",
    COLORS.galaxy
  );

  const menu = new StringSelectMenuBuilder()
    .setCustomId("nexora_category")
    .setPlaceholder("🌌 Selecciona una categoría")
    .addOptions(
      Object.entries(categories).map(([id, category]) => ({
        label: category.name.replace(/^.\s/, ""),
        value: id,
        emoji: category.name.split(" ")[0]
      }))
    );

  const row = new ActionRowBuilder().addComponents(menu);

  return {
    embeds: [embed],
    components: [row]
  };
}

// ============================================================
// 📋 MENÚ DE CATEGORÍA
// ============================================================

function categoryMenu(categoryId) {
  const category = categories[categoryId];

  if (!category) {
    return mainMenu();
  }

  const embed = createEmbed(
    category.name,
    category.commands
      .map(command => `\`n.${command}\``)
      .join("\n"),
    COLORS.galaxy
  );

  const backButton = new ButtonBuilder()
    .setCustomId("nexora_back")
    .setLabel("Volver")
    .setEmoji("↩️")
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(backButton);

  return {
    embeds: [embed],
    components: [row]
  };
}

// ============================================================
// 🚀 READY
// ============================================================

client.once(Events.ClientReady, readyClient => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🌌 NEXORA INICIADO");
  console.log(`🤖 Usuario: ${readyClient.user.tag}`);
  console.log(`🌐 Servidores: ${readyClient.guilds.cache.size}`);
  console.log(`💫 Prefijo: ${PREFIX}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  readyClient.user.setPresence({
    activities: [
      {
        name: "n.help • 🌌 Nexora",
        type: 0
      }
    ],
    status: "online"
  });
});

// ============================================================
// 📨 MENSAJES
// ============================================================

client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;
  if (!message.guild) return;

  if (!message.content.toLowerCase().startsWith(PREFIX)) return;

  const args = message.content
    .slice(PREFIX.length)
    .trim()
    .split(/\s+/);

  const command = args.shift()?.toLowerCase();

  if (!command) return;

  const userData = getUserData(message.author.id);

  // ==========================================================
  // 🌌 HELP
  // ==========================================================

  if (command === "help") {
    return message.reply(mainMenu());
  }

  // ==========================================================
  // 🏓 PING
  // ==========================================================

  if (command === "ping") {
    return message.reply(
      createEmbed(
        "🏓 Pong!",
        `Latencia: **${client.ws.ping}ms**`,
        COLORS.success
      )
    );
  }

  // ==========================================================
  // 🤖 BOTINFO
  // ==========================================================

  if (command === "botinfo") {
    return message.reply(
      createEmbed(
        "🤖 Nexora",
        `🌌 **Nombre:** ${client.user.username}\n` +
          `🌐 **Servidores:** ${client.guilds.cache.size}\n` +
          `👥 **Usuarios:** ${client.guilds.cache.reduce(
            (total, guild) => total + guild.memberCount,
            0
          )}\n` +
          `💫 **Prefijo:** ${PREFIX}`,
        COLORS.galaxy
      )
    );
  }

  // ==========================================================
  // 🏠 SERVERINFO
  // ==========================================================

  if (command === "serverinfo") {
    return message.reply(
      createEmbed(
        `🏠 ${message.guild.name}`,
        `👑 **Dueño:** <@${message.guild.ownerId}>\n` +
          `👥 **Miembros:** ${message.guild.memberCount}\n` +
          `💬 **Canales:** ${message.guild.channels.cache.size}\n` +
          `🎭 **Roles:** ${message.guild.roles.cache.size}\n` +
          `🆔 **ID:** ${message.guild.id}`,
        COLORS.main
      )
    );
  }

  // ==========================================================
  // 👤 USERINFO
  // ==========================================================

  if (command === "userinfo") {
    const member =
      message.mentions.members.first() ||
      message.member;

    return message.reply(
      createEmbed(
        "👤 Información del usuario",
        `👤 **Usuario:** ${member.user.tag}\n` +
          `🆔 **ID:** ${member.id}\n` +
          `📅 **Cuenta:** <t:${Math.floor(
            member.user.createdTimestamp / 1000
          )}:F>\n` +
          `📅 **Entró:** ${
            member.joinedTimestamp
              ? `<t:${Math.floor(
                  member.joinedTimestamp / 1000
                )}:F>`
              : "Desconocido"
          }`
      )
    );
  }

  // ==========================================================
  // 🖼️ AVATAR
  // ==========================================================

  if (command === "avatar") {
    const member =
      message.mentions.members.first() ||
      message.member;

    return message.reply({
      content: member.user.displayAvatarURL({
        size: 1024,
        extension: "png"
      })
    });
  }

  // ==========================================================
  // 📊 STATS
  // ==========================================================

  if (command === "stats") {
    return message.reply(
      createEmbed(
        "📊 Tus estadísticas",
        `💰 Balance: **${userData.balance}**\n` +
          `⭐ XP: **${userData.xp}**\n` +
          `🏆 Nivel: **${userData.level}**\n` +
          `⚠️ Advertencias: **${userData.warnings.length}**`
      )
    );
  }

  // ==========================================================
  // 💰 BALANCE
  // ==========================================================

  if (command === "balance") {
    return message.reply(
      createEmbed(
        "💰 Balance",
        `Tienes **${userData.balance}** monedas virtuales.`
      )
    );
  }

  // ==========================================================
  // 🎁 DAILY
  // ==========================================================

  if (command === "daily") {
    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000;

    if (userData.daily && now - userData.daily < cooldown) {
      const remaining =
        cooldown - (now - userData.daily);

      const hours = Math.ceil(
        remaining / (60 * 60 * 1000)
      );

      return message.reply(
        createEmbed(
          "⏳ Daily",
          `Ya reclamaste tu recompensa.\nVuelve en aproximadamente **${hours}h**.`,
          COLORS.warning
        )
      );
    }

    const reward = Math.floor(
      Math.random() * 101
    ) + 100;

    userData.balance += reward;
    userData.daily = now;

    saveData();

    return message.reply(
      createEmbed(
        "🎁 Recompensa diaria",
        `Recibiste **${reward}** monedas virtuales.`,
        COLORS.success
      )
    );
  }

  // ==========================================================
  // 💼 WORK
  // ==========================================================

  if (command === "work") {
    const reward =
      Math.floor(Math.random() * 101) + 50;

    userData.balance += reward;

    saveData();

    return message.reply(
      createEmbed(
        "💼 Trabajo completado",
        `Ganaste **${reward}** monedas virtuales.`,
        COLORS.success
      )
    );
  }

  // ==========================================================
  // 🪙 COINFLIP
  // ==========================================================

  if (command === "coinflip") {
    const result =
      Math.random() < 0.5
        ? "🪙 Cara"
        : "🪙 Cruz";

    return message.reply(
      createEmbed(
        "🪙 Moneda",
        `Resultado: **${result}**`
      )
    );
  }

  // ==========================================================
  // 🎲 DICE
  // ==========================================================

  if (command === "dice") {
    const result =
      Math.floor(Math.random() * 6) + 1;

    return message.reply(
      createEmbed(
        "🎲 Dado",
        `Resultado: **${result}**`
      )
    );
  }

  // ==========================================================
  // 🔮 8BALL
  // ==========================================================

  if (command === "8ball") {
    const answers = [
      "✨ Sí.",
      "🌌 Probablemente.",
      "🤔 No estoy seguro.",
      "❌ No.",
      "💫 Puede ser.",
      "🔮 Las estrellas dicen que sí."
    ];

    return message.reply(
      createEmbed(
        "🔮 8Ball",
        answers[
          Math.floor(Math.random() * answers.length)
        ]
      )
    );
  }

  // ==========================================================
  // 🎯 CHOOSE
  // ==========================================================

  if (command === "choose") {
    if (args.length < 2) {
      return message.reply(
        "❌ Usa: `n.choose opción1 opción2 opción3`"
      );
    }

    const choice =
      args[Math.floor(Math.random() * args.length)];

    return message.reply(
      createEmbed(
        "🎯 Elección",
        `Elegí: **${choice}**`
      )
    );
  }

  // ==========================================================
  // ⭐ RANK
  // ==========================================================

  if (command === "rank") {
    return message.reply(
      createEmbed(
        "⭐ Tu rango",
        `🏆 Nivel: **${userData.level}**\n` +
          `✨ XP: **${userData.xp}**`
      )
    );
  }

  // ==========================================================
  // 🏆 LEADERBOARD
  // ==========================================================

  if (command === "leaderboard") {
    const ranking = Object.entries(data.users)
      .sort((a, b) => b[1].xp - a[1].xp)
      .slice(0, 10);

    if (!ranking.length) {
      return message.reply(
        "📊 Todavía no hay datos suficientes."
      );
    }

    const text = ranking
      .map(
        ([id, user], index) =>
          `**${index + 1}.** <@${id}> — ⭐ ${user.xp} XP`
      )
      .join("\n");

    return message.reply(
      createEmbed(
        "🏆 Leaderboard",
        text
      )
    );
  }

  // ==========================================================
  // 🦶 KICK
  // ==========================================================

  if (command === "kick") {
    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.KickMembers
      )
    ) {
      return message.reply(
        "❌ No tienes permiso para expulsar miembros."
      );
    }

    const member =
      message.mentions.members.first();

    if (!member) {
      return message.reply(
        "❌ Menciona al miembro que quieres expulsar."
      );
    }

    if (!member.kickable) {
      return message.reply(
        "❌ No puedo expulsar a ese miembro."
      );
    }

    await member.kick(
      `Expulsado por ${message.author.tag}`
    );

    return message.reply(
      createEmbed(
        "👢 Miembro expulsado",
        `${member.user.tag} fue expulsado.`,
        COLORS.success
      )
    );
  }

  // ==========================================================
  // 🔨 BAN
  // ==========================================================

  if (command === "ban") {
    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.BanMembers
      )
    ) {
      return message.reply(
        "❌ No tienes permiso para banear miembros."
      );
    }

    const member =
      message.mentions.members.first();

    if (!member) {
      return message.reply(
        "❌ Menciona al miembro que quieres banear."
      );
    }

    if (!member.bannable) {
      return message.reply(
        "❌ No puedo banear a ese miembro."
      );
    }

    await member.ban({
      reason: `Baneado por ${message.author.tag}`
    });

    return message.reply(
      createEmbed(
        "🔨 Miembro baneado",
        `${member.user.tag} fue baneado.`,
        COLORS.danger
      )
    );
  }

  // ==========================================================
  // ⏰ TIMEOUT
  // ==========================================================

  if (command === "timeout") {
    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.ModerateMembers
      )
    ) {
      return message.reply(
        "❌ No tienes permiso para aplicar timeout."
      );
    }

    const member =
      message.mentions.members.first();

    if (!member) {
      return message.reply(
        "❌ Menciona al miembro."
      );
    }

    const minutes =
      parseInt(args[1]) || 10;

    if (!member.moderatable) {
      return message.reply(
        "❌ No puedo aplicar timeout a ese miembro."
      );
    }

    await member.timeout(
      minutes * 60 * 1000,
      `Timeout por ${message.author.tag}`
    );

    return message.reply(
      createEmbed(
        "⏰ Timeout",
        `${member.user.tag} recibió un timeout de **${minutes} minutos**.`,
        COLORS.warning
      )
    );
  }

  // ==========================================================
  // 🧹 CLEAR
  // ==========================================================

  if (command === "clear") {
    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.ManageMessages
      )
    ) {
      return message.reply(
        "❌ No tienes permiso para borrar mensajes."
      );
    }

    const amount =
      Math.min(parseInt(args[0]) || 10, 100);

    await message.channel.bulkDelete(
      amount,
      true
    );

    const msg = await message.channel.send(
      `🧹 Se eliminaron **${amount}** mensajes.`
    );

    setTimeout(() => {
      msg.delete().catch(() => {});
    }, 3000);

    return;
  }

  // ==========================================================
  // 🐌 SLOWMODE
  // ==========================================================

  if (command === "slowmode") {
    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.ManageChannels
      )
    ) {
      return message.reply(
        "❌ No tienes permiso para configurar el canal."
      );
    }

    const seconds =
      Math.min(parseInt(args[0]) || 0, 21600);

    await message.channel.setRateLimitPerUser(
      seconds
    );

    return message.reply(
      createEmbed(
        "🐌 Slowmode",
        `Slowmode establecido en **${seconds} segundos**.`,
        COLORS.success
      )
    );
  }

  // ==========================================================
  // 🔒 LOCK
  // ==========================================================

  if (command === "lock") {
    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.ManageChannels
      )
    ) {
      return message.reply(
        "❌ No tienes permiso para bloquear canales."
      );
    }

    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      {
        SendMessages: false
      }
    );

    return message.reply(
      createEmbed(
        "🔒 Canal bloqueado",
        "Este canal ha sido bloqueado.",
        COLORS.warning
      )
    );
  }

  // ==========================================================
  // 🔓 UNLOCK
  // ==========================================================

  if (command === "unlock") {
    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.ManageChannels
      )
    ) {
      return message.reply(
        "❌ No tienes permiso para desbloquear canales."
      );
    }

    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      {
        SendMessages: null
      }
    );

    return message.reply(
      createEmbed(
        "🔓 Canal desbloqueado",
        "Este canal ha sido desbloqueado.",
        COLORS.success
      )
    );
  }

  // ==========================================================
  // ⚠️ WARN
  // ==========================================================

  if (command === "warn") {
    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.ModerateMembers
      )
    ) {
      return message.reply(
        "❌ No tienes permiso para advertir miembros."
      );
    }

    const member =
      message.mentions.members.first();

    if (!member) {
      return message.reply(
        "❌ Menciona al miembro."
      );
    }

    const reason =
      args.slice(1).join(" ") ||
      "Sin razón especificada";

    const targetData =
      getUserData(member.id);

    targetData.warnings.push({
      reason,
      moderator: message.author.id,
      date: Date.now()
    });

    saveData();

    return message.reply(
      createEmbed(
        "⚠️ Advertencia",
        `${member.user.tag} recibió una advertencia.\n\n` +
          `**Razón:** ${reason}`,
        COLORS.warning
      )
    );
  }

  // ==========================================================
  // 📋 WARNINGS
  // ==========================================================

  if (command === "warnings") {
    const member =
      message.mentions.members.first() ||
      message.member;

    const targetData =
      getUserData(member.id);

    if (!targetData.warnings.length) {
      return message.reply(
        `📋 ${member.user.tag} no tiene advertencias.`
      );
    }

    const text = targetData.warnings
      .map(
        (warn, index) =>
          `**${index + 1}.** ${warn.reason}`
      )
      .join("\n");

    return message.reply(
      createEmbed(
        `📋 Advertencias de ${member.user.tag}`,
        text,
        COLORS.warning
      )
    );
  }

  // ==========================================================
  // 🔐 PERMISSIONS
  // ==========================================================

  if (command === "permissions") {
    const permissions =
      message.member.permissions.toArray();

    return message.reply(
      createEmbed(
        "🔐 Tus permisos",
        permissions
          .map(permission => `• ${permission}`)
          .join("\n")
      )
    );
  }

  // ==========================================================
  // ⚙️ CONFIG
  // ==========================================================

  if (command === "config") {
    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) {
      return message.reply(
        "❌ Solo los administradores pueden usar la configuración."
      );
    }

    const guildData =
      getGuildData(message.guild.id);

    return message.reply(
      createEmbed(
        "⚙️ Configuración de Nexora",
        `👋 Bienvenida: ${
          guildData.welcomeChannel
            ? `<#${guildData.welcomeChannel}>`
            : "No configurada"
        }\n` +
          `📋 Logs: ${
            guildData.logsChannel
              ? `<#${guildData.logsChannel}>`
              : "No configurados"
          }\n` +
          `🎭 AutoRol: ${
            guildData.autoRole
              ? `<@&${guildData.autoRole}>`
              : "No configurado"
          }`
      )
    );
  }

  // ==========================================================
  // 👋 SETWELCOME
  // ==========================================================

  if (command === "setwelcome") {
    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) {
      return message.reply(
        "❌ Solo los administradores pueden usar esto."
      );
    }

    const channel =
      message.mentions.channels.first();

    if (!channel) {
      return message.reply(
        "❌ Menciona el canal de bienvenida."
      );
    }

    const guildData =
      getGuildData(message.guild.id);

    guildData.welcomeChannel = channel.id;

    saveData();

    return message.reply(
      createEmbed(
        "👋 Bienvenida configurada",
        `Canal: ${channel}`,
        COLORS.success
      )
    );
  }

  // ==========================================================
  // 📋 SETLOGS
  // ==========================================================

  if (command === "setlogs") {
    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) {
      return message.reply(
        "❌ Solo los administradores pueden usar esto."
      );
    }

    const channel =
      message.mentions.channels.first();

    if (!channel) {
      return message.reply(
        "❌ Menciona el canal de logs."
      );
    }

    const guildData =
      getGuildData(message.guild.id);

    guildData.logsChannel = channel.id;

    saveData();

    return message.reply(
      createEmbed(
        "📋 Logs configurados",
        `Canal: ${channel}`,
        COLORS.success
      )
    );
  }

  // ==========================================================
  // 🎭 SETAUTOROLE
  // ==========================================================

  if (command === "setautorole") {
    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) {
      return message.reply(
        "❌ Solo los administradores pueden usar esto."
      );
    }

    const role =
      message.mentions.roles.first();

    if (!role) {
      return message.reply(
        "❌ Menciona el rol automático."
      );
    }

    const guildData =
      getGuildData(message.guild.id);

    guildData.autoRole = role.id;

    saveData();

    return message.reply(
      createEmbed(
        "🎭 AutoRol configurado",
        `Rol: ${role}`,
        COLORS.success
      )
    );
  }

  // ==========================================================
  // 🎫 TICKET
  // ==========================================================

  if (command === "ticket") {
    const channel =
      await message.guild.channels.create({
        name: `ticket-${message.author.username}`
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, ""),
        type: 0,
        permissionOverwrites: [
          {
            id: message.guild.roles.everyone.id,
            deny: [
              PermissionsBitField.Flags.ViewChannel
            ]
          },
          {
            id: message.author.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages
            ]
          }
        ]
      });

    return message.reply(
      createEmbed(
        "🎫 Ticket creado",
        `Tu ticket está aquí: ${channel}`,
        COLORS.success
      )
    );
  }

  // ==========================================================
  // 💬 SAY
  // ==========================================================

  if (command === "say") {
    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.ManageMessages
      )
    ) {
      return message.reply(
        "❌ No tienes permiso para usar este comando."
      );
    }

    const text =
      args.join(" ");

    if (!text) {
      return message.reply(
        "❌ Escribe el mensaje."
      );
    }

    await message.delete().catch(() => {});

    return message.channel.send(text);
  }

  // ==========================================================
  // ⭐ RATE
  // ==========================================================

  if (command === "rate") {
    const number =
      Math.floor(Math.random() * 10) + 1;

    return message.reply(
      createEmbed(
        "⭐ Rating",
        `Mi puntuación es: **${number}/10**`
      )
    );
  }

  // ==========================================================
  // 🎲 RANDOM
  // ==========================================================

  if (command === "random") {
    const min =
      parseInt(args[0]) || 1;

    const max =
      parseInt(args[1]) || 100;

    const result =
      Math.floor(
        Math.random() * (max - min + 1)
      ) + min;

    return message.reply(
      createEmbed(
        "🎲 Número aleatorio",
        `Resultado: **${result}**`
      )
    );
  }

  // ==========================================================
  // ❓ COMANDO DESCONOCIDO
  // ==========================================================

  return message.reply(
    `❌ Comando desconocido. Usa \`${PREFIX}help\` para ver los comandos.`
  );
});

// ============================================================
// 🆕 MIEMBRO NUEVO
// ============================================================

client.on(Events.GuildMemberAdd, async member => {
  const guildData =
    getGuildData(member.guild.id);

  if (guildData.welcomeChannel) {
    const channel =
      member.guild.channels.cache.get(
        guildData.welcomeChannel
      );

    if (channel) {
      channel.send(
        `🌌 ¡Bienvenido/a ${member} a **${member.guild.name}**!`
      );
    }
  }

  if (guildData.autoRole) {
    const role =
      member.guild.roles.cache.get(
        guildData.autoRole
      );

    if (role) {
      await member.roles.add(role).catch(() => {});
    }
  }
});

// ============================================================
// ❌ ERRORES
// ============================================================

client.on("error", error => {
  console.error(
    "❌ DISCORD ERROR:",
    error.message || error
  );
});

client.on("shardError", error => {
  console.error(
    "❌ SHARD ERROR:",
    error.message || error
  );
});

client.on("shardReconnecting", () => {
  console.log(
    "🔄 Discord está intentando reconectar..."
  );
});

client.on("shardDisconnect", closeEvent => {
  console.log(
    `🔴 Gateway desconectado. Código: ${closeEvent.code}`
  );
});

client.on("shardReady", () => {
  console.log(
    "🟢 Gateway de Discord conectado."
  );
});

// ============================================================
// 🌐 SERVIDOR HTTP PARA RENDER
// ============================================================

const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8"
  });

  res.end("🌌 Nexora online\n");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    `🌐 Servidor HTTP activo en el puerto ${PORT}`
  );
});

// ============================================================
// 🔐 CONEXIÓN CON DISCORD
// ============================================================

console.log(
  "🔄 Intentando conectar Nexora a Discord..."
);

if (!process.env.DISCORD_TOKEN) {
  console.error(
    "❌ DISCORD_TOKEN no está configurado en Render."
  );
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN)
  .then(() => {
    console.log(
      "🔐 Solicitud de conexión enviada correctamente."
    );
  })
  .catch(error => {
    console.error(
      "❌ ERROR AL CONECTAR NEXORA"
    );

    console.error(
      "Código:",
      error.code || "Desconocido"
    );

    console.error(
      "Mensaje:",
      error.message || "Sin mensaje"
    );
  });

// ============================================================
// 🚨 ERRORES GLOBALES
// ============================================================

process.on("unhandledRejection", error => {
  console.error(
    "🚨 UNHANDLED REJECTION:",
    error
  );
});

process.on("uncaughtException", error => {
  console.error(
    "🚨 UNCAUGHT EXCEPTION:",
    error
  );
});
