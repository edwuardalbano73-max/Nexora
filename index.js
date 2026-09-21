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
const PORT = Number(process.env.PORT) || 10000;

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
      db = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    }
  } catch (error) {
    console.error("❌ Error cargando base de datos:", error);
    db = { users: {}, guilds: {} };
  }

  if (!db.users) db.users = {};
  if (!db.guilds) db.guilds = {};
}

function saveDatabase() {
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(db, null, 2)
    );
  } catch (error) {
    console.error("❌ Error guardando base de datos:", error);
  }
}

loadDatabase();

// ============================================================
// DATOS
// ============================================================

function getUser(id) {
  if (!db.users[id]) {
    db.users[id] = {
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
      lastSpin: 0
    };
  }

  return db.users[id];
}

function getGuild(id) {
  if (!db.guilds[id]) {
    db.guilds[id] = {
      prefix: PREFIX,
      welcomeChannel: null,
      logChannel: null,
      modRole: null,
      autoRole: null,

      antiSpam: false,
      antiLink: false,
      autoMod: false,
      filter: false,

      economy: true,
      social: true,
      rewards: true,
      levels: true,

      language: "es",
      timezone: "Europe/Amsterdam",

      commandToggles: {},

      linkExemptRoles: [],
      spamExemptRoles: [],

      commandUses: 0
    };
  }

  return db.guilds[id];
}

// ============================================================
// UTILIDADES
// ============================================================

function formatMoney(number) {
  return Number(number || 0).toLocaleString("es-ES");
}

function random(min, max) {
  return Math.floor(
    Math.random() * (max - min + 1)
  ) + min;
}

function cooldownRemaining(last, cooldown) {
  const remaining =
    cooldown - (Date.now() - last);

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

function isAdmin(member) {
  return !!member?.permissions?.has(
    PermissionsBitField.Flags.Administrator
  );
}

function hasPermission(member, permission) {
  return !!member?.permissions?.has(permission);
}

function getMember(message, args) {
  const mention =
    message.mentions.members.first();

  if (mention) return mention;

  if (args[0]) {
    return message.guild.members.cache.get(
      args[0].replace(/[<@!>]/g, "")
    );
  }

  return message.member;
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
    if (
      interaction.replied ||
      interaction.deferred
    ) {
      return await interaction.editReply(options);
    }

    return await interaction.update(options);
  } catch {
    try {
      if (
        !interaction.replied &&
        !interaction.deferred
      ) {
        return await interaction.reply(options);
      }
    } catch {}
  }
}

