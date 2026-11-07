
import os
import json
import discord
from discord.ext import commands

TOKEN = os.getenv("DISCORD_TOKEN")
DATA_FILE = "data.json"

intents = discord.Intents.default()
intents.message_content = True
intents.members = True

bot = commands.Bot(command_prefix="!", intents=intents)

def load_data():
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}

def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

data = load_data()

@bot.event
async def on_ready():
    print(f"CodeRole Bot online: {bot.user}")

@bot.command()
@commands.has_permissions(administrator=True)
async def setcode(ctx, code: str, role_id: int):
    role = ctx.guild.get_role(role_id)
    if not role:
        return await ctx.send("❌ Không tìm thấy role!")

    guild = str(ctx.guild.id)
    data.setdefault(guild, {})
    data[guild][code] = role_id
    save_data(data)

    await ctx.send(f"✅ Đã tạo mã `{code}` cho role {role.mention}")

@bot.command()
async def code(ctx, *, code: str):
    guild = str(ctx.guild.id)
    role_id = data.get(guild, {}).get(code)

    if not role_id:
        return await ctx.send("❌ Mã code không hợp lệ!")

    role = ctx.guild.get_role(role_id)
    if not role:
        return await ctx.send("❌ Role không còn tồn tại!")

    if role in ctx.author.roles:
        return await ctx.send("⚠️ Bạn đã có role này!")

    try:
        await ctx.author.add_roles(role, reason="Nhập code thành công")
        await ctx.send(f"🎉 {ctx.author.mention} nhận thành công {role.mention}!")
    except discord.Forbidden:
        await ctx.send("❌ Bot không đủ quyền cấp role!")

@bot.command()
@commands.has_permissions(administrator=True)
async def delcode(ctx, code: str):
    guild = str(ctx.guild.id)
    if code not in data.get(guild, {}):
        return await ctx.send("❌ Không tìm thấy mã!")

    del data[guild][code]
    save_data(data)
    await ctx.send(f"✅ Đã xóa mã `{code}`!")

@bot.command()
@commands.has_permissions(administrator=True)
async def listcode(ctx):
    codes = data.get(str(ctx.guild.id), {})
    if not codes:
        return await ctx.send("Server chưa có mã nào!")

    lines = [f"`{c}` → <@&{r}>" for c, r in codes.items()]
    await ctx.send("**Danh sách mã:**\n" + "\n".join(lines))

if not TOKEN:
    raise RuntimeError("Chưa cấu hình DISCORD_TOKEN!")

bot.run(TOKEN)
