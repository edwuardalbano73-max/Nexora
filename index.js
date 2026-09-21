// ============================================================
// 🌌 NEXORA — DISCORD BOT
// Prefix: n.
// discord.js v14
// Render Ready
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
// ⚙️ CONFIGURACIÓN
// ============================================================

const PREFIX = "n.";
const TOKEN = process.env.DISCORD_TOKEN;
const PORT = Number(process.env.PORT) || 10000;
const DATA_FILE = path.join(__dirname, "nexora-data.json");

if (!TOKEN) {
  console.error("❌ ERROR: Falta DISCORD_TOKEN en Render.");
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
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.GuildMember,
    Partials.User
  ]
});

// ============================================================
// 💾 BASE DE DATOS
// ============================================================

let db = {
  users: {},
  guilds: {}
};

function loadDB() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      db = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    }
  } catch (error) {
    console.error("❌ Error leyendo base de datos:", error);
    db = { users: {}, guilds: {} };
  }

  if (!db.users) db.users = {};
  if (!db.guilds) db.guilds = {};
}

function saveDB() {
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(db, null, 2)
    );
  } catch (error) {
    console.error("❌ Error guardando base de datos:", error);
  }
}

loadDB();

// ============================================================
// 👤 USUARIOS
// ============================================================

function getUser(id) {
  if (!db.users[id]) {
    db.users[id] = {
      money: 1000,
      bank: 0,
      xp: 0,
      level: 1,
      reputation: 0,
      warnings: 0,
      inventory: [],
      achievements: [],
      badges: [],
      bio: "Sin biografía.",
      status: "Disponible",
      friends: [],
      lastDaily: 0,
      lastWeekly: 0,
      lastMonthly: 0,
      lastWork: 0,
      lastRep: 0,
      lastSpin: 0
    };
  }

  return db.users[id];
}

// ============================================================
// 🏠 SERVIDORES
// ============================================================

function getGuild(id) {
  if (!db.guilds[id]) {
    db.guilds[id] = {
      prefix: PREFIX,
      welcomeChannel: null,
      logChannel: null,
      autoRole: null,
      modRole: null,

      antiLink: false,
      antiSpam: false,
      autoMod: false,

      economy: true,
      levels: true,
      social: true,
      rewards: true,

      commandUses: 0,

      linkExemptRoles: [],
      spamExemptRoles: []
    };
  }

  return db.guilds[id];
}

// ============================================================
// 🧰 UTILIDADES
// ============================================================

function random(min, max) {
  return Math.floor(
    Math.random() * (max - min + 1)
  ) + min;
}

function money(value) {
  return Number(value || 0).toLocaleString("es-ES");
}

function formatTime(seconds) {
  seconds = Math.max(0, seconds);

  const h = Math.floor(seconds / 3600);
  seconds %= 3600;

  const m = Math.floor(seconds / 60);
  const s = seconds % 60;

  const parts = [];

  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s || parts.length === 0) parts.push(`${s}s`);

  return parts.join(" ");
}

function cooldown(last, duration) {
  const left = duration - (Date.now() - last);

  if (left <= 0) return 0;

  return Math.ceil(left / 1000);
}

function addXP(user, amount) {
  user.xp += amount;

  let required = user.level * 100;

  while (user.xp >= required) {
    user.xp -= required;
    user.level++;
    required = user.level * 100;
  }
}

function isAdmin(member) {
  return !!member?.permissions?.has(
    PermissionsBitField.Flags.Administrator
  );
}

function hasPermission(member, permission) {
  return !!member?.permissions?.has(permission);
}

function getTarget(message, args) {
  const mentioned = message.mentions.members.first();

  if (mentioned) return mentioned;

  if (args[0]) {
    return message.guild.members.cache.get(
      args[0].replace(/[<@!>]/g, "")
    );
  }

  return null;
}

