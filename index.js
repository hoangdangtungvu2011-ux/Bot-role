require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    PermissionsBitField,
    EmbedBuilder
} = require("discord.js");

const fs = require("fs");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const FILE = "./codes.json";

if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, JSON.stringify({}, null, 2));
}

function loadCodes() {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
}

function saveCodes(data) {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

client.once("ready", () => {
    console.log(`Bot ${client.user.tag} đã online!`);
});

// Lệnh /setcode
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "setcode") return;

    // Chỉ Owner server được sử dụng
    if (interaction.user.id !== interaction.guild.ownerId) {
        return interaction.reply({
            content: "❌ Chỉ Owner server mới được tạo code!",
            ephemeral: true
        });
    }

    const code = interaction.options
        .getString("ma")
        .trim()
        .toUpperCase();

    const role = interaction.options.getRole("role");

    // Kiểm tra quyền bot
    if (!interaction.guild.members.me.permissions.has(
        PermissionsBitField.Flags.ManageRoles
    )) {
        return interaction.reply({
            content: "❌ Bot chưa có quyền Manage Roles!",
            ephemeral: true
        });
    }

    if (role.position >= interaction.guild.members.me.roles.highest.position) {
        return interaction.reply({
            content: "❌ Role của bot phải cao hơn role cần cấp!",
            ephemeral: true
        });
    }

    const codes = loadCodes();
    const key = `${interaction.guildId}_${code}`;

    if (codes[key]) {
        return interaction.reply({
            content: "❌ Mã code này đã tồn tại!",
            ephemeral: true
        });
    }

    codes[key] = {
        roleId: role.id,
        used: false
    };

    saveCodes(codes);

    const embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("🎟️ TẠO CODE THÀNH CÔNG")
        .addFields(
            { name: "Mã Code", value: `\`${code}\`` },
            { name: "Role", value: `${role}` },
            { name: "Trạng thái", value: "🟢 Chưa sử dụng" }
        )
        .setTimestamp();

    interaction.reply({ embeds: [embed], ephemeral: true });
});

// Lệnh !code
client.on("messageCreate", async message => {
    if (message.author.bot || !message.guild) return;

    const args = message.content.trim().split(/\s+/);

    if (args[0].toLowerCase() !== "!code") return;

    if (!args[1]) {
        return message.reply("❌ Cách dùng: `!code <mã>`");
    }

    const code = args[1].toUpperCase();
    const codes = loadCodes();
    const key = `${message.guild.id}_${code}`;

    const data = codes[key];

    if (!data) {
        return message.reply("❌ Mã code không tồn tại!");
    }

    if (data.used) {
        return message.reply("❌ Mã code này đã được sử dụng!");
    }

    const role = message.guild.roles.cache.get(data.roleId);

    if (!role) {
        return message.reply("❌ Role của code không còn tồn tại!");
    }

    const member = message.member;

    if (member.roles.cache.has(role.id)) {
        return message.reply("❌ Bạn đã có role này rồi!");
    }

    try {
        await member.roles.add(role);

        // Đánh dấu code đã sử dụng
        codes[key].used = true;
        codes[key].usedBy = message.author.id;
        codes[key].usedAt = Date.now();

        saveCodes(codes);

        const embed = new EmbedBuilder()
            .setColor("Green")
            .setTitle("🎉 NHẬN ROLE THÀNH CÔNG")
            .setDescription(
                `${message.author} đã sử dụng code thành công!\n\n` +
                `🎟️ Code: \`${code}\`\n` +
                `🏆 Role nhận được: ${role}`
            )
            .setTimestamp();

        message.reply({ embeds: [embed] });

    } catch (error) {
        console.error(error);

        message.reply(
            "❌ Không thể cấp role! Hãy kiểm tra quyền Manage Roles và thứ tự role của bot."
        );
    }
});

client.login(process.env.TOKEN);