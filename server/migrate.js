#!/usr/bin/env node
/**
 * Auto-migration script — runs server/schema.sql against MySQL.
 *
 * Uses IF NOT EXISTS guards so it is safe to run on every startup:
 * existing tables and data are never dropped or modified.
 *
 * Reads connection settings from environment variables (or .env file).
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __dirname = dirname(fileURLToPath(import.meta.url));

const config = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306'),
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  // Connect without selecting a database initially so we can CREATE DATABASE
  multipleStatements: true,
  timezone: '+00:00',
};

const schemaPath = resolve(__dirname, 'schema.sql');

async function migrate() {
  let conn;
  try {
    console.log('⏳ Running database migrations…');
    conn = await mysql.createConnection(config);

    const sql = readFileSync(schemaPath, 'utf8');

    // Execute the whole file at once — multipleStatements:true handles it.
    // mysql2 returns an array of results for multi-statement queries.
    await conn.query(sql);

    console.log('✅ Migrations complete.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

migrate();
