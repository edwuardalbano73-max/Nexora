// ============================================================
// 🌌 NEXORA — DISCORD BOT
// Prefijo: n.
// discord.js v14
// ============================================================

const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
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

if (!process.env.DISCORD_TOKEN) {
  console.error("❌ ERROR: Falta DISCORD_TOKEN en las variables de entorno.");
  process.exit(1);
}

// ============================================================
// 💾 DATOS
// ============================================================

let data = {
  guilds: {},
  users: {}
};

if (fs.existsSync(DATA_FILE)) {
  try {
    data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

    if (!data.guilds) data.guilds = {};
    if (!data.users) data.users = {};
  } catch (error) {
    console.log("⚠️ No se pudo leer data.json. Creando datos nuevos.");

    data = {
      guilds: {},
      users: {}
    };
  }
}

function saveData() {
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(data, null, 2)
    );
  } catch (error) {
    console.error("❌ Error guardando datos:", error.message);
  }
}

function getGuildData(guildId) {
  if (!data.guilds[guildId]) {
    data.guilds[guildId] = {
      welcomeChannel: null,
      logsChannel: null,
      autoRole: null,
      warnings: {}
    };
  }

  if (!data.guilds[guildId].warnings) {
    data.guilds[guildId].warnings = {};
  }

  return data.guilds[guildId];
}

function getUserData(userId) {
  if (!data.users[userId]) {
    data.users[userId] = {
      balance: 0,
      daily: 0,
      xp: 0,
      level: 1
    };
  }

  return data.users[userId];
}

// ============================================================
// 🤖 CLIENTE
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
// 🌌 COLORES
// ============================================================

const COLORS = {
  galaxy: 0x5865f2,
  blue: 0x3498db,
  green: 0x2ecc71,
  red: 0xe74c3c,
  yellow: 0xf1c40f,
  purple: 0x9b59b6,
  cyan: 0x00d9ff
};

function embed(title, description, color = COLORS.galaxy) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setFooter({
      text: "🌌 Nexora • Explora más allá"
    })
    .setTimestamp();
}

// ============================================================
// 📚 CATEGORÍAS
// ============================================================