function embed(title, description = "") {
  return new EmbedBuilder()
    .setColor(0x6f42c1)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

async function safeReply(message, content) {
  try {
    return await message.reply(content);
  } catch {
    return null;
  }
}

async function logAction(guild, text) {
  const config = getGuild(guild.id);

  if (!config.logChannel) return;

  const channel = guild.channels.cache.get(
    config.logChannel
  );

  if (!channel) return;

  try {
    await channel.send({
      embeds: [
        embed("📜 Registro de Nexora", text)
      ]
    });
  } catch {}
}

// ============================================================
// 📚 CATEGORÍAS PRINCIPALES
// ============================================================

const categories = {
  economy: {
    label: "💰 Economía",
    commands: [
      "balance",
      "bal",
      "bank",
      "deposit",
      "withdraw",
      "pay",
      "give",
      "work",
      "crime",
      "rob",
      "daily",
      "weekly",
      "monthly",
      "salary",
      "rich",
      "leaderboard",
      "economy",
      "wallet",
      "cash",
      "depositall",
      "withdrawall",
      "transfer",
      "income",
      "expenses",
      "shop",
      "buy",
      "sell",
      "inventory",
      "item",
      "use",
      "trade",
      "market",
      "price",
      "gift",
      "coins",
      "money",
      "stash",
      "vault",
      "economystats"
    ]
  },

  social: {
    label: "👥 Social",
    commands: [
      "profile",
      "userinfo",
      "avatar",
      "banner",
      "bio",
      "setbio",
      "status",
      "setstatus",
      "rep",
      "reputation",
      "friends",
      "friend",
      "unfriend",
      "follow",
      "unfollow",
      "followers",
      "following",
      "social",
      "whois",
      "member",
      "servermate",
      "birthday",
      "setbirthday",
      "age",
      "quote",
      "ship",
      "match",
      "highfive",
      "wave",
      "hug",
      "poke",
      "say",
      "choose",
      "roll",
      "coinflip",
      "8ball",
      "socialstats",
      "activity"
    ]
  },

  games: {
    label: "🎮 Minijuegos",
    commands: [
      "trivia",
      "quiz",
      "math",
      "guess",
      "number",
      "rps",
      "dice",
      "coin",
      "slots",
      "memory",
      "reaction",
      "typing",
      "fast",
      "higherlower",
      "odd",
      "even",
      "blackjack",
      "duel",
      "battle",
      "adventure",
      "treasure",
      "mines",
      "word",
      "anagram",
      "scramble",
      "hangman",
      "emoji",
      "sequence",
      "colors",
      "challenge",
      "game",
      "games",
      "score",
      "wins",
      "losses",
      "streak",
      "gamedaily",
      "gamexp",
      "arcade",
      "gamestats"
    ]
  },

  rewards: {
    label: "🎁 Recompensas",
    commands: [
      "dailyreward",
      "weeklyreward",
      "monthlyreward",
      "claim",
      "bonus",
      "streak",
      "checkin",
      "spin",
      "luck",
      "reward",
      "rewards",
      "giftbox",
      "chest",
      "treasurebox",
      "free",
      "claimall",
      "rewardstats",
      "milestone",
      "milestones",
      "achievementreward",
      "levelreward",
      "xpreward",
      "activityreward",
      "voterreward",
      "special",
      "eventreward",
      "randomreward",
      "jackpot",
      "fortune",
      "scratch",
      "wheel",
      "drop",
      "drops",
      "collect",
      "collection",
      "rewardlist",
      "rewardinfo",
      "bonusinfo",
      "rewardhelp"
    ]
  },

  stats: {
    label: "📊 Estadísticas",
    commands: [
      "stats",
      "statistics",
      "level",
      "rank",
      "xp",
      "leaderboard",
      "top",
      "topmoney",
      "topxp",
      "toplevel",
      "toprep",
      "topactivity",
      "serverstats",
      "membercount",
      "channelcount",
      "rolecount",
      "boosts",
      "boosters",
      "online",
      "bots",
      "humans",
      "messages",
      "commands",
      "usage",
      "serverinfo",
      "guildinfo",
      "created",
      "joined",
      "uptime",
      "ping",
      "latency",
      "botstats",
      "database",
      "economystats",
      "socialstats",
      "gamestats",
      "rewardstats",
      "achievementstats",
      "activitystats",
      "overview"
    ]
  },

  tools: {
    label: "🛠️ Herramientas",
    commands: [
      "help",
      "ping",
      "avatar",
      "serverinfo",
      "userinfo",
      "roleinfo",
      "channelinfo",
      "emojiinfo",
      "invite",
      "botinfo",
      "id",
      "say",
      "embed",
      "poll",
      "choose",
      "roll",
      "calculate",
      "remind",
      "timer",
      "translate",
      "weather",
      "time",
      "date",
      "timestamp",
      "afk",
      "unafk",
      "announce",
      "announcechannel",
      "clear",
      "purge",
      "slowmode",
      "lock",
      "unlock",
      "nick",
      "resetnick",
      "role",
      "unrole",
      "userinfoall",
      "servericon",
      "support"
    ]
  },

  customization: {
    label: "🎨 Personalización",
    commands: [
      "setbio",
      "setstatus",
      "setcolor",
      "setavatar",
      "setbanner",
      "profilecolor",
      "profiletheme",
      "title",
      "settitle",
      "badge",
      "badges",
      "setprefix",
      "language",
      "timezone",
      "settimezone",
      "setlanguage",
      "profile",
      "card",
      "rankcard",
      "background",
      "setbackground",
      "display",
      "privacy",
      "notifications",
      "settings",
      "preferences",
      "appearance",
      "theme",
      "nickname",
      "resetprofile",
      "resetsettings",
      "customstatus",
      "custombio",
      "customtitle",
      "customcolor",
      "customcard",
      "customprofile",
      "profileinfo",
      "personalize",
      "customization"
    ]
  },

  achievements: {
    label: "🏆 Logros",
    commands: [
      "achievements",
      "achievement",
      "badges",
      "badge",
      "titles",
      "title",
      "milestones",
      "milestone",
      "progress",
      "goals",
      "goal",
      "quests",
      "quest",
      "missions",
      "mission",
      "collector",
      "veteran",
      "richest",
      "gamer",
      "socializer",
      "worker",
      "lucky",
      "streaker",
      "levelmaster",
      "xpmaster",
      "economist",
      "explorer",
      "winner",
      "triviachampion",
      "completion",
      "completionist",
      "unlocks",
      "unlocked",
      "locked",
      "nextachievement",
      "achievementstats",
      "achievementlist",
      "achievementinfo",
      "claimachievement",
      "achievementprogress"
    ]
  },

  info: {
    label: "ℹ️ Información",
    commands: [
      "help",
      "about",
      "info",
      "botinfo",
      "commands",
      "command",
      "prefix",
      "support",
      "invite",
      "website",
      "credits",
      "version",
      "updates",
      "changelog",
      "status",
      "ping",
      "uptime",
      "serverinfo",
      "userinfo",
      "roleinfo",
      "channelinfo",
      "emojiinfo",
      "membercount",
      "rules",
      "guide",
      "faq",
      "features",
      "modules",
      "developers",
      "privacy",
      "terms",
      "links",
      "contact",
      "report",
      "suggest",
      "feedback",
      "vote",
      "donate",
      "information"
    ]
  },

  nexora: {
    label: "🌌 Nexora",
    commands: [
      "nexora",
      "nexorainfo",
      "nexorastats",
      "nexoraversion",
      "nexorastatus",
      "nexoraupdate",
      "nexorafeatures",
      "nexoramodules",
      "nexorabot",
      "nexorahelp",
      "nexoraguide",
      "nexoraabout",
      "nexoracredits",
      "nexoradevelopers",
      "nexoracommands",
      "nexoraprefix",
      "nexoraping",
      "nexorauptime",
      "nexoraeconomy",
      "nexorasocial",
      "nexoragames",
      "nexorarewards",
      "nexorastats",
      "nexoratools",
      "nexoracustom",
      "nexoraachievements",
      "nexoraevents",
      "nexoranews",
      "nexoraupdates",
      "nexoraguide",
      "nexorasupport",
      "nexorareport",
      "nexorasuggest",
      "nexorafeedback",
      "nexoraprivacy",
      "nexoraterms",
      "nexoralinks",
      "nexoraonline",
      "nexorahealth",
      "nexoraoverview"
    ]
  }
};

// ============================================================
// 👑 ADMIN
// ============================================================

const adminCategories = {
  moderation: {
    label: "🛡️ Moderación",
    commands: [
      "ban","unban","kick","timeout","untimeout",
      "mute","unmute","warn","warnings","unwarn",
      "clearwarns","purge","clear","slowmode",
      "unslowmode","lock","unlock","lockdown",
      "unlockdown","nick","resetnick","addrole",
      "removerole","role","unrole","softban",
      "massban","reason","modlogs","history",
      "case","cases","note","notes","warnall",
      "timeoutall","kickall","moderation"
    ]
  },

  security: {
    label: "🔗 Seguridad",
    commands: [
      "antilink","antiinvite","antispam","automod",
      "filter","badwords","capsfilter","mentionfilter",
      "raidmode","verification","verify","unverify",
      "security","securitylog","linklogs","spamlogs",
      "automodlogs","setmodrole","setverification",
      "setverifychannel","locksecurity","unlocksecurity",
      "securitystatus","securitytest","linkexempt",
      "linkunexempt","spamexempt","spamunexempt",
      "filteradd","filterremove","filterlist",
      "automodadd","automodremove","automodlist",
      "raidlock","raidunlock","securityreset",
      "securitysetup","securityhelp"
    ]
  },

  users: {
    label: "👥 Usuarios",
    commands: [
      "userinfo","avatar","banner","profile",
      "warnings","warn","unwarn","clearwarns",
      "addrole","removerole","nick","resetnick",
      "timeout","untimeout","ban","unban",
      "kick","history","notes","note",
      "verify","unverify","userstats","userlevel",
      "userxp","usermoney","userrep","useractivity",
      "usercommands","userjoined","usercreated",
      "roles","shared","permissions","presence",
      "status","badges","achievements","inventory",
      "warningslist","userhelp"
    ]
  },

  server: {
    label: "⚙️ Servidor",
    commands: [
      "serverinfo","setprefix","setwelcome",
      "setlog","setautorole","setmodrole",
      "welcome","autorole","logging","config",
      "configuration","settings","serverstats",
      "membercount","channelcount","rolecount",
      "emojicount","boosts","vanity","servername",
      "setservername","servericon","setservericon",
      "systemchannel","setsystemchannel","ruleschannel",
      "setruleschannel","language","setlanguage",
      "timezone","settimezone","features","modules",
      "enable","disable","toggle","resetconfig",
      "serverbackup","serverhelp","serverstatus"
    ]
  },

  logs: {
    label: "📜 Logs",
    commands: [
      "logs","log","setlog","logchannel",
      "modlogs","messagelogs","memberlogs",
      "rolelogs","channellogs","voicelogs",
      "serverlogs","banlogs","kicklogs",
      "warnlogs","timeoutlogs","linklogs",
      "spamlogs","automodlogs","joinlogs",
      "leaveLogs","auditlogs","audit","lastlogs",
      "clearlogs","exportlogs","logstatus",
      "logtest","enablelogs","disablelogs",
      "messageeditlogs","messagedeletelogs",
      "roleaddlogs","roleremovelogs","nicklogs",
      "channelcreatelogs","channeldeletelogs",
      "channelupdatelogs","logsettings","loghelp"
    ]
  },

  economy: {
    label: "💰 Economía",
    commands: [
      "givecoins","setmoney","addmoney","removemoney",
      "resetmoney","setbank","addbank","removebank",
      "resetbank","economy","economystats","setdaily",
      "setweekly","setmonthly","setwork","setreward",
      "resetcooldowns","moneylogs","economylogs",
      "shop","additem","removeitem","edititem",
      "iteminfo","inventory","clearinventory",
      "giveitem","removeitemuser","market",
      "setprice","resetprices","richest","bankrichest",
      "economyreset","economyenable","economydisable",
      "economyconfig","economyhelp"
    ]
  },

  games: {
    label: "🎮 Minijuegos",
    commands: [
      "games","gamestats","setgamexp","setgamecoins",
      "resetgames","trivia","quiz","rps","dice",
      "slots","guess","math","duel","battle",
      "leaderboard","gameleaderboard","setgame",
      "enablegames","disablegames","gameconfig",
      "gamecooldowns","resetgamecooldowns","gamewins",
      "gamelosses","gamestreak","gamexp","gamecoins",
      "triviaquestions","addquestion","removequestion",
      "editquestion","questionlist","gamehistory",
      "clearhistory","arcade","gamesettings",
      "gamereset","gamehelp"
    ]
  },

  tools: {
    label: "🧹 Herramientas",
    commands: [
      "purge","clear","slowmode","unslowmode",
      "lock","unlock","lockdown","unlockdown",
      "say","embed","announce","poll","role",
      "unrole","nick","resetnick","createchannel",
      "deletechannel","renamechannel","createcategory",
      "deletecategory","movechannel","clonechannel",
      "createRole","deleteRole","renameRole","clearroles",
      "clearchannels","massdelete","clean","cleanup",
      "prune","permissions","setpermissions",
      "channelpermissions","toolstats","tools","toolhelp"
    ]
  },

  stats: {
    label: "📊 Estadísticas",
    commands: [
      "serverstats","memberstats","messagestats",
      "commandstats","economystats","gamestats",
      "socialstats","rewardstats","activitystats",
      "userstats","growth","joins","leaves",
      "messages","commands","online","bots",
      "humans","channels","roles","emojis",
      "boosts","boosters","topmoney","topxp",
      "toplevel","toprep","topactivity","topgames",
      "toprewards","topusers","servergrowth",
      "dailyactivity","weeklyactivity","monthlyactivity",
      "statsreset","statsexport","statsreport",
      "statsconfig","statshelp"
    ]
  },

  advanced: {
    label: "🌐 Avanzado",
    commands: [
      "reload","maintenance","shutdown","restart",
      "eval","debug","database","dbstatus",
      "dbbackup","dbreset","cache","clearcache",
      "guildcache","usercache","memory","process",
      "environment","health","diagnostics","latency",
      "gateway","api","version","dependencies",
      "permissions","intents","modules","module",
      "enablemodule","disablemodule","reloadmodule",
      "feature","enablefeature","disablefeature",
      "configexport","configimport","backup",
      "restore","advancedstats","advancedinfo","advancedhelp"
    ]
  }
};

// ============================================================
// 🏠 MENÚ PRINCIPAL
// ============================================================

function mainMenu(member) {
  const options = Object.entries(categories).map(
    ([id, category]) => ({
      label: category.label.replace(/^.+? /, ""),
      value: id,
      emoji: category.label.split(" ")[0]
    })
  );

  if (isAdmin(member)) {
    options.push({
      label: "Panel de Admin",
      value: "admin",
      emoji: "👑"
    });
  }

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("nexora_main")
      .setPlaceholder("🌌 Selecciona una categoría")
      .addOptions(options)
  );
}

