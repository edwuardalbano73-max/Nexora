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
  MessageFlags,
  Events
} = require("discord.js");

const fs = require("fs");
const path = require("path");
const http = require("http");

// ============================================================
// CONFIGURACIÓN
// ============================================================

const PREFIX = "n.";
const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) {
  console.error("❌ Falta DISCORD_TOKEN en las variables de entorno.");
  process.exit(1);
}

const PORT = process.env.PORT || 10000;

const DATA_FILE = path.join(__dirname, "nexora-data.json");

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
    Partials.GuildMember
  ]
});

// ============================================================
// DATOS
// ============================================================

let data = {};

function defaultGuild() {
  return {
    users: {},
    config: {
      antiLink: false,
      antiSpam: false,
      autoMod: false,
      welcome: false,
      welcomeChannel: null,
      logChannel: null,
      mutedRole: null,
      prefix: "n.",
      autoRole: null,
      welcomeMessage: "¡Bienvenido/a {user} a {server}! 🎉"
    },
    warnings: {},
    logs: [],
    achievements: {},
    serverStats: {
      commands: 0,
      messages: 0
    }
  };
}

function defaultUser() {
  return {
    coins: 0,
    bank: 0,
    xp: 0,
    level: 1,
    messages: 0,
    commands: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    triviaCorrect: 0,
    triviaWrong: 0,
    daily: 0,
    weekly: 0,
    lastDaily: 0,
    lastWeekly: 0,
    achievements: [],
    inventory: [],
    created: Date.now()
  };
}

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(
        DATA_FILE,
        JSON.stringify({}, null, 2)
      );
    }

    data = JSON.parse(
      fs.readFileSync(DATA_FILE, "utf8")
    );

    if (!data || typeof data !== "object") {
      data = {};
    }
  } catch (err) {
    console.error("❌ Error leyendo datos:", err);
    data = {};
  }
}

function saveData() {
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(data, null, 2)
    );
  } catch (err) {
    console.error("❌ Error guardando datos:", err);
  }
}

function getGuildData(guildId) {
  if (!data[guildId]) {
    data[guildId] = defaultGuild();
  }

  const guild = data[guildId];

  guild.users ||= {};
  guild.config ||= defaultGuild().config;
  guild.warnings ||= {};
  guild.logs ||= [];
  guild.achievements ||= {};
  guild.serverStats ||= {
    commands: 0,
    messages: 0
  };

  return guild;
}

function getUserData(guildId, userId) {
  const guild = getGuildData(guildId);

  if (!guild.users[userId]) {
    guild.users[userId] = defaultUser();
  }

  return guild.users[userId];
}

loadData();

// ============================================================
// UTILIDADES
// ============================================================

function isAdmin(member) {
  return member.permissions.has(
    PermissionsBitField.Flags.Administrator
  );
}

function isModerator(member) {
  return member.permissions.has(
    PermissionsBitField.Flags.ModerateMembers
  ) || isAdmin(member);
}

function formatCoins(amount) {
  return `${Number(amount || 0).toLocaleString("es-ES")} 🪙`;
}

function random(min, max) {
  return Math.floor(
    Math.random() * (max - min + 1)
  ) + min;
}

function pick(array) {
  return array[
    Math.floor(Math.random() * array.length)
  ];
}

function cleanUserId(input) {
  if (!input) return null;

  const match = input.match(/\d{15,25}/);

  return match ? match[0] : null;
}

function msToText(ms) {
  const seconds = Math.ceil(ms / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);

  return `${hours}h`;
}

async function safeReply(message, content) {
  try {
    return await message.reply(content);
  } catch {
    return null;
  }
}

async function logAction(guild, text) {
  const guildData = getGuildData(guild.id);

  guildData.logs.push({
    text,
    timestamp: Date.now()
  });

  if (guildData.logs.length > 200) {
    guildData.logs.shift();
  }

  saveData();

  if (!guildData.config.logChannel) return;

  const channel =
    guild.channels.cache.get(
      guildData.config.logChannel
    );

  if (!channel) return;

  try {
    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865F2)
          .setDescription(text)
          .setTimestamp()
      ]
    });
  } catch {}
}

function addXP(guildId, userId, amount) {
  const user = getUserData(guildId, userId);

  user.xp += amount;

  let needed = user.level * 100;

  while (user.xp >= needed) {
    user.xp -= needed;
    user.level++;

    needed = user.level * 100;
  }

  saveData();

  return user.level;
}

function parseDuration(text) {
  if (!text) return null;

  const match = text.match(
    /^(\d+)(s|m|h|d)$/i
  );

  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };

  return amount * multipliers[unit];
}

// ============================================================
// CATEGORÍAS
// ============================================================

