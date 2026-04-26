const GatewaySandbox = (function() {
  'use strict';

  const MAX_EXECUTION_TIME = 5000;
  const MAX_MEMORY_BYTES = 10 * 1024 * 1024;

  const SAFE_GLOBALS = [
    'Object', 'Array', 'String', 'Number', 'Boolean',
    'Math', 'Date', 'RegExp', 'JSON', 'parseInt', 'parseFloat',
    'isNaN', 'isFinite', 'encodeURI', 'encodeURIComponent',
    'decodeURI', 'decodeURIComponent', 'undefined', 'null',
    'true', 'false', 'Infinity', 'NaN'
  ];

  const FORBIDDEN_PATTERNS = [
    /document\s*\./g,
    /window\s*\./g,
    /eval\s*\(/g,
    /new\s+Function/g,
    /Function\s*\(/g,
    /setTimeout\s*\(/g,
    /setInterval\s*\(/g,
    /import\s*\(/g,
    /import\s+.*from/g,
    /export\s+(default|const|let|var|function|class)/g,
    /require\s*\(/g,
    /module\s*\./g,
    /exports\s*\./g,
    /process\s*\./g,
    /global\s*\./g,
    /__dirname/g,
    /__filename/g,
    /fetch\s*\(/g,
    /XMLHttpRequest/g,
    /WebSocket/g,
    /localStorage/g,
    /sessionStorage/g,
    /indexedDB/g,
    /postMessage/g,
    /parent\s*\./g,
    /top\s*\./g,
    /location\s*\./g,
    /history\s*\./g,
    /navigator\s*\./g,
    /screen\s*\./g,
    /frames\s*\./g,
    /self\s*\./g,
    /atob\s*\(/g,
    /btoa\s*\(/g,
    /Blob\s*\(/g,
    /File\s*\(/g,
    /FileReader\s*\(/g,
    /URL\s*\./g,
    /createObjectURL/g,
    /revokeObjectURL/g,
    /Worker\s*\(/g,
    /SharedWorker\s*\(/g,
    /ServiceWorker\s*\./g,
    /webkitStorageInfo/g,
    /storage\s*\./g
  ];

  function validateScript(script) {
    if (typeof script !== 'string') {
      return { valid: false, error: '脚本必须是字符串类型' };
    }

    const trimmed = script.trim();
    if (!trimmed) {
      return { valid: false, error: '脚本不能为空' };
    }

    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(script)) {
        return {
          valid: false,
          error: `脚本包含禁止的语法: ${pattern.source}`
        };
      }
    }

    try {
      new Function('context', `
        "use strict";
        ${script}
      `);
    } catch (e) {
      return { valid: false, error: `语法错误: ${e.message}` };
    }

    return { valid: true };
  }

  function createSandbox(context = {}) {
    const sandbox = Object.create(null);
    const safeContext = {};

    for (const key of Object.keys(context)) {
      try {
        safeContext[key] = JSON.parse(JSON.stringify(context[key]));
      } catch (e) {
        safeContext[key] = context[key];
      }
    }

    const safeGlobals = {
      Object: createSafeObject(),
      Array: createSafeArray(),
      String: createSafeString(),
      Number: Number,
      Boolean: Boolean,
      Math: createSafeMath(),
      Date: createSafeDate(),
      RegExp: createSafeRegExp(),
      JSON: createSafeJSON(),
      parseInt: parseInt,
      parseFloat: parseFloat,
      isNaN: isNaN,
      isFinite: isFinite,
      encodeURI: encodeURI,
      encodeURIComponent: encodeURIComponent,
      decodeURI: decodeURI,
      decodeURIComponent: decodeURIComponent,
      undefined: undefined,
      null: null,
      true: true,
      false: false,
      Infinity: Infinity,
      NaN: NaN,
      console: createSafeConsole(),
      ...safeContext
    };

    for (const key of Object.keys(safeGlobals)) {
      sandbox[key] = safeGlobals[key];
    }

    return sandbox;
  }

  function createSafeObject() {
    const safe = {};
    const safeMethods = ['create', 'defineProperty', 'defineProperties', 
      'freeze', 'seal', 'preventExtensions', 
      'getOwnPropertyDescriptor', 'getOwnPropertyNames', 'getOwnPropertySymbols',
      'getPrototypeOf', 'is', 'isExtensible', 'isFrozen', 'isSealed',
      'keys', 'values', 'entries', 'assign'];
    
    safeMethods.forEach(method => {
      if (Object[method]) {
        safe[method] = Object[method].bind(Object);
      }
    });
    
    return safe;
  }

  function createSafeArray() {
    return Array;
  }

  function createSafeString() {
    return String;
  }

  function createSafeMath() {
    return Math;
  }

  function createSafeDate() {
    return Date;
  }

  function createSafeRegExp() {
    return RegExp;
  }

  function createSafeJSON() {
    return {
      parse: (text, reviver) => {
        return JSON.parse(text, reviver);
      },
      stringify: (value, replacer, space) => {
        return JSON.stringify(value, replacer, space);
      }
    };
  }

  function createSafeConsole() {
    return {
      log: (...args) => {
        console.log('[Sandbox]', ...args);
      },
      info: (...args) => {
        console.info('[Sandbox]', ...args);
      },
      warn: (...args) => {
        console.warn('[Sandbox]', ...args);
      },
      error: (...args) => {
        console.error('[Sandbox]', ...args);
      }
    };
  }

  function execute(script, context = {}, options = {}) {
    const validation = validateScript(script);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const maxTime = options.maxTime || MAX_EXECUTION_TIME;
    const startTime = Date.now();

    const sandbox = createSandbox(context);

    let userScript = script.trim();
    if (!userScript.includes('return ') && !userScript.includes('return;')) {
      userScript = `return (function() { ${userScript} })();`;
    }

    const wrapperScript = `
      "use strict";
      const result = (function() {
        with (sandbox) {
          ${userScript}
        }
      })();
      return result;
    `;

    try {
      const executor = new Function('sandbox', wrapperScript);
      
      const checkTimeout = () => {
        if (Date.now() - startTime > maxTime) {
          throw new Error(`脚本执行超时 (${maxTime}ms)`);
        }
      };

      const intervalId = setInterval(checkTimeout, 100);
      
      try {
        const result = executor(sandbox);
        checkTimeout();
        
        try {
          return JSON.parse(JSON.stringify(result));
        } catch (e) {
          return result;
        }
      } finally {
        clearInterval(intervalId);
      }
    } catch (e) {
      if (e.message.includes('超时')) {
        throw e;
      }
      throw new Error(`脚本执行错误: ${e.message}`);
    }
  }

  function executeAsync(script, context = {}, options = {}) {
    return new Promise((resolve, reject) => {
      const maxTime = options.maxTime || MAX_EXECUTION_TIME;
      
      const timeoutId = setTimeout(() => {
        reject(new Error(`脚本执行超时 (${maxTime}ms)`));
      }, maxTime);

      try {
        const result = execute(script, context, options);
        clearTimeout(timeoutId);
        resolve(result);
      } catch (e) {
        clearTimeout(timeoutId);
        reject(e);
      }
    });
  }

  function testScript(script, sampleContext = {}) {
    const validation = validateScript(script);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        stage: 'validation'
      };
    }

    try {
      const result = execute(script, sampleContext, { maxTime: 1000 });
      return {
        success: true,
        result,
        stage: 'execution'
      };
    } catch (e) {
      return {
        success: false,
        error: e.message,
        stage: 'execution'
      };
    }
  }

  const BUILTIN_TEMPLATES = {
    basic: {
      name: '基础聚合',
      description: '合并多个服务的返回结果',
      code: `// 基础聚合模板
// 所有服务调用结果都在 results 对象中
return {
  success: true,
  data: {
    userInfo: results.userService || {},
    orderStats: results.orderService || {},
    balance: results.paymentService?.balance || 0
  },
  timestamp: Date.now()
};`
    },
    transform: {
      name: '数据转换',
      description: '字段映射和数据格式转换',
      code: `// 数据转换模板
// 字段映射和数据转换
const transformUser = (user) => ({
  id: user.userId,
  name: user.userName,
  avatar: user.avatarUrl,
  phone: user.phoneNumber?.replace(/(\\d{3})\\d{4}(\\d{4})/, '$1****$2')
});

return {
  ...transformUser(results.userService),
  orders: results.orderService?.list?.map(o => ({
    id: o.orderId,
    status: o.orderStatus
  })) || []
};`
    },
    filter: {
      name: '数据过滤',
      description: '筛选和过滤数据',
      code: `// 数据过滤模板
// 过滤和筛选数据
const orders = results.orderService?.list || [];

return {
  total: orders.length,
  pending: orders.filter(o => o.status === 'pending'),
  completed: orders.filter(o => o.status === 'completed'),
  highValue: orders.filter(o => o.amount > 1000)
};`
    },
    error: {
      name: '错误处理',
      description: '容错和默认值处理',
      code: `// 错误处理模板
// 容错和默认值处理
try {
  return {
    success: true,
    user: results.userService || { error: '用户服务不可用' },
    order: results.orderService || { list: [] }
  };
} catch (e) {
  return {
    success: false,
    error: e.message,
    fallback: true
  };
}`
    }
  };

  function getTemplates() {
    return Object.entries(BUILTIN_TEMPLATES).map(([key, value]) => ({
      key,
      ...value
    }));
  }

  function getTemplate(key) {
    return BUILTIN_TEMPLATES[key];
  }

  return {
    validateScript,
    createSandbox,
    execute,
    executeAsync,
    testScript,
    getTemplates,
    getTemplate,
    MAX_EXECUTION_TIME,
    MAX_MEMORY_BYTES,
    SAFE_GLOBALS,
    FORBIDDEN_PATTERNS
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GatewaySandbox;
}