// ============================================================
// 📖 MOSTRAR AYUDA
// ============================================================

function helpEmbed() {
  return embed(
    "🌌 NEXORA — Centro de ayuda",
    "Selecciona una categoría para ver sus comandos.\n\n" +
    "💰 Economía\n" +
    "👥 Social\n" +
    "🎮 Minijuegos\n" +
    "🎁 Recompensas\n" +
    "📊 Estadísticas\n" +
    "🛠️ Herramientas\n" +
    "🎨 Personalización\n" +
    "🏆 Logros\n" +
    "ℹ️ Información\n" +
    "🌌 Nexora\n\n" +
    "👑 El Panel de Admin solo aparece para administradores."
  );
}

// ============================================================
// 📄 PÁGINAS DE CATEGORÍA
// ============================================================

function categoryPage(categoryId, page = 0) {
  const category = categories[categoryId];

  if (!category) return null;

  const perPage = 20;
  const totalPages = Math.ceil(
    category.commands.length / perPage
  );

  const start = page * perPage;
  const commands = category.commands.slice(
    start,
    start + perPage
  );

  const description = commands
    .map(command => `\`n.${command}\``)
    .join("\n");

  const e = embed(
    `${category.label}`,
    `${description}\n\nPágina **${page + 1}/${totalPages}**`
  );

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`prev_${categoryId}_${page}`)
      .setLabel("Anterior")
      .setEmoji("⬅️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 0),

    new ButtonBuilder()
      .setCustomId("home")
      .setLabel("Menú")
      .setEmoji("🏠")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId(`next_${categoryId}_${page}`)
      .setLabel("Siguiente")
      .setEmoji("➡️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1)
  );

  return {
    embeds: [e],
    components: [buttons]
  };
}

// ============================================================
// 👑 PANEL ADMIN
// ============================================================

function adminMenu() {
  const options = Object.entries(adminCategories).map(
    ([id, category]) => ({
      label: category.label.replace(/^.+? /, ""),
      value: `admin_${id}`,
      emoji: category.label.split(" ")[0]
    })
  );

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("nexora_admin")
      .setPlaceholder("👑 Selecciona una sección")
      .addOptions(options)
  );
}

function adminPage(categoryId, page = 0) {
  const category = adminCategories[categoryId];

  if (!category) return null;

  const perPage = 20;
  const totalPages = Math.ceil(
    category.commands.length / perPage
  );

  const commands = category.commands.slice(
    page * perPage,
    page * perPage + perPage
  );

  const e = embed(
    `👑 ${category.label}`,
    commands
      .map(command => `\`n.${command}\``)
      .join("\n") +
      `\n\nPágina **${page + 1}/${totalPages}**`
  );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`adminprev_${categoryId}_${page}`)
      .setLabel("Anterior")
      .setEmoji("⬅️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 0),

    new ButtonBuilder()
      .setCustomId("adminhome")
      .setLabel("Panel")
      .setEmoji("👑")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId(`adminnext_${categoryId}_${page}`)
      .setLabel("Siguiente")
      .setEmoji("➡️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1)
  );

  return {
    embeds: [e],
    components: [row]
  };
}

// ============================================================
// 🎲 TRIVIA
// ============================================================