function baseEmbed(title, description = "") {
  return new EmbedBuilder()
    .setColor(0x6f42c1)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

function commandUsed(guildId) {
  const guild = getGuild(guildId);

  guild.commandUses =
    (guild.commandUses || 0) + 1;

  saveDatabase();
}

// ============================================================
// CATEGORÍAS PRINCIPALES
// 40 COMANDOS CADA UNA
// ============================================================

const CATEGORIES = {

  economy: {
    name: "💰 Economía",
    commands: [
      "balance","bank","deposit","withdraw","pay",
      "work","salary","shop","buy","sell",
      "inventory","rich","economy","cash","give",
      "tip","giftmoney","treasure","mine","fish",
      "farm","dig","hunt","dailyeco","weeklyeco",
      "monthlyeco","lottery","coinflip","slots","networth",
      "tax","wallet","depositall","withdrawall","moneyinfo",
      "economyinfo","earnings","spendings","cashflow","moneylog"
    ]
  },

  social: {
    name: "👥 Social",
    commands: [
      "profile","socialrank","levelinfo","reputation","give-rep",
      "user","userinfo","avatar","banner","server",
      "members","leaderboard","top-level","top-rep","badges",
      "achievements","roles","permissions","joined","nickname",
      "setbio","bio","setstatus","status","friend",
      "unfriend","friends","follow","followers","social",
      "socialstats","activity","rank","level","xp",
      "rep","socialinfo","card","aboutme","presence","memberinfo"
    ]
  },

  minigames: {
    name: "🎮 Minijuegos",
    commands: [
      "roll","dice","flipcoin","eightball","guess",
      "rps","choose","random","rate","joke",
      "meme","roast","compliment","fact","magic",
      "fortune","yesno","reverse","fliptext","sayfun",
      "emoji","color","animal","planet","space",
      "challenge","trivia","slotsfun","mathquiz","reaction",
      "duel","memory","scramble","numberguess","wordguess",
      "quickquiz","coinrace","dicebattle","guesscolor","quiz"
    ]
  },

  rewards: {
    name: "🎁 Recompensas",
    commands: [
      "daily","weekly","monthly","streak","reward",
      "claim","bonus","giftbox","chest","treasure-reward",
      "lucky","spin","wheel","scratch","quest",
      "quests","mission","missions","xpboost","moneyboost",
      "luck","prize","prizes","event","events",
      "calendar","checkin","streakinfo","rewardinfo","redeem",
      "rewardlog","bonusinfo","claimall","dailyinfo","weeklyinfo",
      "monthlyinfo","questinfo","missioninfo","eventinfo","rewardstats"
    ]
  },

  stats: {
    name: "📊 Estadísticas",
    commands: [
      "stats","serverstats","userstats","botstats","membercount",
      "onlinecount","commandstats","economy-stats","levelstats","repstats",
      "top","topmoney","topxp","toprep","topactive",
      "uptime","ping","latency","rank","rankme",
      "rankmoney","rankxp","activity","messages","voice",
      "commandsused","serveractivity","useractivity","economystats","socialstats",
      "rewardstats","gamestats","moderationstats","securitystats","levelstats2",
      "serverlevel","servermoney","serverxp","serverrep","growth"
    ]
  },

  tools: {
    name: "🛠️ Herramientas",
    commands: [
      "help","menu","ping","avatar","banner",
      "userinfo","serverinfo","channelinfo","roleinfo","roles",
      "channels","emojiinfo","servericon","serverbanner","invite",
      "say","calc","poll","choose","remind",
      "timer","translate","announce","embed","time",
      "date","status","botinfo","commandinfo","categoryinfo",
      "id","snowflake","permissions","system","library","creator",
      "credits","diagnose","health","serverid","userid"
    ]
  },

  customization: {
    name: "🎨 Personalización",
    commands: [
      "setbio","setstatus","setcolor","settitle","setfooter",
      "setavatar","setbanner","profilecolor","profiletitle","profilefooter",
      "profile","resetprofile","cardstyle","cardtext","cardshow",
      "hideprofile","showprofile","nickname","setprefix","language",
      "timezone","theme","welcomeview","welcomeconfig","personalinfo",
      "setabout","aboutme","setemoji","setname","setdescription",
      "profileinfo","profilepreview","statusinfo","colorinfo","themeinfo",
      "styleinfo","footerinfo","titleinfo","bioinfo","custominfo"
    ]
  },

  achievements: {
    name: "🏆 Logros",
    commands: [
      "achievements","badges","achievement","achievementinfo","badge",
      "badgeinfo","goals","goal","progress","progressinfo",
      "milestones","milestone","trophies","trophy","unlocks",
      "unlocked","completion","completepoints","points","medal",
      "medals","showcase","showcaseadd","showcaseremove","collection",
      "collections","collector","rare","common","legendary",
      "titles","title","settitle","gettitle","ranktitle",
      "achievementrank","badgecount","trophycount","pointsrank","goalstats"
    ]
  },

  info: {
    name: "ℹ️ Información",
    commands: [
      "help","menu","about","botinfo","stats",
      "ping","uptime","serverinfo","channelinfo","userinfo",
      "avatarinfo","bannerinfo","roleinfo","membercount","servericon",
      "serverbanner","invite","support","website","version",
      "commands","categories","status","latency","system",
      "library","creator","credits","nexora","commandinfo",
      "changelog","rules","terms","privacy","faq",
      "features","modules","servers","memory","diagnostics"
    ]
  },

  nexora: {
    name: "🌌 Nexora",
    commands: [
      "nexora","nexorainfo","version","status","features",
      "roadmap","credits","creator","support","uptime",
      "ping","prefix","commands","categories","dashboard",
      "news","updates","maintenance","modules","configcheck",
      "diagnostics","health","memory","cache","servers",
      "shards","api","system","library","build",
      "release","changelog","license","terms","privacy",
      "website","community","helpdesk","report","suggest",
      "feedback"
    ]
  }
};

// ============================================================
// CATEGORÍAS ADMIN
// ============================================================

const ADMIN_CATEGORIES = {

  moderation: {
    name: "🛡️ Moderación",
    commands: [
      "ban","unban","kick","timeout","untimeout",
      "mute","unmute","warn","warnings","unwarn",
      "clearwarns","purge","clear","slowmode","unslowmode",
      "lock","unlock","lockdown","unlockdown","nick",
      "resetnick","addrole","removerole","announce","embed",
      "saymod","channelinfo","servermodinfo","modlogs","staff",
      "modhelp","roleinfo","massrole","massnick","history",
      "punishments","punishmentinfo","moderator","modstats","actionlog"
    ]
  },

  security: {
    name: "🔗 Seguridad",
    commands: [
      "antilink","antispam","automod","filter","whitelist",
      "blacklist","allowlist","blocklist","security","securitylog",
      "securityinfo","linklog","spamlog","raidmode","lockdown",
      "verify","verification","protection","botfilter","invitefilter",
      "mentionfilter","capsfilter","wordfilter","linkexempt","spam-exempt",
      "resetsecurity","securityconfig","securitystatus","antiraid","antibot",
      "antimention","anticaps","antiword","securitytest","filtertest",
      "linktest","spamtest","raidtest","securitylogs","securityhelp"
    ]
  },

  users: {
    name: "👥 Usuarios",
    commands: [
      "userinfo","profile","avatar","banner","balance",
      "bank","inventory","warnings","reputation","level",
      "roles","permissions","joined","nickname","history",
      "notes","addnote","removenote","noteslist","lookup",
      "finduser","member","membercount","kickinfo","baninfo",
      "timeoutinfo","userstats","usereconomy","useractivity","userachievements",
      "userbadges","userroles","userpresence","userlevel","userxp",
      "userrep","userwarnings","userhistory","usernotes","usercommands"
    ]
  },

  server: {
    name: "⚙️ Servidor",
    commands: [
      "config","settings","serverconfig","prefix","welcome",
      "setwelcome","log","setlog","modrole","setmodrole",
      "autorole","setautorole","language","timezone","economyconfig",
      "socialconfig","rewardconfig","levelconfig","welcomeconfig","logconfig",
      "botconfig","channels","roles","permissions","resetconfig",
      "togglecommands","modules","servername","servericon","serverbanner",
      "verification","serverinfo","serverstats","configinfo","configreset",
      "configexport","configimport","serverhealth","servermodules","serverhelp"
    ]
  },

  logs: {
    name: "📜 Logs",
    commands: [
      "logs","log","loginfo","setlog","unsetlog","modlogs",
      "securitylogs","messagelogs","memberlogs","rolelogs","channellogs",
      "serverlogs","commandlogs","economylogs","punishmentlogs","joinlogs",
      "leavelogs","banlogs","kicklogs","timeoutlogs","warnlogs",
      "auditlogs","logtest","logclear","logstatus","logchannel",
      "logconfig","logenable","logdisable","logfilter","logsearch",
      "logexport","logstats","logcount","recentlogs","latestlogs",
      "actionlogs","securitylog","moderationlog","systemlog"
    ]
  },

  economy: {
    name: "💰 Economía",
    commands: [
      "givepay","payall","addmoney","removemoney","setmoney",
      "resetmoney","addbank","removebank","setbank","resetbank",
      "economyinfo","economyreset","shopadd","shopremove","shopclear",
      "itemadd","itemremove","itemprice","setprice","tax",
      "economylog","rich","richest","poorest","economyenable",
      "economydisable","moneycheck","bankcheck","moneylog","economystats",
      "setreward","setdaily","setweekly","setmonthly","setwork",
      "settax","economyconfig","economyhelp","economybackup","economyrestore"
    ]
  },

  games: {
    name: "🎮 Minijuegos",
    commands: [
      "gameinfo","gameenable","gamedisable","resetgames","triviareset",
      "guessreset","leaderboardgames","topgames","rewardsgames","gamebonus",
      "gamecooldown","setcooldown","gameconfig","triviaquestions","addquestion",
      "removequestion","questionlist","gamehelp","gameaudit","gameusers",
      "gamehistory","gameclear","gameevents","gameevent","gamepoints",
      "setpoints","resetpoints","gameleaderboard","gamewins","gamelosses",
      "gamerank","gamesettings","gamebalance","gamexp","gamelevels",
      "gamerewards","gamestats","gameinfoall","gamebackup","gamerestore"
    ]
  },

  tools: {
    name: "🧹 Herramientas",
    commands: [
      "say","embed","announce","clear","purge","slowmode",
      "nick","addrole","removerole","channelinfo","roleinfo","serverinfo",
      "userinfo","calc","poll","choose","avatar","banner",
      "invite","commandinfo","categoryinfo","reload","reloadconfig","backup",
      "restore","export","import","diagnose","health","cacheclear","dbsave",
      "dbload","maintenance","maintenanceon","maintenanceoff","system","memory",
      "database","filecheck","toolhelp"
    ]
  },

  stats: {
    name: "📊 Estadísticas",
    commands: [
      "stats","serverstats","botstats","memberstats","commandstats",
      "economy-stats","moderationstats","securitystats","gamestats","socialstats",
      "rewardstats","levelstats","activity","activeusers","messages",
      "channels","roles","joins","leaves","bans",
      "kicks","timeouts","warns","commandsused","topcommands","topusers",
      "topmoney","topxp","toppoints","uptime","latency","memory",
      "guilds","serveractivity","servergrowth","usergrowth","economygrowth",
      "modgrowth","gamegrowth","securitygrowth","statsexport"
    ]
  },

  advanced: {
    name: "🌐 Avanzado",
    commands: [
      "advanced","debug","diagnostics","health","modules","moduleinfo",
      "permissions","intents","cache","database","dbinfo","backup",
      "restore","export","import","maintenance","maintenanceon","maintenanceoff",
      "reload","reloadconfig","resetall","migrate","migratecheck","datafix",
      "optimize","compact","test","webserver","api","status","shard",
      "shardinfo","runtime","environment","process","memoryinfo","nodeinfo",
      "discordinfo","advancedhelp","systemcheck","integrity"
    ]
  }
};

// ============================================================
// MENÚ PRINCIPAL
// ============================================================

function mainMenu(member) {
  const options =
    Object.entries(CATEGORIES).map(
      ([id, category]) => ({
        label: category.name
          .replace(/^.\s/, "")
          .slice(0, 100),

        description:
          `Ver los 40 comandos de ${category.name
            .replace(/^.\s/, "")}`.slice(0, 100),

        value: id,

        emoji:
          category.name.split(" ")[0]
      })
    );

  const rows = [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("nexora_category")
        .setPlaceholder(
          "🌌 Selecciona una categoría..."
        )
        .addOptions(options)
    )
  ];

  if (isAdmin(member)) {
    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("nexora_admin")
          .setLabel("👑 Panel de Admin")
          .setStyle(ButtonStyle.Danger)
      )
    );
  }

  return rows;
}

// ============================================================
// AYUDA
// ============================================================

function helpEmbed(member) {
  let text =
    "🌌 **Bienvenido al centro de control de Nexora.**\n\n" +
    "Selecciona una categoría para ver sus comandos.\n\n";

  for (const category of Object.values(CATEGORIES)) {
    text += `${category.name}\n`;
  }

  if (isAdmin(member)) {
    text +=
      "\n👑 **Panel de Admin disponible abajo.**";
  }

  return baseEmbed(
    "🌌 NEXORA",
    text
  ).setFooter({
    text: "Nexora • n.help"
  });
}

// ============================================================
// PÁGINAS DE CATEGORÍAS
// 20 COMANDOS POR PÁGINA
// ============================================================

function categoryPage(categoryId, page = 0) {
  const category =
    CATEGORIES[categoryId];

  if (!category) return null;

  const perPage = 20;

  const totalPages =
    Math.ceil(
      category.commands.length /
      perPage
    );

  page = Math.max(
    0,
    Math.min(page, totalPages - 1)
  );

  const start = page * perPage;

  const commands =
    category.commands.slice(
      start,
      start + perPage
    );

  let description = "";

  commands.forEach(
    (command, index) => {
      description +=
        `**${start + index + 1}.** \`n.${command}\`\n`;
    }
  );

  const previous =
    new ButtonBuilder()
      .setCustomId(
        `nexora_page_${categoryId}_${page - 1}`
      )
      .setLabel("⬅️ Anterior")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0);

  const home =
    new ButtonBuilder()
      .setCustomId("nexora_home")
      .setLabel("🏠 Menú")
      .setStyle(ButtonStyle.Primary);

  const next =
    new ButtonBuilder()
      .setCustomId(
        `nexora_page_${categoryId}_${page + 1}`
      )
      .setLabel("Siguiente ➡️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(
        page === totalPages - 1
      );

  return {
    embeds: [
      baseEmbed(
        `${category.name} • Página ${page + 1}/${totalPages}`,
        description
      ).setFooter({
        text:
          `Comandos ${start + 1}-${Math.min(
            start + perPage,
            category.commands.length
          )} de ${category.commands.length}`
      })
    ],

    components: [
      new ActionRowBuilder().addComponents(
        previous,
        home,
        next
      )
    ]
  };
}

