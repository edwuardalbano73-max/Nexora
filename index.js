// ============================================================
// 🌌 NEXORA — DISCORD BOT
// Prefix: n.
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

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const PREFIX = "n.";
const DATA_FILE = path.join(__dirname, "nexora-data.json");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

// ============================================================
// 💾 BASE DE DATOS
// ============================================================

let data = {
  users: {},
  guilds: {}
};

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const saved = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

      data = {
        users: saved.users || {},
        guilds: saved.guilds || {}
      };
    }
  } catch (error) {
    console.error("❌ Error cargando la base de datos:", error);
  }
}

function saveData() {
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(data, null, 2),
      "utf8"
    );
  } catch (error) {
    console.error("❌ Error guardando la base de datos:", error);
  }
}

loadData();

// ============================================================
// 👤 DATOS DEL USUARIO
// ============================================================

function getUser(userId) {
  if (!data.users[userId]) {
    data.users[userId] = {
      money: 1000,
      bank: 0,
      level: 1,
      xp: 0,
      reputation: 0,
      daily: 0,
      lastDaily: 0,
      lastWork: 0,
      inventory: []
    };

    saveData();
  }

  return data.users[userId];
}

// ============================================================
// 🏠 DATOS DEL SERVIDOR
// ============================================================

function getGuild(guildId) {
  if (!data.guilds[guildId]) {
    data.guilds[guildId] = {
      prefix: PREFIX
    };

    saveData();
  }

  return data.guilds[guildId];
}

// ============================================================
// 🌌 COLORES
// ============================================================

const COLORS = {
  galaxy: 0x6C5CE7,
  blue: 0x3498DB,
  green: 0x2ECC71,
  red: 0xE74C3C,
  gold: 0xF1C40F,
  purple: 0x9B59B6,
  dark: 0x15152B
};

// ============================================================
// 🌌 EMBED PRINCIPAL
// ============================================================

function mainEmbed(user) {
  return new EmbedBuilder()
    .setColor(COLORS.galaxy)
    .setTitle("🌌 NEXORA")
    .setDescription(
      `> ✨ Bienvenido al universo de **Nexora**.\n` +
      `> Explora todas las funciones utilizando el menú de abajo.\n\n` +

      `💰 **Economía**\n` +
      `Compra, trabaja, ahorra y administra tu dinero.\n\n` +

      `👥 **Social**\n` +
      `Interactúa con otros usuarios y desarrolla tu perfil.\n\n` +

      `🎮 **Diversión**\n` +
      `Juega y descubre diferentes funciones.\n\n` +

      `🎁 **Recompensas**\n` +
      `Obtén premios y recompensas diarias.\n\n` +

      `🛡️ **Moderación**\n` +
      `Herramientas para administrar el servidor.\n\n` +

      `⚙️ **Configuración**\n` +
      `Personaliza Nexora para tu servidor.`
    )
    .addFields(
      {
        name: "👤 Usuario",
        value: `<@${user.id}>`,
        inline: true
      },
      {
        name: "💰 Dinero",
        value: `$${getUser(user.id).money.toLocaleString()}`,
        inline: true
      },
      {
        name: "⭐ Nivel",
        value: `${getUser(user.id).level}`,
        inline: true
      }
    )
    .setFooter({
      text: "🌌 Nexora • Explora el universo"
    })
    .setTimestamp();
}

// ============================================================
// 📋 MENÚ PRINCIPAL
// ============================================================

function mainMenu() {
  return new StringSelectMenuBuilder()
    .setCustomId("nexora_main_menu")
    .setPlaceholder("🌌 Selecciona una categoría...")
    .addOptions([
      {
        label: "Economía",
        description: "Dinero, banco, trabajo, tienda...",
        value: "economia",
        emoji: "💰"
      },
      {
        label: "Social",
        description: "Perfil, reputación y usuarios...",
        value: "social",
        emoji: "👥"
      },
      {
        label: "Diversión",
        description: "Juegos y entretenimiento...",
        value: "diversion",
        emoji: "🎮"
      },
      {
        label: "Recompensas",
        description: "Daily, premios y recompensas...",
        value: "recompensas",
        emoji: "🎁"
      },
      {
        label: "Moderación",
        description: "Herramientas para administradores...",
        value: "moderacion",
        emoji: "🛡️"
      },
      {
        label: "Configuración",
        description: "Configuración de Nexora...",
        value: "configuracion",
        emoji: "⚙️"
      },
      {
        label: "Información",
        description: "Información sobre Nexora...",
        value: "informacion",
        emoji: "ℹ️"
      }
    ]);
}

