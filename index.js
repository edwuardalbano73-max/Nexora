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
  Events,
  ChannelType
} = require("discord.js");

const fs = require("fs");
const path = require("path");
const http = require("http");

// ============================================================
// CONFIGURACIÓN
// ============================================================

const PREFIX = "n.";
const TOKEN = process.env.DISCORD_TOKEN;
const DATA_FILE = path.join(__dirname, "nexora-data.json");
const PORT = process.env.PORT || 3000;

if (!TOKEN) {
  console.error("❌ Falta DISCORD_TOKEN en las variables de entorno.");
}

// ============================================================
// CLIENTE
// ============================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.GuildMember,
    Partials.User
  ]
});

// ============================================================
// BASE DE DATOS
// ============================================================

let db = {
  users: {},
  guilds: {}
};

function loadDatabase() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf8");
      db = JSON.parse(raw);
    }
  } catch (error) {
    console.error("❌ Error cargando base de datos:", error);
  }

  if (!db.users) db.users = {};
  if (!db.guilds) db.guilds = {};
}

function saveDatabase() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error("❌ Error guardando base de datos:", error);
  }
}

loadDatabase();

// ============================================================
// DATOS DE USUARIO
// ============================================================

function getUser(userId) {
  if (!db.users[userId]) {
    db.users[userId] = {
      money: 1000,
      bank: 0,
      level: 1,
      xp: 0,
      reputation: 0,
      warnings: 0,
      inventory: [],
      badges: [],
      achievements: [],
      bio: "Sin biografía.",
      status: "Disponible",
      friends: [],
      followers: [],
      following: [],
      streak: 0,
      luck: 0,
      lastDaily: 0,
      lastWeekly: 0,
      lastMonthly: 0,
      lastWork: 0,
      lastRep: 0,
      lastCheckin: 0,
      lastSpin: 0,
      lastQuest: 0
    };
  }

  return db.users[userId];
}

function getGuild(guildId) {
  if (!db.guilds[guildId]) {
    db.guilds[guildId] = {
      prefix: PREFIX,
      welcomeChannel: null,
      logChannel: null,
      modRole: null,
      autoRole: null,
      antiSpam: false,
      antiLink: false,
      autoMod: false,
      filter: false,
      language: "es",
      timezone: "Europe/Amsterdam",
      economy: true,
      social: true,
      rewards: true,
      levels: true,
      commandToggles: {}
    };
  }

  return db.guilds[guildId];
}

// ============================================================
// UTILIDADES
// ============================================================

function formatMoney(number) {
  return Number(number || 0).toLocaleString("es-ES");
}

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function cooldownRemaining(last, cooldown) {
  const remaining = cooldown - (Date.now() - last);

  if (remaining <= 0) return 0;

  return Math.ceil(remaining / 1000);
}

function formatTime(seconds) {
  seconds = Math.max(0, seconds);

  const d = Math.floor(seconds / 86400);
  seconds %= 86400;

  const h = Math.floor(seconds / 3600);
  seconds %= 3600;

  const m = Math.floor(seconds / 60);
  const s = seconds % 60;

  const parts = [];

  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s || parts.length === 0) parts.push(`${s}s`);

  return parts.join(" ");
}

function addXP(user, amount) {
  user.xp += amount;

  let needed = user.level * 100;

  while (user.xp >= needed) {
    user.xp -= needed;
    user.level++;
    needed = user.level * 100;
  }
}

function getMember(message, args) {
  const mention = message.mentions.members.first();

  if (mention) return mention;

  if (args[0]) {
    return message.guild.members.cache.get(
      args[0].replace(/[<@!>]/g, "")
    );
  }

  return message.member;
}

function isAdmin(member) {
  return member?.permissions?.has(
    PermissionsBitField.Flags.Administrator
  );
}

function hasPermission(member, permission) {
  return member?.permissions?.has(permission);
}

async function reply(message, content) {
  try {
    return await message.reply(content);
  } catch {
    return null;
  }
}

async function interactionReply(interaction, options) {
  try {
    if (interaction.replied || interaction.deferred) {
      return await interaction.editReply(options);
    }

    return await interaction.reply(options);
  } catch (error) {
    console.error("❌ Error respondiendo interacción:", error);
  }
}

function commandUsed(guildId) {
  const guild = getGuild(guildId);

  if (!guild.commandUses) guild.commandUses = 0;

  guild.commandUses++;
  saveDatabase();
}

// ============================================================
// EMBEDS
// ============================================================