// ============================================================
// PANEL ADMIN
// ============================================================

function adminPanel() {
  const options =
    Object.entries(
      ADMIN_CATEGORIES
    ).map(([id, category]) => ({
      label:
        category.name.replace(/^.\s/, ""),

      description:
        "40 comandos administrativos",

      value: id,

      emoji:
        category.name.split(" ")[0]
    }));

  return {
    embeds: [
      baseEmbed(
        "👑 PANEL DE ADMIN",
        "Selecciona una sección administrativa."
      )
    ],

    components: [
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(
            "nexora_admin_category"
          )
          .setPlaceholder(
            "👑 Selecciona una sección..."
          )
          .addOptions(options)
      ),

      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("nexora_home")
          .setLabel("🏠 Menú")
          .setStyle(ButtonStyle.Primary)
      )
    ]
  };
}

function adminCategoryPage(
  categoryId,
  page = 0
) {
  const category =
    ADMIN_CATEGORIES[categoryId];

  if (!category) return null;

  const perPage = 20;

  const totalPages =
    Math.ceil(
      category.commands.length /
      perPage
    );

  page = Math.max(
    0,
    Math.min(page, totalPages - 1)
  );

  const start = page * perPage;

  const commands =
    category.commands.slice(
      start,
      start + perPage
    );

  let text = "";

  commands.forEach(
    (command, index) => {
      text +=
        `**${start + index + 1}.** \`n.${command}\`\n`;
    }
  );

  const previous =
    new ButtonBuilder()
      .setCustomId(
        `nexora_admin_page_${categoryId}_${page - 1}`
      )
      .setLabel("⬅️ Anterior")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0);

  const panel =
    new ButtonBuilder()
      .setCustomId("nexora_admin")
      .setLabel("👑 Panel")
      .setStyle(ButtonStyle.Danger);

  const next =
    new ButtonBuilder()
      .setCustomId(
        `nexora_admin_page_${categoryId}_${page + 1}`
      )
      .setLabel("Siguiente ➡️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(
        page === totalPages - 1
      );

  return {
    embeds: [
      baseEmbed(
        `${category.name} • Página ${page + 1}/${totalPages}`,
        text
      )
    ],

    components: [
      new ActionRowBuilder().addComponents(
        previous,
        panel,
        next
      )
    ]
  };
}

// ============================================================
// LOGS
// ============================================================

async function sendLog(
  guild,
  title,
  description
) {
  try {
    const data =
      getGuild(guild.id);

    if (!data.logChannel) return;

    const channel =
      guild.channels.cache.get(
        data.logChannel
      );

    if (!channel) return;

    await channel.send({
      embeds: [
        baseEmbed(
          title,
          description
        )
      ]
    });
  } catch (error) {
    console.error(
      "❌ Error enviando log:",
      error
    );
  }
}

// ============================================================
// ECONOMÍA
// ============================================================

async function economyCommand(
  message,
  command,
  args
) {
  const user =
    getUser(message.author.id);

  if (
    [
      "balance",
      "cash",
      "wallet"
    ].includes(command)
  ) {
    return reply(
      message,
      `💰 Tienes **${formatMoney(user.money)}** monedas.`
    );
  }

  if (command === "bank") {
    return reply(
      message,
      `🏦 Banco: **${formatMoney(user.bank)}** monedas.`
    );
  }

  if (command === "deposit") {
    const amount =
      Number(args[0]);

    if (
      !amount ||
      amount <= 0
    ) {
      return reply(
        message,
        "❌ Usa `n.deposit cantidad`."
      );
    }

    if (amount > user.money) {
      return reply(
        message,
        "❌ No tienes suficiente dinero."
      );
    }

    user.money -= amount;
    user.bank += amount;

    saveDatabase();

    return reply(
      message,
      `🏦 Depositaste **${formatMoney(amount)}** monedas.`
    );
  }

  if (command === "withdraw") {
    const amount =
      Number(args[0]);

    if (
      !amount ||
      amount <= 0
    ) {
      return reply(
        message,
        "❌ Usa `n.withdraw cantidad`."
      );
    }

    if (amount > user.bank) {
      return reply(
        message,
        "❌ No tienes suficiente dinero en el banco."
      );
    }

    user.bank -= amount;
    user.money += amount;

    saveDatabase();

    return reply(
      message,
      `💵 Retiraste **${formatMoney(amount)}** monedas.`
    );
  }

  if (
    ["pay", "give", "tip", "giftmoney"].includes(command)
  ) {
    const target =
      message.mentions.users.first();

    const amount =
      Number(args[1] || args[0]);

    if (!target) {
      return reply(
        message,
        "❌ Menciona al usuario."
      );
    }

    if (
      target.id === message.author.id
    ) {
      return reply(
        message,
        "❌ No puedes pagarte a ti mismo."
      );
    }

    if (
      !amount ||
      amount <= 0
    ) {
      return reply(
        message,
        "❌ Indica una cantidad válida."
      );
    }

    if (amount > user.money) {
      return reply(
        message,
        "❌ No tienes suficiente dinero."
      );
    }

    const receiver =
      getUser(target.id);

    user.money -= amount;
    receiver.money += amount;

    saveDatabase();

    return reply(
      message,
      `💸 Enviaste **${formatMoney(amount)}** monedas a ${target}.`
    );
  }

  if (
    ["work", "salary"].includes(command)
  ) {
    const left =
      cooldownRemaining(
        user.lastWork,
        60 * 60 * 1000
      );

    if (left) {
      return reply(
        message,
        `⏳ Podrás trabajar nuevamente en **${formatTime(left)}**.`
      );
    }

    const amount =
      random(100, 500);

    user.money += amount;
    user.lastWork = Date.now();

    addXP(user, random(10, 25));

    saveDatabase();

    return reply(
      message,
      `💼 Trabajaste y ganaste **${formatMoney(amount)}** monedas.`
    );
  }

  if (
    ["daily", "dailyeco"].includes(command)
  ) {
    const left =
      cooldownRemaining(
        user.lastDaily,
        24 * 60 * 60 * 1000
      );

    if (left) {
      return reply(
        message,
        `⏳ Tu recompensa estará disponible en **${formatTime(left)}**.`
      );
    }

    const amount =
      random(250, 750);

    user.money += amount;
    user.lastDaily = Date.now();
    user.streak++;

    addXP(user, 30);

    saveDatabase();

    return reply(
      message,
      `🎁 Recompensa diaria: **${formatMoney(amount)}** monedas.\n🔥 Racha: **${user.streak}**`
    );
  }

  if (
    ["weekly", "weeklyeco"].includes(command)
  ) {
    const left =
      cooldownRemaining(
        user.lastWeekly,
        7 * 24 * 60 * 60 * 1000
      );

    if (left) {
      return reply(
        message,
        `⏳ Disponible en **${formatTime(left)}**.`
      );
    }

    const amount =
      random(1000, 3000);

    user.money += amount;
    user.lastWeekly = Date.now();

    addXP(user, 100);

    saveDatabase();

    return reply(
      message,
      `🎁 Recompensa semanal: **${formatMoney(amount)}** monedas.`
    );
  }

  if (
    ["monthly", "monthlyeco"].includes(command)
  ) {
    const left =
      cooldownRemaining(
        user.lastMonthly,
        30 * 24 * 60 * 60 * 1000
      );

    if (left) {
      return reply(
        message,
        `⏳ Disponible en **${formatTime(left)}**.`
      );
    }

    const amount =
      random(5000, 12000);

    user.money += amount;
    user.lastMonthly = Date.now();

    addXP(user, 300);

    saveDatabase();

    return reply(
      message,
      `🎁 Recompensa mensual: **${formatMoney(amount)}** monedas.`
    );
  }

  if (
    [
      "treasure",
      "mine",
      "fish",
      "farm",
      "dig",
      "hunt"
    ].includes(command)
  ) {
    const amount =
      random(50, 350);

    user.money += amount;

    addXP(
      user,
      random(5, 20)
    );

    saveDatabase();

    return reply(
      message,
      `⛏️ Encontraste **${formatMoney(amount)}** monedas.`
    );
  }

  if (command === "inventory") {
    const items =
      user.inventory.length
        ? user.inventory.join(", ")
        : "Vacío";

    return reply(
      message,
      `🎒 **Inventario**\n${items}`
    );
  }

  if (
    ["rich", "leaderboard"].includes(command)
  ) {
    const ranking =
      Object.entries(db.users)
        .sort(
          (a, b) =>
            (b[1].money || 0) -
            (a[1].money || 0)
        )
        .slice(0, 10);

    let text = "";

    for (
      let i = 0;
      i < ranking.length;
      i++
    ) {
      text +=
        `**${i + 1}.** <@${ranking[i][0]}> — ${formatMoney(ranking[i][1].money)}\n`;
    }

    return reply(
      message,
      {
        embeds: [
          baseEmbed(
            "💰 Ranking económico",
            text || "No hay datos."
          )
        ]
      }
    );
  }

  if (
    ["networth", "economy"].includes(command)
  ) {
    return reply(
      message,
      {
        embeds: [
          baseEmbed(
            "💰 Economía",
            `💵 Efectivo: **${formatMoney(user.money)}**\n` +
            `🏦 Banco: **${formatMoney(user.bank)}**\n` +
            `💎 Patrimonio: **${formatMoney(user.money + user.bank)}**`
          )
        ]
      }
    );
  }

  return false;
}

