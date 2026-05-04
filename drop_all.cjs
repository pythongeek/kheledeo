const mysql = require('mysql2/promise');

async function dropAll() {
  const conn = await mysql.createConnection({
    host: 'ep-t4ni387b5e83b7519dc8.epsrv-t4n281l4mrmemi4zls9a.ap-southeast-1.privatelink.aliyuncs.com',
    port: 4000,
    user: 'p9LDaK6P7AxDxGZ.root',
    password: 'hzk4DRO1e6qxzSOvclgQ6JsQhRwHg5b8',
    database: '19df07a2-6142-8555-8000-092a05d8e508',
  });

  const [tables] = await conn.execute('SHOW TABLES');
  for (const row of tables) {
    const tableName = Object.values(row)[0];
    console.log(`Dropping ${tableName}...`);
    await conn.execute(`DROP TABLE IF EXISTS \`${tableName}\``);
  }

  await conn.end();
  console.log('All tables dropped!');
}

dropAll().catch(console.error);