function mainRow() {
  return new ActionRowBuilder().addComponents(mainMenu());
}

// ============================================================
// 📋 MENÚ DE CATEGORÍAS
// ============================================================

function categoryEmbed(category) {
  const embeds = {

    economia: new EmbedBuilder()
      .setColor(COLORS.green)
      .setTitle("💰 ECONOMÍA")
      .setDescription(
        `Gestiona tu economía dentro de Nexora.\n\n` +
        `💵 **n.balance** — Ver tu dinero\n` +
        `🏦 **n.bank** — Ver tu banco\n` +
        `💼 **n.work** — Trabajar\n` +
        `🎁 **n.daily** — Recompensa diaria\n` +
        `💸 **n.pay** — Pagar a otro usuario\n` +
        `🏪 **n.shop** — Ver la tienda\n` +
        `🎒 **n.inventory** — Ver inventario`
      )
      .setFooter({ text: "🌌 Nexora • Economía" }),

    social: new EmbedBuilder()
      .setColor(COLORS.purple)
      .setTitle("👥 SOCIAL")
      .setDescription(
        `Conoce y personaliza tu perfil.\n\n` +
        `👤 **n.profile** — Ver tu perfil\n` +
        `📊 **n.rank** — Ver tu nivel\n` +
        `⭐ **n.rep** — Dar reputación\n` +
        `🔎 **n.user** — Ver información de usuario\n` +
        `🏆 **n.leaderboard** — Clasificación`
      )
      .setFooter({ text: "🌌 Nexora • Social" }),

    diversion: new EmbedBuilder()
      .setColor(COLORS.blue)
      .setTitle("🎮 DIVERSIÓN")
      .setDescription(
        `Funciones para pasar el rato.\n\n` +
        `🎲 **n.roll** — Tirar un dado\n` +
        `🪙 **n.coinflip** — Lanzar una moneda\n` +
        `🔢 **n.guess** — Adivina el número\n` +
        `😂 **n.8ball** — Pregunta a la bola mágica`
      )
      .setFooter({ text: "🌌 Nexora • Diversión" }),

    recompensas: new EmbedBuilder()
      .setColor(COLORS.gold)
      .setTitle("🎁 RECOMPENSAS")
      .setDescription(
        `Obtén diferentes recompensas.\n\n` +
        `🎁 **n.daily** — Recompensa diaria\n` +
        `💼 **n.work** — Recompensa por trabajar\n` +
        `⭐ **n.level** — Ver progreso de nivel\n` +
        `🏆 **n.leaderboard** — Ranking de usuarios`
      )
      .setFooter({ text: "🌌 Nexora • Recompensas" }),

    moderacion: new EmbedBuilder()
      .setColor(COLORS.red)
      .setTitle("🛡️ MODERACIÓN")
      .setDescription(
        `Herramientas disponibles para moderadores.\n\n` +
        `🔨 **n.kick @usuario** — Expulsar\n` +
        `🔨 **n.ban @usuario** — Banear\n` +
        `🔓 **n.unban ID** — Desbanear\n` +
        `🧹 **n.clear cantidad** — Borrar mensajes\n` +
        `🔇 **n.timeout @usuario** — Silenciar temporalmente`
      )
      .setFooter({ text: "🌌 Nexora • Moderación" }),

    configuracion: new EmbedBuilder()
      .setColor(COLORS.dark)
      .setTitle("⚙️ CONFIGURACIÓN")
      .setDescription(
        `Configura Nexora para tu servidor.\n\n` +
        `⚙️ **n.config** — Ver configuración\n` +
        `📌 **n.prefix** — Ver prefix actual\n\n` +
        `Prefix actual: **${PREFIX}**`
      )
      .setFooter({ text: "🌌 Nexora • Configuración" }),

    informacion: new EmbedBuilder()
      .setColor(COLORS.galaxy)
      .setTitle("ℹ️ INFORMACIÓN")
      .setDescription(
        `🌌 **Nexora**\n\n` +
        `Un bot multifunción diseñado para convertir tu servidor ` +
        `en un pequeño universo.\n\n` +
        `🤖 **Bot:** Nexora\n` +
        `⚙️ **Prefix:** ${PREFIX}\n` +
        `📚 **Librería:** discord.js v14\n\n` +
        `Usa **${PREFIX}help** para abrir este menú.`
      )
      .setFooter({ text: "🌌 Nexora" })
  };

  return embeds[category] || embeds.informacion;
}