const CATEGORIES = {

  economia: {
    name: "💰 Economía",
    description: "Sistema económico de Nexora.",
    commands: [
      "balance",
      "coins",
      "saldo",
      "daily",
      "weekly",
      "work",
      "crime",
      "deposit",
      "withdraw",
      "bank",
      "pay",
      "givecoins",
      "leaderboard",
      "rich",
      "economy",
      "wallet",
      "income",
      "expense",
      "bonus",
      "reward",
      "money",
      "cash",
      "savecoins",
      "takecoins",
      "transfer",
      "claim",
      "salary",
      "job",
      "career",
      "fortune",
      "treasure",
      "loot",
      "pouch",
      "vault",
      "funds",
      "finance",
      "economyinfo",
      "coinflip",
      "tax",
      "resetmoney"
    ]
  },

  social: {
    name: "👥 Social",
    description: "Perfil, niveles e interacción social.",
    commands: [
      "profile",
      "perfil",
      "rank",
      "nivel",
      "xp",
      "userinfo",
      "avatar",
      "banner",
      "serverinfo",
      "membercount",
      "age",
      "joined",
      "created",
      "rep",
      "reputation",
      "bio",
      "setbio",
      "status",
      "activity",
      "social",
      "friends",
      "top",
      "levels",
      "leveltop",
      "messagecount",
      "commandsused",
      "stats",
      "mystats",
      "whois",
      "user",
      "member",
      "guild",
      "community",
      "online",
      "roles",
      "permissions",
      "mention",
      "id",
      "socialhelp"
    ]
  },

  minijuegos: {
    name: "🎮 Minijuegos",
    description: "Juegos interactivos de Nexora.",
    commands: [
      "trivia",
      "quiz",
      "rps",
      "ppt",
      "reaction",
      "memory",
      "math",
      "guess",
      "guessnumber",
      "higherlower",
      "duel",
      "word",
      "wordgame",
      "scramble",
      "anagram",
      "quickmath",
      "challenge",
      "button",
      "click",
      "reflex",
      "sequence",
      "pattern",
      "colors",
      "emoji",
      "emojiquiz",
      "animalquiz",
      "geography",
      "science",
      "history",
      "movies",
      "games",
      "gaming",
      "minigame",
      "play",
      "challengegame",
      "brain",
      "brainquiz",
      "speed",
      "memorygame",
      "gamehelp"
    ]
  },

  recompensas: {
    name: "🎁 Recompensas",
    description: "Recompensas, premios y reclamaciones.",
    commands: [
      "rewards",
      "recompensas",
      "claimreward",
      "claimdaily",
      "claimweekly",
      "bonusreward",
      "streak",
      "streaks",
      "gift",
      "giftcoins",
      "present",
      "prize",
      "prizes",
      "lootbox",
      "chest",
      "openchest",
      "drop",
      "drops",
      "eventreward",
      "milestone",
      "milestones",
      "rewardinfo",
      "rewardlist",
      "rewardstats",
      "tokens",
      "token",
      "points",
      "pointsinfo",
      "collect",
      "collector",
      "collection",
      "inventory",
      "items",
      "item",
      "bonus",
      "free",
      "freecoins",
      "giftinfo",
      "rewardhelp"
    ]
  },

  estadisticas: {
    name: "📊 Estadísticas",
    description: "Estadísticas personales y del servidor.",
    commands: [
      "stats",
      "mystats",
      "serverstats",
      "memberstats",
      "messagestats",
      "commandstats",
      "xptop",
      "leveltop",
      "coinstop",
      "winstop",
      "triviatop",
      "activetop",
      "leaderboard",
      "lb",
      "rankings",
      "ranking",
      "topcoins",
      "topxp",
      "topmessages",
      "topwins",
      "toptrivia",
      "activity",
      "activitytop",
      "growth",
      "growthstats",
      "guildstats",
      "botstats",
      "uptime",
      "ping",
      "latency",
      "memory",
      "runtime",
      "version",
      "status",
      "system",
      "performance",
      "statistics",
      "analytics",
      "statshelp"
    ]
  },

  herramientas: {
    name: "🛠️ Herramientas",
    description: "Herramientas generales.",
    commands: [
      "help",
      "ping",
      "avatar",
      "servericon",
      "userinfo",
      "serverinfo",
      "roleinfo",
      "channelinfo",
      "botinfo",
      "id",
      "say",
      "embed",
      "poll",
      "choose",
      "random",
      "number",
      "calculate",
      "calc",
      "time",
      "date",
      "timestamp",
      "remind",
      "timer",
      "countdown",
      "translate",
      "reverse",
      "uppercase",
      "lowercase",
      "length",
      "charcount",
      "wordcount",
      "repeat",
      "clearself",
      "invite",
      "support",
      "links",
      "rules",
      "serverrules",
      "toolhelp"
    ]
  },

  personalizacion: {
    name: "🎨 Personalización",
    description: "Personaliza tu experiencia en Nexora.",
    commands: [
      "settings",
      "settingsme",
      "setbio",
      "bio",
      "setstatus",
      "status",
      "setcolor",
      "color",
      "profilecolor",
      "settitle",
      "title",
      "setprefix",
      "prefix",
      "setlanguage",
      "language",
      "notifications",
      "notify",
      "notificationson",
      "notificationsoff",
      "privacy",
      "profileprivacy",
      "publicprofile",
      "privateprofile",
      "showstats",
      "hidestats",
      "showlevel",
      "hidelevel",
      "showcoins",
      "hidecoins",
      "profileview",
      "theme",
      "interface",
      "preferences",
      "preference",
      "custom",
      "customize",
      "personal",
      "personalize",
      "profile",
      "customhelp"
    ]
  },

  logros: {
    name: "🏆 Logros",
    description: "Logros y progresión.",
    commands: [
      "achievements",
      "logros",
      "achievement",
      "logro",
      "badges",
      "badge",
      "medals",
      "medal",
      "titles",
      "title",
      "unlocks",
      "unlock",
      "progress",
      "progression",
      "milestones",
      "milestone",
      "collector",
      "collection",
      "completion",
      "complete",
      "firstmessage",
      "firstcommand",
      "firstwin",
      "triviaking",
      "richest",
      "levelmaster",
      "socializer",
      "active",
      "veteran",
      "explorer",
      "champion",
      "winner",
      "winnerstats",
      "achievementtop",
      "achievementlist",
      "badgeinfo",
      "achievementinfo",
      "progressstats",
      "trophies",
      "achievementhelp"
    ]
  },

  informacion: {
    name: "ℹ️ Información",
    description: "Información sobre Nexora y el servidor.",
    commands: [
      "about",
      "aboutbot",
      "botinfo",
      "nexora",
      "version",
      "support",
      "invite",
      "website",
      "links",
      "commands",
      "command",
      "help",
      "prefix",
      "features",
      "feature",
      "info",
      "information",
      "server",
      "serverinfo",
      "rules",
      "serverrules",
      "channelinfo",
      "roleinfo",
      "emojis",
      "emojiinfo",
      "members",
      "membercount",
      "channels",
      "roles",
      "created",
      "owner",
      "ownerinfo",
      "uptime",
      "ping",
      "latency",
      "status",
      "system",
      "credits",
      "infohelp"
    ]
  },

  nexora: {
    name: "🌌 Nexora",
    description: "Funciones especiales de Nexora.",
    commands: [
      "nexora",
      "nexorastats",
      "nexoralevel",
      "nexorarank",
      "nexoracoin",
      "nexorainfo",
      "nexorafeatures",
      "nexoraupdate",
      "nexoraversion",
      "nexorastatus",
      "nexoraping",
      "nexorautils",
      "nexoragames",
      "nexoraeconomy",
      "nexorasocial",
      "nexorahelp",
      "nexorauser",
      "nexoraserver",
      "nexoraachievement",
      "nexorarewards",
      "nexoraprofile",
      "nexoraleaderboard",
      "nexoratrivia",
      "nexoramemory",
      "nexorarps",
      "nexoraduels",
      "nexorapoints",
      "nexoraxp",
      "nexoraadmin",
      "nexoraconfig",
      "nexoralogs",
      "nexoramoderation",
      "nexorasecurity",
      "nexoraautomation",
      "nexorawelcome",
      "nexoraautomod",
      "nexorastatsserver",
      "nexorastatsuser",
      "nexorafeaturelist",
      "nexorainfohelp"
    ]
  },

  admin_moderacion: {
    name: "🛡️ Moderación",
    description: "Moderación del servidor.",
    admin: true,
    commands: [
      "ban",
      "unban",
      "kick",
      "timeout",
      "untimeout",
      "mute",
      "unmute",
      "warn",
      "warnings",
      "unwarn",
      "clearwarns",
      "purge",
      "clear",
      "slowmode",
      "unslowmode",
      "lock",
      "unlock",
      "lockdown",
      "unlockdown",
      "nick",
      "resetnick",
      "addrole",
      "removerole",
      "role",
      "temprole",
      "softban",
      "massban",
      "history",
      "modlogs",
      "modlog",
      "reason",
      "note",
      "notes",
      "modnote",
      "case",
      "cases",
      "moderation",
      "modstats",
      "modhelp"
    ]
  },

  admin_seguridad: {
    name: "🔗 Seguridad",
    description: "Seguridad y protección automática.",
    admin: true,
    commands: [
      "antilink",
      "antilinkstatus",
      "antilinkon",
      "antilinkoff",
      "antispam",
      "antispamstatus",
      "antispamon",
      "antispamoff",
      "automod",
      "automodstatus",
      "automodon",
      "automodoff",
      "filter",
      "filterstatus",
      "filteron",
      "filteroff",
      "security",
      "securitystatus",
      "securitylogs",
      "securitycheck",
      "inviteblock",
      "inviteblockon",
      "inviteblockoff",
      "linkfilter",
      "linkfilteron",
      "linkfilteroff",
      "raidmode",
      "raidmodeon",
      "raidmodeoff",
      "verification",
      "verificationstatus",
      "verify",
      "unverify",
      "antibot",
      "antibotstatus",
      "securityconfig",
      "safety",
      "safetystatus",
      "protection",
      "securityhelp"
    ]
  },

  admin_usuarios: {
    name: "👥 Usuarios",
    description: "Administración de usuarios.",
    admin: true,
    commands: [
      "userinfo",
      "user",
      "member",
      "memberinfo",
      "finduser",
      "findmember",
      "avatar",
      "banner",
      "roles",
      "userroles",
      "addrole",
      "removerole",
      "setnick",
      "resetnick",
      "nickname",
      "resetname",
      "permissions",
      "userperms",
      "voiceinfo",
      "activity",
      "history",
      "warnings",
      "notes",
      "note",
      "modnote",
      "addnote",
      "removenote",
      "clearhistory",
      "clearwarnings",
      "userstats",
      "userxp",
      "usercoins",
      "resetuser",
      "resetxp",
      "resetcoins",
      "resetprofile",
      "blacklist",
      "unblacklist",
      "userhelp"
    ]
  },

  admin_servidor: {
    name: "⚙️ Servidor",
    description: "Configuración general del servidor.",
    admin: true,
    commands: [
      "serverinfo",
      "server",
      "setprefix",
      "prefix",
      "setwelcome",
      "welcome",
      "welcomeon",
      "welcomeoff",
      "setwelcomechannel",
      "setlogchannel",
      "logchannel",
      "setautorole",
      "autorole",
      "autoroleon",
      "autoroleoff",
      "setmuterole",
      "muterole",
      "settings",
      "config",
      "configuration",
      "serverconfig",
      "servername",
      "setservername",
      "servericon",
      "setservericon",
      "verification",
      "channels",
      "roles",
      "categories",
      "emojis",
      "serverstats",
      "members",
      "membercount",
      "lockserver",
      "unlockserver",
      "serverbackup",
      "serverstatus",
      "serverhealth",
      "serverhelp"
    ]
  },

  admin_logs: {
    name: "📜 Logs",
    description: "Registros administrativos.",
    admin: true,
    commands: [
      "logs",
      "log",
      "modlogs",
      "modlog",
      "securitylogs",
      "auditlogs",
      "audit",
      "recentlogs",
      "lastlogs",
      "clearlogs",
      "deletelogs",
      "logchannel",
      "setlogchannel",
      "logstatus",
      "logon",
      "logoff",
      "messageLogs",
      "memberlogs",
      "joinlogs",
      "leavelogs",
      "banlogs",
      "kicklogs",
      "timeoutlogs",
      "warnlogs",
      "rolelogs",
      "channellogs",
      "serverlogs",
      "configlogs",
      "automodlogs",
      "antilinklogs",
      "antispamlogs",
      "securitylog",
      "modlogstats",
      "logstats",
      "logcount",
      "logsearch",
      "logexport",
      "loghelp"
    ]
  },

  admin_economia: {
    name: "💰 Economía",
    description: "Administración de la economía.",
    admin: true,
    commands: [
      "givecoins",
      "takecoins",
      "setcoins",
      "resetcoins",
      "addmoney",
      "removemoney",
      "setmoney",
      "resetmoney",
      "givebank",
      "takebank",
      "setbank",
      "resetbank",
      "economy",
      "economystats",
      "economyreset",
      "economybackup",
      "economyrestore",
      "economysettings",
      "dailyamount",
      "weeklyamount",
      "workamount",
      "bonusamount",
      "setreward",
      "resetreward",
      "coinconfig",
      "bankconfig",
      "leaderboard",
      "coinstop",
      "richest",
      "moneylogs",
      "economylogs",
      "transactionlogs",
      "transactions",
      "transaction",
      "paycheck",
      "salary",
      "income",
      "expenses",
      "economyhelp"
    ]
  },

  admin_minijuegos: {
    name: "🎮 Minijuegos",
    description: "Administración de los minijuegos.",
    admin: true,
    commands: [
      "gamesettings",
      "games",
      "gameconfig",
      "gameon",
      "gameoff",
      "trivia",
      "triviaconfig",
      "triviaon",
      "triviaoff",
      "rps",
      "rpsconfig",
      "memory",
      "memoryconfig",
      "reaction",
      "reactionconfig",
      "duel",
      "duelconfig",
      "quiz",
      "quizconfig",
      "gamexp",
      "gamecoins",
      "gamebonus",
      "gamecooldown",
      "gameleaderboard",
      "gameleaders",
      "gamewins",
      "gamewinsreset",
      "gamestats",
      "gamestatsreset",
      "gamehistory",
      "gamehistoryclear",
      "gameplayers",
      "gameactive",
      "gamecleanup",
      "gamehelp"
    ]
  },

  admin_herramientas: {
    name: "🧹 Herramientas",
    description: "Herramientas administrativas.",
    admin: true,
    commands: [
      "purge",
      "clear",
      "clearall",
      "clean",
      "slowmode",
      "unslowmode",
      "lock",
      "unlock",
      "lockdown",
      "unlockdown",
      "say",
      "embed",
      "announce",
      "announcement",
      "poll",
      "channelinfo",
      "roleinfo",
      "createchannel",
      "deletechannel",
      "createcategory",
      "deletecategory",
      "createrole",
      "deleterole",
      "addrole",
      "removerole",
      "renamechannel",
      "renamecategory",
      "renamerole",
      "permissions",
      "channelperms",
      "roleperms",
      "maintenance",
      "maintenanceon",
      "maintenanceoff",
      "botstatus",
      "botactivity",
      "setactivity",
      "tools",
      "adminhelp"
    ]
  },

  admin_estadisticas: {
    name: "📊 Estadísticas",
    description: "Estadísticas administrativas.",
    admin: true,
    commands: [
      "serverstats",
      "memberstats",
      "messagestats",
      "commandstats",
      "modstats",
      "securitystats",
      "economystats",
      "gamestats",
      "logstats",
      "activitystats",
      "growthstats",
      "userstats",
      "topmembers",
      "topmessages",
      "topcommands",
      "topcoins",
      "topxp",
      "topwins",
      "toptrivia",
      "leaderboard",
      "rankings",
      "activeusers",
      "inactiveusers",
      "newmembers",
      "oldmembers",
      "channelstats",
      "rolestats",
      "botstats",
      "uptime",
      "ping",
      "latency",
      "memory",
      "runtime",
      "performance",
      "health",
      "healthcheck",
      "diagnostics",
      "systemstats",
      "statistics",
      "statshelp"
    ]
  },

  admin_avanzado: {
    name: "🌐 Avanzado",
    description: "Funciones avanzadas de administración.",
    admin: true,
    commands: [
      "config",
      "configuration",
      "settings",
      "backup",
      "backupdata",
      "restore",
      "restoredata",
      "export",
      "exportdata",
      "import",
      "reset",
      "resetconfig",
      "resetserver",
      "resetusers",
      "database",
      "databaseinfo",
      "datastats",
      "datarepair",
      "datamigrate",
      "reload",
      "reloadconfig",
      "reloaddata",
      "health",
      "diagnostics",
      "debug",
      "debugon",
      "debugoff",
      "maintenance",
      "maintenanceon",
      "maintenanceoff",
      "botconfig",
      "botstatus",
      "botinfo",
      "setactivity",
      "setstatus",
      "restartinfo",
      "environment",
      "advanced",
      "advancedsettings",
      "advancedhelp"
    ]
  }
};

