// ============================================================
// 🤖 NEXORA — DISCORD BOT
// PREFIX: n.
// ============================================================

const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

const PREFIX = "n.";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ============================================================
// 📋 CATEGORÍAS DEL MENÚ
// ============================================================

const categories = {

  general: {
    emoji: "📚",
    name: "General",
    description: "Comandos generales de Nexora.",
    commands: [
      "n.ayuda",
      "n.ping",
      "n.botinfo",
      "n.servidor",
      "n.usuario",
      "n.avatar",
      "n.banner",
      "n.invitar",
      "n.estado",
      "n.sugerir",
    ],
  },

  diversion: {
    emoji: "🎮",
    name: "Diversión",
    description: "Comandos para divertirte con tu comunidad.",
    commands: [
      "n.8ball",
      "n.dado",
      "n.moneda",
      "n.chiste",
      "n.meme",
      "n.reto",
      "n.trivia",
      "n.ship",
      "n.elegir",
      "n.suerte",
    ],
  },

  economia: {
    emoji: "💰",
    name: "Economía",
    description: "Sistema de economía de Nexora.",
    commands: [
      "n.balance",
      "n.daily",
      "n.trabajar",
      "n.pagar",
      "n.tienda",
      "n.comprar",
      "n.vender",
      "n.inventario",
      "n.prestamo",
      "n.dinero",
    ],
  },

  niveles: {
    emoji: "🏆",
    name: "Niveles",
    description: "Sistema de experiencia y niveles.",
    commands: [
      "n.nivel",
      "n.xp",
      "n.ranking",
      "n.top",
      "n.recompensa",
      "n.racha",
      "n.logros",
      "n.progreso",
      "n.rank",
      "n.puntos",
    ],
  },

  recompensas: {
    emoji: "🎁",
    name: "Recompensas",
    description: "Premios y recompensas.",
    commands: [
      "n.reclamar",
      "n.regalo",
      "n.premio",
      "n.bonus",
      "n.ruleta",
      "n.sorteo",
      "n.ticket",
      "n.cupon",
      "n.recompensas",
      "n.beneficios",
    ],
  },

  multimedia: {
    emoji: "🖼️",
    name: "Multimedia",
    description: "Comandos relacionados con imágenes y contenido visual.",
    commands: [
      "n.gif",
      "n.imagen",
      "n.meme",
      "n.sticker",
      "n.emote",
      "n.icono",
      "n.banner",
      "n.color",
      "n.invertir",
      "n.blur",
    ],
  },

  utilidad: {
    emoji: "🌐",
    name: "Utilidad",
    description: "Herramientas útiles para tu servidor.",
    commands: [
      "n.calcular",
      "n.convertir",
      "n.hora",
      "n.fecha",
      "n.clima",
      "n.traducir",
      "n.recordatorio",
      "n.encuesta",
      "n.cronometro",
      "n.info",
    ],
  },

  comunidad: {
    emoji: "👥",
    name: "Comunidad",
    description: "Funciones para interactuar con la comunidad.",
    commands: [
      "n.perfil",
      "n.cumpleaños",
      "n.confesion",
      "n.bio",
      "n.amigos",
      "n.pareja",
      "n.matrimonio",
      "n.adoptar",
      "n.familia",
      "n.reputacion",
    ],
  },

  configuracion: {
    emoji: "⚙️",
    name: "Configuración",
    description: "Configuración del servidor. Solo administradores.",
    adminOnly: true,
    commands: [
      "n.config",
      "n.idioma",
      "n.prefix",
      "n.bienvenida",
      "n.despedida",
      "n.autoroles",
      "n.logs",
      "n.canales",
      "n.roles",
      "n.servidorconfig",
    ],
  },

};

// ============================================================
// 🏠 EMBED PRINCIPAL
// ============================================================

function createMainMenu() {

  const embed = new EmbedBuilder()
    .setTitle("🤖 Nexora")
    .setDescription(
      "Selecciona una categoría en el menú de abajo para ver sus comandos."
    )
    .addFields(
      {
        name: "📚 General",
        value: "Información y comandos básicos.",
        inline: true,
      },
      {
        name: "🎮 Diversión",
        value: "Juegos y entretenimiento.",
        inline: true,
      },
      {
        name: "💰 Economía",
        value: "Sistema económico.",
        inline: true,
      },
      {
        name: "🏆 Niveles",
        value: "XP, niveles y rankings.",
        inline: true,
      },
      {
        name: "🎁 Recompensas",
        value: "Premios y beneficios.",
        inline: true,
      },
      {
        name: "🖼️ Multimedia",
        value: "Imágenes y contenido visual.",
        inline: true,
      },
      {
        name: "🌐 Utilidad",
        value: "Herramientas útiles.",
        inline: true,
      },
      {
        name: "👥 Comunidad",
        value: "Funciones sociales.",
        inline: true,
      },
      {
        name: "⚙️ Configuración",
        value: "Solo administradores.",
        inline: true,
      }
    )
    .setFooter({
      text: "Nexora • Selecciona una categoría",
    });

  return embed;
}

