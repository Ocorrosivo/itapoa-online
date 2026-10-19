import 'dotenv/config';
import mysql from 'mysql2/promise';
const db = await mysql.createConnection({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
  user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME, charset: 'utf8mb4', connectTimeout: 8000
});
try {
  const [rows] = await db.query(`SELECT id, name, description, features, HEX(name) AS hexName
    FROM companies WHERE id IN ('comp_lava_itapema', 'comp_clinica', 'comp_construcao', 'comp_burger_itapema', 'comp_pousada_itapema')`);
  console.log(JSON.stringify(rows));
  const [session] = await db.query('SELECT @@character_set_client AS cs, @@collation_connection AS coll');
  console.log(JSON.stringify(session));
  const [owners] = await db.query(`SELECT COUNT(*) AS owned FROM companies_users cu
    JOIN users u ON u.id=cu.user_id WHERE u.email='admin@itapoa.online'`);
  console.log(JSON.stringify(owners));
} finally { await db.end(); }
