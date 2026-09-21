// ============================================================
// 🌌 NEXORA — DISCORD BOT
// ============================================================
// Prefix: n.
// Discord.js v14
// Proyecto independiente: NEXORA
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
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "nexora-data.json");

// ============================================================
// 🌐 SERVIDOR PARA RENDER
// ============================================================

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8"
  });

  res.end("🌌 NEXORA ONLINE");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Servidor HTTP activo en puerto ${PORT}`);
});

// ============================================================
// 🤖 CLIENTE
// ============================================================

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

let database = {
  users: {},
  guilds: {}
};

function loadDatabase() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const saved = JSON.parse(
        fs.readFileSync(DATA_FILE, "utf8")
      );

      database = {
        users: saved.users || {},
        guilds: saved.guilds || {}
      };
    }
  } catch (error) {
    console.error("❌ Error cargando datos:", error);
  }
}

function saveDatabase() {
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(database, null, 2),
      "utf8"
    );
  } catch (error) {
    console.error("❌ Error guardando datos:", error);
  }
}

loadDatabase();

// ============================================================
// 👤 DATOS DE USUARIO
// ============================================================

function getUser(userId) {
  if (!database.users[userId]) {
    database.users[userId] = {
      money: 1000,
      bank: 0,
      level: 1,
      xp: 0,
      reputation: 0,
      warnings: 0,
      inventory: [],
      badges: [],
      lastDaily: 0,
      lastWork: 0,
      lastRep: 0
    };

    saveDatabase();
  }

  return database.users[userId];
}

// ============================================================
// 🏠 DATOS DE SERVIDOR
// ============================================================

function getGuild(guildId) {
  if (!database.guilds[guildId]) {
    database.guilds[guildId] = {
      prefix: PREFIX,
      welcomeChannel: null,
      logChannel: null,
      modRole: null
    };

    saveDatabase();
  }

  return database.guilds[guildId];
}

// ============================================================
// 🎨 COLORES
// ============================================================

const COLORS = {
  galaxy: 0x6C5CE7,
  space: 0x15152B,
  blue: 0x3498DB,
  cyan: 0x00CEC9,
  green: 0x2ECC71,
  gold: 0xF1C40F,
  purple: 0x9B59B6,
  red: 0xE74C3C,
  orange: 0xE67E22
};

// ============================================================
// 🌌 DECORACIÓN
// ============================================================

const GALAXY = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

// ============================================================
// 🧩 UTILIDADES
// ============================================================

function embed(title, description, color = COLORS.galaxy) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setFooter({
      text: "🌌 Nexora • Explora el universo"
    })
    .setTimestamp();
}

function userData(user) {
  return getUser(user.id);
}

function isAdmin(member) {
  return member.permissions.has(
    PermissionsBitField.Flags.Administrator
  );
}

function formatMoney(number) {
  return `$${Number(number || 0).toLocaleString()}`;
}

function random(min, max) {
  return Math.floor(
    Math.random() * (max - min + 1)
  ) + min;
}

function addXP(userId, amount) {
  const user = getUser(userId);

  user.xp += amount;

  const needed = user.level * 100;

  if (user.xp >= needed) {
    user.xp -= needed;
    user.level++;

    saveDatabase();

    return true;
  }

  saveDatabase();
  return false;
}

// ============================================================
// 📚 COMANDOS DE CADA MENÚ
// ============================================================

const COMMANDS = {

  economia: [
    ["balance", "💰", "Ver tu dinero"],
    ["bank", "🏦", "Ver tu banco"],
    ["deposit", "📥", "Depositar dinero"],
    ["withdraw", "📤", "Retirar dinero"],
    ["pay", "💸", "Pagar a otro usuario"],
    ["work", "💼", "Trabajar por dinero"],
    ["salary", "💵", "Cobrar salario"],
    ["shop", "🏪", "Ver la tienda"],
    ["buy", "🛒", "Comprar un objeto"],
    ["sell", "💱", "Vender un objeto"],
    ["inventory", "🎒", "Ver inventario"],
    ["wallet", "👛", "Ver cartera"],
    ["rich", "💎", "Ver usuarios con dinero"],
    ["economy", "📊", "Ver economía"],
    ["cash", "💵", "Ver efectivo"],
    ["give", "🎁", "Dar dinero"],
    ["steal", "🕵️", "Intentar robar"],
    ["rob", "💰", "Intentar conseguir dinero"],
    ["crime", "🚨", "Realizar un crimen ficticio"],
    ["lottery", "🎟️", "Participar en lotería"],
    ["coin", "🪙", "Lanzar moneda"],
    ["coinflip", "🪙", "Cara o cruz"],
    ["depositall", "🏦", "Depositar todo"],
    ["withdrawall", "💳", "Retirar todo"],
    ["resetmoney", "🔄", "Revisar economía"],
    ["tip", "💸", "Dar propina"],
    ["gift", "🎁", "Regalar dinero"],
    ["treasure", "🧰", "Buscar tesoro"],
    ["mine", "⛏️", "Minar recursos"],
    ["fish", "🎣", "Pescar"]
  ],

  social: [
    ["profile", "👤", "Ver perfil"],
    ["perfil", "👤", "Ver perfil"],
    ["rank", "📊", "Ver nivel"],
    ["level", "⭐", "Ver nivel"],
    ["rep", "🌟", "Dar reputación"],
    ["reputation", "🌟", "Ver reputación"],
    ["user", "🔎", "Ver usuario"],
    ["userinfo", "📋", "Información de usuario"],
    ["avatar", "🖼️", "Ver avatar"],
    ["banner", "🎨", "Ver banner"],
    ["server", "🏠", "Información del servidor"],
    ["members", "👥", "Ver miembros"],
    ["leaderboard", "🏆", "Clasificación"],
    ["top", "🥇", "Top de usuarios"],
    ["marry", "💍", "Sistema social"],
    ["divorce", "💔", "Sistema social"],
    ["hug", "🤗", "Interactuar"],
    ["kiss", "💫", "Interactuar"],
    ["highfive", "✋", "Chocar manos"],
    ["pat", "🐾", "Interactuar"],
    ["wave", "👋", "Saludar"],
    ["poke", "👉", "Interactuar"],
    ["ship", "💞", "Compatibilidad ficticia"],
    ["friend", "🤝", "Añadir amistad"],
    ["friends", "👥", "Ver amistades"],
    ["bio", "📝", "Ver biografía"],
    ["setbio", "✏️", "Configurar biografía"],
    ["badges", "🏅", "Ver insignias"],
    ["social", "🌐", "Resumen social"],
    ["relationship", "💞", "Ver relación"]
  ],

  diversion: [
    ["roll", "🎲", "Lanzar dado"],
    ["8ball", "🔮", "Bola mágica"],
    ["guess", "🔢", "Adivinar número"],
    ["coinflip", "🪙", "Lanzar moneda"],
    ["joke", "😂", "Chiste"],
    ["meme", "🤣", "Meme aleatorio"],
    ["rps", "✊", "Piedra papel tijera"],
    ["dice", "🎲", "Dados"],
    ["slots", "🎰", "Máquina ficticia"],
    ["choose", "🎯", "Elegir algo"],
    ["random", "🎲", "Número aleatorio"],
    ["rate", "⭐", "Puntuación aleatoria"],
    ["ship", "💞", "Compatibilidad"],
    ["roast", "🔥", "Broma ligera"],
    ["compliment", "✨", "Cumplido"],
    ["fact", "🧠", "Dato curioso"],
    ["magic", "✨", "Magia ficticia"],
    ["fortune", "🔮", "Fortuna"],
    ["yesno", "❓", "Sí o no"],
    ["flip", "🔄", "Voltear texto"],
    ["say", "💬", "Repetir texto"],
    ["reverse", "🔁", "Invertir texto"],
    ["ascii", "🔤", "Texto decorativo"],
    ["emoji", "😀", "Emoji aleatorio"],
    ["number", "🔢", "Número aleatorio"],
    ["color", "🎨", "Color aleatorio"],
    ["animal", "🐾", "Animal aleatorio"],
    ["planet", "🪐", "Planeta aleatorio"],
    ["space", "🌌", "Dato espacial"],
    ["challenge", "⚡", "Reto divertido"]
  ],

  recompensas: [
    ["daily", "🎁", "Recompensa diaria"],
    ["weekly", "📅", "Recompensa semanal"],
    ["monthly", "🗓️", "Recompensa mensual"],
    ["streak", "🔥", "Racha"],
    ["reward", "🎁", "Ver recompensas"],
    ["claim", "🎟️", "Reclamar premio"],
    ["bonus", "✨", "Bono"],
    ["giftbox", "🎁", "Caja sorpresa"],
    ["chest", "🧰", "Cofre"],
    ["treasure", "💎", "Tesoro"],
    ["lucky", "🍀", "Suerte"],
    ["spin", "🎡", "Girar rueda"],
    ["wheel", "🎡", "Rueda"],
    ["scratch", "🎫", "Tarjeta ficticia"],
    ["quest", "📜", "Misión"],
    ["quests", "📜", "Misiones"],
    ["mission", "🎯", "Misión diaria"],
    ["missions", "🎯", "Lista de misiones"],
    ["xpboost", "⚡", "Bono de XP"],
    ["moneyboost", "💰", "Bono económico"],
    ["luck", "🍀", "Ver suerte"],
    ["prize", "🏆", "Premio"],
    ["prizes", "🏆", "Premios"],
    ["event", "🎉", "Evento"],
    ["events", "🎉", "Eventos"],
    ["calendar", "📅", "Calendario"],
    ["checkin", "✅", "Check-in"],
    ["streakinfo", "🔥", "Información de racha"],
    ["rewardinfo", "ℹ️", "Información"],
    ["rewards", "🎁", "Lista de recompensas"]
  ],

  moderacion: [
    ["kick", "🔨", "Expulsar usuario"],
    ["ban", "🔨", "Banear usuario"],
    ["unban", "🔓", "Desbanear usuario"],
    ["timeout", "🔇", "Aplicar timeout"],
    ["untimeout", "🔊", "Quitar timeout"],
    ["clear", "🧹", "Eliminar mensajes"],
    ["purge", "🧹", "Eliminar mensajes"],
    ["warn", "⚠️", "Advertir usuario"],
    ["warnings", "📋", "Ver advertencias"],
    ["unwarn", "✅", "Quitar advertencia"],
    ["lock", "🔒", "Bloquear canal"],
    ["unlock", "🔓", "Desbloquear canal"],
    ["slowmode", "🐌", "Configurar slowmode"],
    ["unslowmode", "⚡", "Quitar slowmode"],
    ["mute", "🔇", "Silenciar usuario"],
    ["unmute", "🔊", "Quitar silencio"],
    ["nick", "✏️", "Cambiar nickname"],
    ["resetnick", "🔄", "Restaurar nickname"],
    ["role", "🎭", "Gestionar rol"],
    ["addrole", "➕", "Añadir rol"],
    ["removerole", "➖", "Quitar rol"],
    ["announce", "📢", "Crear anuncio"],
    ["embed", "📋", "Crear embed"],
    ["say", "💬", "Enviar mensaje"],
    ["channelinfo", "📺", "Info del canal"],
    ["serverinfo", "🏠", "Info del servidor"],
    ["modlogs", "📜", "Ver registros"],
    ["clearwarns", "🧹", "Limpiar advertencias"],
    ["modhelp", "🛡️", "Ayuda de moderación"],
    ["staff", "👮", "Información del staff"]
  ],

  configuracion: [
    ["config", "⚙️", "Ver configuración"],
    ["prefix", "📌", "Ver prefix"],
    ["setprefix", "✏️", "Configurar prefix"],
    ["welcome", "👋", "Bienvenida"],
    ["setwelcome", "📢", "Configurar bienvenida"],
    ["log", "📜", "Logs"],
    ["setlog", "📋", "Configurar logs"],
    ["modrole", "🛡️", "Rol de moderación"],
    ["setmodrole", "🛡️", "Configurar rol"],
    ["autorole", "🎭", "Auto rol"],
    ["setautorole", "🎭", "Configurar auto rol"],
    ["antispam", "🚫", "Anti-spam"],
    ["antilink", "🔗", "Anti-links"],
    ["automod", "🤖", "Auto moderación"],
    ["filter", "🚫", "Filtro"],
    ["language", "🌐", "Idioma"],
    ["timezone", "🕐", "Zona horaria"],
    ["economyconfig", "💰", "Economía"],
    ["socialconfig", "👥", "Social"],
    ["rewardconfig", "🎁", "Recompensas"],
    ["levelconfig", "⭐", "Niveles"],
    ["welcomeconfig", "👋", "Bienvenida"],
    ["logconfig", "📜", "Logs"],
    ["serverconfig", "🏠", "Servidor"],
    ["botconfig", "🤖", "Bot"],
    ["channels", "📺", "Canales"],
    ["roles", "🎭", "Roles"],
    ["permissions", "🔐", "Permisos"],
    ["resetconfig", "🔄", "Restablecer configuración"],
    ["settings", "⚙️", "Configuración general"]
  ],

  informacion: [
    ["help", "❓", "Abrir ayuda"],
    ["menu", "🌌", "Abrir menú"],
    ["about", "ℹ️", "Sobre Nexora"],
    ["botinfo", "🤖", "Información del bot"],
    ["stats", "📊", "Estadísticas"],
    ["ping", "🏓", "Latencia"],
    ["uptime", "⏱️", "Tiempo activo"],
    ["serverinfo", "🏠", "Servidor"],
    ["channelinfo", "📺", "Canal"],
    ["userinfo", "👤", "Usuario"],
    ["avatar", "🖼️", "Avatar"],
    ["banner", "🎨", "Banner"],
    ["roleinfo", "🎭", "Rol"],
    ["membercount", "👥", "Cantidad de miembros"],
    ["servericon", "🖼️", "Icono del servidor"],
    ["serverbanner", "🎨", "Banner del servidor"],
    ["invite", "🔗", "Invitación"],
    ["support", "🆘", "Soporte"],
    ["website", "🌐", "Sitio web"],
    ["version", "📦", "Versión"],
    ["commands", "📚", "Lista de comandos"],
    ["categories", "📂", "Categorías"],
    ["status", "🟢", "Estado"],
    ["latency", "📡", "Latencia"],
    ["system", "💻", "Sistema"],
    ["library", "📚", "Librería"],
    ["creator", "👑", "Creador"],
    ["credits", "✨", "Créditos"],
    ["nexora", "🌌", "Nexora"]
  ]
};

// ============================================================
// 👑 COMANDOS DEL PANEL DE ADMIN
// ============================================================

const ADMIN_COMMANDS = [
  ["adminstats", "📊", "Estadísticas administrativas"],
  ["servercontrol", "🏠", "Control del servidor"],
  ["announce", "📢", "Crear anuncio"],
  ["embed", "📋", "Crear embed"],
  ["say", "💬", "Enviar mensaje"],
  ["lock", "🔒", "Bloquear canal"],
  ["unlock", "🔓", "Desbloquear canal"],
  ["slowmode", "🐌", "Configurar slowmode"],
  ["clear", "🧹", "Eliminar mensajes"],
  ["kick", "🔨", "Expulsar"],
  ["ban", "🔨", "Banear"],
  ["unban", "🔓", "Desbanear"],
  ["timeout", "🔇", "Timeout"],
  ["untimeout", "🔊", "Quitar timeout"],
  ["warn", "⚠️", "Advertir"],
  ["warnings", "📋", "Advertencias"],
  ["clearwarns", "🧹", "Limpiar advertencias"],
  ["setwelcome", "👋", "Configurar bienvenida"],
  ["setlog", "📜", "Configurar logs"],
  ["setmodrole", "🛡️", "Configurar staff"],
  ["setprefix", "📌", "Configurar prefix"],
  ["economyadmin", "💰", "Administrar economía"],
  ["give", "💵", "Dar dinero"],
  ["take", "💸", "Quitar dinero"],
  ["setmoney", "💰", "Establecer dinero"],
  ["setlevel", "⭐", "Establecer nivel"],
  ["setxp", "✨", "Establecer XP"],
  ["setrep", "🌟", "Establecer reputación"],
  ["resetuser", "🔄", "Restablecer usuario"],
  ["resetserver", "♻️", "Restablecer servidor"]
];

// ============================================================
// 📋 CREAR MENÚ
// ============================================================

function categoryMenu(category) {
  const commands = COMMANDS[category];

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`category_${category}`)
    .setPlaceholder("🌌 Selecciona un comando...");

  for (const [name, emoji, description] of commands) {
    menu.addOptions({
      label: `${name}`,
      description: description.slice(0, 100),
      value: name,
      emoji
    });
  }

  return new ActionRowBuilder().addComponents(menu);
}

// ============================================================
// 🌌 MENÚ PRINCIPAL
// ============================================================

function mainMenu(user) {

  const components = [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("nexora_categories")
        .setPlaceholder("🌌 Selecciona una categoría...")
        .addOptions([
          {
            label: "Economía",
            description: "30 comandos económicos",
            value: "economia",
            emoji: "💰"
          },
          {
            label: "Social",
            description: "30 comandos sociales",
            value: "social",
            emoji: "👥"
          },
          {
            label: "Diversión",
            description: "30 comandos de diversión",
            value: "diversion",
            emoji: "🎮"
          },
          {
            label: "Recompensas",
            description: "30 comandos de recompensas",
            value: "recompensas",
            emoji: "🎁"
          },
          {
            label: "Moderación",
            description: "30 comandos de moderación",
            value: "moderacion",
            emoji: "🛡️"
          },
          {
            label: "Configuración",
            description: "30 comandos de configuración",
            value: "configuracion",
            emoji: "⚙️"
          },
          {
            label: "Información",
            description: "30 comandos de información",
            value: "informacion",
            emoji: "ℹ️"
          }
        ])
    )
  ];

  // 👑 SOLO ADMINISTRADORES
  if (
    user &&
    user.member &&
    isAdmin(user.member)
  ) {
    components.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("nexora_admin")
          .setLabel("Panel de Admin")
          .setEmoji("👑")
          .setStyle(ButtonStyle.Danger)
      )
    );
  }

  return components;
}

// ============================================================
// 🌌 EMBED PRINCIPAL
// ============================================================

function helpEmbed(user) {

  const u = getUser(user.id);

  return embed(
    "🌌 NEXORA",
    `${GALAXY}\n\n` +
    "✨ **Bienvenido al universo de Nexora.**\n\n" +
    "Explora las categorías y descubre todas las funciones disponibles.\n\n" +

    "💰 **ECONOMÍA**\n" +
    "Dinero, banco, trabajos y objetos.\n\n" +

    "👥 **SOCIAL**\n" +
    "Perfiles, reputación e interacciones.\n\n" +

    "🎮 **DIVERSIÓN**\n" +
    "Juegos y entretenimiento.\n\n" +

    "🎁 **RECOMPENSAS**\n" +
    "Premios, misiones y eventos.\n\n" +

    "🛡️ **MODERACIÓN**\n" +
    "Herramientas para moderadores.\n\n" +

    "⚙️ **CONFIGURACIÓN**\n" +
    "Configura Nexora en tu servidor.\n\n" +

    "ℹ️ **INFORMACIÓN**\n" +
    "Ayuda y datos de Nexora.\n\n" +

    `${GALAXY}\n` +
    `💰 Dinero: **${formatMoney(u.money)}**\n` +
    `⭐ Nivel: **${u.level}**\n` +
    `✨ XP: **${u.xp}**`,
    COLORS.galaxy
  );
}

// ============================================================
// 👑 EMBED ADMIN
// ============================================================

function adminEmbed() {

  return embed(
    "👑 PANEL DE ADMINISTRACIÓN",
    `${GALAXY}\n\n` +
    "🌌 **NEXORA • CENTRO DE CONTROL**\n\n" +

    "🛡️ **Moderación**\n" +
    "Control de usuarios, canales y sanciones.\n\n" +

    "🏠 **Servidor**\n" +
    "Configuración y herramientas del servidor.\n\n" +

    "👥 **Usuarios**\n" +
    "Administración de dinero, XP, niveles y reputación.\n\n" +

    "💰 **Economía**\n" +
    "Control administrativo de la economía.\n\n" +

    "📊 **Estadísticas**\n" +
    "Información del servidor y Nexora.\n\n" +

    "🔧 **Herramientas**\n" +
    "Anuncios, embeds y utilidades.\n\n" +

    `${GALAXY}\n\n` +
    "⚠️ Este panel solamente está disponible para administradores.",
    COLORS.red
  );
}

// ============================================================
// 👑 MENÚ ADMIN
// ============================================================

function adminMenu() {

  const menu = new StringSelectMenuBuilder()
    .setCustomId("nexora_admin_menu")
    .setPlaceholder("👑 Selecciona una herramienta...");

  for (const [name, emoji, description] of ADMIN_COMMANDS) {
    menu.addOptions({
      label: name,
      description,
      value: name,
      emoji
    });
  }

  return new ActionRowBuilder().addComponents(menu);
}

function adminBackButton() {

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("nexora_admin_back")
      .setLabel("Volver al menú")
      .setEmoji("🌌")
      .setStyle(ButtonStyle.Primary)
  );
}

// ============================================================
// 🟢 READY
// ============================================================

client.once(Events.ClientReady, bot => {

  console.log("");
  console.log(GALAXY);
  console.log("🌌 NEXORA");
  console.log(GALAXY);
  console.log(`✅ Conectado como ${bot.user.tag}`);
  console.log(`🆔 ID: ${bot.user.id}`);
  console.log(`🌐 Servidores: ${bot.guilds.cache.size}`);
  console.log(`⚙️ Prefix: ${PREFIX}`);
  console.log(`🌐 Puerto: ${PORT}`);
  console.log(GALAXY);
  console.log("🚀 NEXORA ESTÁ ONLINE");
  console.log("");

  bot.user.setPresence({
    activities: [
      {
        name: "🌌 n.help | Universo Nexora",
        type: 0
      }
    ],
    status: "online"
  });
});

// ============================================================
// 💬 MENSAJES
// ============================================================

client.on(Events.MessageCreate, async message => {

  if (message.author.bot) return;
  if (!message.guild) return;

  if (
    !message.content
      .toLowerCase()
      .startsWith(PREFIX)
  ) {
    return;
  }

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

  if (
    command === "help" ||
    command === "menu"
  ) {

    return message.reply({
      embeds: [
        helpEmbed(message.author)
      ],
      components: mainMenu(message)
    });
  }

  // ==========================================================
  // 💰 BALANCE
  // ==========================================================

  if (
    command === "balance" ||
    command === "bal" ||
    command === "wallet" ||
    command === "cash"
  ) {

    return message.reply({
      embeds: [
        embed(
          "💰 TU ECONOMÍA",
          `${GALAXY}\n\n` +
          `💵 Efectivo: **${formatMoney(user.money)}**\n` +
          `🏦 Banco: **${formatMoney(user.bank)}**\n\n` +
          `💎 Total: **${formatMoney(
            user.money + user.bank
          )}**`,
          COLORS.green
        )
      ]
    });
  }

  // ==========================================================
  // 🏦 BANK
  // ==========================================================

  if (command === "bank") {

    return message.reply({
      embeds: [
        embed(
          "🏦 BANCO",
          `${GALAXY}\n\n` +
          `💰 Saldo bancario:\n\n` +
          `**${formatMoney(user.bank)}**`,
          COLORS.blue
        )
      ]
    });
  }

  // ==========================================================
  // 📥 DEPOSIT
  // ==========================================================

  if (command === "deposit") {

    const amount = parseInt(args[0]);

    if (!amount || amount <= 0) {
      return message.reply(
        `❌ Usa: **${PREFIX}deposit cantidad**`
      );
    }

    if (user.money < amount) {
      return message.reply(
        "❌ No tienes suficiente efectivo."
      );
    }

    user.money -= amount;
    user.bank += amount;

    saveDatabase();

    return message.reply(
      `🏦 Depositaste **${formatMoney(amount)}**.`
    );
  }

  // ==========================================================
  // 📤 WITHDRAW
  // ==========================================================

  if (command === "withdraw") {

    const amount = parseInt(args[0]);

    if (!amount || amount <= 0) {
      return message.reply(
        `❌ Usa: **${PREFIX}withdraw cantidad**`
      );
    }

    if (user.bank < amount) {
      return message.reply(
        "❌ No tienes suficiente dinero en el banco."
      );
    }

    user.bank -= amount;
    user.money += amount;

    saveDatabase();

    return message.reply(
      `💵 Retiraste **${formatMoney(amount)}**.`
    );
  }

  // ==========================================================
  // 💼 WORK
  // ==========================================================

  if (command === "work") {

    const now = Date.now();

    if (
      now - user.lastWork <
      60 * 1000
    ) {

      const seconds = Math.ceil(
        (
          60000 -
          (now - user.lastWork)
        ) / 1000
      );

      return message.reply(
        `⏳ Espera **${seconds}s** para volver a trabajar.`
      );
    }

    const earned = random(150, 600);

    user.money += earned;
    user.lastWork = now;

    addXP(message.author.id, 20);

    saveDatabase();

    return message.reply({
      embeds: [
        embed(
          "💼 TRABAJO COMPLETADO",
          `${GALAXY}\n\n` +
          `✨ Ganaste **${formatMoney(earned)}**.\n\n` +
          `💰 Dinero: **${formatMoney(user.money)}**`,
          COLORS.green
        )
      ]
    });
  }

  // ==========================================================
  // 🎁 DAILY
  // ==========================================================

  if (command === "daily") {

    const now = Date.now();
    const cooldown =
      24 * 60 * 60 * 1000;

    if (
      now - user.lastDaily <
      cooldown
    ) {

      const remaining =
        cooldown -
        (now - user.lastDaily);

      const hours =
        Math.floor(
          remaining / 3600000
        );

      const minutes =
        Math.floor(
          (remaining % 3600000) /
          60000
        );

      return message.reply(
        `⏳ Ya reclamaste tu recompensa.\n` +
        `Vuelve en **${hours}h ${minutes}m**.`
      );
    }

    const reward = random(500, 1500);

    user.money += reward;
    user.lastDaily = now;

    addXP(message.author.id, 10);

    saveDatabase();

    return message.reply({
      embeds: [
        embed(
          "🎁 RECOMPENSA DIARIA",
          `${GALAXY}\n\n` +
          `✨ Recibiste **${formatMoney(reward)}**.\n\n` +
          `💰 Dinero actual: **${formatMoney(user.money)}**`,
          COLORS.gold
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

    const amount =
      parseInt(args[1]);

    if (!target) {
      return message.reply(
        `❌ Usa: **${PREFIX}pay @usuario cantidad**`
      );
    }

    if (
      target.bot ||
      target.id === message.author.id
    ) {
      return message.reply(
        "❌ Ese usuario no puede recibir el pago."
      );
    }

    if (!amount || amount <= 0) {
      return message.reply(
        "❌ Cantidad inválida."
      );
    }

    if (user.money < amount) {
      return message.reply(
        "❌ No tienes suficiente dinero."
      );
    }

    const targetData =
      getUser(target.id);

    user.money -= amount;
    targetData.money += amount;

    saveDatabase();

    return message.reply(
      `💸 Enviaste **${formatMoney(amount)}** a ${target}.`
    );
  }

  // ==========================================================
  // 👤 PROFILE
  // ==========================================================

  if (
    command === "profile" ||
    command === "perfil"
  ) {

    const target =
      message.mentions.users.first() ||
      message.author;

    const targetData =
      getUser(target.id);

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.purple)
          .setTitle(
            `👤 PERFIL DE ${target.username}`
          )
          .setThumbnail(
            target.displayAvatarURL({
              dynamic: true
            })
          )
          .setDescription(
            `${GALAXY}\n\n` +
            `⭐ Nivel: **${targetData.level}**\n` +
            `✨ XP: **${targetData.xp}**\n` +
            `💰 Dinero: **${formatMoney(targetData.money)}**\n` +
            `🌟 Reputación: **${targetData.reputation}**\n` +
            `⚠️ Advertencias: **${targetData.warnings}**`
          )
          .setFooter({
            text: "🌌 Nexora • Social"
          })
      ]
    });
  }

  // ==========================================================
  // ⭐ REP
  // ==========================================================

  if (
    command === "rep" ||
    command === "reputation"
  ) {

    const target =
      message.mentions.users.first();

    if (!target) {
      return message.reply(
        `❌ Usa: **${PREFIX}rep @usuario**`
      );
    }

    if (
      target.id === message.author.id
    ) {
      return message.reply(
        "❌ No puedes darte reputación a ti mismo."
      );
    }

    const targetData =
      getUser(target.id);

    targetData.reputation++;

    saveDatabase();

    return message.reply(
      `🌟 ${target} ahora tiene **${targetData.reputation}** de reputación.`
    );
  }

  // ==========================================================
  // 🎲 ROLL
  // ==========================================================

  if (
    command === "roll" ||
    command === "dice"
  ) {

    const result = random(1, 6);

    return message.reply(
      `🎲 El dado cayó en **${result}**.`
    );
  }

  // ==========================================================
  // 🪙 COIN
  // ==========================================================

  if (
    command === "coin" ||
    command === "coinflip"
  ) {

    const result =
      Math.random() < 0.5
        ? "Cara"
        : "Cruz";

    return message.reply(
      `🪙 La moneda cayó en **${result}**.`
    );
  }

  // ==========================================================
  // 🔮 8BALL
  // ==========================================================

  if (command === "8ball") {

    const answers = [
      "✨ Sí.",
      "🌌 Probablemente.",
      "⭐ Definitivamente.",
      "🪐 Puede ser.",
      "☄️ No parece probable.",
      "🌑 Mejor pregunta después.",
      "🔮 Las estrellas no están seguras."
    ];

    return message.reply(
      `🔮 **NEXORA 8BALL**\n\n${
        answers[
          random(0, answers.length - 1)
        ]
      }`
    );
  }

  // ==========================================================
  // 😂 JOKE
  // ==========================================================

  if (command === "joke") {

    const jokes = [
      "😂 ¿Qué hace un bot en el espacio? ¡Busca conexión!",
      "🤣 Mi economía está tan mal que hasta el banco me dejó en visto.",
      "😎 Nexora no se cae... solo explora otra galaxia."
    ];

    return message.reply(
      jokes[random(0, jokes.length - 1)]
    );
  }

  // ==========================================================
  // 📊 RANK
  // ==========================================================

  if (
    command === "rank" ||
    command === "level"
  ) {

    return message.reply({
      embeds: [
        embed(
          "⭐ TU NIVEL",
          `${GALAXY}\n\n` +
          `⭐ Nivel: **${user.level}**\n` +
          `✨ XP: **${user.xp}**\n` +
          `📈 Próximo nivel: **${user.level * 100} XP**`,
          COLORS.gold
        )
      ]
    });
  }

  // ==========================================================
  // 🏆 LEADERBOARD
  // ==========================================================

  if (
    command === "leaderboard" ||
    command === "top"
  ) {

    const ranking =
      Object.entries(database.users)
        .sort(
          (a, b) =>
            (b[1].money + b[1].bank) -
            (a[1].money + a[1].bank)
        )
        .slice(0, 10);

    let text = "";

    for (
      let i = 0;
      i < ranking.length;
      i++
    ) {

      const [id, info] =
        ranking[i];

      text +=
        `**${i + 1}.** <@${id}> — ` +
        `${formatMoney(
          info.money + info.bank
        )}\n`;
    }

    return message.reply({
      embeds: [
        embed(
          "🏆 TOP ECONÓMICO",
          `${GALAXY}\n\n${text || "Todavía no hay usuarios."}`,
          COLORS.gold
        )
      ]
    });
  }

  // ==========================================================
  // 🖼️ AVATAR
  // ==========================================================

  if (command === "avatar") {

    const target =
      message.mentions.users.first() ||
      message.author;

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.galaxy)
          .setTitle(`🖼️ Avatar de ${target.username}`)
          .setImage(
            target.displayAvatarURL({
              size: 1024
            })
          )
      ]
    });
  }

  // ==========================================================
  // 🏠 SERVER INFO
  // ==========================================================

  if (
    command === "serverinfo" ||
    command === "server"
  ) {

    return message.reply({
      embeds: [
        embed(
          "🏠 INFORMACIÓN DEL SERVIDOR",
          `${GALAXY}\n\n` +
          `🌌 Nombre: **${message.guild.name}**\n` +
          `👥 Miembros: **${message.guild.memberCount}**\n` +
          `📺 Canales: **${message.guild.channels.cache.size}**\n` +
          `🎭 Roles: **${message.guild.roles.cache.size}**`,
          COLORS.blue
        )
      ]
    });
  }

  // ==========================================================
  // 📡 PING
  // ==========================================================

  if (
    command === "ping" ||
    command === "latency"
  ) {

    return message.reply(
      `🏓 Pong!\n📡 Latencia: **${client.ws.ping}ms**`
    );
  }

  // ==========================================================
  // ⏱️ UPTIME
  // ==========================================================

  if (command === "uptime") {

    const seconds =
      Math.floor(client.uptime / 1000);

    const minutes =
      Math.floor(seconds / 60);

    const hours =
      Math.floor(minutes / 60);

    return message.reply(
      `⏱️ Nexora lleva activo:\n` +
      `**${hours}h ${minutes % 60}m ${seconds % 60}s**`
    );
  }

  // ==========================================================
  // ℹ️ ABOUT
  // ==========================================================

  if (
    command === "about" ||
    command === "nexora" ||
    command === "botinfo"
  ) {

    return message.reply({
      embeds: [
        embed(
          "🌌 SOBRE NEXORA",
          `${GALAXY}\n\n` +
          "🤖 **Nombre:** Nexora\n" +
          `⚙️ **Prefix:** ${PREFIX}\n` +
          "📚 **Discord.js:** v14\n" +
          `🌐 **Servidores:** ${client.guilds.cache.size}\n\n` +
          "✨ Economía • Social • Diversión • Moderación",
          COLORS.galaxy
        )
      ]
    });
  }

  // ==========================================================
  // 🧹 CLEAR
  // ==========================================================

  if (
    command === "clear" ||
    command === "purge"
  ) {

    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ Necesitas permisos de administrador."
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
        `❌ Usa **${PREFIX}clear 1-100**`
      );
    }

    try {

      await message.channel.bulkDelete(
        amount,
        true
      );

      const msg =
        await message.channel.send(
          `🧹 Se eliminaron **${amount} mensajes**.`
        );

      setTimeout(() => {
        msg.delete().catch(() => {});
      }, 3000);

    } catch (error) {

      console.error(error);

      return message.reply(
        "❌ No pude eliminar los mensajes."
      );
    }

    return;
  }

  // ==========================================================
  // 🔨 KICK
  // ==========================================================

  if (command === "kick") {

    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ Solo administradores."
      );
    }

    const target =
      message.mentions.members.first();

    if (!target) {
      return message.reply(
        `❌ Usa **${PREFIX}kick @usuario**`
      );
    }

    if (!target.kickable) {
      return message.reply(
        "❌ No puedo expulsar a ese usuario."
      );
    }

    await target.kick();

    return message.reply(
      `🔨 **${target.user.tag}** fue expulsado.`
    );
  }

  // ==========================================================
  // 🔨 BAN
  // ==========================================================

  if (command === "ban") {

    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ Solo administradores."
      );
    }

    const target =
      message.mentions.members.first();

    if (!target) {
      return message.reply(
        `❌ Usa **${PREFIX}ban @usuario**`
      );
    }

    if (!target.bannable) {
      return message.reply(
        "❌ No puedo banear a ese usuario."
      );
    }

    await target.ban();

    return message.reply(
      `🔨 **${target.user.tag}** fue baneado.`
    );
  }

  // ==========================================================
  // ⚠️ WARN
  // ==========================================================

  if (command === "warn") {

    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ Solo administradores."
      );
    }

    const target =
      message.mentions.users.first();

    if (!target) {
      return message.reply(
        `❌ Usa **${PREFIX}warn @usuario**`
      );
    }

    const targetData =
      getUser(target.id);

    targetData.warnings++;

    saveDatabase();

    return message.reply(
      `⚠️ ${target} recibió una advertencia.\n` +
      `Total: **${targetData.warnings}**`
    );
  }

  // ==========================================================
  // 🔇 TIMEOUT
  // ==========================================================

  if (command === "timeout") {

    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ Solo administradores."
      );
    }

    const target =
      message.mentions.members.first();

    if (!target) {
      return message.reply(
        `❌ Usa **${PREFIX}timeout @usuario**`
      );
    }

    const minutes =
      parseInt(args[1]) || 10;

    if (!target.moderatable) {
      return message.reply(
        "❌ No puedo aplicar timeout."
      );
    }

    await target.timeout(
      minutes * 60 * 1000
    );

    return message.reply(
      `🔇 ${target} recibió timeout durante **${minutes} minutos**.`
    );
  }

  // ==========================================================
  // 🔒 LOCK
  // ==========================================================

  if (command === "lock") {

    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ Solo administradores."
      );
    }

    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      {
        SendMessages: false
      }
    );

    return message.reply(
      "🔒 Canal bloqueado."
    );
  }

  // ==========================================================
  // 🔓 UNLOCK
  // ==========================================================

  if (command === "unlock") {

    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ Solo administradores."
      );
    }

    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      {
        SendMessages: null
      }
    );

    return message.reply(
      "🔓 Canal desbloqueado."
    );
  }

  // ==========================================================
  // ⚙️ CONFIG
  // ==========================================================

  if (command === "config") {

    const guildData =
      getGuild(message.guild.id);

    return message.reply({
      embeds: [
        embed(
          "⚙️ CONFIGURACIÓN DE NEXORA",
          `${GALAXY}\n\n` +
          `📌 Prefix: **${guildData.prefix}**\n` +
          `👋 Bienvenida: **${
            guildData.welcomeChannel
              ? `<#${guildData.welcomeChannel}>`
              : "No configurada"
          }**\n` +
          `📜 Logs: **${
            guildData.logChannel
              ? `<#${guildData.logChannel}>`
              : "No configurados"
          }**`,
          COLORS.space
        )
      ]
    });
  }

  // ==========================================================
  // 📌 PREFIX
  // ==========================================================

  if (command === "prefix") {

    return message.reply(
      `📌 El prefix de Nexora es **${PREFIX}**`
    );
  }

  // ==========================================================
  // ❓ COMANDO DESCONOCIDO
  // ==========================================================

  return message.reply(
    `❌ Ese comando no existe.\n` +
    `Usa **${PREFIX}help** para abrir el menú de Nexora.`
  );
});

// ============================================================
// 🖱️ INTERACCIONES
// ============================================================

client.on(
  Events.InteractionCreate,
  async interaction => {

    // ========================================================
    // 📂 CATEGORÍA
    // ========================================================

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId ===
        "nexora_categories"
    ) {

      const category =
        interaction.values[0];

      const names = {
        economia: "💰 ECONOMÍA",
        social: "👥 SOCIAL",
        diversion: "🎮 DIVERSIÓN",
        recompensas: "🎁 RECOMPENSAS",
        moderacion: "🛡️ MODERACIÓN",
        configuracion: "⚙️ CONFIGURACIÓN",
        informacion: "ℹ️ INFORMACIÓN"
      };

      const commands =
        COMMANDS[category];

      let description =
        `${GALAXY}\n\n` +
        `🌌 **${names[category]}**\n\n`;

      for (
        let i = 0;
        i < commands.length;
        i++
      ) {

        const [name, emoji, text] =
          commands[i];

        description +=
          `${emoji} **n.${name}** — ${text}\n`;
      }

      description +=
        `\n${GALAXY}\n` +
        `📚 Total: **${commands.length} comandos**`;

      return interaction.update({
        embeds: [
          embed(
            names[category],
            description,
            COLORS.galaxy
          )
        ],
        components: [
          categoryMenu(category),
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("nexora_home")
              .setLabel("Menú principal")
              .setEmoji("🌌")
              .setStyle(ButtonStyle.Primary)
          )
        ]
      });
    }

    // ========================================================
    // 👑 PANEL ADMIN
    // ========================================================

    if (
      interaction.isButton() &&
      interaction.customId ===
        "nexora_admin"
    ) {

      if (!isAdmin(interaction.member)) {
        return interaction.reply({
          content:
            "❌ No tienes permisos para utilizar el Panel de Admin.",
          ephemeral: true
        });
      }

      return interaction.update({
        embeds: [
          adminEmbed()
        ],
        components: [
          adminMenu(),
          adminBackButton()
        ]
      });
    }

    // ========================================================
    // 👑 SELECCIÓN ADMIN
    // ========================================================

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId ===
        "nexora_admin_menu"
    ) {

      if (!isAdmin(interaction.member)) {
        return interaction.reply({
          content:
            "❌ No tienes permisos para este panel.",
          ephemeral: true
        });
      }

      const command =
        interaction.values[0];

      return interaction.update({
        embeds: [
          embed(
            `👑 ${command.toUpperCase()}`,
            `${GALAXY}\n\n` +
            `🛠️ Herramienta administrativa:\n\n` +
            `**n.${command}**\n\n` +
            `🌌 Esta función pertenece al Panel de Administración de Nexora.`,
            COLORS.red
          )
        ],
        components: [
          adminBackButton()
        ]
      });
    }

    // ========================================================
    // 🔙 VOLVER ADMIN
    // ========================================================

    if (
      interaction.isButton() &&
      interaction.customId ===
        "nexora_admin_back"
    ) {

      if (!isAdmin(interaction.member)) {
        return interaction.reply({
          content:
            "❌ No tienes permisos para este panel.",
          ephemeral: true
        });
      }

      return interaction.update({
        embeds: [
          adminEmbed()
        ],
        components: [
          adminMenu(),
          adminBackButton()
        ]
      });
    }

    // ========================================================
    // 🌌 VOLVER AL HOME
    // ========================================================

    if (
      interaction.isButton() &&
      interaction.customId ===
        "nexora_home"
    ) {

      return interaction.update({
        embeds: [
          helpEmbed(interaction.user)
        ],
        components: mainMenu(interaction)
      });
    }
  }
);

// ============================================================
// ❌ ERRORES
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

// ============================================================
// 🔐 LOGIN
// ============================================================

const TOKEN =
  process.env.DISCORD_TOKEN;

if (!TOKEN) {

  console.error(
    "❌ ERROR: Falta DISCORD_TOKEN."
  );

  process.exit(1);
}

client.login(TOKEN)
  .then(() => {
    console.log(
      "🔐 Login de Discord iniciado..."
    );
  })
  .catch(error => {
    console.error(
      "❌ Error conectando con Discord:",
      error
    );
  });
