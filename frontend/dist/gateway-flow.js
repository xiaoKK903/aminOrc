const GatewayFlow = (function() {
  'use strict';

  const NODE_TYPES = {
    http: {
      name: 'HTTP调用',
      icon: '🌐',
      defaultConfig: {
        method: 'GET',
        url: '',
        headers: {},
        timeout: 30000,
        retries: 0,
        cacheTtl: 0
      }
    },
    script: {
      name: '脚本处理',
      icon: '⚡',
      defaultConfig: {
        script: `// 数据处理脚本
// 输入: data (上一步的数据)
// 输出: 处理后的数据
return {
  ...data,
  processed: true,
  timestamp: Date.now()
};`
      }
    },
    merge: {
      name: '数据合并',
      icon: '🔗',
      defaultConfig: {
        mergeType: 'object',
        script: `// 数据合并脚本
// 输入: data1, data2, ... (各节点数据)
// 输出: 合并后的数据
return {
  user: data1,
  order: data2
};`
      }
    },
    condition: {
      name: '条件分支',
      icon: '❓',
      defaultConfig: {
        condition: 'data.status === "active"',
        trueBranch: [],
        falseBranch: []
      }
    }
  };

  function createNode(type, config = {}) {
    const typeInfo = NODE_TYPES[type];
    if (!typeInfo) {
      throw new Error(`Unknown node type: ${type}`);
    }

    return {
      id: 'node_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      type,
      name: typeInfo.name,
      description: '',
      x: 100,
      y: 100,
      width: 180,
      height: 80,
      config: { ...typeInfo.defaultConfig, ...config },
      inputs: [],
      outputs: []
    };
  }

  function createConnection(fromNode, fromOutput, toNode, toInput) {
    return {
      id: 'conn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      from: {
        nodeId: fromNode.id,
        output: fromOutput || 'default'
      },
      to: {
        nodeId: toNode.id,
        input: toInput || 'default'
      }
    };
  }

  function validateFlow(nodes, connections) {
    const errors = [];
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    nodes.forEach(node => {
      if (node.type === 'http' && !node.config?.url) {
        errors.push({
          nodeId: node.id,
          message: `节点 "${node.name}" 未配置 URL`
        });
      }

      if (node.type === 'script' && !node.config?.script?.trim()) {
        errors.push({
          nodeId: node.id,
          message: `节点 "${node.name}" 未配置脚本`
        });
      }
    });

    connections.forEach(conn => {
      if (!nodeMap.has(conn.from.nodeId)) {
        errors.push({
          connectionId: conn.id,
          message: `连接引用了不存在的源节点: ${conn.from.nodeId}`
        });
      }
      if (!nodeMap.has(conn.to.nodeId)) {
        errors.push({
          connectionId: conn.id,
          message: `连接引用了不存在的目标节点: ${conn.to.nodeId}`
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  function buildExecutionOrder(nodes, connections) {
    const order = [];
    const inDegree = new Map(nodes.map(n => [n.id, 0]));
    const adjacency = new Map(nodes.map(n => [n.id, []]));

    const startNodes = nodes.filter(n => 
      n.type === 'http' && !connections.some(c => c.to.nodeId === n.id)
    );

    connections.forEach(conn => {
      adjacency.get(conn.from.nodeId)?.push(conn.to.nodeId);
      const current = inDegree.get(conn.to.nodeId) || 0;
      inDegree.set(conn.to.nodeId, current + 1);
    });

    const queue = [...startNodes];
    
    while (queue.length > 0) {
      const nodeId = queue.shift();
      order.push(nodeId);
      
      adjacency.get(nodeId)?.forEach(nextId => {
        inDegree.set(nextId, (inDegree.get(nextId) || 1) - 1);
        if (inDegree.get(nextId) === 0) {
          queue.push(nextId);
        }
      });
    }

    return nodes.filter(n => order.includes(n.id));
  }

  function executeNode(node, context, sandbox) {
    return new Promise((resolve, reject) => {
      switch (node.type) {
        case 'http':
          executeHttpNode(node, context).then(resolve).catch(reject);
          break;
        case 'script':
          executeScriptNode(node, context, sandbox).then(resolve).catch(reject);
          break;
        case 'merge':
          executeMergeNode(node, context, sandbox).then(resolve).catch(reject);
          break;
        case 'condition':
          executeConditionNode(node, context, sandbox).then(resolve).catch(reject);
          break;
        default:
          reject(new Error(`Unknown node type: ${node.type}`));
      }
    });
  }

  async function executeHttpNode(node, context) {
    const config = node.config || {};
    const url = config.url || '';
    const method = config.method || 'GET';
    const timeout = config.timeout || 30000;

    const resolvedUrl = resolveTemplate(url, context);

    if (context?.mockMode) {
      await sleep(Math.random() * 500 + 50);
      return {
        success: true,
        data: {
          _mock: true,
          nodeId: node.id,
          nodeName: node.name,
          url: resolvedUrl,
          method,
          timestamp: Date.now()
        }
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(resolvedUrl, {
        method,
        headers: config.headers || {},
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json();
      return {
        success: response.ok,
        status: response.status,
        data
      };
    } catch (error) {
      clearTimeout(timeoutId);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async function executeScriptNode(node, context, sandbox) {
    const script = node.config?.script || '';
    
    try {
      const result = sandbox.execute(script, {
        data: context?.inputData || {},
        params: context?.params || {},
        headers: context?.headers || {},
        results: context?.results || {}
      });
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async function executeMergeNode(node, context, sandbox) {
    const script = node.config?.script || '';
    
    try {
      const result = sandbox.execute(script, {
        ...context?.inputData || {},
        params: context?.params || {},
        results: context?.results || {}
      });
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async function executeConditionNode(node, context, sandbox) {
    const condition = node.config?.condition || '';
    
    try {
      const result = sandbox.execute(`return ${condition};`, {
        data: context?.inputData || {},
        params: context?.params || {},
        results: context?.results || {}
      });
      
      return {
        success: true,
        data: {
          condition: result,
          trueBranch: result,
          falseBranch: !result
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  function resolveTemplate(template, context) {
    if (!template || !context) return template;
    
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = getNestedValue(context, path.trim());
      return value !== undefined ? value : match;
    });
  }

  function getNestedValue(obj, path) {
    if (!obj || !path) return undefined;
    
    const keys = path.split('.');
    let result = obj;
    
    for (const key of keys) {
      if (result === null || result === undefined) return undefined;
      result = result[key];
    }
    
    return result;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function getNodeTypes() {
    return Object.keys(NODE_TYPES);
  }

  function getNodeTypeInfo(type) {
    return NODE_TYPES[type];
  }

  return {
    createNode,
    createConnection,
    validateFlow,
    buildExecutionOrder,
    executeNode,
    executeHttpNode,
    executeScriptNode,
    executeMergeNode,
    executeConditionNode,
    resolveTemplate,
    getNestedValue,
    getNodeTypes,
    getNodeTypeInfo,
    NODE_TYPES
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GatewayFlow;
}