// ============================================================
// AYUDA
// ============================================================

const normalCategories = [
  "economia",
  "social",
  "minijuegos",
  "recompensas",
  "estadisticas",
  "herramientas",
  "personalizacion",
  "logros",
  "informacion",
  "nexora"
];

const adminCategories = [
  "admin_moderacion",
  "admin_seguridad",
  "admin_usuarios",
  "admin_servidor",
  "admin_logs",
  "admin_economia",
  "admin_minijuegos",
  "admin_herramientas",
  "admin_estadisticas",
  "admin_avanzado"
];

function mainHelpMenu(member) {
  const options = normalCategories.map(key => {
    const cat = CATEGORIES[key];

    return {
      label: cat.name,
      description: cat.description,
      value: key
    };
  });

  if (isAdmin(member)) {
    options.push({
      label: "👑 Panel de Admin",
      description: "Funciones administrativas",
      value: "admin"
    });
  }

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("nexora_help_category")
      .setPlaceholder("Selecciona una categoría")
      .addOptions(options)
  );
}

function helpEmbed() {
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle("🌌 NEXORA — Centro de ayuda")
    .setDescription(
      [
        "Selecciona una categoría para ver sus comandos.",
        "",
        "📌 Los comandos aparecen **uno por línea**.",
        "📖 Cada categoría contiene 40 comandos.",
        "📄 Se muestran 20 por página.",
        "",
        "👑 El Panel de Admin solo aparece para administradores."
      ].join("\n")
    )
    .setFooter({
      text: "Nexora • Sistema de ayuda"
    });
}

function categoryPage(categoryKey, page) {
  const category = CATEGORIES[categoryKey];

  const start = page === 1 ? 0 : 20;

  const commands = category.commands.slice(
    start,
    start + 20
  );

  const lines = commands.map((command, index) => {
    return `**${start + index + 1}.** \`${PREFIX}${command}\``;
  });

  const embed = new EmbedBuilder()
    .setColor(category.admin ? 0xED4245 : 0x5865F2)
    .setTitle(`${category.name}`)
    .setDescription(
      `${category.description}\n\n${lines.join("\n")}`
    )
    .setFooter({
      text: `Página ${page}/2 • ${category.commands.length} comandos`
    });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`help_prev:${categoryKey}:${page}`)
      .setLabel("⬅️ Anterior")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 1),

    new ButtonBuilder()
      .setCustomId(`help_home:${categoryKey}`)
      .setLabel("🏠 Menú")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId(`help_next:${categoryKey}:${page}`)
      .setLabel("Siguiente ➡️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 2)
  );

  return {
    embeds: [embed],
    components: [row]
  };
}

// ============================================================
// TRIVIA
// ============================================================

const triviaQuestions = [
  {
    q: "¿Cuál es el planeta más cercano al Sol?",
    a: ["Mercurio", "Venus", "Marte", "Júpiter"],
    c: 0
  },
  {
    q: "¿Cuántos continentes hay normalmente en el modelo de 7 continentes?",
    a: ["5", "6", "7", "8"],
    c: 2
  },
  {
    q: "¿Cuál es el océano más grande?",
    a: ["Atlántico", "Índico", "Pacífico", "Ártico"],
    c: 2
  },
  {
    q: "¿Qué gas necesitan principalmente las plantas para la fotosíntesis?",
    a: ["Oxígeno", "Dióxido de carbono", "Helio", "Hidrógeno"],
    c: 1
  },
  {
    q: "¿Cuánto es 12 × 8?",
    a: ["86", "96", "108", "88"],
    c: 1
  },
  {
    q: "¿Cuál es el satélite natural de la Tierra?",
    a: ["El Sol", "Marte", "La Luna", "Venus"],
    c: 2
  },
  {
    q: "¿Cuál es el resultado de 100 ÷ 4?",
    a: ["20", "25", "30", "40"],
    c: 1
  },
  {
    q: "¿Qué instrumento tiene teclas blancas y negras?",
    a: ["Violín", "Piano", "Trompeta", "Flauta"],
    c: 1
  }
];

const activeGames = new Map();

function createTrivia(message) {
  const question = pick(triviaQuestions);

  const buttons = question.a.map((answer, index) =>
    new ButtonBuilder()
      .setCustomId(
        `trivia:${message.id}:${index}`
      )
      .setLabel(
        `${String.fromCharCode(65 + index)}. ${answer}`
      )
      .setStyle(ButtonStyle.Primary)
  );

  const row = new ActionRowBuilder()
    .addComponents(buttons);

  activeGames.set(message.id, {
    type: "trivia",
    userId: message.author.id,
    correct: question.c,
    question
  });

  return {
    embeds: [
      new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle("🧠 Trivia Nexora")
        .setDescription(
          `**${question.q}**\n\n` +
          "Selecciona una respuesta:"
        )
        .setFooter({
          text: "Solo quien inició la trivia puede responder."
        })
    ],
    components: [row]
  };
}

// ============================================================
// RPS
// ============================================================

const rpsOptions = {
  piedra: "🪨",
  papel: "📄",
  tijera: "✂️"
};

function rpsResult(user, bot) {
  if (user === bot) return "draw";

  if (
    (user === "piedra" && bot === "tijera") ||
    (user === "papel" && bot === "piedra") ||
    (user === "tijera" && bot === "papel")
  ) {
    return "win";
  }

  return "loss";
}

function createRPS(message) {
  activeGames.set(message.id, {
    type: "rps",
    userId: message.author.id
  });

  return {
    embeds: [
      new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle("🎮 Piedra, Papel o Tijera")
        .setDescription(
          "Elige tu movimiento."
        )
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`rps:${message.id}:piedra`)
          .setLabel("🪨 Piedra")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId(`rps:${message.id}:papel`)
          .setLabel("📄 Papel")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId(`rps:${message.id}:tijera`)
          .setLabel("✂️ Tijera")
          .setStyle(ButtonStyle.Primary)
      )
    ]
  };
}

// ============================================================
// ANTI-SPAM
// ============================================================

const spamTracker = new Map();

function checkSpam(message) {
  if (!message.guild) return false;

  const guildData = getGuildData(
    message.guild.id
  );

  if (!guildData.config.antiSpam) {
    return false;
  }

  const key =
    `${message.guild.id}:${message.author.id}`;

  const now = Date.now();

  const list =
    spamTracker.get(key) || [];

  const recent = list.filter(
    time => now - time < 5000
  );

  recent.push(now);

  spamTracker.set(key, recent);

  return recent.length >= 6;
}

// ============================================================
// ANTILINK
// ============================================================

function containsLink(content) {
  return /(?:https?:\/\/|www\.|discord\.gg\/|discord\.com\/invite\/)/i
    .test(content);
}

async function handleAntiLink(message) {
  if (!message.guild) return false;

  const guildData = getGuildData(
    message.guild.id
  );

  if (!guildData.config.antiLink) {
    return false;
  }

  if (isModerator(message.member)) {
    return false;
  }

  if (!containsLink(message.content)) {
    return false;
  }

  try {
    await message.delete();
  } catch {}

  try {
    await message.member.timeout(
      2 * 60 * 60 * 1000,
      "AntiLink de Nexora"
    );
  } catch {}

  await logAction(
    message.guild,
    `🔗 **AntiLink:** ${message.author.tag} recibió un timeout de 2 horas por enviar un enlace.`
  );

  return true;
}

// ============================================================
// AUTOMOD
// ============================================================

const blockedWords = [
  "spamword1",
  "spamword2"
];

function containsBlockedWord(content) {
  const lower = content.toLowerCase();

  return blockedWords.some(
    word => lower.includes(word)
  );
}

// ============================================================
// BIENVENIDA
// ============================================================

client.on(
  Events.GuildMemberAdd,
  async member => {

    const guildData =
      getGuildData(member.guild.id);

    if (guildData.config.autoRole) {
      const role =
        member.guild.roles.cache.get(
          guildData.config.autoRole
        );

      if (role) {
        try {
          await member.roles.add(role);
        } catch {}
      }
    }

    if (!guildData.config.welcome) {
      return;
    }

    const channel =
      member.guild.channels.cache.get(
        guildData.config.welcomeChannel
      );

    if (!channel) return;

    const text =
      guildData.config.welcomeMessage
        .replaceAll(
          "{user}",
          `<@${member.id}>`
        )
        .replaceAll(
          "{server}",
          member.guild.name
        );

    try {
      await channel.send({
        content: text
      });
    } catch {}
  }
);

// ============================================================
// READY
// ============================================================

client.once(
  Events.ClientReady,
  readyClient => {

    console.log(
      "======================================"
    );

    console.log(
      `🌌 NEXORA ONLINE`
    );

    console.log(
      `🤖 Bot: ${readyClient.user.tag}`
    );

    console.log(
      `🆔 ID: ${readyClient.user.id}`
    );

    console.log(
      `🌐 Servidores: ${readyClient.guilds.cache.size}`
    );

    console.log(
      `⚡ Prefix: ${PREFIX}`
    );

    console.log(
      "======================================"
    );

    readyClient.user.setPresence({
      activities: [
        {
          name: `${PREFIX}help`,
          type: 0
        }
      ],
      status: "online"
    });
  }
);

// ============================================================
// MENSAJES
// ============================================================

client.on(
  Events.MessageCreate,
  async message => {

    if (!message.guild) return;

    if (message.author.bot) return;

    const guildData =
      getGuildData(message.guild.id);

    const userData =
      getUserData(
        message.guild.id,
        message.author.id
      );

    guildData.serverStats.messages++;

    userData.messages++;

    addXP(
      message.guild.id,
      message.author.id,
      2
    );

    saveData();

    // --------------------------------------------------------
    // ANTILINK
    // --------------------------------------------------------

    if (
      await handleAntiLink(message)
    ) {
      return;
    }

    // --------------------------------------------------------
    // ANTISPAM
    // --------------------------------------------------------

    if (checkSpam(message)) {

      try {
        await message.member.timeout(
          60 * 1000,
          "AntiSpam de Nexora"
        );
      } catch {}

      await logAction(
        message.guild,
        `🚨 **AntiSpam:** ${message.author.tag} recibió un timeout de 1 minuto.`
      );

      return;
    }

    // --------------------------------------------------------
    // AUTOMOD
    // --------------------------------------------------------

    if (
      guildData.config.autoMod &&
      containsBlockedWord(message.content)
    ) {

      try {
        await message.delete();
      } catch {}

      await logAction(
        message.guild,
        `🛡️ **AutoMod:** mensaje eliminado de ${message.author.tag}.`
      );

      return;
    }

    // --------------------------------------------------------
    // PREFIX
    // --------------------------------------------------------

    if (!message.content.startsWith(PREFIX)) {
      return;
    }

    const args =
      message.content
        .slice(PREFIX.length)
        .trim()
        .split(/\s+/);

    const commandName =
      (args.shift() || "").toLowerCase();

    if (!commandName) return;

    userData.commands++;

    guildData.serverStats.commands++;

    saveData();

    await executeCommand(
      message,
      commandName,
      args
    );
  }
);