// ============================================================
// SOCIAL
// ============================================================

async function socialCommand(
  message,
  command,
  args
) {
  const user =
    getUser(message.author.id);

  if (command === "profile") {
    return reply(
      message,
      {
        embeds: [
          baseEmbed(
            `👤 Perfil de ${message.author.username}`,
            `💰 Dinero: **${formatMoney(user.money)}**\n` +
            `🏦 Banco: **${formatMoney(user.bank)}**\n` +
            `⭐ Nivel: **${user.level}**\n` +
            `✨ XP: **${user.xp}**\n` +
            `❤️ Reputación: **${user.reputation}**\n` +
            `📝 ${user.bio}\n` +
            `📢 Estado: **${user.status}**`
          )
        ]
      }
    );
  }

  if (
    ["userinfo", "user"].includes(command)
  ) {
    const member =
      getMember(message, args);

    if (!member) {
      return reply(
        message,
        "❌ Usuario no encontrado."
      );
    }

    return reply(
      message,
      {
        embeds: [
          baseEmbed(
            `👤 ${member.user.username}`,
            `🆔 ID: \`${member.id}\`\n` +
            `📅 Cuenta: <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n` +
            `📅 Entrada: ${
              member.joinedTimestamp
                ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
                : "Desconocida"
            }`
          )
        ]
      }
    );
  }

  if (command === "avatar") {
    return reply(
      message,
      message.author.displayAvatarURL({
        size: 1024
      })
    );
  }

  if (command === "banner") {
    const userObj =
      await client.users.fetch(
        message.author.id,
        { force: true }
      );

    return reply(
      message,
      userObj.bannerURL({
        size: 1024
      }) || "❌ Este usuario no tiene banner."
    );
  }

  if (
    ["reputation", "rep"].includes(command)
  ) {
    return reply(
      message,
      `❤️ Tu reputación es **${user.reputation}**.`
    );
  }

  if (
    ["give-rep", "rep+"].includes(command)
  ) {
    const target =
      message.mentions.users.first();

    if (!target) {
      return reply(
        message,
        "❌ Menciona a un usuario."
      );
    }

    if (
      target.id === message.author.id
    ) {
      return reply(
        message,
        "❌ No puedes darte reputación."
      );
    }

    const left =
      cooldownRemaining(
        user.lastRep,
        24 * 60 * 60 * 1000
      );

    if (left) {
      return reply(
        message,
        `⏳ Podrás dar reputación en ${formatTime(left)}.`
      );
    }

    getUser(target.id).reputation++;
    user.lastRep = Date.now();

    saveDatabase();

    return reply(
      message,
      `❤️ Le diste reputación a ${target}.`
    );
  }

  if (command === "levelinfo") {
    return reply(
      message,
      `⭐ Nivel: **${user.level}**\n✨ XP: **${user.xp}/${user.level * 100}**`
    );
  }

  if (command === "setbio") {
    const bio =
      args.join(" ").slice(0, 200);

    if (!bio) {
      return reply(
        message,
        "❌ Escribe una biografía."
      );
    }

    user.bio = bio;
    saveDatabase();

    return reply(
      message,
      "✅ Biografía actualizada."
    );
  }

  if (command === "bio") {
    return reply(
      message,
      `📝 ${user.bio}`
    );
  }

  if (command === "setstatus") {
    const status =
      args.join(" ").slice(0, 100);

    if (!status) {
      return reply(
        message,
        "❌ Escribe un estado."
      );
    }

    user.status = status;
    saveDatabase();

    return reply(
      message,
      "✅ Estado actualizado."
    );
  }

  if (command === "status") {
    return reply(
      message,
      `📢 Estado: **${user.status}**`
    );
  }

  if (command === "roles") {
    return reply(
      message,
      `🎭 ${message.member.roles.cache
        .filter(r => r.id !== message.guild.id)
        .map(r => r.toString())
        .join(", ") || "Sin roles"}`
    );
  }

  if (command === "permissions") {
    return reply(
      message,
      `🔐 Permisos:\n\`\`\`\n${
        message.member.permissions
          .toArray()
          .join("\n")
      }\n\`\`\``
    );
  }

  if (command === "joined") {
    return reply(
      message,
      message.member.joinedTimestamp
        ? `📅 Entraste <t:${Math.floor(message.member.joinedTimestamp / 1000)}:R>`
        : "❌ No disponible."
    );
  }

  return false;
}

// ============================================================
// MINIJUEGOS
// ============================================================

async function gamesCommand(
  message,
  command,
  args
) {
  const user =
    getUser(message.author.id);

  if (
    ["roll", "dice"].includes(command)
  ) {
    const value =
      random(1, 6);

    return reply(
      message,
      `🎲 Sacaste **${value}**.`
    );
  }

  if (
    ["flipcoin", "coinflip"].includes(command)
  ) {
    return reply(
      message,
      `🪙 Salió **${
        Math.random() < 0.5
          ? "Cara"
          : "Cruz"
      }**.`
    );
  }

  if (command === "eightball") {
    const answers = [
      "Sí.",
      "No.",
      "Tal vez.",
      "Probablemente.",
      "No estoy seguro.",
      "Definitivamente."
    ];

    return reply(
      message,
      `🔮 ${answers[random(0, answers.length - 1)]}`
    );
  }

  if (
    ["guess", "numberguess"].includes(command)
  ) {
    const number =
      Number(args[0]);

    if (!number) {
      return reply(
        message,
        "🎯 Adivina un número del 1 al 10 usando `n.guess número`."
      );
    }

    const target =
      random(1, 10);

    if (number === target) {
      user.money += 100;
      addXP(user, 20);
      saveDatabase();

      return reply(
        message,
        "🎯 ¡Correcto! Ganaste **100 monedas**."
      );
    }

    return reply(
      message,
      `❌ Fallaste. Era **${target}**.`
    );
  }

  if (command === "rps") {
    const choices = [
      "piedra",
      "papel",
      "tijera"
    ];

    const bot =
      choices[random(0, 2)];

    const choice =
      args[0]?.toLowerCase();

    if (!choices.includes(choice)) {
      return reply(
        message,
        "✊ Usa `n.rps piedra`, `n.rps papel` o `n.rps tijera`."
      );
    }

    if (choice === bot) {
      return reply(
        message,
        `🤝 Empate. Yo elegí **${bot}**.`
      );
    }

    const win =
      (choice === "piedra" && bot === "tijera") ||
      (choice === "papel" && bot === "piedra") ||
      (choice === "tijera" && bot === "papel");

    if (win) {
      user.money += 100;
      addXP(user, 15);
      saveDatabase();

      return reply(
        message,
        `🎉 Ganaste. Yo elegí **${bot}**.\n💰 +100 monedas`
      );
    }

    return reply(
      message,
      `😅 Perdiste. Yo elegí **${bot}**.`
    );
  }

  if (command === "trivia") {
    return startTrivia(message);
  }

  if (command === "joke") {
    const jokes = [
      "¿Qué hace una abeja en el gimnasio? ¡Zum-ba!",
      "¿Qué le dijo un pez a otro? Nada.",
      "¿Por qué el libro fue al médico? Porque tenía muchas páginas enfermas."
    ];

    return reply(
      message,
      `😂 ${jokes[random(0, jokes.length - 1)]}`
    );
  }

  if (command === "compliment") {
    return reply(
      message,
      "✨ ¡Hoy estás dejando tu huella!"
    );
  }

  if (command === "fact") {
    const facts = [
      "🧠 Los pulpos tienen tres corazones.",
      "🌌 Júpiter es el planeta más grande del sistema solar.",
      "🐝 Las abejas se comunican mediante movimientos."
    ];

    return reply(
      message,
      facts[random(0, facts.length - 1)]
    );
  }

  if (
    ["random", "number"].includes(command)
  ) {
    return reply(
      message,
      `🎲 Número aleatorio: **${random(1, 100)}**`
    );
  }

  if (command === "reverse") {
    return reply(
      message,
      args.join(" ")
        .split("")
        .reverse()
        .join("") || "❌ Escribe texto."
    );
  }

  return false;
}