const categories = {

  general: {
    label: "General",
    emoji: "🌌",
    description: "Comandos generales de Nexora.",
    commands: [
      "`n.help` — Abre el menú de ayuda",
      "`n.ping` — Comprueba la latencia",
      "`n.botinfo` — Información de Nexora",
      "`n.serverinfo` — Información del servidor",
      "`n.userinfo` — Información de un usuario",
      "`n.avatar` — Muestra un avatar",
      "`n.say` — Hace que Nexora diga algo",
      "`n.invite` — Enlace para añadir Nexora",
      "`n.stats` — Estadísticas del bot",
      "`n.hora` — Muestra la hora actual"
    ]
  },

  moderation: {
    label: "Moderación",
    emoji: "🛡️",
    description: "Herramientas para administrar tu servidor.",
    commands: [
      "`n.kick` — Expulsa a un usuario",
      "`n.ban` — Banea a un usuario",
      "`n.unban` — Desbanea a un usuario",
      "`n.timeout` — Aplica un timeout",
      "`n.untimeout` — Quita un timeout",
      "`n.clear` — Elimina mensajes",
      "`n.slowmode` — Configura el modo lento",
      "`n.lock` — Bloquea un canal",
      "`n.unlock` — Desbloquea un canal",
      "`n.warn` — Advierte a un usuario"
    ]
  },

  security: {
    label: "Seguridad",
    emoji: "🔐",
    description: "Herramientas relacionadas con la seguridad.",
    commands: [
      "`n.warnings` — Mira las advertencias",
      "`n.clearwarns` — Borra advertencias",
      "`n.membercheck` — Revisa un usuario",
      "`n.roleinfo` — Información de un rol",
      "`n.channelinfo` — Información de un canal",
      "`n.permissions` — Revisa tus permisos",
      "`n.audit` — Información de moderación",
      "`n.lockdown` — Bloqueo de emergencia",
      "`n.unlockdown` — Desbloqueo de emergencia",
      "`n.security` — Estado de seguridad"
    ]
  },

  server: {
    label: "Servidor",
    emoji: "🏠",
    description: "Información y herramientas del servidor.",
    commands: [
      "`n.serverinfo` — Información del servidor",
      "`n.channels` — Lista de canales",
      "`n.roles` — Lista de roles",
      "`n.members` — Estadísticas de miembros",
      "`n.emojis` — Emojis del servidor",
      "`n.owner` — Muestra al propietario",
      "`n.created` — Fecha de creación",
      "`n.icon` — Icono del servidor",
      "`n.banner` — Banner del servidor",
      "`n.id` — ID del servidor"
    ]
  },

  economy: {
    label: "Economía",
    emoji: "💰",
    description: "Sistema económico de Nexora.",
    commands: [
      "`n.balance` — Mira tu dinero",
      "`n.daily` — Reclama tu recompensa diaria",
      "`n.work` — Trabaja para ganar dinero",
      "`n.pay` — Envía dinero",
      "`n.rich` — Mira tu riqueza",
      "`n.coinflip` — Cara o cruz",
      "`n.dice` — Tira un dado",
      "`n.beg` — Pide algunas monedas",
      "`n.deposit` — Deposita dinero",
      "`n.withdraw` — Retira dinero"
    ]
  },

  fun: {
    label: "Diversión",
    emoji: "🎉",
    description: "Comandos para divertirte.",
    commands: [
      "`n.8ball` — Pregunta a la bola mágica",
      "`n.coin` — Lanza una moneda",
      "`n.dado` — Lanza un dado",
      "`n.choose` — Elige entre opciones",
      "`n.rate` — Puntúa algo",
      "`n.reverse` — Invierte un texto",
      "`n.random` — Número aleatorio",
      "`n.say` — Repite un mensaje",
      "`n.ship` — Compatibilidad divertida",
      "`n.joke` — Cuenta un chiste"
    ]
  },

  levels: {
    label: "Niveles",
    emoji: "⭐",
    description: "Sistema de experiencia y niveles.",
    commands: [
      "`n.rank` — Mira tu nivel",
      "`n.xp` — Mira tu experiencia",
      "`n.level` — Mira tu nivel actual",
      "`n.leaderboard` — Clasificación de niveles",
      "`n.top` — Usuarios con más XP",
      "`n.profile` — Tu perfil",
      "`n.addxp` — Añade XP",
      "`n.resetxp` — Reinicia XP",
      "`n.setlevel` — Cambia un nivel",
      "`n.levels` — Información del sistema"
    ]
  },

  config: {
    label: "Configuración",
    emoji: "⚙️",
    description: "Configuración exclusiva para administradores.",
    commands: [
      "`n.setwelcome` — Configura bienvenida",
      "`n.setlogs` — Configura los logs",
      "`n.setautorole` — Configura autorol",
      "`n.config` — Mira la configuración",
      "`n.resetconfig` — Reinicia configuración",
      "`n.testwelcome` — Prueba bienvenida",
      "`n.testlogs` — Prueba logs",
      "`n.testautorole` — Prueba autorol",
      "`n.admin` — Información administrativa",
      "`n.settings` — Configuración del servidor"
    ]
  },

  tickets: {
    label: "Tickets",
    emoji: "🎫",
    description: "Sistema de soporte mediante tickets.",
    commands: [
      "`n.ticket` — Crea un ticket",
      "`n.close` — Cierra un ticket",
      "`n.add` — Añade un usuario",
      "`n.remove` — Retira un usuario",
      "`n.rename` — Cambia el nombre",
      "`n.claim` — Reclama un ticket",
      "`n.unclaim` — Libera un ticket",
      "`n.ticketinfo` — Información del ticket",
      "`n.support` — Información del soporte",
      "`n.panel` — Crea el panel de tickets"
    ]
  }
};

// ============================================================
// 🌌 MENÚ PRINCIPAL
// ============================================================

function createMainMenu() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("nexora_help")
    .setPlaceholder("🌌 Selecciona una categoría...")
    .addOptions(
      Object.entries(categories).map(([key, category]) => ({
        label: category.label,
        description: category.description,
        value: key,
        emoji: category.emoji
      }))
    );

  return new ActionRowBuilder().addComponents(menu);
}

function createBackButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("nexora_back")
      .setLabel("Volver al menú")
      .setEmoji("↩️")
      .setStyle(ButtonStyle.Secondary)
  );
}