function baseEmbed(title, description = "") {
  return new EmbedBuilder()
    .setColor(0x6f42c1)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

// ============================================================
// CATEGORÍAS
// EXACTAMENTE 30 COMANDOS POR CATEGORÍA
// ============================================================

const CATEGORIES = {

  economy: {
    name: "💰 Economía",
    commands: [
      ["balance", "Ver tu dinero."],
      ["bank", "Ver tu banco."],
      ["deposit", "Depositar dinero."],
      ["withdraw", "Retirar dinero."],
      ["pay", "Pagar a otro usuario."],
      ["work", "Trabajar y ganar dinero."],
      ["salary", "Cobrar un salario."],
      ["shop", "Ver la tienda."],
      ["buy", "Comprar un artículo."],
      ["sell", "Vender un artículo."],
      ["inventory", "Ver tu inventario."],
      ["rich", "Ver usuarios con más dinero."],
      ["economy", "Ver estadísticas de economía."],
      ["cash", "Ver dinero disponible."],
      ["give", "Dar dinero a otro usuario."],
      ["tip", "Dar una propina."],
      ["giftmoney", "Enviar un regalo de dinero."],
      ["treasure", "Buscar un tesoro."],
      ["mine", "Minar recursos."],
      ["fish", "Pescar."],
      ["farm", "Trabajar en una granja."],
      ["dig", "Cavar para encontrar recompensas."],
      ["hunt", "Realizar una búsqueda."],
      ["dailyeco", "Recompensa económica diaria."],
      ["weeklyeco", "Recompensa económica semanal."],
      ["monthlyeco", "Recompensa económica mensual."],
      ["lottery", "Participar en una lotería virtual."],
      ["coinflip", "Apostar dinero virtual al lanzar una moneda."],
      ["slots", "Máquina de premios virtual."],
      ["networth", "Ver tu patrimonio total."]
    ]
  },

  social: {
    name: "👥 Social",
    commands: [
      ["profile", "Ver tu perfil."],
      ["socialrank", "Ver tu posición social."],
      ["levelinfo", "Ver información de nivel."],
      ["reputation", "Ver reputación."],
      ["give-rep", "Dar reputación."],
      ["user", "Ver información de un usuario."],
      ["userinfo", "Información detallada de usuario."],
      ["avatar", "Ver avatar."],
      ["banner", "Ver banner."],
      ["server", "Información del servidor."],
      ["members", "Ver cantidad de miembros."],
      ["leaderboard", "Clasificación general."],
      ["top-level", "Clasificación por niveles."],
      ["top-rep", "Clasificación por reputación."],
      ["badges", "Ver insignias."],
      ["achievements", "Ver logros."],
      ["roles", "Ver tus roles."],
      ["permissions", "Ver tus permisos."],
      ["joined", "Ver cuándo entraste."],
      ["nickname", "Ver tu apodo."],
      ["setbio", "Cambiar tu biografía."],
      ["bio", "Ver biografía."],
      ["setstatus", "Cambiar estado de Nexora."],
      ["status", "Ver estado."],
      ["friend", "Añadir un amigo."],
      ["unfriend", "Eliminar un amigo."],
      ["friends", "Ver amigos."],
      ["follow", "Seguir a un usuario."],
      ["followers", "Ver seguidores."],
      ["social", "Ver estadísticas sociales."]
    ]
  },

  fun: {
    name: "🎮 Diversión",
    commands: [
      ["roll", "Lanzar un dado."],
      ["eightball", "Preguntar a la bola mágica."],
      ["guess", "Adivinar un número."],
      ["flipcoin", "Lanzar una moneda."],
      ["joke", "Contar un chiste."],
      ["meme", "Generar un meme de texto."],
      ["rps", "Piedra, papel o tijera."],
      ["dice", "Tirar dados."],
      ["slotsfun", "Máquina divertida."],
      ["choose", "Elegir entre opciones."],
      ["random", "Generar algo aleatorio."],
      ["rate", "Dar una puntuación aleatoria."],
      ["roast", "Broma ligera."],
      ["compliment", "Generar un cumplido."],
      ["fact", "Dato curioso."],
      ["magic", "Respuesta mágica."],
      ["fortune", "Fortuna aleatoria."],
      ["yesno", "Respuesta sí o no."],
      ["fliptext", "Invertir texto."],
      ["sayfun", "Repetir texto."],
      ["reverse", "Invertir una frase."],
      ["ascii", "Convertir texto a formato ASCII."],
      ["emoji", "Obtener un emoji aleatorio."],
      ["number", "Número aleatorio."],
      ["color", "Color aleatorio."],
      ["animal", "Animal aleatorio."],
      ["planet", "Planeta aleatorio."],
      ["space", "Dato del espacio."],
      ["challenge", "Desafío divertido."],
      ["trivia", "Pregunta de trivia."]
    ]
  },

  rewards: {
    name: "🎁 Recompensas",
    commands: [
      ["daily", "Recompensa diaria."],
      ["weekly", "Recompensa semanal."],
      ["monthly", "Recompensa mensual."],
      ["streak", "Ver racha."],
      ["reward", "Ver recompensas."],
      ["claim", "Reclamar recompensa."],
      ["bonus", "Obtener bonus."],
      ["giftbox", "Abrir caja regalo."],
      ["chest", "Abrir cofre."],
      ["treasure-reward", "Buscar recompensa."],
      ["lucky", "Probar suerte."],
      ["spin", "Girar la ruleta."],
      ["wheel", "Girar rueda."],
      ["scratch", "Raspar tarjeta virtual."],
      ["quest", "Ver misión."],
      ["quests", "Ver misiones."],
      ["mission", "Comenzar misión."],
      ["missions", "Lista de misiones."],
      ["xpboost", "Obtener XP extra."],
      ["moneyboost", "Bonus de dinero."],
      ["luck", "Ver suerte."],
      ["prize", "Ver premio."],
      ["prizes", "Ver premios."],
      ["event", "Evento actual."],
      ["events", "Lista de eventos."],
      ["calendar", "Calendario de recompensas."],
      ["checkin", "Registrar entrada."],
      ["streakinfo", "Información de racha."],
      ["rewardinfo", "Información de recompensas."],
      ["redeem", "Canjear código."]
    ]
  },

  moderation: {
    name: "🛡️ Moderación",
    commands: [
      ["kick", "Expulsar usuario."],
      ["ban", "Banear usuario."],
      ["unban", "Desbanear usuario."],
      ["timeout", "Aplicar timeout."],
      ["untimeout", "Quitar timeout."],
      ["clear", "Eliminar mensajes."],
      ["purge", "Eliminar mensajes."],
      ["warn", "Advertir usuario."],
      ["warnings", "Ver advertencias."],
      ["unwarn", "Quitar advertencia."],
      ["lock", "Bloquear canal."],
      ["unlock", "Desbloquear canal."],
      ["slowmode", "Activar modo lento."],
      ["unslowmode", "Desactivar modo lento."],
      ["mute", "Aplicar silencio."],
      ["unmute", "Quitar silencio."],
      ["nick", "Cambiar apodo."],
      ["resetnick", "Restablecer apodo."],
      ["addrole", "Añadir rol."],
      ["removerole", "Quitar rol."],
      ["announce", "Crear anuncio."],
      ["embed", "Crear embed."],
      ["saymod", "Enviar mensaje como Nexora."],
      ["channelinfo", "Información del canal."],
      ["servermodinfo", "Información de moderación."],
      ["modlogs", "Ver registros."],
      ["clearwarns", "Eliminar advertencias."],
      ["modhelp", "Ayuda de moderación."],
      ["staff", "Ver miembros del staff."],
      ["roleinfo", "Información de rol."]
    ]
  },

  config: {
    name: "⚙️ Configuración",
    commands: [
      ["config", "Ver configuración."],
      ["prefix", "Ver prefijo."],
      ["welcome", "Ver canal de bienvenida."],
      ["setwelcome", "Configurar bienvenida."],
      ["log", "Ver canal de logs."],
      ["setlog", "Configurar canal de logs."],
      ["modrole", "Ver rol de moderación."],
      ["setmodrole", "Configurar rol de moderación."],
      ["autorole", "Ver rol automático."],
      ["setautorole", "Configurar rol automático."],
      ["antispam", "Activar/desactivar antispam."],
      ["antilink", "Activar/desactivar antilinks."],
      ["automod", "Activar/desactivar automod."],
      ["filter", "Activar/desactivar filtro."],
      ["language", "Configurar idioma."],
      ["timezone", "Configurar zona horaria."],
      ["economyconfig", "Configurar economía."],
      ["socialconfig", "Configurar sistema social."],
      ["rewardconfig", "Configurar recompensas."],
      ["levelconfig", "Configurar niveles."],
      ["welcomeconfig", "Configuración de bienvenida."],
      ["logconfig", "Configuración de logs."],
      ["serverconfig", "Configuración del servidor."],
      ["botconfig", "Configuración de Nexora."],
      ["channels", "Ver canales configurados."],
      ["roles", "Ver roles configurados."],
      ["permissions", "Ver permisos."],
      ["resetconfig", "Restablecer configuración."],
      ["settings", "Ver ajustes."],
      ["togglecommands", "Activar/desactivar comandos."]
    ]
  },

  info: {
    name: "ℹ️ Información",
    commands: [
      ["help", "Abrir ayuda."],
      ["menu", "Abrir menú."],
      ["about", "Información sobre Nexora."],
      ["botinfo", "Información del bot."],
      ["stats", "Estadísticas."],
      ["ping", "Latencia."],
      ["uptime", "Tiempo activo."],
      ["serverinfo", "Información del servidor."],
      ["channelinfo", "Información del canal."],
      ["userinfo", "Información de usuario."],
      ["avatarinfo", "Información del avatar."],
      ["bannerinfo", "Información del banner."],
      ["roleinfo", "Información del rol."],
      ["membercount", "Cantidad de miembros."],
      ["servericon", "Icono del servidor."],
      ["serverbanner", "Banner del servidor."],
      ["invite", "Información de invitación."],
      ["support", "Información de soporte."],
      ["website", "Información web."],
      ["version", "Versión de Nexora."],
      ["commands", "Lista de comandos."],
      ["categories", "Lista de categorías."],
      ["status", "Estado del bot."],
      ["latency", "Latencia detallada."],
      ["system", "Información del sistema."],
      ["library", "Biblioteca usada."],
      ["creator", "Información del creador."],
      ["credits", "Créditos."],
      ["nexora", "Información de Nexora."],
      ["commandinfo", "Información de un comando."]
    ]
  }
};

// ============================================================
// MENÚ PRINCIPAL
// ============================================================

function mainMenu(member) {
  const options = Object.entries(CATEGORIES).map(([id, category]) => ({
    label: category.name.replace(/^.\s/, ""),
    description: `Ver los comandos de ${category.name.replace(/^.\s/, "")}`,
    value: id,
    emoji: category.name.split(" ")[0]
  }));

  const menu = new StringSelectMenuBuilder()
    .setCustomId("nexora_category")
    .setPlaceholder("🌌 Selecciona una categoría...")
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(menu);

  const rows = [row];

  if (isAdmin(member)) {
    const adminButton = new ButtonBuilder()
      .setCustomId("nexora_admin")
      .setLabel("👑 Panel de Admin")
      .setStyle(ButtonStyle.Danger);

    rows.push(
      new ActionRowBuilder().addComponents(adminButton)
    );
  }

  return rows;
}

// ============================================================
// EMBED PRINCIPAL
// ============================================================

function helpEmbed(member) {
  let text =
    "🌌 **Bienvenido al centro de control de Nexora.**\n\n" +
    "Selecciona una categoría para ver sus comandos.\n\n" +
    "💰 Economía\n" +
    "👥 Social\n" +
    "🎮 Diversión\n" +
    "🎁 Recompensas\n" +
    "🛡️ Moderación\n" +
    "⚙️ Configuración\n" +
    "ℹ️ Información\n";

  if (isAdmin(member)) {
    text += "\n👑 **Panel de Admin disponible abajo.**";
  }

  return baseEmbed(
    "🌌 NEXORA",
    text
  ).setFooter({
    text: "Nexora • Selecciona una opción"
  });
}

// ============================================================
// MENÚ DE CATEGORÍA
// IMPORTANTE: 15 OPCIONES POR PÁGINA
// ============================================================

function categoryPage(categoryId, page = 0) {
  const category = CATEGORIES[categoryId];

  if (!category) return null;

  const totalPages = Math.ceil(category.commands.length / 15);

  if (page < 0) page = 0;
  if (page >= totalPages) page = totalPages - 1;

  const start = page * 15;
  const commands = category.commands.slice(start, start + 15);

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`nexora_command_${categoryId}_${page}`)
    .setPlaceholder(`📖 Comandos • Página ${page + 1}/${totalPages}`)
    .addOptions(
      commands.map(([name, description]) => ({
        label: `n.${name}`.slice(0, 100),
        description: description.slice(0, 100),
        value: name
      }))
    );

  const menuRow = new ActionRowBuilder().addComponents(menu);

  const previous = new ButtonBuilder()
    .setCustomId(`nexora_page_${categoryId}_${page - 1}`)
    .setLabel("⬅️")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page === 0);

  const next = new ButtonBuilder()
    .setCustomId(`nexora_page_${categoryId}_${page + 1}`)
    .setLabel("➡️")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page === totalPages - 1);

  const home = new ButtonBuilder()
    .setCustomId("nexora_home")
    .setLabel("🌌 Menú principal")
    .setStyle(ButtonStyle.Primary);

  const buttons = new ActionRowBuilder().addComponents(
    previous,
    next,
    home
  );

  const embed = baseEmbed(
    `${category.name} • Página ${page + 1}/${totalPages}`,
    `Selecciona uno de los comandos de esta página.\n\n` +
    `📚 **Comandos ${start + 1}-${Math.min(
      start + 15,
      category.commands.length
    )} de ${category.commands.length}**`
  );

  return {
    embeds: [embed],
    components: [menuRow, buttons]
  };
}

// ============================================================
// ADMIN PANEL
// ============================================================

function adminPanel() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("nexora_admin_category")
    .setPlaceholder("👑 Selecciona una sección...")
    .addOptions([
      {
        label: "🛡️ Moderación",
        description: "Herramientas de moderación",
        value: "moderation"
      },
      {
        label: "⚙️ Servidor",
        description: "Configuración del servidor",
        value: "server"
      },
      {
        label: "👥 Usuarios",
        description: "Información y gestión de usuarios",
        value: "users"
      },
      {
        label: "💰 Economía",
        description: "Gestión de economía",
        value: "economy"
      },
      {
        label: "📊 Estadísticas",
        description: "Estadísticas de Nexora",
        value: "stats"
      },
      {
        label: "🔧 Herramientas",
        description: "Herramientas administrativas",
        value: "tools"
      }
    ]);

  const row = new ActionRowBuilder().addComponents(menu);

  const back = new ButtonBuilder()
    .setCustomId("nexora_home")
    .setLabel("🌌 Volver")
    .setStyle(ButtonStyle.Primary);

  return {
    embeds: [
      baseEmbed(
        "👑 PANEL DE ADMINISTRACIÓN",
        "🌌 **Nexora • Centro de control**\n\n" +
        "Selecciona una sección para administrar el servidor."
      )
    ],
    components: [
      row,
      new ActionRowBuilder().addComponents(back)
    ]
  };
}