// ============================================================
// TRIVIA
// ============================================================

const triviaQuestions = [
  {
    q: "¿Cuál es el planeta más grande del sistema solar?",
    answers: [
      "Marte",
      "Júpiter",
      "Venus",
      "Mercurio"
    ],
    correct: 1
  },
  {
    q: "¿Cuántos continentes hay generalmente reconocidos?",
    answers: [
      "5",
      "6",
      "7",
      "8"
    ],
    correct: 2
  },
  {
    q: "¿Cuál es el océano más grande?",
    answers: [
      "Atlántico",
      "Índico",
      "Ártico",
      "Pacífico"
    ],
    correct: 3
  }
];

const triviaSessions = new Map();

async function startTrivia(message) {
  const question =
    triviaQuestions[
      random(
        0,
        triviaQuestions.length - 1
      )
    ];

  const sessionId =
    `${message.id}_${Date.now()}`;

  triviaSessions.set(
    sessionId,
    {
      userId: message.author.id,
      question,
      answered: false
    }
  );

  const buttons =
    new ActionRowBuilder().addComponents(
      ["A", "B", "C", "D"].map(
        (letter, index) =>
          new ButtonBuilder()
            .setCustomId(
              `trivia_${sessionId}_${index}`
            )
            .setLabel(letter)
            .setStyle(
              ButtonStyle.Primary
            )
      )
    );

  const msg =
    await message.reply({
      embeds: [
        baseEmbed(
          "🧠 Trivia",
          `**${question.q}**\n\n` +
          `🇦 **${question.answers[0]}**\n` +
          `🇧 **${question.answers[1]}**\n` +
          `🇨 **${question.answers[2]}**\n` +
          `🇩 **${question.answers[3]}**`
        )
      ],
      components: [buttons]
    });

  setTimeout(
    async () => {
      if (
        triviaSessions.has(sessionId)
      ) {
        triviaSessions.delete(
          sessionId
        );

        try {
          await msg.edit({
            components: []
          });
        } catch {}
      }
    },
    30000
  );
}

// ============================================================
// RECOMPENSAS
// ============================================================

async function rewardsCommand(
  message,
  command
) {
  const user =
    getUser(message.author.id);

  if (
    ["streak", "streakinfo"].includes(command)
  ) {
    return reply(
      message,
      `🔥 Tu racha es de **${user.streak}** días.`
    );
  }

  if (
    ["reward", "rewardinfo", "rewards"].includes(command)
  ) {
    return reply(
      message,
      {
        embeds: [
          baseEmbed(
            "🎁 Recompensas",
            "🎁 Daily\n" +
            "📅 Weekly\n" +
            "🗓️ Monthly\n" +
            "🔥 Rachas\n" +
            "⭐ XP"
          )
        ]
      }
    );
  }

  if (
    ["bonus", "claim", "giftbox", "chest", "lucky"].includes(command)
  ) {
    const amount =
      random(100, 500);

    user.money += amount;
    addXP(user, 20);

    saveDatabase();

    return reply(
      message,
      `🎁 ¡Ganaste **${formatMoney(amount)}** monedas!`
    );
  }

  if (
    ["spin", "wheel"].includes(command)
  ) {
    const left =
      cooldownRemaining(
        user.lastSpin,
        60 * 60 * 1000
      );

    if (left) {
      return reply(
        message,
        `🎡 Podrás girar nuevamente en **${formatTime(left)}**.`
      );
    }

    const amount =
      random(50, 1000);

    user.money += amount;
    user.lastSpin = Date.now();

    saveDatabase();

    return reply(
      message,
      `🎡 La ruleta te dio **${formatMoney(amount)}** monedas.`
    );
  }

  if (
    ["quest", "quests", "mission", "missions"].includes(command)
  ) {
    return reply(
      message,
      "🎯 **Misión:** usa 5 comandos hoy."
    );
  }

  if (command === "checkin") {
    user.lastCheckin = Date.now();
    user.money += 100;

    saveDatabase();

    return reply(
      message,
      "✅ Check-in registrado. +100 monedas."
    );
  }

  return false;
}

// ============================================================
// MODERACIÓN
// ============================================================

