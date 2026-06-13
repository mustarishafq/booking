#!/usr/bin/env node
/**
 * Auto-migration script — runs server/schema.sql against MySQL.
 *
 * Uses IF NOT EXISTS guards so it is safe to run on every startup:
 * existing tables and data are never dropped or modified.
 *
 * Reads connection settings from environment variables (or .env file).
 * Target database is DB_NAME (default: booking), matching server/db.js.
 */

import 'dotenv/config';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __dirname = dirname(fileURLToPath(import.meta.url));

const dbName = (process.env.DB_NAME || 'booking').replace(/`/g, '');

const config = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306'),
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true,
  timezone: '+00:00',
};

const schemaPath = resolve(__dirname, 'schema.sql');
const migrationsDir = resolve(__dirname, 'migrations');

function stripSchemaBootstrap(sql) {
  return sql
    .replace(/CREATE DATABASE IF NOT EXISTS[\s\S]*?;\s*/i, '')
    .replace(/USE\s+[`\w]+\s*;\s*/i, '');
}

async function migrate() {
  let conn;
  try {
    console.log(`⏳ Running database migrations (database: ${dbName})…`);
    conn = await mysql.createConnection(config);

    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    await conn.query(`USE \`${dbName}\``);

    const schemaSql = stripSchemaBootstrap(readFileSync(schemaPath, 'utf8'));
    await conn.query(schemaSql);
    console.log('  ✓ schema.sql');

    if (existsSync(migrationsDir)) {
      const files = readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

      for (const file of files) {
        const migrationSql = readFileSync(join(migrationsDir, file), 'utf8');
        await conn.query(migrationSql);
        console.log(`  ✓ migrations/${file}`);
      }
    }

    console.log('✅ Migrations complete.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

migrate();