function adminCategory(type) {
  const data = {
    moderation: {
      title: "🛡️ Moderación",
      text:
        "`n.kick` `n.ban` `n.unban` `n.timeout`\n" +
        "`n.clear` `n.warn` `n.warnings` `n.lock`\n" +
        "`n.unlock` `n.slowmode` `n.addrole` `n.removerole`"
    },
    server: {
      title: "⚙️ Servidor",
      text:
        "`n.config` — Configuración general\n" +
        "`n.setwelcome` — Canal de bienvenida\n" +
        "`n.setlog` — Canal de logs\n" +
        "`n.setmodrole` — Rol de moderación\n" +
        "`n.resetconfig` — Restablecer configuración"
    },
    users: {
      title: "👥 Usuarios",
      text:
        "`n.userinfo @usuario`\n" +
        "`n.balance @usuario`\n" +
        "`n.inventory @usuario`\n" +
        "`n.profile @usuario`\n" +
        "`n.warnings @usuario`"
    },
    economy: {
      title: "💰 Economía",
      text:
        "`n.give @usuario cantidad`\n" +
        "`n.pay @usuario cantidad`\n" +
        "`n.resetconfig`\n" +
        "`n.economy`"
    },
    stats: {
      title: "📊 Estadísticas",
      text:
        "`n.stats`\n" +
        "`n.membercount`\n" +
        "`n.commands`\n" +
        "`n.uptime`\n" +
        "`n.ping`"
    },
    tools: {
      title: "🔧 Herramientas",
      text:
        "`n.announce texto`\n" +
        "`n.embed texto`\n" +
        "`n.saymod texto`\n" +
        "`n.channelinfo`\n" +
        "`n.roleinfo @rol`"
    }
  };

  return baseEmbed(
    `👑 ${data[type]?.title || "Administración"}`,
    data[type]?.text || "Sección no disponible."
  );
}

// ============================================================
// INTERACCIONES
// ESTE BLOQUE SOLUCIONA "LA APP NO RESPONDIÓ"
// ============================================================

client.on(Events.InteractionCreate, async interaction => {

  try {

    // --------------------------------------------------------
    // SELECT MENUS
    // --------------------------------------------------------

    if (interaction.isStringSelectMenu()) {

      // Categoría principal
      if (interaction.customId === "nexora_category") {

        const categoryId = interaction.values[0];

        const page = categoryPage(categoryId, 0);

        if (!page) {
          return await interactionReply(interaction, {
            content: "❌ Esa categoría no existe.",
            ephemeral: true
          });
        }

        return await interactionReply(interaction, page);
      }

      // Comandos de categoría
      if (interaction.customId.startsWith("nexora_command_")) {

        const parts = interaction.customId.split("_");

        const categoryId = parts[2];
        const page = Number(parts[3] || 0);
        const commandName = interaction.values[0];

        const category = CATEGORIES[categoryId];

        if (!category) {
          return await interactionReply(interaction, {
            content: "❌ Categoría no encontrada.",
            ephemeral: true
          });
        }

        const command = category.commands.find(
          item => item[0] === commandName
        );

        if (!command) {
          return await interactionReply(interaction, {
            content: "❌ Comando no encontrado.",
            ephemeral: true
          });
        }

        const embed = baseEmbed(
          `🌌 n.${command[0]}`,
          `**Descripción:** ${command[1]}\n\n` +
          `**Uso:** \`n.${command[0]}\`\n\n` +
          `📂 **Categoría:** ${category.name}`
        );

        const back = new ButtonBuilder()
          .setCustomId(`nexora_page_${categoryId}_${page}`)
          .setLabel("⬅️ Volver")
          .setStyle(ButtonStyle.Secondary);

        const home = new ButtonBuilder()
          .setCustomId("nexora_home")
          .setLabel("🌌 Menú principal")
          .setStyle(ButtonStyle.Primary);

        return await interactionReply(interaction, {
          embeds: [embed],
          components: [
            new ActionRowBuilder().addComponents(back, home)
          ]
        });
      }

      // Admin
      if (interaction.customId === "nexora_admin_category") {

        if (!isAdmin(interaction.member)) {
          return await interactionReply(interaction, {
            content: "❌ No tienes permisos de administrador.",
            ephemeral: true
          });
        }

        const type = interaction.values[0];

        return await interactionReply(interaction, {
          embeds: [adminCategory(type)],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("nexora_admin")
                .setLabel("👑 Panel Admin")
                .setStyle(ButtonStyle.Danger),
              new ButtonBuilder()
                .setCustomId("nexora_home")
                .setLabel("🌌 Inicio")
                .setStyle(ButtonStyle.Primary)
            )
          ]
        });
      }
    }

    // --------------------------------------------------------
    // BOTONES
    // --------------------------------------------------------

    if (interaction.isButton()) {

      // Inicio
      if (interaction.customId === "nexora_home") {

        return await interactionReply(interaction, {
          embeds: [helpEmbed(interaction.member)],
          components: mainMenu(interaction.member)
        });
      }

      // Admin
      if (interaction.customId === "nexora_admin") {

        if (!isAdmin(interaction.member)) {
          return await interactionReply(interaction, {
            content: "❌ Necesitas permiso de Administrador.",
            ephemeral: true
          });
        }

        return await interactionReply(
          interaction,
          adminPanel()
        );
      }

      // Paginación
      if (interaction.customId.startsWith("nexora_page_")) {

        const parts = interaction.customId.split("_");

        const categoryId = parts[2];
        const page = Number(parts[3]);

        const pageData = categoryPage(
          categoryId,
          Number.isNaN(page) ? 0 : page
        );

        if (!pageData) {
          return await interactionReply(interaction, {
            content: "❌ No se pudo cargar la página.",
            ephemeral: true
          });
        }

        return await interactionReply(
          interaction,
          pageData
        );
      }
    }

  } catch (error) {

    console.error(
      "❌ ERROR EN INTERACTIONCREATE:",
      error
    );

    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ Ocurrió un error al procesar esa opción.",
          ephemeral: true
        });
      }
    } catch {}
  }
});

// ============================================================
// COMANDOS DE AYUDA
// ============================================================

async function commandHelp(message) {
  return reply(message, {
    embeds: [helpEmbed(message.member)],
    components: mainMenu(message.member)
  });
}

// ============================================================
// COMANDOS ECONOMÍA
// ============================================================