async function moderationCommand(
  message,
  command,
  args
) {
  if (
    ![
      "staff",
      "modhelp",
      "warnings",
      "warn"
    ].includes(command) &&
    !isAdmin(message.member)
  ) {
    return false;
  }

  if (command === "kick") {
    if (!hasPermission(
      message.member,
      PermissionsBitField.Flags.KickMembers
    )) {
      return reply(
        message,
        "❌ Necesitas permiso para expulsar miembros."
      );
    }

    const member =
      getMember(message, args);

    if (
      !member ||
      member.id === message.author.id
    ) {
      return reply(
        message,
        "❌ Usuario no encontrado."
      );
    }

    if (!member.kickable) {
      return reply(
        message,
        "❌ No puedo expulsar a ese usuario."
      );
    }

    await member.kick(
      args.slice(1).join(" ") ||
      "Expulsado por Nexora."
    );

    await sendLog(
      message.guild,
      "👢 Kick",
      `${member.user.tag} fue expulsado por ${message.author.tag}.`
    );

    return reply(
      message,
      `✅ ${member.user.tag} fue expulsado.`
    );
  }

  if (command === "ban") {
    if (!hasPermission(
      message.member,
      PermissionsBitField.Flags.BanMembers
    )) {
      return reply(
        message,
        "❌ Necesitas permiso para banear miembros."
      );
    }

    const member =
      getMember(message, args);

    if (!member) {
      return reply(
        message,
        "❌ Usuario no encontrado."
      );
    }

    if (!member.bannable) {
      return reply(
        message,
        "❌ No puedo banear a ese usuario."
      );
    }

    await member.ban({
      reason:
        args.slice(1).join(" ") ||
        "Baneado por Nexora."
    });

    await sendLog(
      message.guild,
      "🔨 Ban",
      `${member.user.tag} fue baneado por ${message.author.tag}.`
    );

    return reply(
      message,
      `✅ ${member.user.tag} fue baneado.`
    );
  }

  if (command === "unban") {
    if (!hasPermission(
      message.member,
      PermissionsBitField.Flags.BanMembers
    )) {
      return reply(
        message,
        "❌ Necesitas permiso para desbanear."
      );
    }

    const id =
      args[0];

    if (!id) {
      return reply(
        message,
        "❌ Usa `n.unban ID`."
      );
    }

    try {
      await message.guild.members.unban(id);

      return reply(
        message,
        `✅ Usuario \`${id}\` desbaneado.`
      );
    } catch {
      return reply(
        message,
        "❌ No pude desbanear ese usuario."
      );
    }
  }

  if (
    ["timeout", "mute"].includes(command)
  ) {
    if (!hasPermission(
      message.member,
      PermissionsBitField.Flags.ModerateMembers
    )) {
      return reply(
        message,
        "❌ Necesitas permiso de moderación."
      );
    }

    const member =
      getMember(message, args);

    if (!member) {
      return reply(
        message,
        "❌ Usuario no encontrado."
      );
    }

    const minutes =
      Number(args[1]) || 10;

    if (!member.moderatable) {
      return reply(
        message,
        "❌ No puedo aplicar timeout a ese usuario."
      );
    }

    await member.timeout(
      minutes * 60 * 1000,
      "Timeout aplicado por Nexora."
    );

    await sendLog(
      message.guild,
      "⏳ Timeout",
      `${member.user.tag} recibió ${minutes} minutos de timeout.`
    );

    return reply(
      message,
      `⏳ ${member.user.tag} recibió timeout por ${minutes} minutos.`
    );
  }

  if (
    ["untimeout", "unmute"].includes(command)
  ) {
    if (!hasPermission(
      message.member,
      PermissionsBitField.Flags.ModerateMembers
    )) {
      return reply(
        message,
        "❌ Necesitas permiso de moderación."
      );
    }

    const member =
      getMember(message, args);

    if (!member) {
      return reply(
        message,
        "❌ Usuario no encontrado."
      );
    }

    await member.timeout(null);

    return reply(
      message,
      `✅ Timeout retirado a ${member.user.tag}.`
    );
  }

  if (
    ["clear", "purge"].includes(command)
  ) {
    if (!hasPermission(
      message.member,
      PermissionsBitField.Flags.ManageMessages
    )) {
      return reply(
        message,
        "❌ Necesitas administrar mensajes."
      );
    }

    let amount =
      Number(args[0]) || 10;

    amount =
      Math.max(1, Math.min(100, amount));

    const deleted =
      await message.channel.bulkDelete(
        amount,
        true
      );

    const response =
      await message.channel.send(
        `🧹 Eliminados **${deleted.size}** mensajes.`
      );

    setTimeout(
      () => response.delete().catch(() => {}),
      3000
    );

    return true;
  }

  if (
    ["warn", "warnings"].includes(command)
  ) {
    const member =
      getMember(message, args);

    if (!member) {
      return reply(
        message,
        "❌ Usuario no encontrado."
      );
    }

    const user =
      getUser(member.id);

    if (command === "warnings") {
      return reply(
        message,
        `⚠️ ${member.user.tag} tiene **${user.warnings}** advertencias.`
      );
    }

    user.warnings++;
    saveDatabase();

    await sendLog(
      message.guild,
      "⚠️ Advertencia",
      `${member.user.tag} recibió una advertencia de ${message.author.tag}.`
    );

    return reply(
      message,
      `⚠️ ${member.user.tag} recibió una advertencia. Total: **${user.warnings}**`
    );
  }

  if (
    ["unwarn", "clearwarns"].includes(command)
  ) {
    const member =
      getMember(message, args);

    if (!member) {
      return reply(
        message,
        "❌ Usuario no encontrado."
      );
    }

    const user =
      getUser(member.id);

    if (command === "unwarn") {
      user.warnings =
        Math.max(
          0,
          user.warnings - 1
        );
    } else {
      user.warnings = 0;
    }

    saveDatabase();

    return reply(
      message,
      `✅ Advertencias de ${member.user.tag}: **${user.warnings}**`
    );
  }

  if (
    ["lock", "unlock"].includes(command)
  ) {
    if (!hasPermission(
      message.member,
      PermissionsBitField.Flags.ManageChannels
    )) {
      return reply(
        message,
        "❌ Necesitas administrar canales."
      );
    }

    const locked =
      command === "lock";

    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      {
        SendMessages:
          locked ? false : null
      }
    );

    return reply(
      message,
      locked
        ? "🔒 Canal bloqueado."
        : "🔓 Canal desbloqueado."
    );
  }

  if (
    ["slowmode", "unslowmode"].includes(command)
  ) {
    if (!hasPermission(
      message.member,
      PermissionsBitField.Flags.ManageChannels
    )) {
      return reply(
        message,
        "❌ Necesitas administrar canales."
      );
    }

    const seconds =
      command === "unslowmode"
        ? 0
        : Math.max(
            0,
            Math.min(
              21600,
              Number(args[0]) || 5
            )
          );

    await message.channel.setRateLimitPerUser(
      seconds
    );

    return reply(
      message,
      seconds
        ? `🐌 Slowmode: **${seconds}s**`
        : "🐌 Slowmode desactivado."
    );
  }

  if (command === "nick") {
    const member =
      getMember(message, args);

    if (!member) {
      return reply(
        message,
        "❌ Usuario no encontrado."
      );
    }

    const nickname =
      args.slice(1).join(" ");

    await member.setNickname(
      nickname || null
    );

    return reply(
      message,
      "✅ Apodo actualizado."
    );
  }

  if (command === "resetnick") {
    const member =
      getMember(message, args);

    if (!member) {
      return reply(
        message,
        "❌ Usuario no encontrado."
      );
    }

    await member.setNickname(null);

    return reply(
      message,
      "✅ Apodo restablecido."
    );
  }

  if (command === "addrole") {
    const member =
      getMember(message, args);

    const role =
      message.mentions.roles.first();

    if (!member || !role) {
      return reply(
        message,
        "❌ Menciona usuario y rol."
      );
    }

    await member.roles.add(role);

    return reply(
      message,
      `✅ Rol ${role} añadido.`
    );
  }

  if (command === "removerole") {
    const member =
      getMember(message, args);

    const role =
      message.mentions.roles.first();

    if (!member || !role) {
      return reply(
        message,
        "❌ Menciona usuario y rol."
      );
    }

    await member.roles.remove(role);

    return reply(
      message,
      `✅ Rol ${role} eliminado.`
    );
  }

  if (command === "channelinfo") {
    return reply(
      message,
      {
        embeds: [
          baseEmbed(
            "📺 Canal",
            `Nombre: **${message.channel.name}**\n` +
            `ID: \`${message.channel.id}\`\n` +
            `Tipo: **${message.channel.type}**`
          )
        ]
      }
    );
  }

  if (command === "roleinfo") {
    const role =
      message.mentions.roles.first();

    if (!role) {
      return reply(
        message,
        "❌ Menciona un rol."
      );
    }

    return reply(
      message,
      {
        embeds: [
          baseEmbed(
            "🎭 Rol",
            `Nombre: **${role.name}**\n` +
            `ID: \`${role.id}\`\n` +
            `Miembros: **${role.members.size}**`
          )
        ]
      }
    );
  }

  if (command === "staff") {
    const staff =
      message.guild.members.cache
        .filter(m => isAdmin(m))
        .map(m => m.user.tag)
        .slice(0, 20);

    return reply(
      message,
      `👑 **Administradores:**\n${staff.join("\n") || "Ninguno"}`
    );
  }

  return false;
}

// ============================================================
// CONFIGURACIÓN
// ============================================================

async function configCommand(
  message,
  command,
  args
) {
  if (!isAdmin(message.member)) {
    return false;
  }

  const guild =
    getGuild(message.guild.id);

  if (
    ["config", "settings", "serverconfig"].includes(command)
  ) {
    return reply(
      message,
      {
        embeds: [
          baseEmbed(
            "⚙️ Configuración",
            `🔗 AntiLink: **${guild.antiLink ? "ON" : "OFF"}**\n` +
            `🛡️ AntiSpam: **${guild.antiSpam ? "ON" : "OFF"}**\n` +
            `🤖 AutoMod: **${guild.autoMod ? "ON" : "OFF"}**\n` +
            `🧹 Filtro: **${guild.filter ? "ON" : "OFF"}**\n` +
            `👋 Bienvenida: **${guild.welcomeChannel ? "Configurada" : "No configurada"}**\n` +
            `📜 Logs: **${guild.logChannel ? "Configurados" : "No configurados"}**`
          )
        ]
      }
    );
  }

  if (
    ["antilink", "antispam", "automod", "filter"].includes(command)
  ) {
    const keyMap = {
      antilink: "antiLink",
      antispam: "antiSpam",
      automod: "autoMod",
      filter: "filter"
    };

    const key =
      keyMap[command];

    guild[key] =
      args[0]?.toLowerCase() === "on"
        ? true
        : args[0]?.toLowerCase() === "off"
          ? false
          : !guild[key];

    saveDatabase();

    return reply(
      message,
      `✅ ${command}: **${guild[key] ? "ON" : "OFF"}**`
    );
  }

  if (
    ["setwelcome", "welcome"].includes(command)
  ) {
    const channel =
      message.mentions.channels.first();

    if (!channel) {
      return reply(
        message,
        "❌ Menciona un canal."
      );
    }

    guild.welcomeChannel =
      channel.id;

    saveDatabase();

    return reply(
      message,
      `👋 Canal de bienvenida: ${channel}`
    );
  }

  if (
    ["setlog", "log"].includes(command)
  ) {
    const channel =
      message.mentions.channels.first();

    if (!channel) {
      return reply(
        message,
        "❌ Menciona un canal."
      );
    }

    guild.logChannel =
      channel.id;

    saveDatabase();

    return reply(
      message,
      `📜 Canal de logs: ${channel}`
    );
  }

  if (
    ["setmodrole", "modrole"].includes(command)
  ) {
    const role =
      message.mentions.roles.first();

    if (!role) {
      return reply(
        message,
        "❌ Menciona un rol."
      );
    }

    guild.modRole =
      role.id;

    saveDatabase();

    return reply(
      message,
      `🛡️ Rol de moderación: ${role}`
    );
  }

  if (
    ["setautorole", "autorole"].includes(command)
  ) {
    const role =
      message.mentions.roles.first();

    if (!role) {
      return reply(
        message,
        "❌ Menciona un rol."
      );
    }

    guild.autoRole =
      role.id;

    saveDatabase();

    return reply(
      message,
      `👤 AutoRole: ${role}`
    );
  }

  if (command === "prefix") {
    return reply(
      message,
      `🌌 El prefijo de Nexora es \`${guild.prefix}\`.`
    );
  }

  if (command === "resetconfig") {
    db.guilds[message.guild.id] =
      null;

    delete db.guilds[message.guild.id];

    getGuild(message.guild.id);

    saveDatabase();

    return reply(
      message,
      "♻️ Configuración restablecida."
    );
  }

  return false;
}

