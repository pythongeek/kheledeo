const mysql = require('mysql2/promise');

async function check() {
  const conn = await mysql.createConnection({
    host: 'ep-t4ni387b5e83b7519dc8.epsrv-t4n281l4mrmemi4zls9a.ap-southeast-1.privatelink.aliyuncs.com',
    port: 4000,
    user: 'p9LDaK6P7AxDxGZ.root',
    password: 'hzk4DRO1e6qxzSOvclgQ6JsQhRwHg5b8',
    database: '19df07a2-6142-8555-8000-092a05d8e508',
    connectTimeout: 10000,
  });
  const [tables] = await conn.execute('SHOW TABLES');
  console.log('Tables:', tables.map(r => Object.values(r)[0]));
  const [matches] = await conn.execute('SELECT COUNT(*) as count FROM matches');
  console.log('Matches count:', matches[0].count);
  await conn.end();
}
check().catch(e => console.error(e.message));