// ============================================================
// EJECUTAR COMANDOS
// ============================================================

async function executeCommand(
  message,
  command,
  args
) {

  const guildId =
    message.guild.id;

  const userId =
    message.author.id;

  const guildData =
    getGuildData(guildId);

  const userData =
    getUserData(guildId, userId);

  // ==========================================================
  // AYUDA
  // ==========================================================

  if (
    command === "help" ||
    command === "commands"
  ) {

    return message.reply({
      embeds: [helpEmbed()],
      components: [
        mainHelpMenu(message.member)
      ]
    });
  }

  // ==========================================================
  // PING
  // ==========================================================

  if (command === "ping") {

    return message.reply(
      `🏓 Pong!\nLatencia: **${client.ws.ping}ms**`
    );
  }

  // ==========================================================
  // BALANCE
  // ==========================================================

  if (
    [
      "balance",
      "coins",
      "saldo",
      "wallet",
      "money",
      "cash"
    ].includes(command)
  ) {

    return message.reply(
      `💰 ${message.author}, tienes **${formatCoins(userData.coins)}**.\n` +
      `🏦 Banco: **${formatCoins(userData.bank)}**`
    );
  }

  // ==========================================================
  // DAILY
  // ==========================================================

  if (
    command === "daily" ||
    command === "claimdaily"
  ) {

    const now = Date.now();

    if (
      now - userData.lastDaily <
      24 * 60 * 60 * 1000
    ) {

      const remaining =
        24 * 60 * 60 * 1000 -
        (now - userData.lastDaily);

      return message.reply(
        `⏳ Ya reclamaste tu recompensa diaria.\n` +
        `Vuelve en **${msToText(remaining)}**.`
      );
    }

    const reward = random(100, 300);

    userData.coins += reward;
    userData.lastDaily = now;
    userData.daily++;

    saveData();

    return message.reply(
      `🎁 Recompensa diaria recibida:\n\n` +
      `**+${formatCoins(reward)}**`
    );
  }

  // ==========================================================
  // WEEKLY
  // ==========================================================

  if (
    command === "weekly" ||
    command === "claimweekly"
  ) {

    const now = Date.now();

    if (
      now - userData.lastWeekly <
      7 * 24 * 60 * 60 * 1000
    ) {

      const remaining =
        7 * 24 * 60 * 60 * 1000 -
        (now - userData.lastWeekly);

      return message.reply(
        `⏳ Ya reclamaste tu recompensa semanal.\n` +
        `Vuelve en **${msToText(remaining)}**.`
      );
    }

    const reward = random(500, 1000);

    userData.coins += reward;
    userData.lastWeekly = now;
    userData.weekly++;

    saveData();

    return message.reply(
      `🎁 Recompensa semanal:\n\n` +
      `**+${formatCoins(reward)}**`
    );
  }

  // ==========================================================
  // WORK
  // ==========================================================

  if (
    [
      "work",
      "job",
      "career",
      "salary",
      "income"
    ].includes(command)
  ) {

    const reward = random(50, 200);

    userData.coins += reward;

    addXP(
      guildId,
      userId,
      10
    );

    saveData();

    return message.reply(
      `💼 Trabajaste y ganaste **${formatCoins(reward)}**.`
    );
  }

  // ==========================================================
  // PAY
  // ==========================================================

  if (
    command === "pay" ||
    command === "transfer"
  ) {

    const targetId =
      cleanUserId(args[0]);

    const amount =
      Number(args[1]);

    if (!targetId) {
      return message.reply(
        `❌ Uso: \`${PREFIX}pay @usuario cantidad\``
      );
    }

    if (
      !Number.isInteger(amount) ||
      amount <= 0
    ) {
      return message.reply(
        "❌ La cantidad debe ser un número positivo."
      );
    }

    if (targetId === userId) {
      return message.reply(
        "❌ No puedes enviarte monedas a ti mismo."
      );
    }

    if (userData.coins < amount) {
      return message.reply(
        "❌ No tienes suficientes monedas."
      );
    }

    const target =
      getUserData(guildId, targetId);

    userData.coins -= amount;
    target.coins += amount;

    saveData();

    return message.reply(
      `💸 Transferiste **${formatCoins(amount)}** a <@${targetId}>.`
    );
  }

  // ==========================================================
  // DEPOSIT
  // ==========================================================

  if (command === "deposit") {

    const amount =
      Number(args[0]);

    if (
      !Number.isInteger(amount) ||
      amount <= 0
    ) {
      return message.reply(
        `❌ Uso: \`${PREFIX}deposit cantidad\``
      );
    }

    if (userData.coins < amount) {
      return message.reply(
        "❌ No tienes suficientes monedas."
      );
    }

    userData.coins -= amount;
    userData.bank += amount;

    saveData();

    return message.reply(
      `🏦 Depositaste **${formatCoins(amount)}**.`
    );
  }

  // ==========================================================
  // WITHDRAW
  // ==========================================================

  if (command === "withdraw") {

    const amount =
      Number(args[0]);

    if (
      !Number.isInteger(amount) ||
      amount <= 0
    ) {
      return message.reply(
        `❌ Uso: \`${PREFIX}withdraw cantidad\``
      );
    }

    if (userData.bank < amount) {
      return message.reply(
        "❌ No tienes suficiente dinero en el banco."
      );
    }

    userData.bank -= amount;
    userData.coins += amount;

    saveData();

    return message.reply(
      `💰 Retiraste **${formatCoins(amount)}**.`
    );
  }

  // ==========================================================
  // LEADERBOARD
  // ==========================================================

  if (
    [
      "leaderboard",
      "lb",
      "topcoins",
      "coinstop",
      "richest"
    ].includes(command)
  ) {

    const users =
      Object.entries(guildData.users)
        .sort(
          (a, b) =>
            (b[1].coins + b[1].bank) -
            (a[1].coins + a[1].bank)
        )
        .slice(0, 10);

    const lines =
      users.map(
        ([id, u], index) =>
          `**${index + 1}.** <@${id}> — ${formatCoins(u.coins + u.bank)}`
      );

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xF1C40F)
          .setTitle("🏆 Top de Economía")
          .setDescription(
            lines.length
              ? lines.join("\n")
              : "Todavía no hay datos."
          )
      ]
    });
  }

  // ==========================================================
  // PERFIL
  // ==========================================================

  if (
    [
      "profile",
      "perfil",
      "mystats",
      "stats"
    ].includes(command)
  ) {

    const targetId =
      cleanUserId(args[0]) || userId;

    const targetUser =
      await client.users.fetch(targetId)
        .catch(() => message.author);

    const targetData =
      getUserData(guildId, targetUser.id);

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(`👤 Perfil de ${targetUser.username}`)
          .setThumbnail(
            targetUser.displayAvatarURL()
          )
          .addFields(
            {
              name: "💰 Monedas",
              value: formatCoins(targetData.coins),
              inline: true
            },
            {
              name: "🏦 Banco",
              value: formatCoins(targetData.bank),
              inline: true
            },
            {
              name: "⭐ Nivel",
              value: String(targetData.level),
              inline: true
            },
            {
              name: "✨ XP",
              value: String(targetData.xp),
              inline: true
            },
            {
              name: "💬 Mensajes",
              value: String(targetData.messages),
              inline: true
            },
            {
              name: "🎮 Victorias",
              value: String(targetData.wins),
              inline: true
            }
          )
      ]
    });
  }

  // ==========================================================
  // USERINFO
  // ==========================================================

  if (
    [
      "userinfo",
      "user",
      "member",
      "whois"
    ].includes(command)
  ) {

    const targetId =
      cleanUserId(args[0]) || userId;

    const member =
      await message.guild.members.fetch(
        targetId
      ).catch(() => null);

    if (!member) {
      return message.reply(
        "❌ Usuario no encontrado."
      );
    }

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(`👤 ${member.user.tag}`)
          .setThumbnail(
            member.user.displayAvatarURL()
          )
          .addFields(
            {
              name: "🆔 ID",
              value: member.id,
              inline: true
            },
            {
              name: "📅 Cuenta",
              value: `<t:${Math.floor(
                member.user.createdTimestamp / 1000
              )}:F>`,
              inline: false
            },
            {
              name: "📥 Entrada",
              value: member.joinedTimestamp
                ? `<t:${Math.floor(
                    member.joinedTimestamp / 1000
                  )}:F>`
                : "Desconocida",
              inline: false
            },
            {
              name: "👑 Roles",
              value:
                member.roles.cache
                  .filter(r => r.id !== message.guild.id)
                  .map(r => r.toString())
                  .slice(0, 15)
                  .join(", ") ||
                "Sin roles"
            }
          ]
      ]
    });
  }

  // ==========================================================
  // SERVERINFO
  // ==========================================================

  if (
    [
      "serverinfo",
      "server",
      "guild"
    ].includes(command)
  ) {

    const guild =
      message.guild;

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(`🏠 ${guild.name}`)
          .setThumbnail(
            guild.iconURL()
          )
          .addFields(
            {
              name: "👥 Miembros",
              value: String(guild.memberCount),
              inline: true
            },
            {
              name: "💬 Canales",
              value: String(guild.channels.cache.size),
              inline: true
            },
            {
              name: "🎭 Roles",
              value: String(guild.roles.cache.size),
              inline: true
            },
            {
              name: "🆔 ID",
              value: guild.id,
              inline: false
            },
            {
              name: "👑 Propietario",
              value: `<@${guild.ownerId}>`,
              inline: false
            }
          ]
      ]
    });
  }

  // ==========================================================
  // AVATAR
  // ==========================================================

  if (command === "avatar") {

    const targetId =
      cleanUserId(args[0]) || userId;

    const user =
      await client.users.fetch(
        targetId
      ).catch(() => message.author);

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(`🖼️ Avatar de ${user.username}`)
          .setImage(
            user.displayAvatarURL({
              size: 1024
            })
          )
      ]
    });
  }

  // ==========================================================
  // XP / RANK
  // ==========================================================

  if (
    [
      "xp",
      "rank",
      "nivel",
      "level"
    ].includes(command)
  ) {

    return message.reply(
      `⭐ **${message.author.username}**\n\n` +
      `Nivel: **${userData.level}**\n` +
      `XP: **${userData.xp}/${userData.level * 100}**`
    );
  }

  // ==========================================================
  // TRIVIA
  // ==========================================================

  if (
    command === "trivia" ||
    command === "quiz" ||
    command === "brainquiz"
  ) {

    const sent =
      await message.reply(
        "🧠 Preparando la trivia..."
      );

    const game =
      createTrivia({
        id: sent.id,
        author: message.author
      });

    return sent.edit(game);
  }

  // ==========================================================
  // RPS
  // ==========================================================

  if (
    command === "rps" ||
    command === "ppt"
  ) {

    const sent =
      await message.reply(
        "🎮 Preparando..."
      );

    return sent.edit(
      createRPS({
        id: sent.id,
        author: message.author
      })
    );
  }

  // ==========================================================
  // GUESS NUMBER
  // ==========================================================

  if (
    command === "guess" ||
    command === "guessnumber"
  ) {

    const number =
      random(1, 10);

    const answer =
      Number(args[0]);

    if (
      !Number.isInteger(answer) ||
      answer < 1 ||
      answer > 10
    ) {

      return message.reply(
        `🎯 Adivina un número entre **1 y 10**.\n` +
        `Ejemplo: \`${PREFIX}guess 7\``
      );
    }

    if (answer === number) {

      userData.wins++;

      userData.coins += 25;

      saveData();

      return message.reply(
        `🎉 ¡Correcto! Era **${number}**.\n` +
        `💰 Ganaste **25 🪙**.`
      );
    }

    userData.losses++;

    saveData();

    return message.reply(
      `❌ No era ese número. Era **${number}**.`
    );
  }

  // ==========================================================
  // MATH
  // ==========================================================

  if (
    [
      "math",
      "quickmath",
      "calculate",
      "calc"
    ].includes(command)
  ) {

    const a = random(2, 20);
    const b = random(2, 20);

    const operations = [
      {
        symbol: "+",
        answer: a + b
      },
      {
        symbol: "-",
        answer: a - b
      },
      {
        symbol: "×",
        answer: a * b
      }
    ];

    const operation =
      pick(operations);

    return message.reply(
      `🧮 Resuelve:\n\n` +
      `**${a} ${operation.symbol} ${b} = ?**\n\n` +
      `Respuesta: ||${operation.answer}||`
    );
  }

  // ==========================================================
  // ACHIEVEMENTS
  // ==========================================================

  if (
    [
      "achievements",
      "logros",
      "achievement",
      "logro",
      "badges",
      "trophies"
    ].includes(command)
  ) {

    const achievements = [
      {
        id: "first_message",
        name: "💬 Primer mensaje",
        unlocked: userData.messages >= 1
      },
      {
        id: "first_command",
        name: "⚡ Primer comando",
        unlocked: userData.commands >= 1
      },
      {
        id: "level_5",
        name: "⭐ Nivel 5",
        unlocked: userData.level >= 5
      },
      {
        id: "rich",
        name: "💰 Ahorrador",
        unlocked:
          userData.coins + userData.bank >= 1000
      },
      {
        id: "winner",
        name: "🏆 Ganador",
        unlocked: userData.wins >= 5
      }
    ];

    const lines =
      achievements.map(a =>
        `${a.unlocked ? "✅" : "🔒"} ${a.name}`
      );

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xF1C40F)
          .setTitle("🏆 Tus logros")
          .setDescription(
            lines.join("\n")
          )
      ]
    });
  }

  // ==========================================================
  // BOT INFO
  // ==========================================================

  if (
    [
      "about",
      "aboutbot",
      "botinfo",
      "nexora",
      "nexorainfo",
      "info"
    ].includes(command)
  ) {

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle("🌌 Nexora")
          .setDescription(
            "Bot multifunción para Discord."
          )
          .addFields(
            {
              name: "⚡ Prefijo",
              value: PREFIX,
              inline: true
            },
            {
              name: "🌐 Servidores",
              value: String(
                client.guilds.cache.size
              ),
              inline: true
            },
            {
              name: "👥 Usuarios",
              value: String(
                client.users.cache.size
              ),
              inline: true
            }
          )
      ]
    });
  }

  // ==========================================================
  // UPTIME
  // ==========================================================

  if (
    command === "uptime" ||
    command === "runtime"
  ) {

    return message.reply(
      `⏱️ Nexora lleva activo **${msToText(
        client.uptime || 0
      )}**.`
    );
  }

  // ==========================================================
  // ECONOMY ADMIN
  // ==========================================================

  if (
    [
      "givecoins",
      "addmoney"
    ].includes(command)
  ) {

    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ Necesitas ser administrador."
      );
    }

    const targetId =
      cleanUserId(args[0]);

    const amount =
      Number(args[1]);

    if (
      !targetId ||
      !Number.isInteger(amount) ||
      amount <= 0
    ) {
      return message.reply(
        `❌ Uso: \`${PREFIX}${command} @usuario cantidad\``
      );
    }

    const target =
      getUserData(
        guildId,
        targetId
      );

    target.coins += amount;

    saveData();

    await logAction(
      message.guild,
      `💰 ${message.author.tag} añadió ${formatCoins(amount)} a <@${targetId}>.`
    );

    return message.reply(
      `✅ Añadiste **${formatCoins(amount)}** a <@${targetId}>.`
    );
  }

  // ==========================================================
  // TAKE COINS
  // ==========================================================

  if (
    [
      "takecoins",
      "removemoney"
    ].includes(command)
  ) {

    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ Necesitas ser administrador."
      );
    }

    const targetId =
      cleanUserId(args[0]);

    const amount =
      Number(args[1]);

    if (
      !targetId ||
      !Number.isInteger(amount) ||
      amount <= 0
    ) {
      return message.reply(
        `❌ Uso: \`${PREFIX}${command} @usuario cantidad\``
      );
    }

    const target =
      getUserData(
        guildId,
        targetId
      );

    target.coins =
      Math.max(
        0,
        target.coins - amount
      );

    saveData();

    return message.reply(
      `✅ Retiraste **${formatCoins(amount)}** a <@${targetId}>.`
    );
  }

  // ==========================================================
  // SET COINS
  // ==========================================================

  if (
    [
      "setcoins",
      "setmoney"
    ].includes(command)
  ) {

    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ Necesitas ser administrador."
      );
    }

    const targetId =
      cleanUserId(args[0]);

    const amount =
      Number(args[1]);

    if (
      !targetId ||
      !Number.isInteger(amount) ||
      amount < 0
    ) {
      return message.reply(
        `❌ Uso: \`${PREFIX}${command} @usuario cantidad\``
      );
    }

    const target =
      getUserData(
        guildId,
        targetId
      );

    target.coins = amount;

    saveData();

    return message.reply(
      `✅ El saldo de <@${targetId}> ahora es **${formatCoins(amount)}**.`
    );
  }

  // ==========================================================
  // WARN
  // ==========================================================

  if (command === "warn") {

    if (!isModerator(message.member)) {
      return message.reply(
        "❌ Necesitas permisos de moderación."
      );
    }

    const targetId =
      cleanUserId(args[0]);

    if (!targetId) {
      return message.reply(
        `❌ Uso: \`${PREFIX}warn @usuario razón\``
      );
    }

    if (targetId === message.author.id) {
      return message.reply(
        "❌ No puedes advertirte a ti mismo."
      );
    }

    const reason =
      args.slice(1).join(" ") ||
      "Sin razón especificada";

    guildData.warnings[targetId] ||=
      [];

    guildData.warnings[targetId].push({
      reason,
      moderator: message.author.id,
      timestamp: Date.now()
    });

    saveData();

    await logAction(
      message.guild,
      `⚠️ ${message.author.tag} advirtió a <@${targetId}>: ${reason}`
    );

    return message.reply(
      `⚠️ <@${targetId}> recibió una advertencia.\n` +
      `📝 Razón: **${reason}**`
    );
  }

  // ==========================================================
  // WARNINGS
  // ==========================================================

  if (
    command === "warnings" ||
    command === "warns"
  ) {

    if (!isModerator(message.member)) {
      return message.reply(
        "❌ Necesitas permisos de moderación."
      );
    }

    const targetId =
      cleanUserId(args[0]) ||
      message.author.id;

    const warnings =
      guildData.warnings[targetId] || [];

    if (!warnings.length) {
      return message.reply(
        `✅ <@${targetId}> no tiene advertencias.`
      );
    }

    const lines =
      warnings.map(
        (warning, index) =>
          `**${index + 1}.** ${warning.reason} — <@${warning.moderator}>`
      );

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xF1C40F)
          .setTitle("⚠️ Advertencias")
          .setDescription(
            lines.join("\n")
          )
      ]
    });
  }

  // ==========================================================
  // CLEARWARNS
  // ==========================================================

  if (
    [
      "clearwarns",
      "clearwarnings"
    ].includes(command)
  ) {

    if (!isModerator(message.member)) {
      return message.reply(
        "❌ Necesitas permisos de moderación."
      );
    }

    const targetId =
      cleanUserId(args[0]);

    if (!targetId) {
      return message.reply(
        `❌ Uso: \`${PREFIX}clearwarns @usuario\``
      );
    }

    delete guildData.warnings[targetId];

    saveData();

    return message.reply(
      `✅ Advertencias de <@${targetId}> eliminadas.`
    );
  }

  // ==========================================================
  // BAN
  // ==========================================================

  if (command === "ban") {

    if (!isModerator(message.member)) {
      return message.reply(
        "❌ Necesitas permisos de moderación."
      );
    }

    const targetId =
      cleanUserId(args[0]);

    if (!targetId) {
      return message.reply(
        `❌ Uso: \`${PREFIX}ban @usuario razón\``
      );
    }

    if (targetId === message.author.id) {
      return message.reply(
        "❌ No puedes banearte a ti mismo."
      );
    }

    const member =
      await message.guild.members.fetch(
        targetId
      ).catch(() => null);

    if (member) {

      if (
        !member.bannable
      ) {
        return message.reply(
          "❌ No puedo banear a ese usuario. Revisa la jerarquía de roles."
        );
      }
    }

    const reason =
      args.slice(1).join(" ") ||
      "Sin razón especificada";

    try {

      await message.guild.members.ban(
        targetId,
        {
          reason
        }
      );

    } catch {
      return message.reply(
        "❌ No pude banear al usuario."
      );
    }

    await logAction(
      message.guild,
      `🔨 ${message.author.tag} baneó a <@${targetId}>: ${reason}`
    );

    return message.reply(
      `🔨 <@${targetId}> fue baneado.\n` +
      `📝 Razón: **${reason}**`
    );
  }

  // ==========================================================
  // UNBAN
  // ==========================================================

  if (command === "unban") {

    if (!isModerator(message.member)) {
      return message.reply(
        "❌ Necesitas permisos de moderación."
      );
    }

    const targetId =
      cleanUserId(args[0]);

    if (!targetId) {
      return message.reply(
        `❌ Uso: \`${PREFIX}unban ID\``
      );
    }

    try {

      await message.guild.members.unban(
        targetId
      );

    } catch {

      return message.reply(
        "❌ No pude quitar el ban. Comprueba el ID."
      );
    }

    await logAction(
      message.guild,
      `🔓 ${message.author.tag} quitó el ban de <@${targetId}>.`
    );

    return message.reply(
      `🔓 Ban eliminado para <@${targetId}>.`
    );
  }

  // ==========================================================
  // KICK
  // ==========================================================

  if (command === "kick") {

    if (!isModerator(message.member)) {
      return message.reply(
        "❌ Necesitas permisos de moderación."
      );
    }

    const targetId =
      cleanUserId(args[0]);

    const member =
      await message.guild.members.fetch(
        targetId
      ).catch(() => null);

    if (!member) {
      return message.reply(
        "❌ Usuario no encontrado."
      );
    }

    if (!member.kickable) {
      return message.reply(
        "❌ No puedo expulsar a ese usuario."
      );
    }

    const reason =
      args.slice(1).join(" ") ||
      "Sin razón especificada";

    try {
      await member.kick(reason);
    } catch {
      return message.reply(
        "❌ No pude expulsar al usuario."
      );
    }

    await logAction(
      message.guild,
      `👢 ${message.author.tag} expulsó a ${member.user.tag}: ${reason}`
    );

    return message.reply(
      `👢 **${member.user.tag}** fue expulsado.`
    );
  }

  // ==========================================================
  // TIMEOUT
  // ==========================================================

  if (command === "timeout") {

    if (!isModerator(message.member)) {
      return message.reply(
        "❌ Necesitas permisos de moderación."
      );
    }

    const targetId =
      cleanUserId(args[0]);

    const duration =
      parseDuration(args[1]);

    const member =
      await message.guild.members.fetch(
        targetId
      ).catch(() => null);

    if (!member) {
      return message.reply(
        "❌ Usuario no encontrado."
      );
    }

    if (!duration) {
      return message.reply(
        `❌ Usa una duración como \`10m\`, \`1h\` o \`2d\`.`
      );
    }

    if (duration > 28 * 24 * 60 * 60 * 1000) {
      return message.reply(
        "❌ Discord limita los timeouts a 28 días."
      );
    }

    try {

      await member.timeout(
        duration,
        args.slice(2).join(" ") ||
        "Moderación de Nexora"
      );

    } catch {
      return message.reply(
        "❌ No pude aplicar el timeout."
      );
    }

    return message.reply(
      `⏱️ <@${targetId}> recibió un timeout de **${msToText(duration)}**.`
    );
  }

  // ==========================================================
  // UNTIMEOUT
  // ==========================================================

  if (
    command === "untimeout" ||
    command === "unmute"
  ) {

    if (!isModerator(message.member)) {
      return message.reply(
        "❌ Necesitas permisos de moderación."
      );
    }

    const targetId =
      cleanUserId(args[0]);

    const member =
      await message.guild.members.fetch(
        targetId
      ).catch(() => null);

    if (!member) {
      return message.reply(
        "❌ Usuario no encontrado."
      );
    }

    try {
      await member.timeout(null);
    } catch {
      return message.reply(
        "❌ No pude quitar el timeout."
      );
    }

    return message.reply(
      `🔊 Timeout eliminado para <@${targetId}>.`
    );
  }

  // ==========================================================
  // PURGE
  // ==========================================================

  if (
    [
      "purge",
      "clear",
      "clean"
    ].includes(command)
  ) {

    if (!isModerator(message.member)) {
      return message.reply(
        "❌ Necesitas permisos de moderación."
      );
    }

    const amount =
      Number(args[0]);

    if (
      !Number.isInteger(amount) ||
      amount < 1 ||
      amount > 100
    ) {
      return message.reply(
        `❌ Usa una cantidad entre 1 y 100.`
      );
    }

    try {

      const deleted =
        await message.channel.bulkDelete(
          amount + 1,
          true
        );

      const response =
        await message.channel.send(
          `🧹 Eliminados **${Math.max(
            0,
            deleted.size - 1
          )}** mensajes.`
        );

      setTimeout(
        () => response.delete().catch(() => {}),
        4000
      );

    } catch {
      return message.reply(
        "❌ No pude eliminar los mensajes."
      );
    }

    return;
  }

  // ==========================================================
  // SLOWMODE
  // ==========================================================

  if (command === "slowmode") {

    if (!isModerator(message.member)) {
      return message.reply(
        "❌ Necesitas permisos de moderación."
      );
    }

    const seconds =
      Number(args[0]);

    if (
      !Number.isInteger(seconds) ||
      seconds < 0 ||
      seconds > 21600
    ) {
      return message.reply(
        "❌ Usa entre 0 y 21600 segundos."
      );
    }

    try {

      await message.channel.setRateLimitPerUser(
        seconds
      );

    } catch {
      return message.reply(
        "❌ No pude configurar el slowmode."
      );
    }

    return message.reply(
      `🐢 Slowmode establecido en **${seconds}s**.`
    );
  }

  // ==========================================================
  // UNSLOWMODE
  // ==========================================================

  if (command === "unslowmode") {

    if (!isModerator(message.member)) {
      return message.reply(
        "❌ Necesitas permisos de moderación."
      );
    }

    try {
      await message.channel.setRateLimitPerUser(0);
    } catch {
      return message.reply(
        "❌ No pude quitar el slowmode."
      );
    }

    return message.reply(
      "🐇 Slowmode desactivado."
    );
  }

  // ==========================================================
  // LOCK
  // ==========================================================

  if (command === "lock") {

    if (!isModerator(message.member)) {
      return message.reply(
        "❌ Necesitas permisos de moderación."
      );
    }

    try {

      await message.channel.permissionOverwrites.edit(
        message.guild.roles.everyone,
        {
          SendMessages: false
        }
      );

    } catch {
      return message.reply(
        "❌ No pude bloquear el canal."
      );
    }

    return message.reply(
      "🔒 Canal bloqueado."
    );
  }

  // ==========================================================
  // UNLOCK
  // ==========================================================

  if (command === "unlock") {

    if (!isModerator(message.member)) {
      return message.reply(
        "❌ Necesitas permisos de moderación."
      );
    }

    try {

      await message.channel.permissionOverwrites.edit(
        message.guild.roles.everyone,
        {
          SendMessages: null
        }
      );

    } catch {
      return message.reply(
        "❌ No pude desbloquear el canal."
      );
    }

    return message.reply(
      "🔓 Canal desbloqueado."
    );
  }

  // ==========================================================
  // NICK
  // ==========================================================

  if (
    command === "nick" ||
    command === "setnick"
  ) {

    if (!isModerator(message.member)) {
      return message.reply(
        "❌ Necesitas permisos de moderación."
      );
    }

    const targetId =
      cleanUserId(args[0]);

    const nickname =
      args.slice(1).join(" ");

    if (!targetId || !nickname) {
      return message.reply(
        `❌ Uso: \`${PREFIX}nick @usuario nuevo_nombre\``
      );
    }

    const member =
      await message.guild.members.fetch(
        targetId
      ).catch(() => null);

    if (!member) {
      return message.reply(
        "❌ Usuario no encontrado."
      );
    }

    try {
      await member.setNickname(nickname);
    } catch {
      return message.reply(
        "❌ No pude cambiar el apodo."
      );
    }

    return message.reply(
      `✏️ Apodo cambiado para <@${targetId}>.`
    );
  }

  // ==========================================================
  // RESET NICK
  // ==========================================================

  if (command === "resetnick") {

    if (!isModerator(message.member)) {
      return message.reply(
        "❌ Necesitas permisos de moderación."
      );
    }

    const targetId =
      cleanUserId(args[0]);

    const member =
      await message.guild.members.fetch(
        targetId
      ).catch(() => null);

    if (!member) {
      return message.reply(
        "❌ Usuario no encontrado."
      );
    }

    try {
      await member.setNickname(null);
    } catch {
      return message.reply(
        "❌ No pude restablecer el apodo."
      );
    }

    return message.reply(
      `🔄 Apodo restablecido para <@${targetId}>.`
    );
  }

  // ==========================================================
  // ADD ROLE
  // ==========================================================

  if (command === "addrole") {

    if (!isModerator(message.member)) {
      return message.reply(
        "❌ Necesitas permisos de moderación."
      );
    }

    const targetId =
      cleanUserId(args[0]);

    const role =
      message.guild.roles.cache.find(
        r =>
          r.id === cleanUserId(args[1]) ||
          r.name.toLowerCase() ===
            args.slice(1).join(" ").toLowerCase()
      );

    const member =
      await message.guild.members.fetch(
        targetId
      ).catch(() => null);

    if (!member || !role) {
      return message.reply(
        `❌ Uso: \`${PREFIX}addrole @usuario @rol\``
      );
    }

    try {
      await member.roles.add(role);
    } catch {
      return message.reply(
        "❌ No pude añadir el rol."
      );
    }

    return message.reply(
      `🎭 Rol ${role} añadido a ${member}.`
    );
  }

  // ==========================================================
  // REMOVE ROLE
  // ==========================================================

  if (command === "removerole") {

    if (!isModerator(message.member)) {
      return message.reply(
        "❌ Necesitas permisos de moderación."
      );
    }

    const targetId =
      cleanUserId(args[0]);

    const role =
      message.guild.roles.cache.find(
        r =>
          r.id === cleanUserId(args[1]) ||
          r.name.toLowerCase() ===
            args.slice(1).join(" ").toLowerCase()
      );

    const member =
      await message.guild.members.fetch(
        targetId
      ).catch(() => null);

    if (!member || !role) {
      return message.reply(
        `❌ Uso: \`${PREFIX}removerole @usuario @rol\``
      );
    }

    try {
      await member.roles.remove(role);
    } catch {
      return message.reply(
        "❌ No pude quitar el rol."
      );
    }

    return message.reply(
      `🎭 Rol ${role} eliminado de ${member}.`
    );
  }

  // ==========================================================
  // CONFIG — ANTILINK
  // ==========================================================

  if (
    [
      "antilink",
      "antilinkon",
      "antilinkoff"
    ].includes(command)
  ) {

    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ Solo administradores."
      );
    }

    let value;

    if (command === "antilinkon") {
      value = true;
    } else if (command === "antilinkoff") {
      value = false;
    } else {
      const option =
        (args[0] || "").toLowerCase();

      if (
        option === "on" ||
        option === "true" ||
        option === "activar"
      ) {
        value = true;
      } else if (
        option === "off" ||
        option === "false" ||
        option === "desactivar"
      ) {
        value = false;
      } else {
        return message.reply(
          `🔗 AntiLink: **${
            guildData.config.antiLink
              ? "ACTIVADO"
              : "DESACTIVADO"
          }**\n\n` +
          `Usa \`${PREFIX}antilink on\` o \`${PREFIX}antilink off\`.`
        );
      }
    }

    guildData.config.antiLink =
      value;

    saveData();

    return message.reply(
      `🔗 AntiLink **${value ? "activado" : "desactivado"}**.`
    );
  }

  // ==========================================================
  // ANTISPAM
  // ==========================================================

  if (
    [
      "antispam",
      "antispamon",
      "antispamoff"
    ].includes(command)
  ) {

    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ Solo administradores."
      );
    }

    let value;

    if (command === "antispamon") {
      value = true;
    } else if (command === "antispamoff") {
      value = false;
    } else {

      const option =
        (args[0] || "").toLowerCase();

      if (
        option === "on" ||
        option === "activar"
      ) {
        value = true;
      } else if (
        option === "off" ||
        option === "desactivar"
      ) {
        value = false;
      } else {
        return message.reply(
          `🚨 AntiSpam: **${
            guildData.config.antiSpam
              ? "ACTIVADO"
              : "DESACTIVADO"
          }**`
        );
      }
    }

    guildData.config.antiSpam =
      value;

    saveData();

    return message.reply(
      `🚨 AntiSpam **${value ? "activado" : "desactivado"}**.`
    );
  }

  // ==========================================================
  // AUTOMOD
  // ==========================================================

  if (
    [
      "automod",
      "automodon",
      "automodoff"
    ].includes(command)
  ) {

    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ Solo administradores."
      );
    }

    let value;

    if (command === "automodon") {
      value = true;
    } else if (command === "automodoff") {
      value = false;
    } else {

      const option =
        (args[0] || "").toLowerCase();

      if (
        option === "on" ||
        option === "activar"
      ) {
        value = true;
      } else if (
        option === "off" ||
        option === "desactivar"
      ) {
        value = false;
      } else {
        return message.reply(
          `🛡️ AutoMod: **${
            guildData.config.autoMod
              ? "ACTIVADO"
              : "DESACTIVADO"
          }**`
        );
      }
    }

    guildData.config.autoMod =
      value;

    saveData();

    return message.reply(
      `🛡️ AutoMod **${value ? "activado" : "desactivado"}**.`
    );
  }

  // ==========================================================
  // SET LOG CHANNEL
  // ==========================================================

  if (
    command === "setlogchannel" ||
    command === "logchannel"
  ) {

    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ Solo administradores."
      );
    }

    const channel =
      message.mentions.channels.first();

    if (!channel) {
      return message.reply(
        `❌ Menciona un canal.\nEjemplo: \`${PREFIX}setlogchannel #logs\``
      );
    }

    guildData.config.logChannel =
      channel.id;

    saveData();

    return message.reply(
      `📜 Canal de logs establecido en ${channel}.`
    );
  }

  // ==========================================================
  // SET WELCOME CHANNEL
  // ==========================================================

  if (
    command === "setwelcomechannel"
  ) {

    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ Solo administradores."
      );
    }

    const channel =
      message.mentions.channels.first();

    if (!channel) {
      return message.reply(
        `❌ Menciona un canal.`
      );
    }

    guildData.config.welcomeChannel =
      channel.id;

    saveData();

    return message.reply(
      `👋 Canal de bienvenida: ${channel}.`
    );
  }

  // ==========================================================
  // WELCOME
  // ==========================================================

  if (
    [
      "welcome",
      "welcomeon",
      "welcomeoff"
    ].includes(command)
  ) {

    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ Solo administradores."
      );
    }

    let value;

    if (command === "welcomeon") {
      value = true;
    } else if (command === "welcomeoff") {
      value = false;
    } else {

      const option =
        (args[0] || "").toLowerCase();

      if (
        option === "on" ||
        option === "activar"
      ) {
        value = true;
      } else if (
        option === "off" ||
        option === "desactivar"
      ) {
        value = false;
      } else {

        return message.reply(
          `👋 Bienvenida: **${
            guildData.config.welcome
              ? "ACTIVADA"
              : "DESACTIVADA"
          }**`
        );
      }
    }

    guildData.config.welcome =
      value;

    saveData();

    return message.reply(
      `👋 Bienvenida **${value ? "activada" : "desactivada"}**.`
    );
  }

  // ==========================================================
  // SET PREFIX
  // ==========================================================

  if (
    command === "setprefix" ||
    command === "prefix"
  ) {

    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ Solo administradores."
      );
    }

    const newPrefix =
      args[0];

    if (
      !newPrefix ||
      newPrefix.length > 5
    ) {
      return message.reply(
        "❌ El prefijo debe tener entre 1 y 5 caracteres."
      );
    }

    guildData.config.prefix =
      newPrefix;

    saveData();

    return message.reply(
      `⚙️ Prefijo guardado: \`${newPrefix}\`\n\n` +
      `ℹ️ El prefijo principal de Nexora sigue siendo \`${PREFIX}\` en esta versión.`
    );
  }

  // ==========================================================
  // STATS SERVIDOR
  // ==========================================================

  if (
    [
      "serverstats",
      "guildstats",
      "statistics",
      "statshelp"
    ].includes(command)
  ) {

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle("📊 Estadísticas")
          .addFields(
            {
              name: "💬 Mensajes procesados",
              value: String(
                guildData.serverStats.messages
              ),
              inline: true
            },
            {
              name: "⚡ Comandos usados",
              value: String(
                guildData.serverStats.commands
              ),
              inline: true
            },
            {
              name: "👥 Miembros",
              value: String(
                message.guild.memberCount
              ),
              inline: true
            }
          )
      ]
    });
  }

  // ==========================================================
  // ID
  // ==========================================================

  if (command === "id") {

    const targetId =
      cleanUserId(args[0]) ||
      message.author.id;

    return message.reply(
      `🆔 ID: \`${targetId}\``
    );
  }

  // ==========================================================
  // SAY
  // ==========================================================

  if (command === "say") {

    if (!isModerator(message.member)) {
      return message.reply(
        "❌ Necesitas permisos de moderación."
      );
    }

    const text =
      args.join(" ");

    if (!text) {
      return message.reply(
        `❌ Uso: \`${PREFIX}say mensaje\``
      );
    }

    await message.delete()
      .catch(() => {});

    return message.channel.send(text);
  }

  // ==========================================================
  // CHOOSE
  // ==========================================================

  if (command === "choose") {

    if (args.length < 2) {
      return message.reply(
        `❌ Ejemplo: \`${PREFIX}choose pizza hamburguesa\``
      );
    }

    return message.reply(
      `🎯 Elegí: **${pick(args)}**`
    );
  }

  // ==========================================================
  // RANDOM
  // ==========================================================

  if (
    command === "random" ||
    command === "number"
  ) {

    let min = Number(args[0]);
    let max = Number(args[1]);

    if (
      !Number.isInteger(min) ||
      !Number.isInteger(max)
    ) {
      min = 1;
      max = 100;
    }

    if (min > max) {
      [min, max] =
        [max, min];
    }

    return message.reply(
      `🎲 Número aleatorio: **${random(min, max)}**`
    );
  }

  // ==========================================================
  // REPEAT
  // ==========================================================

  if (command === "repeat") {

    const text =
      args.join(" ");

    if (!text) {
      return message.reply(
        "❌ Escribe algo para repetir."
      );
    }

    if (text.length > 1000) {
      return message.reply(
        "❌ El texto es demasiado largo."
      );
    }

    return message.reply(text);
  }

  // ==========================================================
  // UPTIME / SYSTEM
  // ==========================================================

  if (
    [
      "system",
      "systemstats",
      "performance",
      "health",
      "healthcheck",
      "diagnostics"
    ].includes(command)
  ) {

    const memory =
      process.memoryUsage();

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle("🟢 Nexora — Sistema")
          .addFields(
            {
              name: "🏓 Ping",
              value: `${client.ws.ping}ms`,
              inline: true
            },
            {
              name: "💾 RAM",
              value: `${Math.round(
                memory.rss / 1024 / 1024
              )} MB`,
              inline: true
            },
            {
              name: "🌐 Servidores",
              value: String(
                client.guilds.cache.size
              ),
              inline: true
            },
            {
              name: "🟢 Estado",
              value: "Online",
              inline: true
            }
          )
      ]
    });
  }

  // ==========================================================
  // ADMIN CONFIG
  // ==========================================================

  if (
    [
      "config",
      "configuration",
      "settings",
      "serverconfig"
    ].includes(command)
  ) {

    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ Solo administradores."
      );
    }

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle("⚙️ Configuración de Nexora")
          .addFields(
            {
              name: "🔗 AntiLink",
              value:
                guildData.config.antiLink
                  ? "🟢 Activado"
                  : "🔴 Desactivado",
              inline: true
            },
            {
              name: "🚨 AntiSpam",
              value:
                guildData.config.antiSpam
                  ? "🟢 Activado"
                  : "🔴 Desactivado",
              inline: true
            },
            {
              name: "🛡️ AutoMod",
              value:
                guildData.config.autoMod
                  ? "🟢 Activado"
                  : "🔴 Desactivado",
              inline: true
            },
            {
              name: "👋 Bienvenida",
              value:
                guildData.config.welcome
                  ? "🟢 Activada"
                  : "🔴 Desactivada",
              inline: true
            },
            {
              name: "📜 Logs",
              value:
                guildData.config.logChannel
                  ? `<#${guildData.config.logChannel}>`
                  : "No configurado",
              inline: true
            },
            {
              name: "👋 Canal bienvenida",
              value:
                guildData.config.welcomeChannel
                  ? `<#${guildData.config.welcomeChannel}>`
                  : "No configurado",
              inline: true
            }
          )
      ]
    });
  }

  // ==========================================================
  // LOGS
  // ==========================================================

  if (
    [
      "logs",
      "log",
      "recentlogs",
      "lastlogs"
    ].includes(command)
  ) {

    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ Solo administradores."
      );
    }

    const logs =
      guildData.logs.slice(-10);

    if (!logs.length) {
      return message.reply(
        "📜 No hay logs todavía."
      );
    }

    const lines =
      logs.map(
        entry =>
          `• <t:${Math.floor(
            entry.timestamp / 1000
          )}:R> — ${entry.text}`
      );

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle("📜 Últimos logs")
          .setDescription(
            lines.join("\n")
          )
      ]
    });
  }

  // ==========================================================
  // RESET USER
  // ==========================================================

  if (
    [
      "resetuser",
      "resetprofile"
    ].includes(command)
  ) {

    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ Solo administradores."
      );
    }

    const targetId =
      cleanUserId(args[0]);

    if (!targetId) {
      return message.reply(
        `❌ Uso: \`${PREFIX}${command} @usuario\``
      );
    }

    guildData.users[targetId] =
      defaultUser();

    saveData();

    return message.reply(
      `🔄 Datos de <@${targetId}> restablecidos.`
    );
  }

  // ==========================================================
  // RESET ECONOMY
  // ==========================================================

  if (
    command === "economyreset"
  ) {

    if (!isAdmin(message.member)) {
      return message.reply(
        "❌ Solo administradores."
      );
    }

    for (
      const id of Object.keys(
        guildData.users
      )
    ) {
      guildData.users[id].coins = 0;
      guildData.users[id].bank = 0;
    }

    saveData();

    return message.reply(
      "💰 Economía reiniciada para todos los usuarios."
    );
  }

  // ==========================================================
  // STATUS
  // ==========================================================

  if (
    [
      "status",
      "botstatus",
      "nexorastatus"
    ].includes(command)
  ) {

    return message.reply(
      `🟢 Nexora está **ONLINE**.\n` +
      `🏓 Ping: **${client.ws.ping}ms**`
    );
  }

  // ==========================================================
  // VERSION
  // ==========================================================

  if (
    [
      "version",
      "nexoraversion"
    ].includes(command)
  ) {

    return message.reply(
      "🌌 **Nexora v1.0.0**\n" +
      "⚡ discord.js v14"
    );
  }

  // ==========================================================
  // COMANDO DESCONOCIDO
  // ==========================================================

  return message.reply(
    `❌ No existe el comando \`${PREFIX}${command}\`.\n\n` +
    `Usa \`${PREFIX}help\` para ver los comandos.`
  );
}