async function economyCommand(message, command, args) {

  const user = getUser(message.author.id);

  if (command === "balance" ||
      command === "cash") {

    return reply(message,
      `💰 **${message.author.username}**\n\n` +
      `💵 Dinero: **$${formatMoney(user.money)}**\n` +
      `🏦 Banco: **$${formatMoney(user.bank)}**\n` +
      `💎 Patrimonio: **$${formatMoney(user.money + user.bank)}**`
    );
  }

  if (command === "bank") {
    return reply(message,
      `🏦 Tienes **$${formatMoney(user.bank)}** en el banco.`
    );
  }

  if (command === "deposit") {

    const amount = Number(args[0]);

    if (!amount || amount <= 0) {
      return reply(message, "❌ Usa `n.deposit cantidad`.");
    }

    if (amount > user.money) {
      return reply(message, "❌ No tienes suficiente dinero.");
    }

    user.money -= amount;
    user.bank += amount;

    saveDatabase();

    return reply(message,
      `🏦 Depositaste **$${formatMoney(amount)}**.`
    );
  }

  if (command === "withdraw") {

    const amount = Number(args[0]);

    if (!amount || amount <= 0) {
      return reply(message, "❌ Usa `n.withdraw cantidad`.");
    }

    if (amount > user.bank) {
      return reply(message, "❌ No tienes suficiente dinero en el banco.");
    }

    user.bank -= amount;
    user.money += amount;

    saveDatabase();

    return reply(message,
      `💵 Retiraste **$${formatMoney(amount)}**.`
    );
  }

  if (
    command === "pay" ||
    command === "give" ||
    command === "tip" ||
    command === "giftmoney"
  ) {

    const target = message.mentions.users.first();

    const amount = Number(args[1] || args[0]);

    if (!target) {
      return reply(message, "❌ Menciona a un usuario.");
    }

    if (target.id === message.author.id) {
      return reply(message, "❌ No puedes enviarte dinero a ti mismo.");
    }

    if (!amount || amount <= 0) {
      return reply(message, "❌ Indica una cantidad válida.");
    }

    if (amount > user.money) {
      return reply(message, "❌ No tienes suficiente dinero.");
    }

    user.money -= amount;

    const targetUser = getUser(target.id);
    targetUser.money += amount;

    saveDatabase();

    return reply(message,
      `💸 ${message.author} envió **$${formatMoney(amount)}** a ${target}.`
    );
  }

  if (command === "work" || command === "salary") {

    const remaining = cooldownRemaining(
      user.lastWork,
      60 * 1000
    );

    if (remaining) {
      return reply(message,
        `⏳ Espera **${remaining}s** para volver a trabajar.`
      );
    }

    const amount = random(100, 500);

    user.money += amount;
    user.lastWork = Date.now();

    addXP(user, 15);
    saveDatabase();

    return reply(message,
      `💼 Trabajaste y ganaste **$${formatMoney(amount)}**.\n` +
      `⭐ +15 XP`
    );
  }

  if (
    command === "treasure" ||
    command === "mine" ||
    command === "fish" ||
    command === "farm" ||
    command === "dig" ||
    command === "hunt"
  ) {

    const amount = random(50, 300);

    user.money += amount;
    addXP(user, 10);

    saveDatabase();

    const activities = {
      treasure: "🗺️ Encontraste un tesoro",
      mine: "⛏️ Minaste recursos",
      fish: "🎣 Fuiste a pescar",
      farm: "🌾 Trabajaste en la granja",
      dig: "🪓 Excavaste el terreno",
      hunt: "🔎 Realizaste una búsqueda"
    };

    return reply(message,
      `${activities[command]} y obtuviste **$${formatMoney(amount)}**.\n⭐ +10 XP`
    );
  }

  if (
    command === "dailyeco" ||
    command === "weeklyeco" ||
    command === "monthlyeco"
  ) {

    const times = {
      dailyeco: [86400000, 500],
      weeklyeco: [604800000, 3000],
      monthlyeco: [2592000000, 15000]
    };

    const [cooldown, reward] = times[command];

    const field = {
      dailyeco: "lastDaily",
      weeklyeco: "lastWeekly",
      monthlyeco: "lastMonthly"
    }[command];

    const remaining = cooldownRemaining(
      user[field],
      cooldown
    );

    if (remaining) {
      return reply(message,
        `⏳ Ya recibiste esta recompensa. Vuelve en **${formatTime(remaining)}**.`
      );
    }

    user[field] = Date.now();
    user.money += reward;

    saveDatabase();

    return reply(message,
      `🎁 Recibiste **$${formatMoney(reward)}**.`
    );
  }

  if (command === "inventory") {

    if (!user.inventory.length) {
      return reply(message, "🎒 Tu inventario está vacío.");
    }

    return reply(message,
      `🎒 **Inventario**\n\n` +
      user.inventory.map((x, i) => `${i + 1}. ${x}`).join("\n")
    );
  }

  if (command === "shop") {

    return reply(message,
      `🛒 **Tienda de Nexora**\n\n` +
      `📦 Caja — $500\n` +
      `💎 Cristal — $1,000\n` +
      `⭐ Insignia — $2,500\n\n` +
      `Usa \`n.buy caja\`, \`n.buy cristal\` o \`n.buy insignia\`.`
    );
  }

  if (command === "buy") {

    const item = args.join(" ").toLowerCase();

    const items = {
      caja: 500,
      cristal: 1000,
      insignia: 2500
    };

    if (!items[item]) {
      return reply(message,
        "❌ Artículo no válido. Usa `n.shop`."
      );
    }

    if (user.money < items[item]) {
      return reply(message, "❌ No tienes suficiente dinero.");
    }

    user.money -= items[item];
    user.inventory.push(item);

    saveDatabase();

    return reply(message,
      `🛒 Compraste **${item}** por **$${formatMoney(items[item])}**.`
    );
  }

  if (command === "sell") {

    if (!user.inventory.length) {
      return reply(message, "🎒 No tienes artículos.");
    }

    const item = args.join(" ").toLowerCase();

    const index = user.inventory.indexOf(item);

    if (index === -1) {
      return reply(message, "❌ No tienes ese artículo.");
    }

    user.inventory.splice(index, 1);

    const reward = 250;
    user.money += reward;

    saveDatabase();

    return reply(message,
      `💰 Vendiste **${item}** por **$${reward}**.`
    );
  }

  if (command === "rich") {

    const ranking = Object.entries(db.users)
      .sort((a, b) =>
        (b[1].money + b[1].bank) -
        (a[1].money + a[1].bank)
      )
      .slice(0, 10);

    if (!ranking.length) {
      return reply(message, "📊 No hay datos.");
    }

    const lines = [];

    for (let i = 0; i < ranking.length; i++) {

      const [id, data] = ranking[i];

      let username = "Usuario";

      try {
        const u = await client.users.fetch(id);
        username = u.username;
      } catch {}

      lines.push(
        `**${i + 1}.** ${username} — $${formatMoney(
          data.money + data.bank
        )}`
      );
    }

    return reply(message,
      `💰 **Usuarios con más patrimonio**\n\n${lines.join("\n")}`
    );
  }

  if (command === "economy" || command === "networth") {

    const total = Object.values(db.users)
      .reduce(
        (sum, u) => sum + (u.money || 0) + (u.bank || 0),
        0
      );

    return reply(message,
      `💰 **Economía Nexora**\n\n` +
      `👥 Usuarios registrados: **${Object.keys(db.users).length}**\n` +
      `💵 Dinero total: **$${formatMoney(total)}**`
    );
  }

  if (command === "lottery") {

    if (user.money < 100) {
      return reply(message,
        "❌ Necesitas $100 para participar."
      );
    }

    user.money -= 100;

    const win = Math.random() < 0.25;

    if (win) {
      user.money += 500;
      saveDatabase();

      return reply(message,
        "🎟️ ¡Ganaste la lotería! **+$500**"
      );
    }

    saveDatabase();

    return reply(message,
      "🎟️ No ganaste esta vez. Mejor suerte la próxima."
    );
  }

  if (command === "coinflip") {

    const result = Math.random() < 0.5
      ? "🪙 Cara"
      : "🪙 Cruz";

    return reply(message,
      `🪙 La moneda cayó en **${result}**.`
    );
  }

  if (command === "slots") {

    const symbols = ["🍒", "🍋", "⭐", "💎"];

    const a = symbols[random(0, 3)];
    const b = symbols[random(0, 3)];
    const c = symbols[random(0, 3)];

    let reward = 0;

    if (a === b && b === c) {
      reward = 1000;
    } else if (a === b || b === c || a === c) {
      reward = 250;
    }

    user.money += reward;

    saveDatabase();

    return reply(message,
      `🎰 ${a} | ${b} | ${c}\n\n` +
      `💰 Premio: **$${formatMoney(reward)}**`
    );
  }

  return false;
}

// ============================================================
// COMANDOS SOCIALES
// ============================================================

async function socialCommand(message, command, args) {

  const user = getUser(message.author.id);
  const target = getMember(message, args);

  if (
    command === "profile" ||
    command === "userinfo" ||
    command === "user"
  ) {

    const data = getUser(target.id);

    return reply(message, {
      embeds: [
        baseEmbed(
          `👤 Perfil de ${target.user.username}`,
          `💰 Dinero: **$${formatMoney(data.money)}**\n` +
          `🏦 Banco: **$${formatMoney(data.bank)}**\n` +
          `⭐ Nivel: **${data.level}**\n` +
          `✨ XP: **${data.xp}**\n` +
          `👍 Reputación: **${data.reputation}**\n` +
          `⚠️ Advertencias: **${data.warnings}**\n\n` +
          `📝 ${data.bio}`
        ).setThumbnail(target.user.displayAvatarURL({ size: 256 }))
      ]
    });
  }

  if (command === "avatar") {

    return reply(message, {
      embeds: [
        baseEmbed(
          `🖼️ Avatar de ${target.user.username}`,
          `[Abrir avatar](${target.user.displayAvatarURL({
            size: 1024
          })})`
        ).setImage(
          target.user.displayAvatarURL({ size: 1024 })
        )
      ]
    });
  }

  if (command === "banner") {

    const userData = await client.users.fetch(target.id, {
      force: true
    });

    if (!userData.banner) {
      return reply(message,
        "❌ Ese usuario no tiene banner."
      );
    }

    return reply(message, {
      embeds: [
        baseEmbed(
          `🎨 Banner de ${target.user.username}`
        ).setImage(
          userData.bannerURL({ size: 1024 })
        )
      ]
    });
  }

  if (
    command === "reputation" ||
    command === "socialrank"
  ) {

    return reply(message,
      `👍 **${target.user.username}** tiene **${getUser(target.id).reputation}** puntos de reputación.`
    );
  }

  if (command === "give-rep") {

    if (target.id === message.author.id) {
      return reply(message,
        "❌ No puedes darte reputación a ti mismo."
      );
    }

    const remaining = cooldownRemaining(
      user.lastRep,
      3600000
    );

    if (remaining) {
      return reply(message,
        `⏳ Puedes dar reputación nuevamente en **${formatTime(remaining)}**.`
      );
    }

    getUser(target.id).reputation++;
    user.lastRep = Date.now();

    saveDatabase();

    return reply(message,
      `👍 Diste reputación a ${target}.`
    );
  }

  if (command === "levelinfo") {

    const needed = user.level * 100;

    return reply(message,
      `⭐ **Nivel ${user.level}**\n\n` +
      `✨ XP: **${user.xp}/${needed}**`
    );
  }

  if (command === "badges") {

    if (!user.badges.length) {
      return reply(message,
        "🏅 Todavía no tienes insignias."
      );
    }

    return reply(message,
      `🏅 **Tus insignias**\n\n${user.badges.join("\n")}`
    );
  }

  if (command === "achievements") {

    return reply(message,
      `🏆 **Logros**\n\n` +
      `⭐ Nivel actual: ${user.level}\n` +
      `💰 Dinero: $${formatMoney(user.money)}\n` +
      `👍 Reputación: ${user.reputation}`
    );
  }

  if (command === "roles") {

    return reply(message,
      `🎭 **Roles de ${target.user.username}**\n\n` +
      (target.roles.cache
        .filter(r => r.id !== message.guild.id)
        .map(r => `• ${r.name}`)
        .join("\n") || "Sin roles")
    );
  }

  if (command === "permissions") {

    return reply(message,
      `🔐 **Permisos**\n\n` +
      target.permissions.toArray()
        .map(p => `• ${p}`)
        .join("\n")
    );
  }

  if (command === "joined") {

    return reply(message,
      `📅 ${target.user.username} entró al servidor el:\n` +
      `<t:${Math.floor(target.joinedTimestamp / 1000)}:F>`
    );
  }

  if (command === "nickname") {

    return reply(message,
      `🏷️ Apodo: **${target.nickname || "Sin apodo"}**`
    );
  }

  if (command === "setbio") {

    const bio = args.join(" ").slice(0, 200);

    if (!bio) {
      return reply(message,
        "❌ Usa `n.setbio tu texto`."
      );
    }

    user.bio = bio;

    saveDatabase();

    return reply(message,
      "📝 Biografía actualizada."
    );
  }

  if (command === "bio") {

    return reply(message,
      `📝 **Biografía de ${target.user.username}:**\n${getUser(target.id).bio}`
    );
  }

  if (command === "setstatus") {

    const status = args.join(" ").slice(0, 100);

    if (!status) {
      return reply(message,
        "❌ Usa `n.setstatus texto`."
      );
    }

    user.status = status;

    saveDatabase();

    return reply(message,
      "🟢 Estado actualizado."
    );
  }

  if (command === "status") {

    return reply(message,
      `🟢 Estado de ${target.user.username}: **${getUser(target.id).status}**`
    );
  }

  if (command === "friend") {

    if (target.id === message.author.id) {
      return reply(message, "❌ No puedes agregarte.");
    }

    if (!user.friends.includes(target.id)) {
      user.friends.push(target.id);
    }

    saveDatabase();

    return reply(message,
      `👥 ${target} fue añadido a tus amigos.`
    );
  }

  if (command === "unfriend") {

    user.friends = user.friends.filter(
      id => id !== target.id
    );

    saveDatabase();

    return reply(message,
      `👥 ${target} fue eliminado de tus amigos.`
    );
  }

  if (command === "friends") {

    if (!user.friends.length) {
      return reply(message,
        "👥 No tienes amigos registrados."
      );
    }

    const names = [];

    for (const id of user.friends) {
      try {
        const u = await client.users.fetch(id);
        names.push(`• ${u.username}`);
      } catch {}
    }

    return reply(message,
      `👥 **Tus amigos**\n\n${names.join("\n")}`
    );
  }

  if (command === "follow") {

    if (target.id === message.author.id) {
      return reply(message, "❌ No puedes seguirte.");
    }

    if (!user.following.includes(target.id)) {
      user.following.push(target.id);
    }

    const targetData = getUser(target.id);

    if (!targetData.followers.includes(message.author.id)) {
      targetData.followers.push(message.author.id);
    }

    saveDatabase();

    return reply(message,
      `👤 Ahora sigues a ${target}.`
    );
  }

  if (command === "followers") {

    return reply(message,
      `👥 **Seguidores:** ${user.followers.length}\n` +
      `➡️ **Siguiendo:** ${user.following.length}`
    );
  }

  if (command === "members") {

    return reply(message,
      `👥 Este servidor tiene **${message.guild.memberCount}** miembros.`
    );
  }

  if (
    command === "leaderboard" ||
    command === "top-level"
  ) {

    const ranking = Object.entries(db.users)
      .sort((a, b) =>
        (b[1].level || 0) -
        (a[1].level || 0)
      )
      .slice(0, 10);

    const lines = [];

    for (let i = 0; i < ranking.length; i++) {

      const [id, data] = ranking[i];

      let name = "Usuario";

      try {
        const u = await client.users.fetch(id);
        name = u.username;
      } catch {}

      lines.push(
        `**${i + 1}.** ${name} — Nivel ${data.level}`
      );
    }

    return reply(message,
      `🏆 **Clasificación**\n\n${lines.join("\n")}`
    );
  }

  if (command === "top-rep") {

    const ranking = Object.entries(db.users)
      .sort((a, b) =>
        (b[1].reputation || 0) -
        (a[1].reputation || 0)
      )
      .slice(0, 10);

    return reply(message,
      `👍 **Top reputación**\n\n` +
      ranking.map(
        ([id, data], i) =>
          `**${i + 1}.** <@${id}> — ${data.reputation}`
      ).join("\n")
    );
  }

  if (command === "social") {

    return reply(message,
      `👥 **Estadísticas sociales**\n\n` +
      `👤 Amigos: **${user.friends.length}**\n` +
      `👥 Seguidores: **${user.followers.length}**\n` +
      `➡️ Siguiendo: **${user.following.length}**\n` +
      `👍 Reputación: **${user.reputation}**`
    );
  }

  return false;
}

