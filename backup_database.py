#!/usr/bin/env python3
"""
Database Backup Script for Whats Guard
Creates a SQL backup of the PostgreSQL database
"""

import psycopg2
from datetime import datetime
import os

# Database connection details
DB_CONFIG = {
    "host": "178.63.34.211",
    "port": 10034,
    "database": "block_preventer_bridge",
    "user": "postgres",
    "password": "Eng.OctoBot-DK-Kareem-DODGE.12"
}

def get_table_schema(cursor, table_name):
    """Get CREATE TABLE statement for a table"""
    cursor.execute(f"""
        SELECT 
            'CREATE TABLE ' || quote_ident(c.relname) || ' (' ||
            string_agg(
                quote_ident(a.attname) || ' ' || 
                pg_catalog.format_type(a.atttypid, a.atttypmod) ||
                CASE WHEN a.attnotnull THEN ' NOT NULL' ELSE '' END ||
                CASE WHEN a.atthasdef THEN ' DEFAULT ' || pg_get_expr(d.adbin, d.adrelid) ELSE '' END,
                ', '
                ORDER BY a.attnum
            ) || ');'
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
        LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
        WHERE c.relname = %s
        AND n.nspname = 'public'
        AND a.attnum > 0
        AND NOT a.attisdropped
        GROUP BY c.relname;
    """, (table_name,))
    result = cursor.fetchone()
    return result[0] if result else None

def backup_database():
    """Create a full database backup"""
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    backup_file = f"db_backup_{timestamp}.sql"
    
    print(f"Connecting to database at {DB_CONFIG['host']}:{DB_CONFIG['port']}...")
    
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Get all tables
        cursor.execute("""
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public'
            ORDER BY tablename;
        """)
        tables = [row[0] for row in cursor.fetchall()]
        
        print(f"Found {len(tables)} tables: {', '.join(tables)}")
        
        with open(backup_file, 'w', encoding='utf-8') as f:
            f.write(f"-- Whats Guard Database Backup\n")
            f.write(f"-- Created: {datetime.now().isoformat()}\n")
            f.write(f"-- Database: {DB_CONFIG['database']}\n")
            f.write(f"-- Host: {DB_CONFIG['host']}:{DB_CONFIG['port']}\n")
            f.write(f"-- Tables: {len(tables)}\n")
            f.write(f"--\n\n")
            
            # Disable foreign key checks
            f.write("SET session_replication_role = 'replica';\n\n")
            
            for table in tables:
                print(f"Backing up table: {table}...")
                
                # Table structure
                f.write(f"\n-- Table: {table}\n")
                f.write(f"-- ----------------------------------------\n\n")
                
                # Drop existing table
                f.write(f"DROP TABLE IF EXISTS \"{table}\" CASCADE;\n\n")
                
                # Get column info for CREATE TABLE
                cursor.execute(f"""
                    SELECT column_name, data_type, character_maximum_length,
                           is_nullable, column_default
                    FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = %s
                    ORDER BY ordinal_position;
                """, (table,))
                columns = cursor.fetchall()
                
                if columns:
                    f.write(f"CREATE TABLE \"{table}\" (\n")
                    col_defs = []
                    for col in columns:
                        col_name, data_type, max_len, nullable, default = col
                        col_def = f"    \"{col_name}\" {data_type}"
                        if max_len:
                            col_def += f"({max_len})"
                        if nullable == 'NO':
                            col_def += " NOT NULL"
                        if default:
                            col_def += f" DEFAULT {default}"
                        col_defs.append(col_def)
                    f.write(",\n".join(col_defs))
                    f.write("\n);\n\n")
                
                # Get primary key
                cursor.execute(f"""
                    SELECT kcu.column_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                        ON tc.constraint_name = kcu.constraint_name
                    WHERE tc.table_name = %s AND tc.constraint_type = 'PRIMARY KEY';
                """, (table,))
                pk_cols = [row[0] for row in cursor.fetchall()]
                if pk_cols:
                    pk_cols_str = '", "'.join(pk_cols)
                    f.write(f'ALTER TABLE "{table}" ADD PRIMARY KEY ("{pk_cols_str}");\n\n')
                
                # Export data
                cursor.execute(f'SELECT * FROM "{table}";')
                rows = cursor.fetchall()
                
                if rows:
                    # Get column names
                    col_names = [desc[0] for desc in cursor.description]
                    cols_str = ', '.join([f'"{c}"' for c in col_names])
                    
                    f.write(f"-- Data for table: {table} ({len(rows)} rows)\n")
                    
                    for row in rows:
                        values = []
                        for val in row:
                            if val is None:
                                values.append("NULL")
                            elif isinstance(val, str):
                                escaped = val.replace("'", "''")
                                values.append(f"'{escaped}'")
                            elif isinstance(val, bool):
                                values.append("TRUE" if val else "FALSE")
                            elif isinstance(val, (int, float)):
                                values.append(str(val))
                            elif isinstance(val, datetime):
                                values.append(f"'{val.isoformat()}'")
                            else:
                                escaped = str(val).replace("'", "''")
                                values.append(f"'{escaped}'")
                        
                        values_str = ', '.join(values)
                        f.write(f"INSERT INTO \"{table}\" ({cols_str}) VALUES ({values_str});\n")
                    
                    f.write("\n")
                else:
                    f.write(f"-- No data in table: {table}\n\n")
            
            # Re-enable foreign key checks
            f.write("\nSET session_replication_role = 'origin';\n")
            f.write("\n-- End of backup\n")
        
        cursor.close()
        conn.close()
        
        file_size = os.path.getsize(backup_file)
        print(f"\n✅ Backup completed successfully!")
        print(f"📁 File: {backup_file}")
        print(f"📊 Size: {file_size / 1024:.2f} KB")
        print(f"📋 Tables backed up: {len(tables)}")
        
        return backup_file
        
    except Exception as e:
        print(f"❌ Error: {e}")
        raise

if __name__ == "__main__":
    backup_database()
