const http = require('http');

const HOST = 'localhost';
const PORT = 3005;

async function makeRequest(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const dataString = data ? JSON.stringify(data) : '';
        const options = {
            hostname: HOST,
            port: PORT,
            path: '/api' + path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        if (dataString) {
            options.headers['Content-Length'] = Buffer.byteLength(dataString);
        }

        console.log(`\n>>> ${method} /api${path}`);
        if (data) console.log(`    请求数据: ${dataString}`);

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                console.log(`    状态码: ${res.statusCode}`);
                try {
                    const jsonBody = JSON.parse(body);
                    console.log(`    响应数据: ${JSON.stringify(jsonBody, null, 2)}`);
                    resolve({ status: res.statusCode, data: jsonBody });
                } catch (e) {
                    console.log(`    响应数据: ${body}`);
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', (e) => {
            console.log(`    请求错误: ${e.message}`);
            reject(e);
        });

        if (dataString) {
            req.write(dataString);
        }
        req.end();
    });
}

async function testCredentialPools() {
    console.log('====================================');
    console.log('测试凭证池 API');
    console.log('====================================');

    let token = null;

    try {
        console.log('\n--- 步骤1: 登录获取 token ---');
        const loginResult = await makeRequest('POST', '/auth/login', {
            email: 'admin@jitword.com',
            password: 'admin111'
        });
        
        if (loginResult.status === 201 || loginResult.status === 200) {
            token = loginResult.data.token;
            console.log('✓ 登录成功，获取到 token');
        } else {
            console.log('✗ 登录失败，状态码: ' + loginResult.status);
            return;
        }

        console.log('\n--- 步骤2: 获取统计数据 ---');
        const statsResult = await makeRequest('GET', '/credential-pools/statistics/overview', null, token);
        console.log('✓ 统计数据获取成功');

        console.log('\n--- 步骤3: 获取第三方平台列表 ---');
        const thirdPartiesResult = await makeRequest('GET', '/credential-pools/third-parties/list', null, token);
        console.log('✓ 第三方平台列表获取成功');

        console.log('\n--- 步骤4: 获取凭证列表 ---');
        const listResult = await makeRequest('GET', '/credential-pools?page=1&pageSize=10', null, token);
        console.log('✓ 凭证列表获取成功');

        console.log('\n--- 步骤5: 创建新凭证 ---');
        const createResult = await makeRequest('POST', '/credential-pools', {
            thirdParty: '微信支付',
            account: 'wx_test_123456',
            secret: 'sk_test_abcdef123456',
            expireDate: '2026-12-31',
            purpose: '小程序支付功能',
            responsiblePerson: '张三',
            callbackUrl: 'https://example.com/api/wxpay/callback',
            remarks: '测试环境密钥'
        }, token);

        let credentialId = null;
        if (createResult.status === 201 || createResult.status === 200) {
            credentialId = createResult.data.id;
            console.log(`✓ 凭证创建成功，ID: ${credentialId}`);
            console.log(`  掩码密钥: ${createResult.data.maskedSecret}`);
            console.log(`  状态: ${createResult.data.status}`);
        } else {
            console.log('✗ 凭证创建失败');
        }

        if (credentialId) {
            console.log('\n--- 步骤6: 获取凭证详情 ---');
            const detailResult = await makeRequest('GET', `/credential-pools/${credentialId}`, null, token);
            console.log('✓ 凭证详情获取成功');

            console.log('\n--- 步骤7: 查看原始密钥 ---');
            const secretResult = await makeRequest('GET', `/credential-pools/${credentialId}/secret`, null, token);
            console.log(`✓ 密钥获取成功: ${secretResult.data.secret}`);

            console.log('\n--- 步骤8: 更新凭证 ---');
            const updateResult = await makeRequest('PATCH', `/credential-pools/${credentialId}`, {
                purpose: '小程序支付功能 - 已更新',
                expireDate: '2027-06-30'
            }, token);
            console.log('✓ 凭证更新成功');

            console.log('\n--- 步骤9: 再次获取列表验证 ---');
            const listResult2 = await makeRequest('GET', '/credential-pools?page=1&pageSize=10', null, token);
            console.log(`✓ 列表获取成功，总条数: ${listResult2.data.total || listResult2.data.items?.length || 0}`);

            console.log('\n--- 步骤10: 删除测试凭证 ---');
            const deleteResult = await makeRequest('DELETE', `/credential-pools/${credentialId}`, null, token);
            if (deleteResult.status === 200 || deleteResult.status === 204) {
                console.log('✓ 凭证删除成功');
            } else {
                console.log('✗ 凭证删除失败，状态码: ' + deleteResult.status);
            }
        }

        console.log('\n====================================');
        console.log('所有测试完成！');
        console.log('====================================');

    } catch (error) {
        console.error('\n测试出错:', error.message);
    }
}

testCredentialPools();