// ============================================================
// DIVERSIÓN
// ============================================================

async function funCommand(message, command, args) {

  if (command === "roll" || command === "dice") {

    const sides = Number(args[0]) || 6;

    if (sides < 2 || sides > 1000) {
      return reply(message,
        "❌ Usa un número entre 2 y 1000."
      );
    }

    return reply(message,
      `🎲 Salió **${random(1, sides)}** de ${sides}.`
    );
  }

  if (
    command === "flipcoin" ||
    command === "yesno"
  ) {

    const result = Math.random() < 0.5
      ? "Sí / Cara"
      : "No / Cruz";

    return reply(message,
      `🪙 **${result}**`
    );
  }

  if (command === "eightball") {

    const answers = [
      "🎱 Sí.",
      "🎱 No.",
      "🎱 Probablemente.",
      "🎱 No estoy seguro.",
      "🎱 Pregunta nuevamente.",
      "🎱 Todo apunta a que sí."
    ];

    return reply(message,
      answers[random(0, answers.length - 1)]
    );
  }

  if (command === "rps") {

    const choices = ["🪨 Piedra", "📄 Papel", "✂️ Tijera"];

    return reply(message,
      `🎮 Tú: **${choices[random(0, 2)]}**\n` +
      `🤖 Nexora: **${choices[random(0, 2)]}**`
    );
  }

  if (command === "choose") {

    const choices = args.join(" ")
      .split("|")
      .map(x => x.trim())
      .filter(Boolean);

    if (choices.length < 2) {
      return reply(message,
        "❌ Usa: `n.choose pizza | hamburguesa`"
      );
    }

    return reply(message,
      `🎯 Nexora eligió: **${
        choices[random(0, choices.length - 1)]
      }**`
    );
  }

  if (command === "random" || command === "number") {

    return reply(message,
      `🔢 Número aleatorio: **${random(1, 100)}**`
    );
  }

  if (command === "rate") {

    return reply(message,
      `⭐ Mi puntuación aleatoria es: **${random(1, 10)}/10**`
    );
  }

  if (command === "joke") {

    const jokes = [
      "😂 ¿Qué hace un bot cuando tiene sueño? Se pone en modo automático.",
      "😂 ¿Por qué el servidor fue al médico? Porque tenía demasiados bugs.",
      "😂 Un programador entra a un bar... pide 1, 10, 100 bebidas."
    ];

    return reply(message,
      jokes[random(0, jokes.length - 1)]
    );
  }

  if (command === "meme") {

    return reply(message,
      "😂 **MEME NEXORA**\n\n" +
      "Yo: solo voy a probar el bot.\n" +
      "También yo: llevo 4 horas configurándolo."
    );
  }

  if (command === "roast") {

    return reply(message,
      "🔥 Tu conexión con Nexora está bien... tu suerte no tanto 😂"
    );
  }

  if (command === "compliment") {

    return reply(message,
      "✨ Hoy tienes una energía increíble."
    );
  }

  if (command === "fact") {

    const facts = [
      "🌌 Un día en Venus dura más que su año.",
      "🐙 Los pulpos tienen tres corazones.",
      "🛰️ La luz del Sol tarda unos 8 minutos en llegar a la Tierra."
    ];

    return reply(message,
      facts[random(0, facts.length - 1)]
    );
  }

  if (command === "magic" || command === "fortune") {

    const answers = [
      "🔮 El futuro parece interesante.",
      "🔮 Algo inesperado podría ocurrir.",
      "🔮 La respuesta está más cerca de lo que parece.",
      "🔮 Las estrellas dicen que tengas paciencia."
    ];

    return reply(message,
      answers[random(0, answers.length - 1)]
    );
  }

  if (command === "fliptext" || command === "reverse") {

    const text = args.join(" ");

    if (!text) {
      return reply(message,
        "❌ Escribe un texto."
      );
    }

    return reply(message,
      text.split("").reverse().join("")
    );
  }

  if (command === "sayfun") {

    const text = args.join(" ");

    if (!text) {
      return reply(message,
        "❌ Escribe algo."
      );
    }

    return reply(message, text.slice(0, 1900));
  }

  if (command === "emoji") {

    const emojis = [
      "😀","😂","🔥","🌌","⭐","🎮","🚀","💎","🍕","🐱"
    ];

    return reply(message,
      emojis[random(0, emojis.length - 1)]
    );
  }

  if (command === "color") {

    const hex = Math.floor(
      Math.random() * 16777215
    ).toString(16).padStart(6, "0");

    return reply(message,
      `🎨 Color aleatorio: **#${hex}**`
    );
  }

  if (command === "animal") {

    const animals = [
      "🐱 Gato",
      "🐶 Perro",
      "🦊 Zorro",
      "🐼 Panda",
      "🐨 Koala",
      "🦁 León"
    ];

    return reply(message,
      animals[random(0, animals.length - 1)]
    );
  }

  if (command === "planet") {

    const planets = [
      "🌍 Tierra",
      "🌙 Luna",
      "🔴 Marte",
      "🪐 Saturno",
      "🔵 Neptuno",
      "🟠 Júpiter"
    ];

    return reply(message,
      planets[random(0, planets.length - 1)]
    );
  }

  if (command === "space") {

    return reply(message,
      "🌌 El espacio contiene miles de millones de galaxias."
    );
  }

  if (command === "challenge") {

    return reply(message,
      "🎯 Desafío: intenta escribir una frase sin usar la letra A."
    );
  }

  if (command === "trivia") {

    return reply(message,
      "🧠 **Trivia:** ¿Cuál es el planeta más grande del Sistema Solar?\n\n" +
      "A) Marte\nB) Júpiter\nC) Venus"
    );
  }

  if (command === "ascii") {

    const text = args.join(" ");

    if (!text) {
      return reply(message, "❌ Escribe un texto.");
    }

    return reply(message,
      `\`\`\`\n${text.slice(0, 1000)}\n\`\`\``
    );
  }

  if (command === "slotsfun") {

    const symbols = ["🍒", "⭐", "💎"];

    return reply(message,
      `🎰 ${symbols[random(0, 2)]} | ${symbols[random(0, 2)]} | ${symbols[random(0, 2)]}`
    );
  }

  return false;
}

// ============================================================
// RECOMPENSAS
// ============================================================