// ============================================================
// 📂 CREAR MENÚ
// ============================================================

function createCategoryMenu(member) {

  const menu = new StringSelectMenuBuilder()
    .setCustomId("nexora_command_category")
    .setPlaceholder("📂 Selecciona una categoría")
    .addOptions(

      new StringSelectMenuOptionBuilder()
        .setLabel("General")
        .setDescription("Comandos generales")
        .setValue("general")
        .setEmoji("📚"),

      new StringSelectMenuOptionBuilder()
        .setLabel("Diversión")
        .setDescription("Juegos y entretenimiento")
        .setValue("diversion")
        .setEmoji("🎮"),

      new StringSelectMenuOptionBuilder()
        .setLabel("Economía")
        .setDescription("Sistema económico")
        .setValue("economia")
        .setEmoji("💰"),

      new StringSelectMenuOptionBuilder()
        .setLabel("Niveles")
        .setDescription("XP, niveles y rankings")
        .setValue("niveles")
        .setEmoji("🏆"),

      new StringSelectMenuOptionBuilder()
        .setLabel("Recompensas")
        .setDescription("Premios y beneficios")
        .setValue("recompensas")
        .setEmoji("🎁"),

      new StringSelectMenuOptionBuilder()
        .setLabel("Multimedia")
        .setDescription("Imágenes y contenido visual")
        .setValue("multimedia")
        .setEmoji("🖼️"),

      new StringSelectMenuOptionBuilder()
        .setLabel("Utilidad")
        .setDescription("Herramientas útiles")
        .setValue("utilidad")
        .setEmoji("🌐"),

      new StringSelectMenuOptionBuilder()
        .setLabel("Comunidad")
        .setDescription("Funciones sociales")
        .setValue("comunidad")
        .setEmoji("👥"),

    );

  // ==========================================================
  // ⚙️ CONFIGURACIÓN — SOLO ADMINS
  // ==========================================================

  if (
    member &&
    member.permissions.has(PermissionsBitField.Flags.Administrator)
  ) {

    menu.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("Configuración")
        .setDescription("Configuración del servidor")
        .setValue("configuracion")
        .setEmoji("⚙️")
    );

  }

  return new ActionRowBuilder().addComponents(menu);
}

// ============================================================
// 📋 MOSTRAR CATEGORÍA
// ============================================================

function createCategoryEmbed(category) {

  const commandList = category.commands
    .map((command, index) => `**${index + 1}.** \`${command}\``)
    .join("\n");

  return new EmbedBuilder()
    .setTitle(`${category.emoji} ${category.name}`)
    .setDescription(category.description)
    .addFields({
      name: "📋 Comandos",
      value: commandList,
    })
    .setFooter({
      text: "Nexora • Usa el menú para cambiar de categoría",
    });
}

// ============================================================
// 🚀 BOT LISTO
// ============================================================

client.once("ready", () => {

  console.log("=================================");
  console.log("🤖 NEXORA ONLINE");
  console.log(`👤 Usuario: ${client.user.tag}`);
  console.log(`🆔 ID: ${client.user.id}`);
  console.log(`🌐 Servidores: ${client.guilds.cache.size}`);
  console.log(`⚡ Prefix: ${PREFIX}`);
  console.log("=================================");

});

// ============================================================
// 💬 MENSAJES
// ============================================================

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;

  if (!message.content.toLowerCase().startsWith(PREFIX)) return;

  const args = message.content
    .slice(PREFIX.length)
    .trim()
    .split(/\s+/);

  const command = args.shift()?.toLowerCase();

  // ==========================================================
  // 📋 N.COMANDOS
  // ==========================================================

  if (command === "comandos") {

    const embed = createMainMenu();

    const menu = createCategoryMenu(message.member);

    await message.reply({
      embeds: [embed],
      components: [menu],
    });

    return;
  }

});

// ============================================================
// 🖱️ INTERACCIONES DEL MENÚ
// ============================================================

client.on("interactionCreate", async (interaction) => {

  if (!interaction.isStringSelectMenu()) return;

  if (interaction.customId !== "nexora_command_category") return;

  const selected = interaction.values[0];

  const category = categories[selected];

  if (!category) return;

  // ==========================================================
  // 🔒 CONFIGURACIÓN — COMPROBAR ADMIN
  // ==========================================================

  if (category.adminOnly) {

    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) {

      await interaction.reply({
        content: "❌ Solo los administradores pueden ver esta categoría.",
        ephemeral: true,
      });

      return;
    }
  }

  const embed = createCategoryEmbed(category);

  const menu = createCategoryMenu(interaction.member);

  await interaction.update({
    embeds: [embed],
    components: [menu],
  });

});

// ============================================================
// 🔐 LOGIN
// ============================================================

client.login(process.env.DISCORD_TOKEN);