const triviaQuestions = [
  {
    q: "¿Cuál es el planeta más grande del sistema solar?",
    answers: ["Marte", "Júpiter", "Venus", "Mercurio"],
    correct: 1
  },
  {
    q: "¿Cuántos lados tiene un hexágono?",
    answers: ["5", "6", "7", "8"],
    correct: 1
  },
  {
    q: "¿Cuál es la capital de Francia?",
    answers: ["Madrid", "Roma", "París", "Lisboa"],
    correct: 2
  },
  {
    q: "¿Cuánto es 9 × 9?",
    answers: ["72", "81", "90", "99"],
    correct: 1
  },
  {
    q: "¿Qué océano es el más grande?",
    answers: ["Atlántico", "Índico", "Pacífico", "Ártico"],
    correct: 2
  }
];

const activeTrivia = new Map();

async function startTrivia(message) {
  if (activeTrivia.has(message.channel.id)) {
    return safeReply(
      message,
      "🎯 Ya hay una trivia activa en este canal."
    );
  }

  const question =
    triviaQuestions[
      random(0, triviaQuestions.length - 1)
    ];

  const id = `${message.channel.id}_${Date.now()}`;

  activeTrivia.set(message.channel.id, {
    id,
    user: message.author.id,
    correct: question.correct
  });

  const row = new ActionRowBuilder();

  question.answers.forEach((answer, index) => {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`trivia_${id}_${index}`)
        .setLabel(
          `${String.fromCharCode(65 + index)}. ${answer}`
        )
        .setStyle(ButtonStyle.Primary)
    );
  });

  await message.reply({
    embeds: [
      embed(
        "🧠 Trivia Nexora",
        `**${question.q}**\n\n` +
        "Tienes una oportunidad para responder."
      )
    ],
    components: [row]
  });
}

// ============================================================
// 💰 ECONOMÍA
// ============================================================

async function economyCommand(message, command, args) {
  const user = getUser(message.author.id);

  if (command === "balance" || command === "bal") {
    return message.reply({
      embeds: [
        embed(
          "💰 Balance",
          `💵 Dinero: **${money(user.money)}**\n` +
          `🏦 Banco: **${money(user.bank)}**\n\n` +
          `💎 Total: **${money(user.money + user.bank)}**`
        )
      ]
    });
  }

  if (command === "bank") {
    return message.reply({
      embeds: [
        embed(
          "🏦 Banco",
          `Tu banco contiene **${money(user.bank)}** monedas.`
        )
      ]
    });
  }

  if (command === "daily") {
    const left = cooldown(
      user.lastDaily,
      24 * 60 * 60 * 1000
    );

    if (left) {
      return message.reply(
        `⏳ Ya reclamaste tu recompensa. Vuelve en **${formatTime(left)}**.`
      );
    }

    const amount = random(500, 1500);

    user.money += amount;
    user.lastDaily = Date.now();

    addXP(user, 20);
    saveDB();

    return message.reply(
      `🎁 Recibiste **${money(amount)}** monedas.`
    );
  }

  if (command === "weekly") {
    const left = cooldown(
      user.lastWeekly,
      7 * 24 * 60 * 60 * 1000
    );

    if (left) {
      return message.reply(
        `⏳ Disponible en **${formatTime(left)}**.`
      );
    }

    const amount = random(2500, 6000);

    user.money += amount;
    user.lastWeekly = Date.now();

    saveDB();

    return message.reply(
      `🎁 Recompensa semanal: **${money(amount)}** monedas.`
    );
  }

  if (command === "work") {
    const left = cooldown(
      user.lastWork,
      60 * 60 * 1000
    );

    if (left) {
      return message.reply(
        `⏳ Puedes volver a trabajar en **${formatTime(left)}**.`
      );
    }

    const amount = random(100, 500);

    user.money += amount;
    user.lastWork = Date.now();

    addXP(user, random(10, 25));
    saveDB();

    return message.reply(
      `💼 Trabajaste y ganaste **${money(amount)}** monedas.`
    );
  }

  if (command === "deposit") {
    const amount = Number(args[0]);

    if (!Number.isFinite(amount) || amount <= 0) {
      return message.reply("❌ Usa `n.deposit <cantidad>`.");
    }

    if (amount > user.money) {
      return message.reply("❌ No tienes suficiente dinero.");
    }

    user.money -= amount;
    user.bank += amount;

    saveDB();

    return message.reply(
      `🏦 Depositaste **${money(amount)}** monedas.`
    );
  }

  if (command === "withdraw") {
    const amount = Number(args[0]);

    if (!Number.isFinite(amount) || amount <= 0) {
      return message.reply("❌ Usa `n.withdraw <cantidad>`.");
    }

    if (amount > user.bank) {
      return message.reply("❌ No tienes suficiente dinero en el banco.");
    }

    user.bank -= amount;
    user.money += amount;

    saveDB();

    return message.reply(
      `💵 Retiraste **${money(amount)}** monedas.`
    );
  }

  if (command === "pay" || command === "give") {
    const target = getTarget(message, args);
    const amount = Number(
      args.find(x => /^\d+$/.test(x))
    );

    if (!target || target.id === message.author.id) {
      return message.reply("❌ Debes mencionar a otro usuario.");
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return message.reply("❌ Indica una cantidad válida.");
    }

    if (amount > user.money) {
      return message.reply("❌ No tienes suficiente dinero.");
    }

    const receiver = getUser(target.id);

    user.money -= amount;
    receiver.money += amount;

    saveDB();

    return message.reply(
      `💸 Enviaste **${money(amount)}** monedas a ${target}.`
    );
  }

  if (
    command === "rich" ||
    command === "leaderboard" ||
    command === "topmoney"
  ) {
    const ranking = Object.entries(db.users)
      .sort(
        (a, b) =>
          (b[1].money + b[1].bank) -
          (a[1].money + a[1].bank)
      )
      .slice(0, 10);

    let text = "";

    ranking.forEach((entry, index) => {
      text += `${index + 1}. <@${entry[0]}> — **${money(
        entry[1].money + entry[1].bank
      )}**\n`;
    });

    return message.reply({
      embeds: [
        embed("🏆 Ranking económico", text || "Sin datos.")
      ]
    });
  }

  if (
    command === "economy" ||
    command === "wallet" ||
    command === "cash" ||
    command === "coins" ||
    command === "money"
  ) {
    return economyCommand(message, "balance", args);
  }

  if (command === "inventory") {
    return message.reply({
      embeds: [
        embed(
          "🎒 Inventario",
          user.inventory.length
            ? user.inventory.join("\n")
            : "Tu inventario está vacío."
        )
      ]
    });
  }

  if (command === "shop") {
    return message.reply({
      embeds: [
        embed(
          "🛒 Tienda",
          "🪙 Moneda básica — 100\n" +
          "🎟️ Ticket — 250\n" +
          "💎 Gema — 750\n\n" +
          "Compra: `n.buy <objeto>`"
        )
      ]
    });
  }

  if (command === "buy") {
    const item = args.join(" ").toLowerCase();

    const prices = {
      moneda: 100,
      ticket: 250,
      gema: 750
    };

    if (!prices[item]) {
      return message.reply(
        "❌ Ese objeto no existe en la tienda."
      );
    }

    if (user.money < prices[item]) {
      return message.reply("❌ No tienes suficiente dinero.");
    }

    user.money -= prices[item];
    user.inventory.push(item);

    saveDB();

    return message.reply(
      `🛒 Compraste **${item}**.`
    );
  }

  return false;
}

// ============================================================
// 👥 SOCIAL
// ============================================================