// ============================================================
// INTERACCIONES
// ============================================================

client.on(
  Events.InteractionCreate,
  async interaction => {

    try {

      // ======================================================
      // SELECT MENU
      // ======================================================

      if (
        interaction.isStringSelectMenu()
      ) {

        if (
          interaction.customId !==
          "nexora_help_category"
        ) {
          return;
        }

        const selected =
          interaction.values[0];

        // -----------------------------------------------
        // PANEL ADMIN
        // -----------------------------------------------

        if (selected === "admin") {

          if (!isAdmin(interaction.member)) {
            return interaction.reply({
              content:
                "❌ Solo los administradores pueden acceder al Panel de Admin.",
              flags:
                MessageFlags.Ephemeral
            });
          }

          const options =
            adminCategories.map(key => {

              const category =
                CATEGORIES[key];

              return {
                label: category.name,
                description:
                  category.description,
                value: key
              };
            });

          return interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle("👑 Panel de Administración")
                .setDescription(
                  "Selecciona un área administrativa."
                )
            ],
            components: [
              new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                  .setCustomId(
                    "nexora_admin_category"
                  )
                  .setPlaceholder(
                    "Selecciona un área"
                  )
                  .addOptions(options)
              ),
              new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId(
                    "admin_back_main"
                  )
                  .setLabel("🏠 Menú principal")
                  .setStyle(ButtonStyle.Secondary)
              )
            ]
          });
        }

        if (!CATEGORIES[selected]) {
          return interaction.reply({
            content: "❌ Categoría inválida.",
            flags:
              MessageFlags.Ephemeral
          });
        }

        return interaction.update(
          categoryPage(
            selected,
            1
          )
        );
      }

      // ======================================================
      // SELECT ADMIN
      // ======================================================

      if (
        interaction.isStringSelectMenu() &&
        interaction.customId ===
          "nexora_admin_category"
      ) {

        if (!isAdmin(interaction.member)) {
          return interaction.reply({
            content:
              "❌ Solo administradores.",
            flags:
              MessageFlags.Ephemeral
          });
        }

        const selected =
          interaction.values[0];

        return interaction.update(
          categoryPage(
            selected,
            1
          )
        );
      }

      // ======================================================
      // BOTONES
      // ======================================================

      if (
        interaction.isButton()
      ) {

        const id =
          interaction.customId;

        // -----------------------------------------------
        // HOME
        // -----------------------------------------------

        if (
          id.startsWith("help_home:")
        ) {

          return interaction.update({
            embeds: [
              helpEmbed()
            ],
            components: [
              mainHelpMenu(
                interaction.member
              )
            ]
          });
        }

        // -----------------------------------------------
        // ADMIN HOME
        // -----------------------------------------------

        if (
          id === "admin_back_main"
        ) {

          return interaction.update({
            embeds: [
              helpEmbed()
            ],
            components: [
              mainHelpMenu(
                interaction.member
              )
            ]
          });
        }

        // -----------------------------------------------
        // PAGINACIÓN
        // -----------------------------------------------

        if (
          id.startsWith("help_prev:")
        ) {

          const parts =
            id.split(":");

          const category =
            parts[1];

          const page =
            Number(parts[2]);

          return interaction.update(
            categoryPage(
              category,
              Math.max(
                1,
                page - 1
              )
            )
          );
        }

        if (
          id.startsWith("help_next:")
        ) {

          const parts =
            id.split(":");

          const category =
            parts[1];

          const page =
            Number(parts[2]);

          return interaction.update(
            categoryPage(
              category,
              Math.min(
                2,
                page + 1
              )
            )
          );
        }

        // -----------------------------------------------
        // TRIVIA
        // -----------------------------------------------

        if (
          id.startsWith("trivia:")
        ) {

          const parts =
            id.split(":");

          const messageId =
            parts[1];

          const answer =
            Number(parts[2]);

          const game =
            activeGames.get(
              messageId
            );

          if (!game) {
            return interaction.reply({
              content:
                "❌ Esta trivia ya terminó.",
              flags:
                MessageFlags.Ephemeral
            });
          }

          if (
            interaction.user.id !==
            game.userId
          ) {

            return interaction.reply({
              content:
                "❌ Solo la persona que inició la trivia puede responder.",
              flags:
                MessageFlags.Ephemeral
            });
          }

          const user =
            getUserData(
              interaction.guild.id,
              interaction.user.id
            );

          const correct =
            answer === game.correct;

          user.coins +=
            correct ? 50 : 5;

          if (correct) {
            user.triviaCorrect++;
            user.wins++;
            addXP(
              interaction.guild.id,
              interaction.user.id,
              25
            );
          } else {
            user.triviaWrong++;
          }

          saveData();

          const resultEmbed =
            new EmbedBuilder()
              .setColor(
                correct
                  ? 0x57F287
                  : 0xED4245
              )
              .setTitle(
                correct
                  ? "🎉 ¡Respuesta correcta!"
                  : "❌ Respuesta incorrecta"
              )
              .setDescription(
                correct
                  ? `Ganaste **50 🪙** y **25 XP**.`
                  : `La respuesta correcta era **${game.question.a[game.correct]}**.\nGanaste **5 🪙** por participar.`
              );

          const disabledButtons =
            game.question.a.map(
              (answerText, index) =>
                new ButtonBuilder()
                  .setCustomId(
                    `trivia:${messageId}:${index}`
                  )
                  .setLabel(
                    `${String.fromCharCode(65 + index)}. ${answerText}`
                  )
                  .setStyle(
                    index === game.correct
                      ? ButtonStyle.Success
                      : ButtonStyle.Secondary
                  )
                  .setDisabled(true)
            );

          activeGames.delete(
            messageId
          );

          return interaction.update({
            embeds: [
              resultEmbed
            ],
            components: [
              new ActionRowBuilder()
                .addComponents(
                  disabledButtons
                )
            ]
          });
        }

        // -----------------------------------------------
        // RPS
        // -----------------------------------------------

        if (
          id.startsWith("rps:")
        ) {

          const parts =
            id.split(":");

          const messageId =
            parts[1];

          const choice =
            parts[2];

          const game =
            activeGames.get(
              messageId
            );

          if (!game) {
            return interaction.reply({
              content:
                "❌ Esta partida ya terminó.",
              flags:
                MessageFlags.Ephemeral
            });
          }

          if (
            interaction.user.id !==
            game.userId
          ) {

            return interaction.reply({
              content:
                "❌ Esta partida no es tuya.",
              flags:
                MessageFlags.Ephemeral
            });
          }

          const botChoice =
            pick(
              Object.keys(
                rpsOptions
              )
            );

          const result =
            rpsResult(
              choice,
              botChoice
            );

          const user =
            getUserData(
              interaction.guild.id,
              interaction.user.id
            );

          if (result === "win") {
            user.wins++;
            user.coins += 20;
          } else if (result === "loss") {
            user.losses++;
          } else {
            user.draws++;
          }

          saveData();

          activeGames.delete(
            messageId
          );

          const resultText =
            result === "win"
              ? "🎉 ¡Ganaste!"
              : result === "loss"
                ? "❌ Perdiste."
                : "🤝 Empate.";

          return interaction.update({
            embeds: [
              new EmbedBuilder()
                .setColor(
                  result === "win"
                    ? 0x57F287
                    : result === "loss"
                      ? 0xED4245
                      : 0xFEE75C
                )
                .setTitle(
                  "🎮 Piedra, Papel o Tijera"
                )
                .setDescription(
                  `${rpsOptions[choice]} Tú: **${choice}**\n` +
                  `${rpsOptions[botChoice]} Nexora: **${botChoice}**\n\n` +
                  `${resultText}`
                )
            ],
            components: []
          });
        }
      }

    } catch (error) {

      console.error(
        "❌ Error en interacción:",
        error
      );

      try {

        if (
          interaction.replied ||
          interaction.deferred
        ) {

          await interaction.followUp({
            content:
              "❌ Ocurrió un error al procesar la interacción.",
            flags:
              MessageFlags.Ephemeral
          });

        } else {

          await interaction.reply({
            content:
              "❌ Ocurrió un error al procesar la interacción.",
            flags:
              MessageFlags.Ephemeral
          });
        }

      } catch {}
    }
  }
);

// ============================================================
// ERRORES
// ============================================================

client.on(
  Events.Error,
  error => {
    console.error(
      "❌ Discord Client Error:",
      error
    );
  }
);

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
// SERVIDOR HTTP PARA RENDER
// ============================================================

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
        "🌌 Nexora está funcionando correctamente."
      );
    }
  );

server.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `🌐 Servidor HTTP activo en puerto ${PORT}`
    );
  }
);

// ============================================================
// GUARDADO AUTOMÁTICO
// ============================================================

setInterval(
  () => {
    saveData();
  },
  30000
);

// ============================================================
// LOGIN
// ============================================================

client.login(TOKEN);
