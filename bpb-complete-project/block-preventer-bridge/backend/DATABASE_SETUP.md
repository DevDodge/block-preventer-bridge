# Database Setup Guide

## Configuration

### 1. Create `.env` file

Copy `.env.example` to `.env` and update with your database credentials:

```bash
cp .env.example .env
```

### 2. Update Database Connection

Edit `.env` file:

```env
DATABASE_URL=postgresql+asyncpg://postgres:your_password@your_host:your_port/block_preventer_bridge
DATABASE_URL_SYNC=postgresql://postgres:your_password@your_host:your_port/block_preventer_bridge
```

**Important Notes:**
- Use `postgresql+asyncpg://` for async connections (FastAPI)
- Use `postgresql://` for sync connections (migrations/scripts)
- Do NOT add `CORS_ORIGINS` or `LOG_LEVEL` in `.env` file
- These settings are managed in `app/config/settings.py`

### 3. Allow External Connections (if using external PostgreSQL)

If your PostgreSQL server is on a different machine, you need to:

#### Update `pg_hba.conf`:

Add this line to allow connections from your application server:

```
host    block_preventer_bridge    postgres    YOUR_IP_ADDRESS/32    md5
```

Or for a subnet:

```
host    block_preventer_bridge    postgres    YOUR_SUBNET/24    md5
```

#### Update `postgresql.conf`:

```
listen_addresses = '*'
```

Then restart PostgreSQL:

```bash
sudo systemctl restart postgresql
```

### 4. Run Migrations

If the `message_content_display` column is missing, run:

```bash
psql -h your_host -p your_port -U postgres -d block_preventer_bridge -f migrations/add_message_content_display.sql
```

Or using Python:

```python
import asyncio
import asyncpg

async def run_migration():
    conn = await asyncpg.connect('postgresql://postgres:password@host:port/block_preventer_bridge')
    await conn.execute("""
        ALTER TABLE global_settings 
        ADD COLUMN IF NOT EXISTS message_content_display VARCHAR(10) DEFAULT 'hover'
    """)
    await conn.close()

asyncio.run(run_migration())
```

### 5. Verify Connection

Test the connection:

```bash
python3 -c "
import asyncio
import asyncpg

async def test():
    conn = await asyncpg.connect('postgresql://postgres:password@host:port/block_preventer_bridge')
    version = await conn.fetchval('SELECT version()')
    print(f'Connected: {version[:50]}')
    await conn.close()

asyncio.run(test())
"
```

## Common Issues

### Issue 1: `no pg_hba.conf entry for host`

**Solution**: Add your IP address to `pg_hba.conf` as described above.

### Issue 2: `column does not exist`

**Solution**: Run the migration script in `migrations/add_message_content_display.sql`

### Issue 3: `Extra inputs are not permitted`

**Solution**: Remove `CORS_ORIGINS` and `LOG_LEVEL` from `.env` file. These are configured in code.

### Issue 4: Connection timeout

**Solution**: 
- Check firewall settings
- Verify PostgreSQL is listening on the correct port
- Ensure `listen_addresses = '*'` in `postgresql.conf`

## Database Schema

The application expects these tables:
- `global_settings` - System-wide settings
- `packages` - Message distribution packages
- `profiles` - WhatsApp profiles
- `messages` - Message records
- `message_queue` - Pending messages
- `delivery_logs` - Delivery status logs
- `alerts` - System alerts
- `profile_statistics` - Profile performance metrics
- `conversation_routing` - Routing rules
- `system_settings` - Additional system settings (if used)

All tables are created automatically by SQLAlchemy on first run.