// ============================================================
// INFORMACIÓN
// ============================================================

async function infoCommand(
  message,
  command
) {
  if (
    ["help", "menu"].includes(command)
  ) {
    return reply(
      message,
      {
        embeds: [
          helpEmbed(message.member)
        ],
        components:
          mainMenu(message.member)
      }
    );
  }

  if (
    ["about", "botinfo", "nexora"].includes(command)
  ) {
    return reply(
      message,
      {
        embeds: [
          baseEmbed(
            "🌌 Nexora",
            "🤖 Bot de Discord creado con discord.js v14.\n\n" +
            `📚 Prefijo: \`${PREFIX}\`\n` +
            `🏠 Servidores: **${client.guilds.cache.size}**`
          )
        ]
      }
    );
  }

  if (
    ["ping", "latency"].includes(command)
  ) {
    return reply(
      message,
      `🏓 Pong: **${client.ws.ping}ms**`
    );
  }

  if (command === "uptime") {
    return reply(
      message,
      `⏱️ Uptime: **${formatTime(Math.floor(client.uptime / 1000))}**`
    );
  }

  if (
    ["serverinfo", "server"].includes(command)
  ) {
    return reply(
      message,
      {
        embeds: [
          baseEmbed(
            `🏠 ${message.guild.name}`,
            `👥 Miembros: **${message.guild.memberCount}**\n` +
            `📺 Canales: **${message.guild.channels.cache.size}**\n` +
            `🎭 Roles: **${message.guild.roles.cache.size}**\n` +
            `🆔 ID: \`${message.guild.id}\``
          )
        ]
      }
    );
  }

  if (command === "membercount") {
    return reply(
      message,
      `👥 Miembros: **${message.guild.memberCount}**`
    );
  }

  if (command === "categories") {
    return reply(
      message,
      Object.values(CATEGORIES)
        .map(c => c.name)
        .join("\n")
    );
  }

  if (command === "commands") {
    const total =
      Object.values(CATEGORIES)
        .reduce(
          (sum, c) =>
            sum + c.commands.length,
          0
        );

    return reply(
      message,
      `📚 Nexora tiene **${total} comandos listados** en las categorías principales.`
    );
  }

  if (command === "status") {
    return reply(
      message,
      "🟢 Nexora está online."
    );
  }

  if (command === "system") {
    return reply(
      message,
      `💻 Node.js: **${process.version}**\n` +
      `📦 discord.js: **14.x**\n` +
      `🖥️ Plataforma: **${process.platform}**`
    );
  }

  if (command === "library") {
    return reply(
      message,
      "📦 Biblioteca: **discord.js v14**"
    );
  }

  if (command === "credits") {
    return reply(
      message,
      "🌌 **Nexora**\nSistema desarrollado para Discord."
    );
  }

  return false;
}

// ============================================================
// ESTADÍSTICAS
// ============================================================

async function statsCommand(
  message,
  command
) {
  if (
    [
      "stats",
      "serverstats",
      "botstats"
    ].includes(command)
  ) {
    const guild =
      getGuild(message.guild.id);

    return reply(
      message,
      {
        embeds: [
          baseEmbed(
            "📊 Estadísticas de Nexora",
            `🏠 Servidores: **${client.guilds.cache.size}**\n` +
            `👥 Miembros: **${client.guilds.cache.reduce((n, g) => n + g.memberCount, 0)}**\n` +
            `📚 Comandos usados: **${guild.commandUses || 0}**\n` +
            `⏱️ Uptime: **${formatTime(Math.floor(client.uptime / 1000))}**`
          )
        ]
      }
    );
  }

  return false;
}

// ============================================================
// INTERACCIONES
// ============================================================

client.on(
  Events.InteractionCreate,
  async interaction => {
    try {

      // ------------------------------
      // SELECT MENUS
      // ------------------------------

      if (
        interaction.isStringSelectMenu()
      ) {

        if (
          interaction.customId ===
          "nexora_category"
        ) {
          const categoryId =
            interaction.values[0];

          const page =
            categoryPage(
              categoryId,
              0
            );

          if (!page) {
            return interactionReply(
              interaction,
              {
                content:
                  "❌ Categoría no encontrada.",
                ephemeral: true
              }
            );
          }

          return interactionReply(
            interaction,
            page
          );
        }

        if (
          interaction.customId ===
          "nexora_admin_category"
        ) {
          if (
            !isAdmin(
              interaction.member
            )
          ) {
            return interactionReply(
              interaction,
              {
                content:
                  "❌ Necesitas permiso de Administrador.",
                ephemeral: true
              }
            );
          }

          const categoryId =
            interaction.values[0];

          const page =
            adminCategoryPage(
              categoryId,
              0
            );

          return interactionReply(
            interaction,
            page
          );
        }
      }

      // ------------------------------
      // BOTONES
      // ------------------------------

      if (interaction.isButton()) {

        if (
          interaction.customId ===
          "nexora_home"
        ) {
          return interactionReply(
            interaction,
            {
              embeds: [
                helpEmbed(
                  interaction.member
                )
              ],
              components:
                mainMenu(
                  interaction.member
                )
            }
          );
        }

        if (
          interaction.customId ===
          "nexora_admin"
        ) {
          if (
            !isAdmin(
              interaction.member
            )
          ) {
            return interactionReply(
              interaction,
              {
                content:
                  "❌ Necesitas permiso de Administrador.",
                ephemeral: true
              }
            );
          }

          return interactionReply(
            interaction,
            adminPanel()
          );
        }

        // Páginas normales

        if (
          interaction.customId.startsWith(
            "nexora_page_"
          )
        ) {
          const parts =
            interaction.customId.split("_");

          const categoryId =
            parts[2];

          const page =
            Number(parts[3]);

          const data =
            categoryPage(
              categoryId,
              Number.isNaN(page)
                ? 0
                : page
            );

          if (!data) {
            return interactionReply(
              interaction,
              {
                content:
                  "❌ Página no encontrada.",
                ephemeral: true
              }
            );
          }

          return interactionReply(
            interaction,
            data
          );
        }

        // Páginas admin

        if (
          interaction.customId.startsWith(
            "nexora_admin_page_"
          )
        ) {
          if (
            !isAdmin(
              interaction.member
            )
          ) {
            return interactionReply(
              interaction,
              {
                content:
                  "❌ No tienes permisos.",
                ephemeral: true
              }
            );
          }

          const parts =
            interaction.customId.split("_");

          const categoryId =
            parts[3];

          const page =
            Number(parts[4]);

          const data =
            adminCategoryPage(
              categoryId,
              Number.isNaN(page)
                ? 0
                : page
            );

          return interactionReply(
            interaction,
            data
          );
        }

        // Trivia

        if (
          interaction.customId.startsWith(
            "trivia_"
          )
        ) {
          const parts =
            interaction.customId.split("_");

          const sessionId =
            parts.slice(1, -1).join("_");

          const answer =
            Number(
              parts[parts.length - 1]
            );

          const session =
            triviaSessions.get(
              sessionId
            );

          if (!session) {
            return interactionReply(
              interaction,
              {
                content:
                  "⏰ Esta trivia ya terminó.",
                ephemeral: true
              }
            );
          }

          if (
            interaction.user.id !==
            session.userId
          ) {
            return interactionReply(
              interaction,
              {
                content:
                  "❌ Solo quien inició la trivia puede responder.",
                ephemeral: true
              }
            );
          }

          if (session.answered) {
            return interactionReply(
              interaction,
              {
                content:
                  "❌ Ya respondiste.",
                ephemeral: true
              }
            );
          }

          session.answered = true;

          const correct =
            answer ===
            session.question.correct;

          const user =
            getUser(
              interaction.user.id
            );

          if (correct) {
            user.money += 150;
            addXP(user, 40);
          }

          saveDatabase();

          triviaSessions.delete(
            sessionId
          );

          const disabledButtons =
            new ActionRowBuilder().addComponents(
              ["A", "B", "C", "D"].map(
                (letter, index) =>
                  new ButtonBuilder()
                    .setCustomId(
                      `done_${sessionId}_${index}`
                    )
                    .setLabel(letter)
                    .setStyle(
                      index ===
                      session.question.correct
                        ? ButtonStyle.Success
                        : ButtonStyle.Secondary
                    )
                    .setDisabled(true)
              )
            );

          return interactionReply(
            interaction,
            {
              embeds: [
                baseEmbed(
                  correct
                    ? "🎉 ¡Correcto!"
                    : "❌ Incorrecto",
                  correct
                    ? "Ganaste **150 monedas** y **40 XP**."
                    : `La respuesta correcta era **${session.question.answers[session.question.correct]}**.`
                )
              ],
              components: [
                disabledButtons
              ]
            }
          );
        }
      }

    } catch (error) {
      console.error(
        "❌ ERROR EN INTERACTIONCREATE:",
        error
      );

      try {
        if (
          !interaction.replied &&
          !interaction.deferred
        ) {
          await interaction.reply({
            content:
              "❌ Ocurrió un error al procesar esa opción.",
            ephemeral: true
          });
        }
      } catch {}
    }
  }
);