function mainHelpEmbed() {
  return embed(
    "🌌 NEXORA • CENTRO DE COMANDOS",
    [
      "## ✨ Bienvenido a Nexora",
      "",
      "Explora todas las funciones disponibles utilizando el menú de abajo.",
      "",
      "🌌 **Selecciona una categoría**",
      "Cada sección contiene los comandos correspondientes.",
      "",
      "━━━━━━━━━━━━━━━━━━━━",
      "💫 **Prefijo:** `n.`",
      "🛡️ **Moderación:** Herramientas administrativas",
      "🔐 **Seguridad:** Protección y control",
      "💰 **Economía:** Sistema económico",
      "🎉 **Diversión:** Comandos entretenidos",
      "⭐ **Niveles:** XP y rangos",
      "⚙️ **Configuración:** Solo administradores",
      "🎫 **Tickets:** Sistema de soporte",
      "━━━━━━━━━━━━━━━━━━━━"
    ].join("\n"),
    COLORS.purple
  );
}

function categoryEmbed(key) {
  const category = categories[key];

  return embed(
    `${category.emoji} ${category.label.toUpperCase()}`,
    [
      category.description,
      "",
      "━━━━━━━━━━━━━━━━━━━━",
      ...category.commands,
      "━━━━━━━━━━━━━━━━━━━━"
    ].join("\n"),
    COLORS.galaxy
  );
}

// ============================================================
// 📌 READY
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
// 👋 BIENVENIDAS
// ============================================================

client.on(Events.GuildMemberAdd, async member => {
  const guildData = getGuildData(member.guild.id);

  if (guildData.welcomeChannel) {
    const channel = member.guild.channels.cache.get(
      guildData.welcomeChannel
    );

    if (channel) {
      const welcome = embed(
        "🌌 ¡Nuevo miembro!",
        `✨ Bienvenido/a ${member} a **${member.guild.name}**.\n\nExplora el servidor y disfruta tu estancia.`,
        COLORS.purple
      );

      channel.send({
        embeds: [welcome]
      }).catch(() => {});
    }
  }

  if (guildData.autoRole) {
    const role = member.guild.roles.cache.get(
      guildData.autoRole
    );

    if (role) {
      member.roles.add(role).catch(() => {});
    }
  }
});

// ============================================================
// ⭐ XP
// ============================================================

const cooldowns = new Map();