async function socialCommand(message, command, args) {
  const user = getUser(message.author.id);

  if (command === "profile") {
    const target = getTarget(message, args);
    const member = target || message.member;
    const data = getUser(member.id);

    return message.reply({
      embeds: [
        embed(
          `👤 Perfil de ${member.user.username}`,
          `📊 Nivel: **${data.level}**\n` +
          `✨ XP: **${data.xp}**\n` +
          `💰 Dinero: **${money(data.money)}**\n` +
          `⭐ Reputación: **${data.reputation}**\n\n` +
          `📝 ${data.bio}\n` +
          `🔹 Estado: ${data.status}`
        )
      ]
    });
  }

  if (command === "userinfo" || command === "whois") {
    const target = getTarget(message, args) || message.member;

    return message.reply({
      embeds: [
        embed(
          `👤 ${target.user.username}`,
          `🆔 ${target.id}\n` +
          `📅 Cuenta: <t:${Math.floor(
            target.user.createdTimestamp / 1000
          )}:F>\n` +
          `👥 Servidor: <t:${Math.floor(
            target.joinedTimestamp / 1000
          )}:F>`
        )
      ]
    });
  }

  if (command === "avatar") {
    const target = getTarget(message, args) || message.member;

    return message.reply({
      embeds: [
        embed(
          `🖼️ Avatar de ${target.user.username}`,
          `[Abrir avatar](${target.user.displayAvatarURL({
            size: 1024,
            extension: "png"
          })})`
        ).setImage(
          target.user.displayAvatarURL({
            size: 1024,
            extension: "png"
          })
        )
      ]
    });
  }

  if (command === "bio" || command === "setbio") {
    if (!args.length) {
      return message.reply(
        `📝 Tu biografía actual: **${user.bio}**`
      );
    }

    user.bio = args.join(" ").slice(0, 200);
    saveDB();

    return message.reply("✅ Biografía actualizada.");
  }

  if (command === "status" || command === "setstatus") {
    if (!args.length) {
      return message.reply(
        `🔹 Estado: **${user.status}**`
      );
    }

    user.status = args.join(" ").slice(0, 100);
    saveDB();

    return message.reply("✅ Estado actualizado.");
  }

  if (command === "rep" || command === "reputation") {
    const left = cooldown(
      user.lastRep,
      60 * 60 * 1000
    );

    if (left) {
      return message.reply(
        `⏳ Podrás dar reputación nuevamente en ${formatTime(left)}.`
      );
    }

    const target = getTarget(message, args);

    if (!target || target.id === message.author.id) {
      return message.reply(
        "❌ Menciona a otro usuario."
      );
    }

    const targetData = getUser(target.id);

    targetData.reputation++;
    user.lastRep = Date.now();

    saveDB();

    return message.reply(
      `⭐ ${target} recibió +1 reputación.`
    );
  }

  return false;
}

// ============================================================
// 🎮 JUEGOS
// ============================================================

async function gameCommand(message, command, args) {
  if (command === "trivia" || command === "quiz") {
    return startTrivia(message);
  }

  if (command === "dice") {
    const result = random(1, 6);

    return message.reply(
      `🎲 Lanzaste un dado y salió **${result}**.`
    );
  }

  if (command === "coin" || command === "coinflip") {
    return message.reply(
      `🪙 Salió **${Math.random() < 0.5 ? "Cara" : "Cruz"}**.`
    );
  }

  if (command === "roll") {
    const max = Math.max(2, Number(args[0]) || 100);

    return message.reply(
      `🎲 Resultado: **${random(1, max)}**`
    );
  }

  if (command === "rps") {
    const choices = ["piedra", "papel", "tijera"];
    const bot = choices[random(0, 2)];
    const user = args[0]?.toLowerCase();

    if (!choices.includes(user)) {
      return message.reply(
        "❌ Usa `n.rps piedra`, `n.rps papel` o `n.rps tijera`."
      );
    }

    let result;

    if (user === bot) {
      result = "🤝 Empate.";
    } else if (
      (user === "piedra" && bot === "tijera") ||
      (user === "papel" && bot === "piedra") ||
      (user === "tijera" && bot === "papel")
    ) {
      result = "🎉 Ganaste.";
    } else {
      result = "😅 Perdiste.";
    }

    return message.reply(
      `🪨 Tú: **${user}**\n` +
      `🤖 Nexora: **${bot}**\n\n${result}`
    );
  }

  if (command === "guess" || command === "number") {
    const answer = random(1, 10);
    const guess = Number(args[0]);

    if (!Number.isInteger(guess)) {
      return message.reply(
        "❌ Adivina un número del 1 al 10."
      );
    }

    return message.reply(
      guess === answer
        ? "🎉 ¡Acertaste!"
        : `❌ No era ese. El número era **${answer}**.`
    );
  }

  if (command === "math") {
    const a = random(1, 20);
    const b = random(1, 20);

    return message.reply(
      `🧮 ¿Cuánto es **${a} + ${b}**?\n` +
      `Responde con \`n.answer ${a + b}\`.`
    );
  }

  return false;
}

// ============================================================
// 🎁 RECOMPENSAS
// ============================================================

async function rewardCommand(message, command) {
  const user = getUser(message.author.id);

  if (
    command === "dailyreward" ||
    command === "claim"
  ) {
    return economyCommand(message, "daily", []);
  }

  if (command === "streak" || command === "checkin") {
    user.streak++;
    const amount = 100 + user.streak * 25;

    user.money += amount;

    saveDB();

    return message.reply(
      `🔥 Racha actual: **${user.streak}**\n` +
      `🎁 Ganaste **${money(amount)}** monedas.`
    );
  }

  if (
    command === "spin" ||
    command === "wheel"
  ) {
    const left = cooldown(
      user.lastSpin,
      60 * 60 * 1000
    );

    if (left) {
      return message.reply(
        `⏳ Puedes girar otra vez en ${formatTime(left)}.`
      );
    }

    const amount = random(50, 1000);

    user.money += amount;
    user.lastSpin = Date.now();

    saveDB();

    return message.reply(
      `🎡 Ganaste **${money(amount)}** monedas.`
    );
  }

  if (
    command === "reward" ||
    command === "rewards"
  ) {
    return message.reply({
      embeds: [
        embed(
          "🎁 Recompensas",
          "🎁 `n.dailyreward`\n" +
          "🔥 `n.checkin`\n" +
          "🎡 `n.spin`\n" +
          "📅 `n.weeklyreward`\n" +
          "💰 `n.monthlyreward`"
        )
      ]
    });
  }

  return false;
}

// ============================================================
// 📊 ESTADÍSTICAS
// ============================================================

async function statsCommand(message, command) {
  const user = getUser(message.author.id);

  if (
    command === "level" ||
    command === "xp" ||
    command === "rank"
  ) {
    return message.reply({
      embeds: [
        embed(
          "📊 Estadísticas",
          `👤 ${message.author}\n` +
          `🏆 Nivel: **${user.level}**\n` +
          `✨ XP: **${user.xp}/${user.level * 100}**\n` +
          `⭐ Reputación: **${user.reputation}**`
        )
      ]
    });
  }

  if (command === "ping") {
    return message.reply(
      `🏓 Pong! **${client.ws.ping}ms**`
    );
  }

  if (command === "serverstats") {
    const guild = message.guild;

    return message.reply({
      embeds: [
        embed(
          "📊 Estadísticas del servidor",
          `👥 Miembros: **${guild.memberCount}**\n` +
          `💬 Canales: **${guild.channels.cache.size}**\n` +
          `🎭 Roles: **${guild.roles.cache.size}**\n` +
          `🚀 Boosts: **${guild.premiumSubscriptionCount || 0}**`
        )
      ]
    });
  }

  if (command === "membercount") {
    return message.reply(
      `👥 Este servidor tiene **${message.guild.memberCount}** miembros.`
    );
  }

  if (command === "uptime") {
    return message.reply(
      `⏱️ Nexora lleva conectado **${formatTime(
        Math.floor(client.uptime / 1000)
      )}**.`
    );
  }

  return false;
}

