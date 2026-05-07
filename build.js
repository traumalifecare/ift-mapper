#!/usr/bin/env node
/**
 * build.js — injects .env values into index.html
 * Usage: node build.js
 */

const fs   = require('fs');
const path = require('path');

// ── Load .env ──────────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('ERROR: .env file not found. Copy .env.example to .env and fill in your values.');
  process.exit(1);
}

const env = {};
fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const eq = trimmed.indexOf('=');
  if (eq === -1) return;
  const key = trimmed.slice(0, eq).trim();
  const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, ''); // strip optional quotes
  env[key] = val;
});

// ── Token → env key map ────────────────────────────────────────────────────
const replacements = {
  '__GOOGLE_MAPS_API_KEY__': env.GOOGLE_MAPS_API_KEY || '',
  '__SAC_ADDRESS__':         env.SAC_ADDRESS         || '',
  '__SC_ADDRESS__':          env.SC_ADDRESS          || '',
  '__HB_TOKEN__':            env.HB_TOKEN            || '',
  '__HB_SAC_UUID__':         env.HB_SAC_UUID         || '',
  '__HB_SC_UUID__':          env.HB_SC_UUID          || '',
  '__ZOHO_API_URL__':        env.ZOHO_API_URL        || '',
  '__ZOHO_API_TOKEN__':      env.ZOHO_API_TOKEN      || '',
};

// ── Read source, replace tokens, write output ──────────────────────────────
let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

Object.entries(replacements).forEach(([token, value]) => {
  // Escape value for safe embedding inside a JS string literal
  const safe = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  html = html.split(token).join(safe);
});

fs.writeFileSync(path.join(__dirname, 'index.html'), html, 'utf8');
console.log('✓ index.html built successfully');

// Warn about any tokens left unreplaced (missing .env keys)
const remaining = html.match(/__[A-Z_]+__/g);
if (remaining) {
  const unique = [...new Set(remaining)];
  console.warn('⚠ Unreplaced tokens (add to .env):', unique.join(', '));
}
