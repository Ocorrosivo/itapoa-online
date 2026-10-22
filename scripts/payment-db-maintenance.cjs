// Runs inside the application container. Never prints credentials or row data.
const mysql = require('mysql2/promise');
const crypto = require('node:crypto');
const fs = require('node:fs');
const mode = process.argv[2];
const quote = name => {
  if (!/^[a-zA-Z0-9_]+$/.test(name)) throw new Error('Unexpected SQL identifier');
  return '`' + name + '`';
};
async function fingerprint(db, columns) {
  const result = {};
  for (const [table, names] of Object.entries(columns)) {
    const [rows] = await db.query('SELECT ' + names.map(quote).join(',') + ' FROM ' + quote(table));
    // Sort row digests instead of relying on storage order. Values remain private.
    const digests = rows.map(row => crypto.createHash('sha256').update(JSON.stringify(row)).digest('hex')).sort();
    result[table] = { count: rows.length, sha256: crypto.createHash('sha256').update(digests.join('\n')).digest('hex') };
  }
  return result;
}
async function main() {
  if (!['manifest','migrate'].includes(mode)) throw new Error('Unknown maintenance mode');
  if (process.env.DB_NAME !== 'itapoa_db' || !['itapoa-db','127.0.0.1'].includes(process.env.DB_HOST)) throw new Error('Unexpected database target');
  const db = await mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,dateStrings:true});
  try {
    const [identity] = await db.query('SELECT DATABASE() db, VERSION() version');
    if (!/^11\..*MariaDB/.test(identity[0].version)) throw new Error('Reviewed migration requires MariaDB 11');
    const [tables] = await db.query("SELECT TABLE_NAME name,ENGINE engine FROM information_schema.tables WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME");
    if (tables.some(t=>t.engine!=='InnoDB')) throw new Error('Consistent backup requires all tables to use InnoDB');
    const columns = {};
    for (const {name} of tables) {
      const [cols] = await db.query('SHOW COLUMNS FROM '+quote(name));
      columns[name]=cols.map(c=>c.Field);
    }
    const before = await fingerprint(db,columns);
    if (mode==='manifest') { console.log(JSON.stringify({identity:identity[0],columns,data:before})); return; }
    const source = fs.readFileSync(0,'utf8');
    const statements = source.split(/\r?\n/).filter(line=>!line.trim().startsWith('--')).join('\n').split(';').map(s=>s.trim()).filter(Boolean);
    if (statements.length!==6 || statements.some(s=>!/^ALTER TABLE (plans|companies|subscriptions)\s|^CREATE TABLE IF NOT EXISTS (admin_plan_grants|gateway_payment_state|webhook_events)\s/.test(s))) throw new Error('Unexpected migration content');
    await db.query('SET SESSION lock_wait_timeout=15');
    for (const statement of statements) await db.query(statement);
    const after = await fingerprint(db,columns);
    if (JSON.stringify(before)!==JSON.stringify(after)) throw new Error('Original data changed during maintenance; review concurrent writes before proceeding');
    await db.query('SELECT payment_id,subscription_id,remote_updated_at,activated_at,expires_at FROM gateway_payment_state LIMIT 0');
    await db.query('SELECT gateway_event_id,attempts,status FROM webhook_events LIMIT 0');
    await db.query('SELECT version,is_active,allow_new_subscriptions FROM plans LIMIT 0');
    console.log(JSON.stringify({migration:'verified',originalTables:tables.length,originalDataUnchanged:true,counts:Object.fromEntries(Object.entries(after).map(([t,v])=>[t,v.count]))}));
  } finally { await db.end(); }
}
main().catch(e=>{console.error('Payment maintenance failed:',e.code||e.message);process.exitCode=1;});
