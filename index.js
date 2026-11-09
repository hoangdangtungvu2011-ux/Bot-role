
require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    PermissionsBitField,
    EmbedBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");

// Kiểm tra TOKEN
if (!process.env.TOKEN) {
    console.error("❌ Không tìm thấy TOKEN trong Railway Variables!");
    process.exit(1);
}

// Khởi tạo bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Lưu dữ liệu
// Railway: đặt DATA_DIR=/data nếu đã gắn Volume tại /data
const DATA_DIR = process.env.DATA_DIR || process.cwd();

fs.mkdirSync(DATA_DIR, { recursive: true });

const FILE = path.join(DATA_DIR, "codes.json");

if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, "{}");
}

// Đọc code
function loadCodes() {
    try {
        const data = JSON.parse(fs.readFileSync(FILE, "utf8"));

        if (!data || typeof data !== "object" || Array.isArray(data)) {
            throw new Error("Dữ liệu codes.json không hợp lệ");
        }

        return data;
    } catch (error) {
        console.error("Lỗi đọc codes.json:", error);
        throw error;
    }
}

// Lưu code an toàn hơn bằng file tạm
function saveCodes(data) {
    const tempFile = FILE + ".tmp";

    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
    fs.renameSync(tempFile, FILE);
}

// Ngăn hai người dùng cùng một code đồng thời
const processingCodes = new Set();

client.once("ready", () => {
    console.log("--------------------------------");
    console.log(`✅ Bot: ${client.user.tag}`);
    console.log(`✅ ID: ${client.user.id}`);
    console.log("✅ Bot đã online trên Railway!");
    console.log("--------------------------------");
});

// Xử lý lệnh /setcode
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "setcode") return;

    try {
        if (!interaction.guild) {
            return interaction.reply({
                content: "❌ Lệnh này chỉ sử dụng trong server!",
                ephemeral: true
            });
        }

        // Chỉ Owner server được tạo code
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

        if (!code || code.length > 50) {
            return interaction.reply({
                content: "❌ Code phải có từ 1 đến 50 ký tự!",
                ephemeral: true
            });
        }

        const me = await interaction.guild.members.fetchMe();

        // Kiểm tra quyền bot
        if (!me.permissions.has(
            PermissionsBitField.Flags.ManageRoles
        )) {
            return interaction.reply({
                content: "❌ Bot thiếu quyền Manage Roles!",
                ephemeral: true
            });
        }

        // Kiểm tra thứ tự role
        if (
            role.position >= me.roles.highest.position ||
            role.managed
        ) {
            return interaction.reply({
                content: "❌ Bot không thể cấp role này! Hãy kiểm tra thứ tự role.",
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
            used: false,
            createdBy: interaction.user.id,
            createdAt: Date.now()
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

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });

    } catch (error) {
        console.error("Lỗi setcode:", error);

        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: "❌ Có lỗi khi tạo code!",
                ephemeral: true
            }).catch(() => {});
        }
    }
});

// Xử lý lệnh !code
client.on("messageCreate", async message => {
    if (message.author.bot || !message.guild) return;

    const args = message.content.trim().split(/\s+/);

    if (args[0].toLowerCase() !== "!code") return;

    if (!args[1] || args.length !== 2) {
        return message.reply(
            "❌ Cách dùng: `!code <mã>`"
        );
    }

    const code = args[1].toUpperCase();
    const key = `${message.guild.id}_${code}`;

    if (processingCodes.has(key)) {
        return message.reply("⏳ Code đang được xử lý, hãy thử lại!");
    }

    processingCodes.add(key);

    try {
        const codes = loadCodes();
        const data = codes[key];

        if (!data) {
            return message.reply("❌ Mã code không tồn tại!");
        }

        if (data.used) {
            return message.reply("❌ Mã code đã được sử dụng!");
        }

        const role = await message.guild.roles.fetch(data.roleId);

        if (!role || role.managed) {
            return message.reply("❌ Role không còn tồn tại hoặc không thể cấp!");
        }

        const member = await message.guild.members.fetch(
            message.author.id
        );

        if (member.roles.cache.has(role.id)) {
            return message.reply("❌ Bạn đã có role này rồi!");
        }

        const me = await message.guild.members.fetchMe();

        if (!me.permissions.has(
            PermissionsBitField.Flags.ManageRoles
        )) {
            return message.reply("❌ Bot thiếu quyền Manage Roles!");
        }

        if (role.position >= me.roles.highest.position) {
            return message.reply("❌ Role bot không đủ cao để cấp role này!");
        }

        // Cấp role
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
                `${message.author} đã nhận role thành công!\n\n` +
                `🎟️ Code: \`${code}\`\n` +
                `🏆 Role: ${role}\n` +
                `✅ Trạng thái: Đã sử dụng`
            )
            .setTimestamp();

        await message.reply({ embeds: [embed] });

    } catch (error) {
        console.error("Lỗi nhận role:", error);

        await message.reply(
            "❌ Không thể nhận role! Hãy kiểm tra quyền của bot."
        ).catch(() => {});

    } finally {
        processingCodes.delete(key);
    }
});

// Khởi động bot
client.login(process.env.TOKEN).catch(error => {
    console.error("❌ Không thể đăng nhập Discord:", error);
    process.exit(1);
});