// ============================================================
// 🔙 BOTÓN VOLVER
// ============================================================

function backButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("nexora_back")
      .setLabel("Volver al menú")
      .setEmoji("🌌")
      .setStyle(ButtonStyle.Primary)
  );
}

// ============================================================
// 🟢 READY
// ============================================================

client.once(Events.ClientReady, (bot) => {
  console.log("======================================");
  console.log("🌌 NEXORA");
  console.log("======================================");
  console.log(`✅ Bot conectado como ${bot.user.tag}`);
  console.log(`🆔 ID: ${bot.user.id}`);
  console.log(`🌐 Servidores: ${bot.guilds.cache.size}`);
  console.log(`⚙️ Prefix: ${PREFIX}`);
  console.log("======================================");

  bot.user.setPresence({
    activities: [
      {
        name: "🌌 n.help | Explorando el universo",
        type: 0
      }
    ],
    status: "online"
  });
});

// ============================================================
// 💬 MENSAJES
// ============================================================

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  if (!message.content.toLowerCase().startsWith(PREFIX)) return;

  const args = message.content
    .slice(PREFIX.length)
    .trim()
    .split(/\s+/);

  const command = args.shift()?.toLowerCase();

  if (!command) return;

  const user = getUser(message.author.id);
  getGuild(message.guild.id);

  // ==========================================================
  // 🌌 HELP
  // ==========================================================

  if (command === "help" || command === "menu") {
    return message.reply({
      embeds: [mainEmbed(message.author)],
      components: [mainRow()]
    });
  }

  // ==========================================================
  // 💰 BALANCE
  // ==========================================================

  if (command === "balance" || command === "bal") {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.green)
          .setTitle("💰 Tu balance")
          .setDescription(
            `💵 **Efectivo:** $${user.money.toLocaleString()}\n` +
            `🏦 **Banco:** $${user.bank.toLocaleString()}\n\n` +
            `💎 **Total:** $${(user.money + user.bank).toLocaleString()}`
          )
          .setFooter({ text: "🌌 Nexora • Economía" })
      ]
    });
  }

  // ==========================================================
  // 🏦 BANK
  // ==========================================================

  if (command === "bank") {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.blue)
          .setTitle("🏦 Banco")
          .setDescription(
            `💰 Dinero en el banco: **$${user.bank.toLocaleString()}**`
          )
      ]
    });
  }

  // ==========================================================
  // 💼 WORK
  // ==========================================================

  if (command === "work") {
    const now = Date.now();
    const cooldown = 60 * 1000;

    if (now - user.lastWork < cooldown) {
      const remaining = Math.ceil(
        (cooldown - (now - user.lastWork)) / 1000
      );

      return message.reply(
        `⏳ Debes esperar **${remaining}s** antes de volver a trabajar.`
      );
    }

    const earnings = Math.floor(Math.random() * 451) + 150;

    user.money += earnings;
    user.lastWork = now;

    saveData();

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.green)
          .setTitle("💼 Trabajo completado")
          .setDescription(
            `✨ Has trabajado y recibido **$${earnings.toLocaleString()}**.\n\n` +
            `💰 Dinero actual: **$${user.money.toLocaleString()}**`
          )
      ]
    });
  }

  // ==========================================================
  // 🎁 DAILY
  // ==========================================================

  if (command === "daily") {
    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000;

    if (now - user.lastDaily < cooldown) {
      const remaining = cooldown - (now - user.lastDaily);

      const hours = Math.floor(remaining / 3600000);
      const minutes = Math.floor(
        (remaining % 3600000) / 60000
      );

      return message.reply(
        `⏳ Ya reclamaste tu recompensa.\n` +
        `Vuelve en **${hours}h ${minutes}m**.`
      );
    }

    const reward = 1000;

    user.money += reward;
    user.lastDaily = now;

    saveData();

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.gold)
          .setTitle("🎁 Recompensa diaria")
          .setDescription(
            `✨ Has recibido **$${reward.toLocaleString()}**.\n\n` +
            `💰 Dinero actual: **$${user.money.toLocaleString()}**`
          )
      ]
    });
  }

  // ==========================================================
  // 💸 PAY
  // ==========================================================

  if (command === "pay") {
    const target =
      message.mentions.users.first();

    const amount = parseInt(args[1]);

    if (!target) {
      return message.reply(
        `❌ Usa: **${PREFIX}pay @usuario cantidad**`
      );
    }

    if (target.bot) {
      return message.reply("❌ No puedes pagarle a un bot.");
    }

    if (!amount || amount <= 0) {
      return message.reply("❌ Especifica una cantidad válida.");
    }

    if (user.money < amount) {
      return message.reply("❌ No tienes suficiente dinero.");
    }

    const targetData = getUser(target.id);

    user.money -= amount;
    targetData.money += amount;

    saveData();

    return message.reply(
      `💸 Has enviado **$${amount.toLocaleString()}** a ${target}.`
    );
  }

  // ==========================================================
  // 👤 PROFILE
  // ==========================================================

  if (command === "profile" || command === "perfil") {
    const target =
      message.mentions.users.first() ||
      message.author;

    const targetData = getUser(target.id);

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.purple)
          .setTitle(`👤 Perfil de ${target.username}`)
          .setThumbnail(target.displayAvatarURL({ dynamic: true }))
          .addFields(
            {
              name: "⭐ Nivel",
              value: `${targetData.level}`,
              inline: true
            },
            {
              name: "✨ XP",
              value: `${targetData.xp}`,
              inline: true
            },
            {
              name: "💰 Dinero",
              value: `$${targetData.money.toLocaleString()}`,
              inline: true
            },
            {
              name: "🌟 Reputación",
              value: `${targetData.reputation}`,
              inline: true
            }
          )
          .setFooter({ text: "🌌 Nexora • Social" })
      ]
    });
  }

  // ==========================================================
  // ⭐ REP
  // ==========================================================

  if (command === "rep") {
    const target =
      message.mentions.users.first();

    if (!target) {
      return message.reply(
        `❌ Usa: **${PREFIX}rep @usuario**`
      );
    }

    if (target.id === message.author.id) {
      return message.reply(
        "❌ No puedes darte reputación a ti mismo."
      );
    }

    const targetData = getUser(target.id);

    targetData.reputation++;

    saveData();

    return message.reply(
      `⭐ ${message.author} le dio reputación a ${target}.`
    );
  }

  // ==========================================================
  // 📊 RANK
  // ==========================================================

  if (command === "rank" || command === "level") {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.galaxy)
          .setTitle("📊 Tu progreso")
          .setDescription(
            `⭐ **Nivel:** ${user.level}\n` +
            `✨ **XP:** ${user.xp}\n\n` +
            `Sigue participando para subir de nivel.`
          )
      ]
    });
  }

  // ==========================================================
  // 🎲 ROLL
  // ==========================================================

  if (command === "roll") {
    const number =
      Math.floor(Math.random() * 6) + 1;

    return message.reply(
      `🎲 Has lanzado un dado y salió **${number}**.`
    );
  }

  // ==========================================================
  // 🪙 COINFLIP
  // ==========================================================

  if (command === "coinflip" || command === "coin") {
    const result =
      Math.random() < 0.5
        ? "🪙 Cara"
        : "🪙 Cruz";

    return message.reply(
      `✨ La moneda cayó en **${result}**.`
    );
  }

  // ==========================================================
  // 🔮 8BALL
  // ==========================================================

  if (command === "8ball") {
    const responses = [
      "✨ Sí.",
      "🌌 Probablemente.",
      "🔮 Las estrellas dicen que sí.",
      "☄️ No parece probable.",
      "🌑 Mejor pregunta después.",
      "⭐ Definitivamente.",
      "🪐 Puede ser."
    ];

    const response =
      responses[
        Math.floor(Math.random() * responses.length)
      ];

    return message.reply(
      `🔮 **Nexora 8Ball**\n\n${response}`
    );
  }

  // ==========================================================
  // 🧹 CLEAR
  // ==========================================================

  if (command === "clear" || command === "purge") {
    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.ManageMessages
      )
    ) {
      return message.reply(
        "❌ Necesitas el permiso **Gestionar mensajes**."
      );
    }

    const amount = parseInt(args[0]);

    if (!amount || amount < 1 || amount > 100) {
      return message.reply(
        `❌ Usa una cantidad entre **1 y 100**.\nEjemplo: **${PREFIX}clear 10**`
      );
    }

    try {
      await message.channel.bulkDelete(amount, true);

      const msg = await message.channel.send(
        `🧹 Se eliminaron **${amount} mensajes**.`
      );

      setTimeout(() => {
        msg.delete().catch(() => {});
      }, 3000);

    } catch (error) {
      console.error(error);

      return message.channel.send(
        "❌ No pude eliminar los mensajes."
      );
    }

    return;
  }

  // ==========================================================
  // 🔨 KICK
  // ==========================================================

  if (command === "kick") {
    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.KickMembers
      )
    ) {
      return message.reply(
        "❌ Necesitas el permiso **Expulsar miembros**."
      );
    }

    const target =
      message.mentions.members.first();

    if (!target) {
      return message.reply(
        `❌ Usa: **${PREFIX}kick @usuario**`
      );
    }

    if (!target.kickable) {
      return message.reply(
        "❌ No puedo expulsar a ese usuario."
      );
    }

    await target.kick();

    return message.reply(
      `🔨 ${target.user.tag} ha sido expulsado.`
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
        "❌ Necesitas el permiso **Banear miembros**."
      );
    }

    const target =
      message.mentions.members.first();

    if (!target) {
      return message.reply(
        `❌ Usa: **${PREFIX}ban @usuario**`
      );
    }

    if (!target.bannable) {
      return message.reply(
        "❌ No puedo banear a ese usuario."
      );
    }

    await target.ban();

    return message.reply(
      `🔨 ${target.user.tag} ha sido baneado.`
    );
  }

  // ==========================================================
  // ⚙️ CONFIG
  // ==========================================================

  if (command === "config") {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.dark)
          .setTitle("⚙️ Configuración de Nexora")
          .setDescription(
            `🌌 **Servidor:** ${message.guild.name}\n` +
            `⚙️ **Prefix:** ${PREFIX}\n` +
            `👥 **Miembros:** ${message.guild.memberCount}`
          )
      ]
    });
  }

  // ==========================================================
  // ❓ COMANDO DESCONOCIDO
  // ==========================================================

  return message.reply(
    `❌ No conozco ese comando.\nUsa **${PREFIX}help** para abrir el menú de Nexora.`
  );
});

// ============================================================
// 🖱️ INTERACCIONES
// ============================================================

client.on(Events.InteractionCreate, async (interaction) => {

  // ==========================================================
  // 📋 SELECT MENU
  // ==========================================================

  if (
    interaction.isStringSelectMenu() &&
    interaction.customId === "nexora_main_menu"
  ) {
    const category = interaction.values[0];

    return interaction.update({
      embeds: [categoryEmbed(category)],
      components: [backButton()]
    });
  }

  // ==========================================================
  // 🔙 VOLVER
  // ==========================================================

  if (
    interaction.isButton() &&
    interaction.customId === "nexora_back"
  ) {
    return interaction.update({
      embeds: [mainEmbed(interaction.user)],
      components: [mainRow()]
    });
  }
});

// ============================================================
// ❌ ERRORES
// ============================================================

process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled Rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
});

// ============================================================
// 🔐 LOGIN
// ============================================================

const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) {
  console.error(
    "❌ No se encontró la variable DISCORD_TOKEN."
  );
  process.exit(1);
}

client.login(TOKEN);