// ============================================================
// ANTILINK / ANTISPAM
// ============================================================

const spamMap = new Map();

client.on(
  Events.MessageCreate,
  async message => {
    try {
      if (message.author.bot) return;
      if (!message.guild) return;

      const guild =
        getGuild(message.guild.id);

      // ------------------------------
      // ANTILINK
      // ------------------------------

      if (
        guild.antiLink &&
        !isAdmin(message.member)
      ) {
        const hasLink =
          /https?:\/\/\S+|www\.\S+|discord\.gg\/\S+|discord\.com\/invite\/\S+/i
            .test(message.content);

        if (hasLink) {
          const exempt =
            message.member.roles.cache.some(
              role =>
                guild.linkExemptRoles.includes(
                  role.id
                )
            );

          if (!exempt) {
            await message.delete()
              .catch(() => {});

            await message.member
              .timeout(
                2 * 60 * 60 * 1000,
                "AntiLink de Nexora"
              )
              .catch(() => {});

            await sendLog(
              message.guild,
              "🔗 AntiLink",
              `${message.author.tag} publicó un enlace y recibió una sanción automática.`
            );

            return;
          }
        }
      }

      // ------------------------------
      // ANTISPAM
      // ------------------------------

      if (
        guild.antiSpam &&
        !isAdmin(message.member)
      ) {
        const key =
          `${message.guild.id}:${message.author.id}`;

        const now =
          Date.now();

        const list =
          spamMap.get(key) || [];

        const recent =
          list.filter(
            time =>
              now - time < 5000
          );

        recent.push(now);

        spamMap.set(
          key,
          recent
        );

        if (recent.length >= 5) {
          spamMap.delete(key);

          await message.member
            .timeout(
              2 * 60 * 1000,
              "AntiSpam de Nexora"
            )
            .catch(() => {});

          await sendLog(
            message.guild,
            "🛡️ AntiSpam",
            `${message.author.tag} activó el AntiSpam.`
          );
        }
      }

    } catch (error) {
      console.error(
        "❌ Error en seguridad:",
        error
      );
    }
  }
);

// ============================================================
// MENSAJES / COMANDOS
// ============================================================

client.on(
  Events.MessageCreate,
  async message => {
    try {
      if (message.author.bot) return;
      if (!message.guild) return;

      const guildData =
        getGuild(
          message.guild.id
        );

      const prefix =
        guildData.prefix ||
        PREFIX;

      if (
        !message.content
          .toLowerCase()
          .startsWith(
            prefix.toLowerCase()
          )
      ) {
        return;
      }

      const content =
        message.content
          .slice(prefix.length)
          .trim();

      if (!content) return;

      const args =
        content.split(/\s+/);

      const command =
        args.shift().toLowerCase();

      commandUsed(
        message.guild.id
      );

      if (
        guildData.commandToggles &&
        guildData.commandToggles[
          command
        ] === false
      ) {
        return reply(
          message,
          "🔴 Este comando está desactivado."
        );
      }

      // AYUDA

      if (
        command === "help" ||
        command === "menu"
      ) {
        return reply(
          message,
          {
            embeds: [
              helpEmbed(
                message.member
              )
            ],
            components:
              mainMenu(
                message.member
              )
          }
        );
      }

      // ECONOMÍA

      if (
        await economyCommand(
          message,
          command,
          args
        )
      ) return;

      // SOCIAL

      if (
        await socialCommand(
          message,
          command,
          args
        )
      ) return;

      // JUEGOS

      if (
        await gamesCommand(
          message,
          command,
          args
        )
      ) return;

      // RECOMPENSAS

      if (
        await rewardsCommand(
          message,
          command,
          args
        )
      ) return;

      // MODERACIÓN

      if (
        await moderationCommand(
          message,
          command,
          args
        )
      ) return;

      // CONFIGURACIÓN

      if (
        await configCommand(
          message,
          command,
          args
        )
      ) return;

      // INFORMACIÓN

      if (
        await infoCommand(
          message,
          command,
          args
        )
      ) return;

      // ESTADÍSTICAS

      if (
        await statsCommand(
          message,
          command,
          args
        )
      ) return;

      return reply(
        message,
        `❌ No existe \`${prefix}${command}\`.\n` +
        `💡 Usa \`${prefix}help\`.`
      );

    } catch (error) {
      console.error(
        "❌ ERROR EN MESSAGECREATE:",
        error
      );

      await reply(
        message,
        "❌ Ocurrió un error ejecutando ese comando."
      );
    }
  }
);

// ============================================================
// BIENVENIDAS + AUTOROLE
// ============================================================

client.on(
  Events.GuildMemberAdd,
  async member => {
    try {
      const guild =
        getGuild(
          member.guild.id
        );

      if (
        guild.welcomeChannel
      ) {
        const channel =
          member.guild.channels.cache.get(
            guild.welcomeChannel
          );

        if (channel) {
          await channel.send(
            `🌌 ¡Bienvenido/a ${member} a **${member.guild.name}**!\n` +
            `💜 Disfruta de tu estancia en el servidor.`
          );
        }
      }

      if (guild.autoRole) {
        const role =
          member.guild.roles.cache.get(
            guild.autoRole
          );

        if (role) {
          await member.roles
            .add(role)
            .catch(() => {});
        }
      }

      await sendLog(
        member.guild,
        "👋 Nuevo miembro",
        `${member.user.tag} entró al servidor.`
      );

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

client.once(
  Events.ClientReady,
  readyClient => {

    console.log(
      "=========================================="
    );

    console.log(
      "🌌 NEXORA ONLINE"
    );

    console.log(
      `🤖 Usuario: ${readyClient.user.tag}`
    );

    console.log(
      `🏠 Servidores: ${readyClient.guilds.cache.size}`
    );

    console.log(
      `📚 Prefijo: ${PREFIX}`
    );

    console.log(
      "=========================================="
    );

    readyClient.user.setPresence({
      activities: [
        {
          name:
            `${PREFIX}help • 🌌 Nexora`,
          type: 0
        }
      ],
      status: "online"
    });
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
// LOGIN
// ============================================================

if (TOKEN) {
  client.login(TOKEN)
    .then(() => {
      console.log(
        "🔐 Conectando a Discord..."
      );
    })
    .catch(error => {
      console.error(
        "❌ No se pudo iniciar sesión en Discord:"
      );
      console.error(error);
    });
} else {
  console.error(
    "❌ Nexora no puede iniciar porque falta DISCORD_TOKEN."
  );
}
