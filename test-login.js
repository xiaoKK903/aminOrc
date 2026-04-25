const http = require('http');

const FRONTEND_HOST = 'localhost';
const FRONTEND_PORT = 5173;
const API_PATH = '/api/auth/login';

function makeRequest(method, host, port, path, data) {
    return new Promise((resolve, reject) => {
        const dataString = data ? JSON.stringify(data) : '';
        const options = {
            hostname: host,
            port: port,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (dataString) {
            options.headers['Content-Length'] = Buffer.byteLength(dataString);
        }

        console.log(`\n  发送请求: ${method} http://${host}:${port}${path}`);
        console.log(`  请求数据: ${dataString || '(无)'}`);

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                console.log(`  响应状态: ${res.statusCode}`);
                console.log(`  响应头: ${JSON.stringify(res.headers)}`);
                try {
                    const jsonBody = JSON.parse(body);
                    console.log(`  响应数据: ${JSON.stringify(jsonBody, null, 2)}`);
                    resolve({ status: res.statusCode, data: jsonBody, headers: res.headers });
                } catch (e) {
                    console.log(`  响应数据: ${body}`);
                    resolve({ status: res.statusCode, data: body, headers: res.headers });
                }
            });
        });

        req.on('error', (e) => {
            console.log(`  请求错误: ${e.message}`);
            reject(e);
        });

        if (dataString) {
            req.write(dataString);
        }
        req.end();
    });
}

async function testLogin() {
    console.log('=== 测试前端登录接口 ===\n');

    const testCases = [
        { email: 'admin@jitword.com', password: 'admin111', name: '管理员账号' },
        { email: 'test@example.com', password: 'test1234', name: '测试账号' },
        { email: 'newuser@test.com', password: 'anypassword', name: '新用户' }
    ];

    for (const testCase of testCases) {
        console.log(`测试 ${testCase.name}: ${testCase.email}`);
        try {
            const result = await makeRequest('POST', FRONTEND_HOST, FRONTEND_PORT, API_PATH, {
                email: testCase.email,
                password: testCase.password
            });

            console.log(`  状态码: ${result.status}`);
            console.log(`  响应: ${JSON.stringify(result.data, null, 2)}`);
        } catch (error) {
            console.log(`  错误: ${error.message}`);
        }
        console.log('---');
        console.log('');
    }

    console.log('=== 测试完成 ===');
}

testLogin().catch(console.error);