// ============================================================
// 🛡️ MODERACIÓN
// ============================================================

async function moderationCommand(message, command, args) {
  if (!isAdmin(message.member)) {
    return message.reply(
      "❌ Necesitas permisos de administrador."
    );
  }

  const target = getTarget(message, args);

  if (
    [
      "ban",
      "kick",
      "timeout",
      "mute",
      "warn",
      "unwarn",
      "addrole",
      "removerole",
      "nick"
    ].includes(command) &&
    !target
  ) {
    return message.reply(
      "❌ Debes mencionar a un usuario."
    );
  }

  if (command === "ban") {
    if (!target.bannable) {
      return message.reply(
        "❌ No puedo expulsar a ese usuario."
      );
    }

    await target.ban({
      reason:
        args.slice(1).join(" ") ||
        `Moderación por ${message.author.tag}`
    });

    await logAction(
      message.guild,
      `🔨 ${target.user.tag} fue baneado por ${message.author.tag}.`
    );

    return message.reply(
      `🔨 **${target.user.tag}** fue baneado.`
    );
  }

  if (command === "kick") {
    if (!target.kickable) {
      return message.reply(
        "❌ No puedo expulsar a ese usuario."
      );
    }

    await target.kick(
      args.slice(1).join(" ") ||
      `Moderación por ${message.author.tag}`
    );

    await logAction(
      message.guild,
      `👢 ${target.user.tag} fue expulsado.`
    );

    return message.reply(
      `👢 **${target.user.tag}** fue expulsado.`
    );
  }

  if (
    command === "timeout" ||
    command === "mute"
  ) {
    if (!target.moderatable) {
      return message.reply(
        "❌ No puedo aplicar timeout a ese usuario."
      );
    }

    const minutes =
      Number(args.find(x => /^\d+$/.test(x))) || 10;

    await target.timeout(
      minutes * 60 * 1000,
      `Moderación por ${message.author.tag}`
    );

    await logAction(
      message.guild,
      `🔇 ${target.user.tag} recibió timeout de ${minutes} minutos.`
    );

    return message.reply(
      `🔇 **${target.user.tag}** recibió timeout durante **${minutes} minutos**.`
    );
  }

  if (
    command === "untimeout" ||
    command === "unmute"
  ) {
    if (!target.moderatable) {
      return message.reply(
        "❌ No puedo modificar a ese usuario."
      );
    }

    await target.timeout(null);

    return message.reply(
      `🔊 Timeout retirado a **${target.user.tag}**.`
    );
  }

  if (command === "warn") {
    const user = getUser(target.id);

    user.warnings++;

    saveDB();

    await logAction(
      message.guild,
      `⚠️ ${target.user.tag} recibió una advertencia.`
    );

    return message.reply(
      `⚠️ **${target.user.tag}** recibió una advertencia.\n` +
      `Total: **${user.warnings}**`
    );
  }

  if (command === "warnings") {
    const user = getUser(
      target?.id || message.author.id
    );

    return message.reply(
      `⚠️ Advertencias: **${user.warnings}**`
    );
  }

  if (command === "unwarn") {
    const user = getUser(target.id);

    user.warnings = Math.max(
      0,
      user.warnings - 1
    );

    saveDB();

    return message.reply(
      `✅ Se retiró una advertencia a **${target.user.tag}**.`
    );
  }

  if (command === "clearwarns") {
    const user = getUser(target.id);

    user.warnings = 0;

    saveDB();

    return message.reply(
      `✅ Advertencias de **${target.user.tag}** eliminadas.`
    );
  }

  if (
    command === "purge" ||
    command === "clear"
  ) {
    const amount = Math.min(
      100,
      Math.max(1, Number(args[0]) || 10)
    );

    const deleted =
      await message.channel.bulkDelete(
        amount,
        true
      );

    const msg = await message.channel.send(
      `🧹 Eliminados **${deleted.size}** mensajes.`
    );

    setTimeout(() => msg.delete().catch(() => {}), 3000);

    return;
  }

  if (command === "slowmode") {
    const seconds = Math.min(
      21600,
      Math.max(0, Number(args[0]) || 5)
    );

    await message.channel.setRateLimitPerUser(
      seconds
    );

    return message.reply(
      `🐌 Slowmode establecido en **${seconds}s**.`
    );
  }

  if (command === "unslowmode") {
    await message.channel.setRateLimitPerUser(0);

    return message.reply(
      "⚡ Slowmode desactivado."
    );
  }

  if (command === "lock") {
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

  if (command === "unlock") {
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

  if (command === "nick") {
    const nickname = args
      .filter(x => !x.startsWith("<@"))
      .join(" ");

    if (!nickname) {
      return message.reply(
        "❌ Indica el nuevo nombre."
      );
    }

    await target.setNickname(
      nickname.slice(0, 32)
    );

    return message.reply(
      `✅ Nickname cambiado para ${target}.`
    );
  }

  if (command === "resetnick") {
    await target.setNickname(null);

    return message.reply(
      `✅ Nickname restaurado para ${target}.`
    );
  }

  if (
    command === "addrole" ||
    command === "role"
  ) {
    const role =
      message.mentions.roles.first();

    if (!role) {
      return message.reply(
        "❌ Menciona un rol."
      );
    }

    await target.roles.add(role);

    return message.reply(
      `✅ Rol ${role} añadido a ${target}.`
    );
  }

  if (
    command === "removerole" ||
    command === "unrole"
  ) {
    const role =
      message.mentions.roles.first();

    if (!role) {
      return message.reply(
        "❌ Menciona un rol."
      );
    }

    await target.roles.remove(role);

    return message.reply(
      `✅ Rol ${role} retirado de ${target}.`
    );
  }

  return false;
}

// ============================================================
// ⚙️ CONFIGURACIÓN
// ============================================================

async function configCommand(message, command, args) {
  if (!isAdmin(message.member)) {
    return message.reply(
      "❌ Necesitas permisos de administrador."
    );
  }

  const config = getGuild(message.guild.id);

  if (command === "setwelcome") {
    const channel =
      message.mentions.channels.first();

    if (!channel) {
      return message.reply(
        "❌ Menciona el canal de bienvenida."
      );
    }

    config.welcomeChannel = channel.id;
    saveDB();

    return message.reply(
      `✅ Canal de bienvenida: ${channel}`
    );
  }

  if (command === "setlog") {
    const channel =
      message.mentions.channels.first();

    if (!channel) {
      return message.reply(
        "❌ Menciona el canal de logs."
      );
    }

    config.logChannel = channel.id;
    saveDB();

    return message.reply(
      `✅ Canal de logs: ${channel}`
    );
  }

  if (command === "setautorole") {
    const role =
      message.mentions.roles.first();

    if (!role) {
      return message.reply(
        "❌ Menciona el rol automático."
      );
    }

    config.autoRole = role.id;
    saveDB();

    return message.reply(
      `✅ Autorol establecido: ${role}`
    );
  }

  if (command === "setmodrole") {
    const role =
      message.mentions.roles.first();

    if (!role) {
      return message.reply(
        "❌ Menciona el rol de moderación."
      );
    }

    config.modRole = role.id;
    saveDB();

    return message.reply(
      `✅ Rol de moderación establecido: ${role}`
    );
  }

  if (command === "antilink") {
    const value =
      args[0]?.toLowerCase();

    if (!["on", "off"].includes(value)) {
      return message.reply(
        "Usa `n.antilink on` o `n.antilink off`."
      );
    }

    config.antiLink = value === "on";
    saveDB();

    return message.reply(
      `🔗 AntiLink: **${config.antiLink ? "ACTIVADO" : "DESACTIVADO"}**`
    );
  }

  if (command === "antispam") {
    const value =
      args[0]?.toLowerCase();

    if (!["on", "off"].includes(value)) {
      return message.reply(
        "Usa `n.antispam on` o `n.antispam off`."
      );
    }

    config.antiSpam = value === "on";
    saveDB();

    return message.reply(
      `🚨 AntiSpam: **${config.antiSpam ? "ACTIVADO" : "DESACTIVADO"}**`
    );
  }

  if (command === "automod") {
    const value =
      args[0]?.toLowerCase();

    if (!["on", "off"].includes(value)) {
      return message.reply(
        "Usa `n.automod on` o `n.automod off`."
      );
    }

    config.autoMod = value === "on";
    saveDB();

    return message.reply(
      `🛡️ AutoMod: **${config.autoMod ? "ACTIVADO" : "DESACTIVADO"}**`
    );
  }

  if (
    command === "config" ||
    command === "configuration" ||
    command === "settings"
  ) {
    return message.reply({
      embeds: [
        embed(
          "⚙️ Configuración",
          `👋 Bienvenida: ${
            config.welcomeChannel
              ? `<#${config.welcomeChannel}>`
              : "No configurada"
          }\n` +
          `📜 Logs: ${
            config.logChannel
              ? `<#${config.logChannel}>`
              : "No configurado"
          }\n` +
          `🎭 Autorol: ${
            config.autoRole
              ? `<@&${config.autoRole}>`
              : "No configurado"
          }\n` +
          `🔗 AntiLink: ${
            config.antiLink ? "🟢" : "🔴"
          }\n` +
          `🚨 AntiSpam: ${
            config.antiSpam ? "🟢" : "🔴"
          }\n` +
          `🛡️ AutoMod: ${
            config.autoMod ? "🟢" : "🔴"
          }`
        )
      ]
    });
  }

  return false;
}

// ============================================================
// 🔗 ANTILINK / ANTISPAM
// ============================================================

const spamTracker = new Map();

client.on(Events.MessageCreate, async message => {
  if (!message.guild) return;
  if (message.author.bot) return;

  const config = getGuild(message.guild.id);

  // ---------------- ANTI LINK ----------------

  if (
    config.antiLink &&
    !isAdmin(message.member)
  ) {
    const link =
      /(https?:\/\/|www\.|discord\.gg\/|discord\.com\/invite\/)/i
        .test(message.content);

    if (link) {
      try {
        await message.delete();
      } catch {}

      try {
        await message.member.timeout(
          2 * 60 * 60 * 1000,
          "AntiLink Nexora"
        );
      } catch {}

      await logAction(
        message.guild,
        `🔗 AntiLink eliminó un mensaje de ${message.author.tag}.`
      );

      return;
    }
  }

  // ---------------- ANTI SPAM ----------------

  if (
    config.antiSpam &&
    !isAdmin(message.member)
  ) {
    const key = `${message.guild.id}:${message.author.id}`;

    const now = Date.now();
    const previous =
      spamTracker.get(key) || [];

    const recent = previous.filter(
      time => now - time < 5000
    );

    recent.push(now);
    spamTracker.set(key, recent);

    if (recent.length >= 6) {
      try {
        await message.member.timeout(
          2 * 60 * 1000,
          "AntiSpam Nexora"
        );
      } catch {}

      spamTracker.delete(key);

      await logAction(
        message.guild,
        `🚨 AntiSpam aplicó timeout a ${message.author.tag}.`
      );
    }
  }
});

// ============================================================
// 👋 BIENVENIDA
// ============================================================

client.on(Events.GuildMemberAdd, async member => {
  const config = getGuild(member.guild.id);

  if (config.autoRole) {
    const role =
      member.guild.roles.cache.get(
        config.autoRole
      );

    if (role) {
      try {
        await member.roles.add(role);
      } catch {}
    }
  }

  if (config.welcomeChannel) {
    const channel =
      member.guild.channels.cache.get(
        config.welcomeChannel
      );

    if (channel) {
      try {
        await channel.send({
          embeds: [
            embed(
              "🌌 ¡Bienvenido!",
              `👋 Bienvenido ${member} a **${member.guild.name}**.\n\n` +
              "¡Disfruta tu estancia!"
            )
          ]
        });
      } catch {}
    }
  }
});

// ============================================================
// 🎛️ INTERACCIONES
// ============================================================

client.on(
  Events.InteractionCreate,
  async interaction => {
    try {
      // ---------------- SELECT PRINCIPAL ----------------

      if (
        interaction.isStringSelectMenu() &&
        interaction.customId === "nexora_main"
      ) {
        const value =
          interaction.values[0];

        if (value === "admin") {
          if (!isAdmin(interaction.member)) {
            return interaction.reply({
              content:
                "❌ No tienes acceso al Panel de Admin.",
              ephemeral: true
            });
          }

          return interaction.update({
            embeds: [
              embed(
                "👑 Panel de Administración",
                "Selecciona una sección."
              )
            ],
            components: [adminMenu()]
          });
        }

        const page =
          categoryPage(value, 0);

        if (!page) return;

        return interaction.update(page);
      }

      // ---------------- SELECT ADMIN ----------------

      if (
        interaction.isStringSelectMenu() &&
        interaction.customId === "nexora_admin"
      ) {
        if (!isAdmin(interaction.member)) {
          return interaction.reply({
            content: "❌ Acceso denegado.",
            ephemeral: true
          });
        }

        const value =
          interaction.values[0]
            .replace("admin_", "");

        return interaction.update(
          adminPage(value, 0)
        );
      }

      // ---------------- BOTONES ----------------

      if (
        interaction.isButton() &&
        interaction.customId === "home"
      ) {
        return interaction.update({
          embeds: [helpEmbed()],
          components: [
            mainMenu(interaction.member)
          ]
        });
      }

      if (
        interaction.isButton() &&
        interaction.customId === "adminhome"
      ) {
        if (!isAdmin(interaction.member)) {
          return interaction.reply({
            content: "❌ Acceso denegado.",
            ephemeral: true
          });
        }

        return interaction.update({
          embeds: [
            embed(
              "👑 Panel de Administración",
              "Selecciona una sección."
            )
          ],
          components: [adminMenu()]
        });
      }

      // ---------------- PÁGINAS ----------------

      if (
        interaction.isButton() &&
        interaction.customId.startsWith("prev_")
      ) {
        const [, category, page] =
          interaction.customId.split("_");

        return interaction.update(
          categoryPage(
            category,
            Math.max(0, Number(page) - 1)
          )
        );
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith("next_")
      ) {
        const [, category, page] =
          interaction.customId.split("_");

        return interaction.update(
          categoryPage(
            category,
            Number(page) + 1
          )
        );
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith("adminprev_")
      ) {
        if (!isAdmin(interaction.member)) {
          return interaction.reply({
            content: "❌ Acceso denegado.",
            ephemeral: true
          });
        }

        const [, category, page] =
          interaction.customId.split("_");

        return interaction.update(
          adminPage(
            category,
            Math.max(0, Number(page) - 1)
          )
        );
      }

      if (
        interaction.isButton() &&
        interaction.customId.startsWith("adminnext_")
      ) {
        if (!isAdmin(interaction.member)) {
          return interaction.reply({
            content: "❌ Acceso denegado.",
            ephemeral: true
          });
        }

        const [, category, page] =
          interaction.customId.split("_");

        return interaction.update(
          adminPage(
            category,
            Number(page) + 1
          )
        );
      }

      // ---------------- TRIVIA ----------------

      if (
        interaction.isButton() &&
        interaction.customId.startsWith("trivia_")
      ) {
        const parts =
          interaction.customId.split("_");

        const channelId = interaction.channel.id;
        const data =
          activeTrivia.get(channelId);

        if (!data) {
          return interaction.reply({
            content:
              "❌ Esta trivia ya terminó.",
            ephemeral: true
          });
        }

        if (
          interaction.user.id !== data.user
        ) {
          return interaction.reply({
            content:
              "❌ Solo quien inició la trivia puede responder.",
            ephemeral: true
          });
        }

        const answer =
          Number(parts[parts.length - 1]);

        const buttons =
          interaction.message.components[0]
            .components.map(component =>
              ButtonBuilder.from(component)
                .setDisabled(true)
            );

        const row =
          new ActionRowBuilder()
            .addComponents(buttons);

        activeTrivia.delete(channelId);

        const user =
          getUser(interaction.user.id);

        if (answer === data.correct) {
          user.money += 250;
          addXP(user, 50);
          saveDB();

          return interaction.update({
            embeds: [
              embed(
                "🧠 Trivia",
                "🎉 **¡Respuesta correcta!**\n\n" +
                "💰 +250 monedas\n" +
                "✨ +50 XP"
              )
            ],
            components: [row]
          });
        }

        return interaction.update({
          embeds: [
            embed(
              "🧠 Trivia",
              "❌ Respuesta incorrecta."
            )
          ],
          components: [row]
        });
      }
    } catch (error) {
      console.error(
        "❌ Error en interacción:",
        error
      );

      try {
        if (!interaction.replied) {
          await interaction.reply({
            content:
              "❌ Ocurrió un error procesando esta interacción.",
            ephemeral: true
          });
        }
      } catch {}
    }
  }
);

// ============================================================
// 💬 COMANDOS
// ============================================================

client.on(
  Events.MessageCreate,
  async message => {
    if (!message.guild) return;
    if (message.author.bot) return;

    if (!message.content.startsWith(PREFIX)) {
      return;
    }

    const args =
      message.content
        .slice(PREFIX.length)
        .trim()
        .split(/\s+/);

    const command =
      args.shift()?.toLowerCase();

    if (!command) return;

    const guild = getGuild(message.guild.id);
    guild.commandUses++;

    saveDB();

    // ---------------- HELP ----------------

    if (command === "help") {
      return message.reply({
        embeds: [helpEmbed()],
        components: [
          mainMenu(message.member)
        ]
      });
    }

    // ---------------- TRIVIA ----------------

    if (
      command === "trivia" ||
      command === "quiz"
    ) {
      return startTrivia(message);
    }

    // ---------------- ECONOMÍA ----------------

    if (
      await economyCommand(
        message,
        command,
        args
      )
    ) return;

    // ---------------- SOCIAL ----------------

    if (
      await socialCommand(
        message,
        command,
        args
      )
    ) return;

    // ---------------- JUEGOS ----------------

    if (
      await gameCommand(
        message,
        command,
        args
      )
    ) return;

    // ---------------- RECOMPENSAS ----------------

    if (
      await rewardCommand(
        message,
        command
      )
    ) return;

    // ---------------- ESTADÍSTICAS ----------------

    if (
      await statsCommand(
        message,
        command
      )
    ) return;

    // ---------------- MODERACIÓN ----------------

    const moderationCommands = [
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
      "nick",
      "resetnick",
      "addrole",
      "removerole",
      "role",
      "unrole"
    ];

    if (
      moderationCommands.includes(command)
    ) {
      return moderationCommand(
        message,
        command,
        args
      );
    }

    // ---------------- CONFIGURACIÓN ----------------

    const configCommands = [
      "setwelcome",
      "setlog",
      "setautorole",
      "setmodrole",
      "antilink",
      "antispam",
      "automod",
      "config",
      "configuration",
      "settings"
    ];

    if (
      configCommands.includes(command)
    ) {
      return configCommand(
        message,
        command,
        args
      );
    }

    // ---------------- INFO ----------------

    if (
      command === "info" ||
      command === "about" ||
      command === "botinfo"
    ) {
      return message.reply({
        embeds: [
          embed(
            "🌌 Nexora",
            "🤖 Bot de Discord desarrollado con discord.js v14.\n\n" +
            `📌 Prefix: \`${PREFIX}\`\n` +
            `⚡ Ping: **${client.ws.ping}ms**\n` +
            `⏱️ Uptime: **${formatTime(
              Math.floor(client.uptime / 1000)
            )}**`
          )
        ]
      });
    }

    if (command === "serverinfo") {
      const guild = message.guild;

      return message.reply({
        embeds: [
          embed(
            `🌌 ${guild.name}`,
            `🆔 ${guild.id}\n` +
            `👥 Miembros: **${guild.memberCount}**\n` +
            `💬 Canales: **${guild.channels.cache.size}**\n` +
            `🎭 Roles: **${guild.roles.cache.size}**`
          )
        ]
      });
    }

    if (command === "invite") {
      return message.reply(
        "🔗 Usa el enlace de invitación configurado para tu bot desde el Developer Portal de Discord."
      );
    }

    // ---------------- NEXORA ----------------

    if (
      command === "nexora" ||
      command === "nexorainfo" ||
      command === "nexoraabout"
    ) {
      return message.reply({
        embeds: [
          embed(
            "🌌 NEXORA",
            "Un bot multifunción para tu servidor de Discord.\n\n" +
            "💰 Economía\n" +
            "👥 Social\n" +
            "🎮 Minijuegos\n" +
            "🎁 Recompensas\n" +
            "📊 Estadísticas\n" +
            "🛠️ Herramientas\n" +
            "🎨 Personalización\n" +
            "🏆 Logros"
          )
        ]
      });
    }

    // ---------------- COMANDO DESCONOCIDO ----------------

    return message.reply({
      embeds: [
        embed(
          "❌ Comando no encontrado",
          `No existe \`${PREFIX}${command}\`.\n\n` +
          `Usa \`${PREFIX}help\` para ver los comandos disponibles.`
        )
      ]
    });
  }
);

// ============================================================
// 🌐 SERVIDOR HTTP PARA RENDER
// ============================================================

http
  .createServer((req, res) => {
    res.writeHead(200, {
      "Content-Type":
        "text/plain; charset=utf-8"
    });

    res.end(
      "🌌 Nexora está funcionando correctamente."
    );
  })
  .listen(
    PORT,
    "0.0.0.0",
    () => {
      console.log(
        `🌐 Servidor HTTP activo en puerto ${PORT}`
      );
    }
  );

// ============================================================
// 🟢 READY
// ============================================================

client.once(
  Events.ClientReady,
  readyClient => {
    console.log(
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    );

    console.log(
      `🌌 NEXORA ONLINE`
    );

    console.log(
      `🤖 Usuario: ${readyClient.user.tag}`
    );

    console.log(
      `🏠 Servidores: ${readyClient.guilds.cache.size}`
    );

    console.log(
      `📌 Prefix: ${PREFIX}`
    );

    console.log(
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    );
  }
);

// ============================================================
// 🔐 LOGIN
// ============================================================

if (TOKEN) {
  client.login(TOKEN).catch(error => {
    console.error(
      "❌ Error iniciando sesión en Discord:"
    );

    console.error(error);
  });
}
