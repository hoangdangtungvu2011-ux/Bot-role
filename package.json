import discord
from discord.ext import commands
import asyncio

# --- CẤU HÌNH ---
# Thay 'YOUR_BOT_TOKEN' bằng Token của bot bạn trên Discord Developer Portal
TOKEN = 'YOUR_BOT_TOKEN' 

# Lưu trữ mã code tạm thời trong bộ nhớ (Dictionary).
# Khi restart bot, dữ liệu sẽ mất. Nếu muốn lưu vĩnh viễn, cần kết nối CSDL (MongoDB/SQL).
code_roles = {} 

# Khởi tạo Bot
intents = discord.Intents.default()
intents.message_content = True  # Quan trọng: Bot phải có quyền đọc nội dung tin nhắn
bot = commands.Bot(command_prefix='!', intents=intents)

@bot.event
async def on_ready():
    print(f'✅ Bot đã hoạt động: {bot.user.name} - {bot.user.id}')
    print('----------------------------------')

# --- LỆNH 1: !setcode <mã> <role> ---
# Chỉ người có quyền Admin/Manage Roles mới có thể dùng lệnh này
@bot.command()
@commands.has_permissions(manage_roles=True)
async def setcode(ctx, code: str, *, role: discord.Role):
    """
    Cài đặt mã code để nhận role.
    Cú pháp: !setcode <mã> <tên_role>
    """
    # Lưu mã code vào dictionary, giá trị là đối tượng Role
    code_roles[code.lower()] = role 
    
    # Phản ứng ✅ cho người dùng
    await ctx.send(f'✅ Đã cài đặt! Mã **"{code}"** đã liên kết với Role **"{role.name}"**.')
    print(f'[LOG] User {ctx.author} set code "{code}" -> Role "{role.name}"')

# --- LỆNH 2: !code <mã> ---
@bot.command()
async def code(ctx, code: str):
    """
    Member dùng lệnh này để nhận role.
    Cú pháp: !code <mã>
    """
    # Tìm mã code (chuyển về lowercase để so sánh không phân biệt hoa thường)
    target_role = code_roles.get(code.lower())
    
    if target_role is None:
        await ctx.send(f'❌ Mã **"{code}"** không tồn tại hoặc chưa được cài đặt. Vui lòng dùng !setcode để đăng ký mã.')
        return

    # Kiểm tra xem user đã có role này chưa
    if target_role in ctx.author.roles:
        await ctx.send(f'👍 Bạn đã có Role **"{target_role.name}"** rồi nhé!')
    else:
        # Thêm role cho user
        try:
            await ctx.author.add_roles(target_role)
            await ctx.send(f'🎉 Chúc mừng {ctx.author.mention}! Bạn đã nhận Role **"{target_role.name}"** thành công.')
        except discord.Forbidden:
            # Xử lý lỗi nếu bot không có quyền thêm role
            await ctx.send('⚠️ Bot không có quyền thêm role này. Vui lòng kiểm tra quyền Bot trên Discord.')
        except Exception as e:
            await ctx.send(f'❌ Đã xảy ra lỗi: {e}')

# --- Xử lý lỗi lệnh (tuỳ chọn) ---
@setcode.error
async def setcode_error(ctx, error):
    if isinstance(error, commands.MissingPermissions):
        await ctx.send('❌ Bạn không có quyền sử dụng lệnh này. Cần quyền "Manage Roles".')

@code.error
async def code_error(ctx, error):
    if isinstance(error, commands.MissingRequiredArgument):
        await ctx.send('❌ Cú pháp sai. Dùng: `!code <mã>`')

# Chạy bot
bot.run(TOKEN)