async function rewardsCommand(message, command, args) {

  const user = getUser(message.author.id);

  if (
    command === "daily" ||
    command === "weekly" ||
    command === "monthly"
  ) {

    const data = {
      daily: [86400000, 500],
      weekly: [604800000, 3000],
      monthly: [2592000000, 15000]
    };

    const [cooldown, amount] = data[command];

    const field =
      command === "daily"
        ? "lastDaily"
        : command === "weekly"
          ? "lastWeekly"
          : "lastMonthly";

    const remaining = cooldownRemaining(
      user[field],
      cooldown
    );

    if (remaining) {
      return reply(message,
        `⏳ Disponible en **${formatTime(remaining)}**.`
      );
    }

    user[field] = Date.now();
    user.money += amount;
    user.streak++;

    saveDatabase();

    return reply(message,
      `🎁 Recibiste **$${formatMoney(amount)}**.\n` +
      `🔥 Racha: **${user.streak}**`
    );
  }

  if (
    command === "streak" ||
    command === "streakinfo"
  ) {

    return reply(message,
      `🔥 Tu racha actual es **${user.streak}** días.`
    );
  }

  if (
    command === "reward" ||
    command === "rewardinfo"
  ) {

    return reply(message,
      `🎁 **Recompensas Nexora**\n\n` +
      `☀️ Daily — $500\n` +
      `📅 Weekly — $3,000\n` +
      `🗓️ Monthly — $15,000`
    );
  }

  if (
    command === "claim" ||
    command === "bonus" ||
    command === "giftbox" ||
    command === "chest" ||
    command === "treasure-reward" ||
    command === "lucky" ||
    command === "scratch"
  ) {

    const amount = random(100, 1000);

    user.money += amount;

    saveDatabase();

    return reply(message,
      `🎁 Encontraste una recompensa de **$${formatMoney(amount)}**.`
    );
  }

  if (
    command === "spin" ||
    command === "wheel"
  ) {

    const prizes = [
      100,
      250,
      500,
      1000,
      2000
    ];

    const prize = prizes[random(0, prizes.length - 1)];

    user.money += prize;

    saveDatabase();

    return reply(message,
      `🎡 La rueda se detuvo en **$${formatMoney(prize)}**.`
    );
  }

  if (
    command === "quest" ||
    command === "quests" ||
    command === "mission" ||
    command === "missions"
  ) {

    return reply(message,
      `📜 **Misiones Nexora**\n\n` +
      `1. 💬 Usa 5 comandos — +100 XP\n` +
      `2. 💰 Consigue $1,000 — +250 XP\n` +
      `3. ⭐ Alcanza nivel 5 — +500 XP`
    );
  }

  if (
    command === "xpboost" ||
    command === "moneyboost"
  ) {

    if (command === "xpboost") {
      addXP(user, 100);
      saveDatabase();

      return reply(message,
        "✨ ¡Recibiste **100 XP**!"
      );
    }

    user.money += 500;

    saveDatabase();

    return reply(message,
      "💰 ¡Recibiste **$500**!"
    );
  }

  if (command === "luck") {

    user.luck++;

    saveDatabase();

    return reply(message,
      `🍀 Suerte actual: **${user.luck}**`
    );
  }

  if (
    command === "prize" ||
    command === "prizes"
  ) {

    return reply(message,
      "🏆 Premios disponibles: $100, $250, $500, $1,000 y $2,000."
    );
  }

  if (
    command === "event" ||
    command === "events"
  ) {

    return reply(message,
      "🎉 **Evento actual:** Bonificación Nexora activa."
    );
  }

  if (command === "calendar") {

    return reply(message,
      "📅 Revisa `n.daily`, `n.weekly` y `n.monthly` para tus recompensas."
    );
  }

  if (command === "checkin") {

    const remaining = cooldownRemaining(
      user.lastCheckin,
      86400000
    );

    if (remaining) {
      return reply(message,
        `⏳ Ya hiciste check-in. Disponible en ${formatTime(remaining)}.`
      );
    }

    user.lastCheckin = Date.now();
    user.money += 250;

    saveDatabase();

    return reply(message,
      "📅 Check-in completado. **+$250**"
    );
  }

  if (command === "redeem") {

    const code = args[0];

    if (!code) {
      return reply(message,
        "❌ Usa `n.redeem código`."
      );
    }

    return reply(message,
      `🎟️ Código **${code}** procesado.`
    );
  }

  return false;
}

// ============================================================
// MODERACIÓN
// ============================================================