client.on(Events.MessageCreate, async message => {

  if (message.author.bot || !message.guild) return;

  const key = `${message.guild.id}-${message.author.id}`;
  const now = Date.now();

  // ==========================================================
  // ⭐ EXPERIENCIA
  // ==========================================================

  if (
    !cooldowns.has(key) ||
    now - cooldowns.get(key) > 60000
  ) {

    cooldowns.set(key, now);

    const user = getUserData(message.author.id);

    user.xp += Math.floor(Math.random() * 8) + 5;

    const needed = user.level * 100;

    if (user.xp >= needed) {

      user.xp -= needed;
      user.level++;

      message.channel.send({
        embeds: [
          embed(
            "⭐ ¡NUEVO NIVEL!",
            `${message.author} ha alcanzado el **nivel ${user.level}**. 🎉`,
            COLORS.yellow
          )
        ]
      }).catch(() => {});
    }

    saveData();
  }

  // ==========================================================
  // PREFIX
  // ==========================================================

  if (!message.content.toLowerCase().startsWith(PREFIX)) {
    return;
  }

  const args = message.content
    .slice(PREFIX.length)
    .trim()
    .split(/\s+/);

  const command = args.shift()?.toLowerCase();

  if (!command) return;

  // ==========================================================
  // 🌌 HELP
  // ==========================================================

  if (command === "help" || command === "ayuda") {

    return message.reply({
      embeds: [mainHelpEmbed()],
      components: [createMainMenu()]
    });
  }

  // ==========================================================
  // 📡 PING
  // ==========================================================

  if (command === "ping") {

    return message.reply({
      embeds: [
        embed(
          "📡 PONG",
          `🏓 Latencia: **${client.ws.ping}ms**`,
          COLORS.green
        )
      ]
    });
  }

  // ==========================================================
  // 🤖 BOTINFO
  // ==========================================================

  if (command === "botinfo") {

    return message.reply({
      embeds: [
        embed(
          "🌌 NEXORA",
          [
            "**Bot multifunción para Discord**",
            "",
            `🌐 Servidores: **${client.guilds.cache.size}**`,
            `👥 Usuarios: **${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)}**`,
            `📡 Ping: **${client.ws.ping}ms**`,
            `💫 Prefijo: **${PREFIX}**`,
            "",
            "✨ Usa `n.help` para ver todos los comandos."
          ].join("\n"),
          COLORS.purple
        )
      ]
    });
  }

  // ==========================================================
  // 🏠 SERVERINFO
  // ==========================================================

  if (command === "serverinfo") {

    const guild = message.guild;

    return message.reply({
      embeds: [
        embed(
          `🏠 ${guild.name}`,
          [
            `👑 Propietario: <@${guild.ownerId}>`,
            `👥 Miembros: **${guild.memberCount}**`,
            `💬 Canales: **${guild.channels.cache.size}**`,
            `🎭 Roles: **${guild.roles.cache.size}**`,
            `😀 Emojis: **${guild.emojis.cache.size}**`,
            `🆔 ID: \`${guild.id}\``,
            `📅 Creado: <t:${Math.floor(guild.createdTimestamp / 1000)}:D>`
          ].join("\n"),
          COLORS.blue
        )
      ]
    });
  }

  // ==========================================================
  // 👤 USERINFO
  // ==========================================================

  if (command === "userinfo") {

    const user =
      message.mentions.users.first() ||
      message.author;

    const member =
      message.guild.members.cache.get(user.id);

    return message.reply({
      embeds: [
        embed(
          `👤 ${user.username}`,
          [
            `🆔 ID: \`${user.id}\``,
            `📅 Cuenta: <t:${Math.floor(user.createdTimestamp / 1000)}:D>`,
            `📥 Entrada al servidor: ${
              member?.joinedTimestamp
                ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>`
                : "N/A"
            }`,
            `🤖 Bot: **${user.bot ? "Sí" : "No"}**`
          ].join("\n"),
          COLORS.blue
        ).setThumbnail(
          user.displayAvatarURL({
            size: 256
          })
        )
      ]
    });
  }

  // ==========================================================
  // 🖼️ AVATAR
  // ==========================================================

  if (command === "avatar") {

    const user =
      message.mentions.users.first() ||
      message.author;

    return message.reply({
      embeds: [
        embed(
          `🖼️ Avatar de ${user.username}`,
          `[Abrir avatar en tamaño completo](${user.displayAvatarURL({
            size: 1024,
            extension: "png"
          })})`,
          COLORS.purple
        ).setImage(
          user.displayAvatarURL({
            size: 1024
          })
        )
      ]
    });
  }

  // ==========================================================
  // 📊 STATS
  // ==========================================================

  if (command === "stats") {

    return message.reply({
      embeds: [
        embed(
          "📊 ESTADÍSTICAS",
          [
            `🌐 Servidores: **${client.guilds.cache.size}**`,
            `👥 Usuarios: **${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)}**`,
            `📡 Ping: **${client.ws.ping}ms**`,
            `⏱️ Uptime: **${Math.floor(client.uptime / 1000)} segundos**`
          ].join("\n"),
          COLORS.cyan
        )
      ]
    });
  }

  // ==========================================================
  // 💰 BALANCE
  // ==========================================================

  if (command === "balance" || command === "bal") {

    const user = getUserData(message.author.id);

    return message.reply({
      embeds: [
        embed(
          "💰 TU BALANCE",
          `💵 Tienes **${user.balance.toLocaleString()} Nexos**.`,
          COLORS.green
        )
      ]
    });
  }

  // ==========================================================
  // 🎁 DAILY
  // ==========================================================

  if (command === "daily") {

    const user = getUserData(message.author.id);
    const now = Date.now();

    if (now - user.daily < 86400000) {

      const remaining =
        86400000 - (now - user.daily);

      const hours =
        Math.ceil(remaining / 3600000);

      return message.reply({
        embeds: [
          embed(
            "⏳ RECOMPENSA DIARIA",
            `Ya reclamaste tu recompensa.\n\nVuelve en aproximadamente **${hours} horas**.`,
            COLORS.yellow
          )
        ]
      });
    }

    user.daily = now;
    user.balance += 500;

    saveData();

    return message.reply({
      embeds: [
        embed(
          "🎁 RECOMPENSA RECIBIDA",
          "Has recibido **500 Nexos**. 💰",
          COLORS.green
        )
      ]
    });
  }

  // ==========================================================
  // 💼 WORK
  // ==========================================================

  if (command === "work") {

    const user = getUserData(message.author.id);

    const amount =
      Math.floor(Math.random() * 301) + 200;

    user.balance += amount;

    saveData();

    return message.reply({
      embeds: [
        embed(
          "💼 TRABAJO COMPLETADO",
          `Has ganado **${amount} Nexos**. 💰`,
          COLORS.green
        )
      ]
    });
  }

  // ==========================================================
  // 🪙 COIN
  // ==========================================================

  if (command === "coinflip" || command === "coin") {

    const result =
      Math.random() < 0.5
        ? "🪙 Cara"
        : "🪙 Cruz";

    return message.reply({
      embeds: [
        embed(
          "🪙 MONEDA",
          `La moneda cayó en:\n\n# ${result}`,
          COLORS.yellow
        )
      ]
    });
  }

  // ==========================================================
  // 🎲 DADO
  // ==========================================================

  if (command === "dice" || command === "dado") {

    const result =
      Math.floor(Math.random() * 6) + 1;

    return message.reply({
      embeds: [
        embed(
          "🎲 DADO",
          `Has sacado:\n\n# 🎲 ${result}`,
          COLORS.purple
        )
      ]
    });
  }

  // ==========================================================
  // 🎱 8BALL
  // ==========================================================

  if (command === "8ball") {

    const answers = [
      "✨ Sí.",
      "🌌 Definitivamente.",
      "💫 Probablemente.",
      "🌙 No lo sé.",
      "☄️ Puede ser.",
      "🚀 No.",
      "🌑 Definitivamente no."
    ];

    const answer =
      answers[Math.floor(Math.random() * answers.length)];

    return message.reply({
      embeds: [
        embed(
          "🎱 BOLA MÁGICA",
          `🔮 ${answer}`,
          COLORS.purple
        )
      ]
    });
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

    return message.reply({
      embeds: [
        embed(
          "🎯 ELECCIÓN",
          `Nexora ha elegido:\n\n# ${choice}`,
          COLORS.cyan
        )
      ]
    });
  }

  // ==========================================================
  // ⭐ RANK
  // ==========================================================

  if (command === "rank" || command === "profile") {

    const user =
      getUserData(message.author.id);

    return message.reply({
      embeds: [
        embed(
          `⭐ PERFIL DE ${message.author.username}`,
          [
            `🏆 Nivel: **${user.level}**`,
            `✨ XP: **${user.xp}/${user.level * 100}**`,
            `💰 Nexos: **${user.balance}**`
          ].join("\n"),
          COLORS.yellow
        ).setThumbnail(
          message.author.displayAvatarURL({
            size: 256
          })
        )
      ]
    });
  }

  // ==========================================================
  // 🏆 LEADERBOARD
  // ==========================================================

  if (command === "leaderboard" || command === "top") {

    const top = Object.entries(data.users)
      .sort((a, b) => {
        return (
          (b[1].level * 100 + b[1].xp) -
          (a[1].level * 100 + a[1].xp)
        );
      })
      .slice(0, 10);

    let text = "";

    for (let i = 0; i < top.length; i++) {

      const [userId, user] = top[i];

      text +=
        `**${i + 1}.** <@${userId}> — Nivel ${user.level} (${user.xp} XP)\n`;
    }

    if (!text) {
      text =
        "Todavía no hay usuarios en la clasificación.";
    }

    return message.reply({
      embeds: [
        embed(
          "🏆 CLASIFICACIÓN",
          text,
          COLORS.yellow
        )
      ]
    });
  }

  // ==========================================================
  // 🛡️ KICK
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
        "❌ Menciona al usuario que quieres expulsar."
      );
    }

    if (!member.kickable) {
      return message.reply(
        "❌ No puedo expulsar a ese usuario."
      );
    }

    const reason =
      args.slice(1).join(" ") || "Sin razón";

    await member.kick(reason);

    return message.reply({
      embeds: [
        embed(
          "🛡️ USUARIO EXPULSADO",
          `${member.user.tag} fue expulsado.\n\n📝 Razón: ${reason}`,
          COLORS.red
        )
      ]
    });
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
        "❌ Menciona al usuario que quieres banear."
      );
    }

    if (!member.bannable) {
      return message.reply(
        "❌ No puedo banear a ese usuario."
      );
    }

    const reason =
      args.slice(1).join(" ") || "Sin razón";

    await member.ban({
      reason
    });

    return message.reply({
      embeds: [
        embed(
          "🔨 USUARIO BANEADO",
          `${member.user.tag} fue baneado.\n\n📝 Razón: ${reason}`,
          COLORS.red
        )
      ]
    });
  }

  // ==========================================================
  // ⏱️ TIMEOUT
  // ==========================================================

  if (command === "timeout") {

    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.ModerateMembers
      )
    ) {
      return message.reply(
        "❌ No tienes permiso para usar timeout."
      );
    }

    const member =
      message.mentions.members.first();

    if (!member) {
      return message.reply(
        "❌ Menciona al usuario."
      );
    }

    const minutes =
      parseInt(args[1]);

    if (
      !minutes ||
      minutes < 1 ||
      minutes > 40320
    ) {
      return message.reply(
        "❌ Usa los minutos. Ejemplo: `n.timeout @usuario 10`"
      );
    }

    if (!member.moderatable) {
      return message.reply(
        "❌ No puedo aplicar timeout a ese usuario."
      );
    }

    await member.timeout(
      minutes * 60000,
      "Moderación mediante Nexora"
    );

    return message.reply({
      embeds: [
        embed(
          "⏱️ TIMEOUT",
          `${member.user.tag} recibió un timeout de **${minutes} minutos**.`,
          COLORS.red
        )
      ]
    });
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
      parseInt(args[0]);

    if (
      !amount ||
      amount < 1 ||
      amount > 100
    ) {
      return message.reply(
        "❌ Usa una cantidad entre 1 y 100."
      );
    }

    const deleted =
      await message.channel.bulkDelete(
        amount,
        true
      );

    const msg =
      await message.channel.send({
        embeds: [
          embed(
            "🧹 MENSAJES ELIMINADOS",
            `Se eliminaron **${deleted.size} mensajes**.`,
            COLORS.green
          )
        ]
      });

    setTimeout(() => {
      msg.delete().catch(() => {});
    }, 4000);

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
        "❌ No tienes permiso."
      );
    }

    const seconds =
      parseInt(args[0]);

    if (
      isNaN(seconds) ||
      seconds < 0 ||
      seconds > 21600
    ) {
      return message.reply(
        "❌ Usa un valor entre 0 y 21600 segundos."
      );
    }

    await message.channel.setRateLimitPerUser(
      seconds
    );

    return message.reply({
      embeds: [
        embed(
          "🐌 SLOWMODE",
          `Modo lento establecido en **${seconds} segundos**.`,
          COLORS.blue
        )
      ]
    });
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
        "❌ No tienes permiso."
      );
    }

    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      {
        SendMessages: false
      }
    );

    return message.reply({
      embeds: [
        embed(
          "🔒 CANAL BLOQUEADO",
          "Este canal ha sido bloqueado.",
          COLORS.red
        )
      ]
    });
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
        "❌ No tienes permiso."
      );
    }

    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      {
        SendMessages: null
      }
    );

    return message.reply({
      embeds: [
        embed(
          "🔓 CANAL DESBLOQUEADO",
          "Este canal ha sido desbloqueado.",
          COLORS.green
        )
      ]
    });
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
        "❌ No tienes permiso."
      );
    }

    const member =
      message.mentions.members.first();

    if (!member) {
      return message.reply(
        "❌ Menciona al usuario."
      );
    }

    const reason =
      args.slice(1).join(" ") || "Sin razón";

    const guildData =
      getGuildData(message.guild.id);

    if (!guildData.warnings[member.id]) {
      guildData.warnings[member.id] = [];
    }

    guildData.warnings[member.id].push({
      reason,
      moderator: message.author.id,
      date: Date.now()
    });

    saveData();

    return message.reply({
      embeds: [
        embed(
          "⚠️ ADVERTENCIA",
          `${member.user.tag} recibió una advertencia.\n\n📝 Razón: ${reason}\n📊 Total: **${guildData.warnings[member.id].length}**`,
          COLORS.yellow
        )
      ]
    });
  }

  // ==========================================================
  // ⚠️ WARNINGS
  // ==========================================================

  if (command === "warnings") {

    const member =
      message.mentions.members.first() ||
      message.member;

    const guildData =
      getGuildData(message.guild.id);

    const warnings =
      guildData.warnings[member.id] || [];

    return message.reply({
      embeds: [
        embed(
          `⚠️ ADVERTENCIAS • ${member.user.username}`,
          warnings.length
            ? warnings
                .map(
                  (w, i) =>
                    `**${i + 1}.** ${w.reason}`
                )
                .join("\n")
            : "Este usuario no tiene advertencias.",
          COLORS.yellow
        )
      ]
    });
  }

  // ==========================================================
  // 🔐 PERMISSIONS
  // ==========================================================

  if (command === "permissions") {

    const permissions =
      message.member.permissions.toArray();

    return message.reply({
      embeds: [
        embed(
          "🔐 TUS PERMISOS",
          permissions.length
            ? permissions
                .map(p => `• ${p}`)
                .join("\n")
            : "No hay permisos especiales.",
          COLORS.cyan
        )
      ]
    });
  }

  // ==========================================================
  // ⚙️ CONFIG
  // ==========================================================

  if (
    command === "config" ||
    command === "settings"
  ) {

    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) {
      return message.reply(
        "❌ Este comando es exclusivo para administradores."
      );
    }

    const guildData =
      getGuildData(message.guild.id);

    return message.reply({
      embeds: [
        embed(
          "⚙️ CONFIGURACIÓN DE NEXORA",
          [
            `👋 Bienvenida: ${
              guildData.welcomeChannel
                ? `<#${guildData.welcomeChannel}>`
                : "No configurada"
            }`,
            `📜 Logs: ${
              guildData.logsChannel
                ? `<#${guildData.logsChannel}>`
                : "No configurados"
            }`,
            `🎭 Autorol: ${
              guildData.autoRole
                ? `<@&${guildData.autoRole}>`
                : "No configurado"
            }`
          ].join("\n"),
          COLORS.purple
        )
      ]
    });
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
      message.mentions.channels.first() ||
      message.channel;

    const guildData =
      getGuildData(message.guild.id);

    guildData.welcomeChannel =
      channel.id;

    saveData();

    return message.reply({
      embeds: [
        embed(
          "👋 BIENVENIDAS CONFIGURADAS",
          `Las bienvenidas se enviarán en ${channel}.`,
          COLORS.green
        )
      ]
    });
  }

  // ==========================================================
  // 📜 SETLOGS
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
      message.mentions.channels.first() ||
      message.channel;

    const guildData =
      getGuildData(message.guild.id);

    guildData.logsChannel =
      channel.id;

    saveData();

    return message.reply({
      embeds: [
        embed(
          "📜 LOGS CONFIGURADOS",
          `Los logs se configuraron en ${channel}.`,
          COLORS.green
        )
      ]
    });
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
        "❌ Menciona el rol que quieres usar como autorol."
      );
    }

    const guildData =
      getGuildData(message.guild.id);

    guildData.autoRole =
      role.id;

    saveData();

    return message.reply({
      embeds: [
        embed(
          "🎭 AUTOROL CONFIGURADO",
          `El rol automático será ${role}.`,
          COLORS.green
        )
      ]
    });
  }

  // ==========================================================
  // 🎫 TICKET
  // ==========================================================

  if (command === "ticket") {

    const existing =
      message.guild.channels.cache.find(
        c =>
          c.name ===
            `ticket-${message.author.username.toLowerCase()}` &&
          c.type === 0
      );

    if (existing) {
      return message.reply(
        `❌ Ya tienes un ticket abierto: ${existing}`
      );
    }

    const channel =
      await message.guild.channels.create({
        name:
          `ticket-${message.author.username}`
            .toLowerCase()
            .slice(0, 90),

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

    const closeButton =
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("close_ticket")
          .setLabel("Cerrar ticket")
          .setEmoji("🔒")
          .setStyle(ButtonStyle.Danger)
      );

    await channel.send({
      embeds: [
        embed(
          "🎫 TICKET CREADO",
          [
            `Hola ${message.author}.`,
            "",
            "Describe tu problema y un miembro del equipo te ayudará.",
            "",
            "Cuando termines, pulsa el botón para cerrar el ticket."
          ].join("\n"),
          COLORS.purple
        )
      ],

      components: [
        closeButton
      ]
    });

    return message.reply(
      `🎫 Tu ticket ha sido creado: ${channel}`
    );
  }

  // ==========================================================
  // 📢 SAY
  // ==========================================================

  if (command === "say") {

    if (!args.length) {
      return message.reply(
        "❌ Escribe algo para que Nexora diga."
      );
    }

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

    await message.delete().catch(() => {});

    return message.channel.send(text);
  }

  // ==========================================================
  // 🎯 RATE
  // ==========================================================

  if (command === "rate") {

    if (!args.length) {
      return message.reply(
        "❌ Escribe algo para puntuar."
      );
    }

    const rating =
      Math.floor(Math.random() * 11);

    return message.reply({
      embeds: [
        embed(
          "🎯 PUNTUACIÓN",
          `Le doy **${rating}/10** a:\n\n${args.join(" ")}`,
          COLORS.purple
        )
      ]
    });
  }

  // ==========================================================
  // 🔢 RANDOM
  // ==========================================================

  if (command === "random") {

    const min =
      parseInt(args[0]) || 1;

    const max =
      parseInt(args[1]) || 100;

    if (min >= max) {
      return message.reply(
        "❌ El mínimo debe ser menor que el máximo."
      );
    }

    const result =
      Math.floor(
        Math.random() *
        (max - min + 1)
      ) + min;

    return message.reply({
      embeds: [
        embed(
          "🔢 NÚMERO ALEATORIO",
          `Resultado: **${result}**`,
          COLORS.cyan
        )
      ]
    });
  }

  // ==========================================================
  // ❓ COMANDO DESCONOCIDO
  // ==========================================================

  return message.reply({
    embeds: [
      embed(
        "❓ COMANDO NO ENCONTRADO",
        [
          `No existe el comando \`${PREFIX}${command}\`.`,
          "",
          `Usa **${PREFIX}help** para abrir el menú de Nexora.`
        ].join("\n"),
        COLORS.red
      )
    ]
  });
});

