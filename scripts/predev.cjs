/**
 * Smart predev: rebuilds better-sqlite3 for Electron only when the Electron
 * version changes. Avoids the ~30s rebuild on every `npm run dev`.
 */
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const electronPkg = path.join(root, 'node_modules', 'electron', 'package.json')
const stampFile = path.join(root, 'node_modules', '.kode-electron-rebuild-stamp')

let electronVersion = 'unknown'
try {
  electronVersion = JSON.parse(fs.readFileSync(electronPkg, 'utf8')).version
} catch {
  // electron not installed yet — rebuild will handle it
}

let needsRebuild = true
try {
  const stamp = fs.readFileSync(stampFile, 'utf8').trim()
  needsRebuild = stamp !== electronVersion
} catch {
  // no stamp yet
}

if (needsRebuild) {
  console.log(`[predev] Rebuilding better-sqlite3 for Electron ${electronVersion}...`)
  execSync('npx @electron/rebuild -f -w better-sqlite3', { stdio: 'inherit', cwd: root })
  fs.writeFileSync(stampFile, electronVersion, 'utf8')
  console.log('[predev] Rebuild done.')
} else {
  console.log(`[predev] better-sqlite3 already built for Electron ${electronVersion} — skipping.`)
}