async function moderationCommand(message, command, args) {

  if (!isAdmin(message.member) &&
      !hasPermission(
        message.member,
        PermissionsBitField.Flags.ManageGuild
      )) {

    return reply(message,
      "❌ Necesitas permisos de moderación."
    );
  }

  const target = message.mentions.members.first();

  if (command === "kick") {

    if (!target) {
      return reply(message,
        "❌ Menciona al usuario."
      );
    }

    if (!target.kickable) {
      return reply(message,
        "❌ No puedo expulsar a ese usuario."
      );
    }

    await target.kick(
      `Moderación de ${message.author.tag}`
    );

    return reply(message,
      `👢 ${target.user.tag} fue expulsado.`
    );
  }

  if (command === "ban") {

    if (!target) {
      return reply(message,
        "❌ Menciona al usuario."
      );
    }

    if (!target.bannable) {
      return reply(message,
        "❌ No puedo banear a ese usuario."
      );
    }

    await target.ban({
      reason: `Moderación de ${message.author.tag}`
    });

    return reply(message,
      `🔨 ${target.user.tag} fue baneado.`
    );
  }

  if (command === "unban") {

    const id = args[0];

    if (!id) {
      return reply(message,
        "❌ Usa `n.unban ID`."
      );
    }

    try {
      await message.guild.members.unban(id);

      return reply(message,
        `✅ Usuario ${id} desbaneado.`
      );
    } catch {
      return reply(message,
        "❌ No se pudo desbanear ese usuario."
      );
    }
  }

  if (
    command === "timeout" ||
    command === "mute"
  ) {

    if (!target) {
      return reply(message,
        "❌ Menciona al usuario."
      );
    }

    if (!target.moderatable) {
      return reply(message,
        "❌ No puedo moderar a ese usuario."
      );
    }

    const minutes = Number(args[1] || args[0]) || 10;

    await target.timeout(
      minutes * 60 * 1000,
      `Moderación de ${message.author.tag}`
    );

    return reply(message,
      `🔇 ${target.user.tag} recibió timeout de ${minutes} minutos.`
    );
  }

  if (command === "untimeout" ||
      command === "unmute") {

    if (!target) {
      return reply(message,
        "❌ Menciona al usuario."
      );
    }

    await target.timeout(null);

    return reply(message,
      `🔊 Se quitó el timeout a ${target.user.tag}.`
    );
  }

  if (
    command === "clear" ||
    command === "purge"
  ) {

    const amount = Number(args[0]);

    if (!amount || amount < 1 || amount > 100) {
      return reply(message,
        "❌ Usa una cantidad entre 1 y 100."
      );
    }

    const deleted = await message.channel.bulkDelete(
      amount,
      true
    );

    const msg = await reply(message,
      `🧹 Eliminados **${deleted.size}** mensajes.`
    );

    if (msg) {
      setTimeout(() => {
        msg.delete().catch(() => {});
      }, 3000);
    }

    return;
  }

  if (
    command === "warn" ||
    command === "warnings"
  ) {

    if (!target) {
      return reply(message,
        "❌ Menciona al usuario."
      );
    }

    const data = getUser(target.id);

    if (command === "warnings") {
      return reply(message,
        `⚠️ ${target.user.tag} tiene **${data.warnings}** advertencias.`
      );
    }

    data.warnings++;

    saveDatabase();

    return reply(message,
      `⚠️ ${target.user.tag} recibió una advertencia.\n` +
      `Total: **${data.warnings}**`
    );
  }

  if (command === "unwarn") {

    if (!target) {
      return reply(message,
        "❌ Menciona al usuario."
      );
    }

    const data = getUser(target.id);

    data.warnings = Math.max(
      0,
      data.warnings - 1
    );

    saveDatabase();

    return reply(message,
      `✅ Advertencia eliminada. Total: **${data.warnings}**`
    );
  }

  if (command === "clearwarns") {

    if (!target) {
      return reply(message,
        "❌ Menciona al usuario."
      );
    }

    getUser(target.id).warnings = 0;

    saveDatabase();

    return reply(message,
      "🧹 Advertencias eliminadas."
    );
  }

  if (command === "lock") {

    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      {
        SendMessages: false
      }
    );

    return reply(message,
      "🔒 Canal bloqueado."
    );
  }

  if (command === "unlock") {

    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      {
        SendMessages: null
      }
    );

    return reply(message,
      "🔓 Canal desbloqueado."
    );
  }

  if (command === "slowmode") {

    const seconds = Number(args[0]) || 5;

    if (seconds < 0 || seconds > 21600) {
      return reply(message,
        "❌ El valor debe estar entre 0 y 21600."
      );
    }

    await message.channel.setRateLimitPerUser(seconds);

    return reply(message,
      `🐢 Slowmode configurado a **${seconds}s**.`
    );
  }

  if (command === "unslowmode") {

    await message.channel.setRateLimitPerUser(0);

    return reply(message,
      "🐇 Slowmode desactivado."
    );
  }

  if (command === "nick") {

    if (!target) {
      return reply(message,
        "❌ Menciona al usuario."
      );
    }

    const nickname = args
      .slice(1)
      .join(" ")
      .slice(0, 32);

    if (!nickname) {
      return reply(message,
        "❌ Escribe el nuevo apodo."
      );
    }

    await target.setNickname(nickname);

    return reply(message,
      `🏷️ Apodo cambiado a **${nickname}**.`
    );
  }

  if (command === "resetnick") {

    if (!target) {
      return reply(message,
        "❌ Menciona al usuario."
      );
    }

    await target.setNickname(null);

    return reply(message,
      "🏷️ Apodo restablecido."
    );
  }

  if (
    command === "addrole" ||
    command === "removerole"
  ) {

    if (!target) {
      return reply(message,
        "❌ Menciona al usuario."
      );
    }

    const role =
      message.mentions.roles.first() ||
      message.guild.roles.cache.get(args[1] || args[0]);

    if (!role) {
      return reply(message,
        "❌ Menciona un rol."
      );
    }

    if (command === "addrole") {
      await target.roles.add(role);

      return reply(message,
        `✅ Rol **${role.name}** añadido.`
      );
    }

    await target.roles.remove(role);

    return reply(message,
      `✅ Rol **${role.name}** eliminado.`
    );
  }

  if (command === "announce") {

    const text = args.join(" ");

    if (!text) {
      return reply(message,
        "❌ Escribe el anuncio."
      );
    }

    return reply(message, {
      embeds: [
        baseEmbed(
          "📢 ANUNCIO",
          text
        ).setAuthor({
          name: message.guild.name,
          iconURL: message.guild.iconURL() || undefined
        })
      ]
    });
  }

  if (
    command === "embed" ||
    command === "saymod"
  ) {

    const text = args.join(" ");

    if (!text) {
      return reply(message,
        "❌ Escribe el texto."
      );
    }

    return reply(message, {
      embeds: [
        baseEmbed(
          "🌌 Nexora",
          text
        )
      ]
    });
  }

  if (command === "channelinfo") {

    return reply(message, {
      embeds: [
        baseEmbed(
          `📺 ${message.channel.name}`,
          `🆔 ${message.channel.id}\n` +
          `📌 Tipo: ${message.channel.type}\n` +
          `👥 Servidor: ${message.guild.name}`
        )
      ]
    });
  }

  if (command === "roleinfo") {

    const role = message.mentions.roles.first();

    if (!role) {
      return reply(message,
        "❌ Menciona un rol."
      );
    }

    return reply(message,
      `🎭 **${role.name}**\n` +
      `🆔 ${role.id}\n` +
      `👥 ${role.members.size} miembros`
    );
  }

  if (command === "staff") {

    const staff = message.guild.members.cache
      .filter(m =>
        m.permissions.has(
          PermissionsBitField.Flags.ManageGuild
        )
      );

    return reply(message,
      `🛡️ **Staff:** ${staff.size}`
    );
  }

  if (command === "modhelp") {

    return reply(message,
      "🛡️ `n.kick` `n.ban` `n.timeout` `n.clear` `n.warn` `n.lock` `n.unlock` `n.slowmode`"
    );
  }

  if (command === "servermodinfo") {

    return reply(message,
      `🛡️ **Moderación**\n\n` +
      `👥 Miembros: ${message.guild.memberCount}\n` +
      `🔐 Administradores: ${
        message.guild.members.cache.filter(
          m => isAdmin(m)
        ).size
      }`
    );
  }

  if (command === "modlogs") {

    const guild = getGuild(message.guild.id);

    return reply(message,
      `📜 Logs configurados: ${
        guild.logChannel
          ? `<#${guild.logChannel}>`
          : "No configurado"
      }`
    );
  }

  return false;
}

// ============================================================
// CONFIGURACIÓN
// ============================================================

async function configCommand(message, command, args) {

  if (!isAdmin(message.member)) {
    return reply(message,
      "❌ Necesitas permiso de Administrador."
    );
  }

  const guild = getGuild(message.guild.id);

  if (command === "config" ||
      command === "settings" ||
      command === "serverconfig") {

    return reply(message,
      `⚙️ **Configuración Nexora**\n\n` +
      `🔤 Prefijo: **${guild.prefix}**\n` +
      `👋 Bienvenida: ${guild.welcomeChannel ? `<#${guild.welcomeChannel}>` : "No configurada"}\n` +
      `📜 Logs: ${guild.logChannel ? `<#${guild.logChannel}>` : "No configurados"}\n` +
      `🛡️ Rol mod: ${guild.modRole ? `<@&${guild.modRole}>` : "No configurado"}\n` +
      `🎭 AutoRole: ${guild.autoRole ? `<@&${guild.autoRole}>` : "No configurado"}\n` +
      `🔗 AntiLink: ${guild.antiLink ? "ON" : "OFF"}\n` +
      `🤖 AutoMod: ${guild.autoMod ? "ON" : "OFF"}`
    );
  }

  if (command === "prefix") {

    return reply(message,
      `🔤 El prefijo actual es **${guild.prefix}**`
    );
  }

  if (
    command === "setwelcome" ||
    command === "welcome"
  ) {

    const channel =
      message.mentions.channels.first() ||
      message.guild.channels.cache.get(args[0]);

    if (!channel) {
      return reply(message,
        "❌ Menciona un canal."
      );
    }

    guild.welcomeChannel = channel.id;

    saveDatabase();

    return reply(message,
      `👋 Canal de bienvenida: ${channel}`
    );
  }

  if (
    command === "setlog" ||
    command === "log"
  ) {

    const channel =
      message.mentions.channels.first() ||
      message.guild.channels.cache.get(args[0]);

    if (!channel) {
      return reply(message,
        "❌ Menciona un canal."
      );
    }

    guild.logChannel = channel.id;

    saveDatabase();

    return reply(message,
      `📜 Canal de logs: ${channel}`
    );
  }

  if (
    command === "setmodrole" ||
    command === "modrole"
  ) {

    const role =
      message.mentions.roles.first() ||
      message.guild.roles.cache.get(args[0]);

    if (!role) {
      return reply(message,
        "❌ Menciona un rol."
      );
    }

    guild.modRole = role.id;

    saveDatabase();

    return reply(message,
      `🛡️ Rol de moderación: ${role}`
    );
  }

  if (
    command === "setautorole" ||
    command === "autorole"
  ) {

    const role =
      message.mentions.roles.first() ||
      message.guild.roles.cache.get(args[0]);

    if (!role) {
      return reply(message,
        "❌ Menciona un rol."
      );
    }

    guild.autoRole = role.id;

    saveDatabase();

    return reply(message,
      `🎭 AutoRole configurado: ${role}`
    );
  }

  const toggles = {
    antispam: "antiSpam",
    antilink: "antiLink",
    automod: "autoMod",
    filter: "filter",
    economyconfig: "economy",
    socialconfig: "social",
    rewardconfig: "rewards",
    levelconfig: "levels"
  };

  if (toggles[command]) {

    const field = toggles[command];

    guild[field] = !guild[field];

    saveDatabase();

    return reply(message,
      `⚙️ **${field}**: ${
        guild[field] ? "🟢 ACTIVADO" : "🔴 DESACTIVADO"
      }`
    );
  }

  if (command === "language") {

    guild.language = args[0] || "es";

    saveDatabase();

    return reply(message,
      `🌐 Idioma configurado: **${guild.language}**`
    );
  }

  if (command === "timezone") {

    guild.timezone = args[0] || "Europe/Amsterdam";

    saveDatabase();

    return reply(message,
      `🕐 Zona horaria: **${guild.timezone}**`
    );
  }

  if (command === "welcomeconfig") {

    return reply(message,
      `👋 Bienvenida: ${
        guild.welcomeChannel
          ? `<#${guild.welcomeChannel}>`
          : "No configurada"
      }`
    );
  }

  if (command === "logconfig") {

    return reply(message,
      `📜 Logs: ${
        guild.logChannel
          ? `<#${guild.logChannel}>`
          : "No configurados"
      }`
    );
  }

  if (command === "botconfig") {

    return reply(message,
      "🤖 Nexora está funcionando correctamente."
    );
  }

  if (command === "channels") {

    return reply(message,
      `📺 **Canales configurados**\n\n` +
      `👋 Bienvenida: ${
        guild.welcomeChannel
          ? `<#${guild.welcomeChannel}>`
          : "Ninguno"
      }\n` +
      `📜 Logs: ${
        guild.logChannel
          ? `<#${guild.logChannel}>`
          : "Ninguno"
      }`
    );
  }

  if (command === "roles") {

    return reply(message,
      `🎭 **Roles configurados**\n\n` +
      `🛡️ Mod: ${
        guild.modRole
          ? `<@&${guild.modRole}>`
          : "Ninguno"
      }\n` +
      `🎭 AutoRole: ${
        guild.autoRole
          ? `<@&${guild.autoRole}>`
          : "Ninguno"
      }`
    );
  }

  if (command === "resetconfig") {

    db.guilds[message.guild.id] = {
      prefix: PREFIX,
      welcomeChannel: null,
      logChannel: null,
      modRole: null,
      autoRole: null,
      antiSpam: false,
      antiLink: false,
      autoMod: false,
      filter: false,
      language: "es",
      timezone: "Europe/Amsterdam",
      economy: true,
      social: true,
      rewards: true,
      levels: true,
      commandToggles: {}
    };

    saveDatabase();

    return reply(message,
      "♻️ Configuración restablecida."
    );
  }

  if (command === "togglecommands") {

    const cmd = args[0];

    if (!cmd) {
      return reply(message,
        "❌ Usa `n.togglecommands comando`."
      );
    }

    guild.commandToggles[cmd] =
      guild.commandToggles[cmd] === false;

    saveDatabase();

    return reply(message,
      `🔧 \`${cmd}\` está ${
        guild.commandToggles[cmd]
          ? "🟢 activado"
          : "🔴 desactivado"
      }.`
    );
  }

  if (command === "permissions") {

    return reply(message,
      "🔐 La configuración de permisos se controla mediante los permisos de Discord."
    );
  }

  return false;
}

// ============================================================
// INFORMACIÓN
// ============================================================