// ============================================================
// 🖱️ INTERACCIONES
// ============================================================

client.on(
  Events.InteractionCreate,
  async interaction => {

    // ========================================================
    // 📋 SELECT MENU
    // ========================================================

    if (interaction.isStringSelectMenu()) {

      if (
        interaction.customId !==
        "nexora_help"
      ) {
        return;
      }

      const selected =
        interaction.values[0];

      if (!categories[selected]) {
        return;
      }

      return interaction.update({
        embeds: [
          categoryEmbed(selected)
        ],
        components: [
          createBackButton()
        ]
      });
    }

    // ========================================================
    // 🔘 BOTONES
    // ========================================================

    if (interaction.isButton()) {

      // ======================================================
      // ↩️ VOLVER
      // ======================================================

      if (
        interaction.customId ===
        "nexora_back"
      ) {

        return interaction.update({
          embeds: [
            mainHelpEmbed()
          ],
          components: [
            createMainMenu()
          ]
        });
      }

      // ======================================================
      // 🎫 CERRAR TICKET
      // ======================================================

      if (
        interaction.customId ===
        "close_ticket"
      ) {

        if (
          !interaction.channel ||
          !interaction.channel.name ||
          !interaction.channel.name.startsWith(
            "ticket-"
          )
        ) {

          return interaction.reply({
            content:
              "❌ Este canal no es un ticket.",
            ephemeral: true
          });
        }

        await interaction.reply({
          content:
            "🔒 Cerrando ticket...",
          ephemeral: true
        });

        setTimeout(() => {
          interaction.channel
            .delete()
            .catch(() => {});
        }, 2000);
      }
    }
  }
);

// ============================================================
// 🌐 SERVIDOR HTTP PARA RENDER
// ============================================================

// Render proporciona PORT automáticamente.
// El valor predeterminado de Render es 10000.

const PORT =
  Number(process.env.PORT) || 10000;

const server =
  http.createServer(
    (req, res) => {

      res.writeHead(
        200,
        {
          "Content-Type":
            "text/plain; charset=utf-8"
        }
      );

      res.end(
        "🌌 Nexora online."
      );
    }
  );

server.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `🌐 Nexora HTTP activo en 0.0.0.0:${PORT}`
    );
  }
);

// ============================================================
// 🔑 LOGIN DE DISCORD
// ============================================================

console.log(
  "🔄 Intentando conectar Nexora a Discord..."
);

client.login(
  process.env.DISCORD_TOKEN
)
  .then(() => {

    console.log(
      "🔐 Token aceptado por Discord."
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
      error.message
    );
  });

// ============================================================
// 🚨 ERRORES
// ============================================================

process.on(
  "unhandledRejection",
  error => {

    console.error(
      "❌ Unhandled Rejection:",
      error
    );
  }
);

process.on(
  "uncaughtException",
  error => {

    console.error(
      "❌ Uncaught Exception:",
      error
    );
  }
);
