const http = require('http');

function request(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body || '{}') }));
        });
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function runTests() {
    console.log('--- Iniciando Tests ---');

    // 1. Test Login
    console.log('1. Probando Login...');
    const loginRes = await request({
        hostname: 'localhost', port: 3000, path: '/api/login', method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, { password: 'azul_profundo' });

    if (loginRes.body.success) console.log('✅ Login exitoso');
    else console.error('❌ Fallo en Login', loginRes.body);

    // 2. Test Crear Poema
    console.log('2. Probando Crear Poema...');
    const poemRes = await request({
        hostname: 'localhost', port: 3000, path: '/api/poems', method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, { title: 'Test Poema', content: 'Esto es una prueba.', password: 'azul_profundo' });

    let poemId = poemRes.body.id;
    if (poemRes.status === 200) console.log('✅ Poema creado, ID:', poemId);
    else console.error('❌ Fallo al crear poema', poemRes.body);

    // 3. Test Leer Poemas
    console.log('3. Probando Leer Poemas...');
    const listRes = await request({ hostname: 'localhost', port: 3000, path: '/api/poems', method: 'GET' });
    if (listRes.status === 200 && listRes.body.data.length > 0) console.log('✅ Lista de poemas recuperada');
    else console.error('❌ Fallo al listar poemas');

    // 4. Test Comentar
    console.log('4. Probando Comentar...');
    const commentRes = await request({
        hostname: 'localhost', port: 3000, path: '/api/comments', method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, { poem_id: poemId, author: 'Tester', content: 'Buen poema.' });

    if (commentRes.status === 200) console.log('✅ Comentario creado');
    else console.error('❌ Fallo al comentar', commentRes.body);

    console.log('--- Tests Finalizados ---');
}

runTests();