async function infoCommand(message, command, args) {

  if (
    command === "help" ||
    command === "menu"
  ) {
    return commandHelp(message);
  }

  if (
    command === "about" ||
    command === "botinfo" ||
    command === "nexora"
  ) {

    return reply(message, {
      embeds: [
        baseEmbed(
          "🌌 NEXORA",
          "🤖 Bot multifunción para Discord.\n\n" +
          "💰 Economía\n" +
          "👥 Sistema social\n" +
          "🎮 Diversión\n" +
          "🎁 Recompensas\n" +
          "🛡️ Moderación\n" +
          "⚙️ Configuración"
        )
      ]
    });
  }

  if (
    command === "ping" ||
    command === "latency"
  ) {

    return reply(message,
      `🏓 Pong!\n` +
      `📡 API: **${client.ws.ping}ms**`
    );
  }

  if (command === "uptime") {

    return reply(message,
      `⏱️ Nexora lleva activo **${formatTime(
        Math.floor(process.uptime())
      )}**.`
    );
  }

  if (
    command === "serverinfo" ||
    command === "server"
  ) {

    return reply(message, {
      embeds: [
        baseEmbed(
          `🏠 ${message.guild.name}`,
          `👥 Miembros: **${message.guild.memberCount}**\n` +
          `📺 Canales: **${message.guild.channels.cache.size}**\n` +
          `🎭 Roles: **${message.guild.roles.cache.size}**\n` +
          `🆔 ${message.guild.id}`
        ).setThumbnail(
          message.guild.iconURL({ size: 256 }) || null
        )
      ]
    });
  }

  if (command === "channelinfo") {

    return reply(message,
      `📺 **${message.channel.name}**\n` +
      `🆔 ${message.channel.id}`
    );
  }

  if (command === "userinfo") {

    const target = getMember(message, args);

    return reply(message,
      `👤 **${target.user.username}**\n` +
      `🆔 ${target.id}\n` +
      `📅 Cuenta: <t:${Math.floor(
        target.user.createdTimestamp / 1000
      )}:D>`
    );
  }

  if (
    command === "avatarinfo" ||
    command === "servericon"
  ) {

    const url =
      command === "servericon"
        ? message.guild.iconURL({ size: 1024 })
        : message.author.displayAvatarURL({ size: 1024 });

    if (!url) {
      return reply(message,
        "❌ No hay imagen disponible."
      );
    }

    return reply(message, {
      embeds: [
        baseEmbed("🖼️ Imagen").setImage(url)
      ]
    });
  }

  if (command === "bannerinfo" ||
      command === "serverbanner") {

    if (command === "serverbanner") {

      const banner = message.guild.bannerURL({
        size: 1024
      });

      if (!banner) {
        return reply(message,
          "❌ El servidor no tiene banner."
        );
      }

      return reply(message, {
        embeds: [
          baseEmbed("🎨 Banner").setImage(banner)
        ]
      });
    }

    const u = await client.users.fetch(
      message.author.id,
      { force: true }
    );

    if (!u.banner) {
      return reply(message,
        "❌ No tienes banner."
      );
    }

    return reply(message, {
      embeds: [
        baseEmbed("🎨 Banner").setImage(
          u.bannerURL({ size: 1024 })
        )
      ]
    });
  }

  if (command === "membercount") {

    return reply(message,
      `👥 Miembros: **${message.guild.memberCount}**`
    );
  }

  if (command === "invite") {

    return reply(message,
      "🔗 Para invitar a Nexora utiliza el enlace de invitación generado desde el Discord Developer Portal."
    );
  }

  if (command === "support") {

    return reply(message,
      "🛠️ Usa este servidor para configurar y administrar Nexora."
    );
  }

  if (command === "website") {

    return reply(message,
      "🌐 Sitio web: próximamente."
    );
  }

  if (command === "version") {

    return reply(message,
      "🌌 Nexora v1.0.0\n📦 discord.js v14"
    );
  }

  if (command === "commands") {

    const total = Object.values(CATEGORIES)
      .reduce(
        (sum, category) =>
          sum + category.commands.length,
        0
      );

    return reply(message,
      `📚 Nexora tiene **${total} comandos listados**.`
    );
  }

  if (command === "categories") {

    return reply(message,
      Object.values(CATEGORIES)
        .map(c => c.name)
        .join("\n")
    );
  }

  if (command === "status") {

    return reply(message,
      `🟢 Estado: **Online**\n` +
      `🏓 Ping: **${client.ws.ping}ms**`
    );
  }

  if (command === "system") {

    return reply(message,
      `💻 Node.js: **${process.version}**\n` +
      `🤖 discord.js: **v14**\n` +
      `⏱️ Uptime: **${formatTime(
        Math.floor(process.uptime())
      )}**`
    );
  }

  if (command === "library") {

    return reply(message,
      "📦 Biblioteca: **discord.js v14**"
    );
  }

  if (command === "creator") {

    return reply(message,
      "👑 Nexora está configurado para este servidor."
    );
  }

  if (command === "credits") {

    return reply(message,
      "🌌 **Nexora**\n\n" +
      "🤖 Discord bot\n" +
      "📦 discord.js v14"
    );
  }

  if (command === "stats") {

    let totalMoney = 0;

    for (const user of Object.values(db.users)) {
      totalMoney +=
        (user.money || 0) +
        (user.bank || 0);
    }

    return reply(message,
      `📊 **Estadísticas Nexora**\n\n` +
      `👥 Usuarios registrados: **${Object.keys(db.users).length}**\n` +
      `🏠 Servidores: **${client.guilds.cache.size}**\n` +
      `💰 Economía: **$${formatMoney(totalMoney)}**\n` +
      `⚡ Ping: **${client.ws.ping}ms**`
    );
  }

  if (command === "commandinfo") {

    const name = args[0]?.toLowerCase();

    if (!name) {
      return reply(message,
        "❌ Usa `n.commandinfo comando`."
      );
    }

    for (const category of Object.values(CATEGORIES)) {

      const found = category.commands.find(
        c => c[0] === name
      );

      if (found) {
        return reply(message,
          `🌌 **n.${found[0]}**\n\n` +
          `📂 ${category.name}\n` +
          `📝 ${found[1]}`
        );
      }
    }

    return reply(message,
      "❌ Ese comando no existe."
    );
  }

  return false;
}

// ============================================================
// MAPA DE CATEGORÍAS
// ============================================================

function getCategoryForCommand(command) {

  for (const [id, category] of Object.entries(CATEGORIES)) {

    if (
      category.commands.some(
        item => item[0] === command
      )
    ) {
      return id;
    }
  }

  return null;
}

// ============================================================
// MENSAJES
// ============================================================

client.on(Events.MessageCreate, async message => {

  try {

    if (message.author.bot) return;
    if (!message.guild) return;

    const guildData = getGuild(message.guild.id);

    const prefix = guildData.prefix || PREFIX;

    if (!message.content.toLowerCase().startsWith(prefix)) {
      return;
    }

    const content = message.content.slice(prefix.length).trim();

    if (!content) return;

    const args = content.split(/\s+/);
    const command = args.shift().toLowerCase();

    commandUsed(message.guild.id);

    // --------------------------------------------------------
    // AYUDA
    // --------------------------------------------------------

    if (
      command === "help" ||
      command === "menu"
    ) {
      return commandHelp(message);
    }

    // --------------------------------------------------------
    // COMANDO DESACTIVADO
    // --------------------------------------------------------

    if (
      guildData.commandToggles &&
      guildData.commandToggles[command] === false
    ) {

      return reply(message,
        "🔴 Este comando está desactivado en este servidor."
      );
    }

    // --------------------------------------------------------
    // ECONOMÍA
    // --------------------------------------------------------

    if (
      await economyCommand(
        message,
        command,
        args
      )
    ) return;

    // --------------------------------------------------------
    // SOCIAL
    // --------------------------------------------------------

    if (
      await socialCommand(
        message,
        command,
        args
      )
    ) return;

    // --------------------------------------------------------
    // DIVERSIÓN
    // --------------------------------------------------------

    if (
      await funCommand(
        message,
        command,
        args
      )
    ) return;

    // --------------------------------------------------------
    // RECOMPENSAS
    // --------------------------------------------------------

    if (
      await rewardsCommand(
        message,
        command,
        args
      )
    ) return;

    // --------------------------------------------------------
    // MODERACIÓN
    // --------------------------------------------------------

    if (
      await moderationCommand(
        message,
        command,
        args
      )
    ) return;

    // --------------------------------------------------------
    // CONFIGURACIÓN
    // --------------------------------------------------------

    if (
      await configCommand(
        message,
        command,
        args
      )
    ) return;

    // --------------------------------------------------------
    // INFORMACIÓN
    // --------------------------------------------------------

    if (
      await infoCommand(
        message,
        command,
        args
      )
    ) return;

    // --------------------------------------------------------
    // DESCONOCIDO
    // --------------------------------------------------------

    return reply(message,
      `❌ No existe el comando \`${prefix}${command}\`.\n` +
      `💡 Usa \`${prefix}help\` para abrir el menú.`
    );

  } catch (error) {

    console.error(
      "❌ ERROR EN MESSAGECREATE:",
      error
    );

    return reply(
      message,
      "❌ Ocurrió un error ejecutando ese comando."
    ).catch(() => {});
  }
});

// ============================================================
// BIENVENIDAS
// ============================================================

client.on(
  Events.GuildMemberAdd,
  async member => {

    try {

      const guild = getGuild(member.guild.id);

      if (!guild.welcomeChannel) return;

      const channel =
        member.guild.channels.cache.get(
          guild.welcomeChannel
        );

      if (!channel) return;

      await channel.send(
        `🌌 ¡Bienvenido/a ${member} a **${member.guild.name}**!\n` +
        `💜 Disfruta de tu estancia en el servidor.`
      );

      if (guild.autoRole) {

        const role =
          member.guild.roles.cache.get(
            guild.autoRole
          );

        if (role) {
          await member.roles.add(role).catch(() => {});
        }
      }

    } catch (error) {
      console.error(
        "❌ Error en bienvenida:",
        error
      );
    }
  }
);

// ============================================================
// READY
// ============================================================

client.once(Events.ClientReady, readyClient => {

  console.log("==========================================");
  console.log("🌌 NEXORA ONLINE");
  console.log(`🤖 Usuario: ${readyClient.user.tag}`);
  console.log(`🏠 Servidores: ${readyClient.guilds.cache.size}`);
  console.log(`📚 Prefijo: ${PREFIX}`);
  console.log("==========================================");

  readyClient.user.setPresence({
    activities: [
      {
        name: `${PREFIX}help • 🌌 Nexora`,
        type: 0
      }
    ],
    status: "online"
  });
});

// ============================================================
// SERVIDOR HTTP PARA RENDER
// ============================================================

const server = http.createServer(
  (req, res) => {

    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8"
    });

    res.end("🌌 Nexora está online.");
  }
);

server.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `🌐 Servidor HTTP escuchando en puerto ${PORT}`
    );
  }
);

// ============================================================
// LOGIN
// ============================================================

client.login(TOKEN).catch(error => {

  console.error(
    "❌ No se pudo iniciar sesión en Discord."
  );

  console.error(error);
});
