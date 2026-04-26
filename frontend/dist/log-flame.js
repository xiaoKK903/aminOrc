const LogFlame = (function() {
  'use strict';

  const STACK_PATTERNS = {
    java: /^at\s+([a-zA-Z0-9_.$]+)\.([a-zA-Z0-9_$]+)\(([a-zA-Z0-9_$]+)\.java:(\d+)\)$/gm,
    js: /^at\s+([a-zA-Z0-9_.$]+)\s*\((.+?):(\d+):(\d+)\)$/gm,
    simple: /^(.+?):(\d+)$/gm
  };

  function parseStackTrace(stackText) {
    if (!stackText) return [];
    
    const frames = [];
    const lines = stackText.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      let match;
      
      match = trimmed.match(/^at\s+([a-zA-Z0-9_.$<>]+)\.([a-zA-Z0-9_$<>]+)\(([^:]+):?(\d*)\)$/);
      if (match) {
        frames.push({
          className: match[1],
          methodName: match[2],
          fileName: match[3],
          lineNumber: match[4] ? parseInt(match[4]) : null,
          raw: trimmed,
          type: 'java'
        });
        continue;
      }
      
      match = trimmed.match(/^at\s+(.+?)\s*\((.+?):(\d+):(\d+)\)$/);
      if (match) {
        frames.push({
          methodName: match[1],
          fileName: match[2],
          lineNumber: parseInt(match[3]),
          columnNumber: parseInt(match[4]),
          raw: trimmed,
          type: 'javascript'
        });
        continue;
      }
      
      match = trimmed.match(/^at\s+(.+?):(\d+):(\d+)$/);
      if (match) {
        frames.push({
          methodName: '<anonymous>',
          fileName: match[1],
          lineNumber: parseInt(match[2]),
          columnNumber: parseInt(match[3]),
          raw: trimmed,
          type: 'javascript-simple'
        });
        continue;
      }
      
      match = trimmed.match(/^([a-zA-Z0-9_.$]+)[:\s]+(.*)$/);
      if (match && !frames.length) {
        frames.push({
          exceptionType: match[1],
          message: match[2],
          raw: trimmed,
          type: 'exception-header'
        });
      }
    }
    
    return frames;
  }

  function buildFlameGraphData(stackFrames, options = {}) {
    if (!stackFrames || stackFrames.length === 0) {
      return {
        name: 'root',
        value: 0,
        children: []
      };
    }
    
    const root = {
      name: options.rootName || 'main',
      value: stackFrames.length,
      children: []
    };
    
    const serviceNames = options.services || [
      'gateway-service',
      'auth-service',
      'user-service',
      'order-service',
      'payment-service',
      'inventory-service',
      'notification-service',
      'search-service'
    ];
    
    const frameMap = new Map();
    
    stackFrames.forEach((frame, index) => {
      const depth = Math.min(index, 8);
      const serviceName = serviceNames[depth % serviceNames.length];
      
      const category = _getFrameCategory(frame);
      
      const leafNode = {
        name: frame.methodName || frame.raw,
        value: 1,
        itemStyle: _getItemStyle(category),
        frameData: {
          ...frame,
          serviceName,
          category,
          depth
        }
      };
      
      let current = root;
      const path = [category, serviceName];
      
      path.forEach(segment => {
        let child = current.children.find(c => c.name === segment);
        if (!child) {
          child = {
            name: segment,
            value: 0,
            children: [],
            itemStyle: _getItemStyle(segment)
          };
          current.children.push(child);
        }
        child.value = (child.value || 0) + 1;
        current = child;
      });
      
      let existingChild = current.children.find(c => 
        c.name === leafNode.name && JSON.stringify(c.frameData) === JSON.stringify(leafNode.frameData)
      );
      
      if (existingChild) {
        existingChild.value = (existingChild.value || 1) + 1;
      } else {
        current.children.push(leafNode);
      }
    });
    
    _normalizeValues(root);
    
    return root;
  }

  function _getFrameCategory(frame) {
    if (frame.type === 'exception-header') return 'Exception';
    
    const className = frame.className || frame.fileName || '';
    const methodName = frame.methodName || '';
    const raw = frame.raw || '';
    
    if (className.includes('service') || methodName.includes('Service')) return 'Business';
    if (className.includes('controller') || methodName.includes('Controller')) return 'Web';
    if (className.includes('repository') || className.includes('dao') || methodName.includes('Query')) return 'Database';
    if (className.includes('cache') || className.includes('redis')) return 'Cache';
    if (raw.includes('http') || raw.includes('rest') || raw.includes('client')) return 'Network';
    if (className.startsWith('org.') || className.startsWith('com.sun.') || className.startsWith('java.')) return 'Framework';
    if (methodName.includes('invoke') || methodName.includes('proxy')) return 'Proxy';
    
    return 'Application';
  }

  function _getItemStyle(category) {
    const colors = {
      'Exception': { color: '#FF4D4F' },
      'Business': { color: '#722ED1' },
      'Web': { color: '#1890FF' },
      'Database': { color: '#FA8C16' },
      'Cache': { color: '#13C2C2' },
      'Network': { color: '#52C41A' },
      'Framework': { color: '#8C8C8C' },
      'Proxy': { color: '#FAAD14' },
      'Application': { color: '#2F54EB' },
      'main': { color: '#1890FF' }
    };
    
    return colors[category] || { color: '#8C8C8C' };
  }

  function _normalizeValues(node) {
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => _normalizeValues(child));
    }
    return node;
  }

  function buildTraceFlameGraph(traceData) {
    if (!traceData || !traceData.spans) {
      return {
        name: 'No Trace Data',
        value: 0,
        children: []
      };
    }
    
    const spans = traceData.spans.sort((a, b) => a.startTime - b.startTime);
    
    const spanMap = new Map();
    spans.forEach(span => spanMap.set(span.spanId, span));
    
    const roots = spans.filter(span => !span.parentSpanId);
    
    function buildNode(span) {
      const children = spans.filter(s => s.parentSpanId === span.spanId);
      const category = _getSpanCategory(span);
      
      return {
        name: span.operationName,
        value: span.duration,
        itemStyle: _getItemStyle(category),
        spanData: {
          spanId: span.spanId,
          serviceName: span.serviceName,
          startTime: span.startTime,
          duration: span.duration,
          tags: span.tags,
          category
        },
        children: children.map(buildNode)
      };
    }
    
    const rootNodes = roots.map(buildNode);
    
    return {
      name: traceData.traceId || 'Trace',
      value: traceData.totalDuration || rootNodes.reduce((sum, n) => sum + (n.value || 0), 0),
      children: rootNodes.length > 0 ? rootNodes : [],
      itemStyle: { color: '#1890FF' }
    };
  }

  function _getSpanCategory(span) {
    const opName = span.operationName || '';
    const tags = span.tags || {};
    
    if (tags.db_type || tags.db_statement || opName.includes('Database')) return 'Database';
    if (tags.http_method || opName.includes('HTTP')) return 'Web';
    if (opName.includes('Cache') || opName.includes('Redis')) return 'Cache';
    if (opName.includes('Service') || span.serviceName?.includes('service')) return 'Business';
    if (opName.includes('Message') || opName.includes('Queue')) return 'Network';
    
    return 'Application';
  }

  function generateRandomFlameData(options = {}) {
    const depth = options.depth || 6;
    const breadth = options.breadth || 4;
    const totalSamples = options.samples || 1000;
    
    const root = {
      name: 'main',
      value: 0,
      children: [],
      itemStyle: { color: '#1890FF' }
    };
    
    const categories = ['Web', 'Business', 'Database', 'Cache', 'Network', 'Framework'];
    const methodNames = {
      'Web': ['handleRequest', 'processRequest', 'dispatchServlet', 'filterChain', 'httpHandler'],
      'Business': ['createOrder', 'processPayment', 'validateUser', 'updateInventory', 'sendNotification'],
      'Database': ['executeQuery', 'prepareStatement', 'commitTransaction', 'rollback', 'batchUpdate'],
      'Cache': ['getCache', 'setCache', 'invalidateCache', 'cacheMiss', 'cacheHit'],
      'Network': ['httpCall', 'restTemplate', 'feignClient', 'grpcInvoke', 'socketWrite'],
      'Framework': ['invokeMethod', 'proxyCall', 'aopAround', 'beanInitialize', 'reflection']
    };
    
    function generateNode(parentName, currentDepth, parentCategory) {
      if (currentDepth >= depth) return null;
      
      const category = currentDepth === 0 ? 'Web' : 
        (Math.random() > 0.3 ? parentCategory : categories[Math.floor(Math.random() * categories.length)]);
      
      const methods = methodNames[category];
      const methodName = methods[Math.floor(Math.random() * methods.length)];
      
      const node = {
        name: methodName,
        value: 0,
        children: [],
        itemStyle: _getItemStyle(category),
        frameData: {
          serviceName: _getServiceForCategory(category),
          category,
          methodName,
          fileName: category.toLowerCase() + '/' + methodName + '.java',
          lineNumber: Math.floor(Math.random() * 200) + 1
        }
      };
      
      const childCount = Math.min(breadth, Math.floor(Math.random() * breadth) + 1);
      for (let i = 0; i < childCount; i++) {
        const child = generateNode(methodName, currentDepth + 1, category);
        if (child) {
          node.children.push(child);
        }
      }
      
      return node;
    }
    
    const topLevelCount = Math.floor(Math.random() * 3) + 2;
    for (let i = 0; i < topLevelCount; i++) {
      const node = generateNode('main', 0, 'Web');
      if (node) {
        root.children.push(node);
      }
    }
    
    _distributeSamples(root, totalSamples);
    
    return root;
  }

  function _getServiceForCategory(category) {
    const mapping = {
      'Web': 'gateway-service',
      'Business': 'order-service',
      'Database': 'inventory-service',
      'Cache': 'user-service',
      'Network': 'payment-service',
      'Framework': 'auth-service'
    };
    return mapping[category] || 'user-service';
  }

  function _distributeSamples(node, total) {
    if (!node.children || node.children.length === 0) {
      node.value = total;
      return total;
    }
    
    let remaining = total;
    const weights = node.children.map(() => Math.random() + 0.5);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    
    let used = 0;
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const childTotal = i === node.children.length - 1 
        ? remaining 
        : Math.floor(total * weights[i] / totalWeight);
      
      used += _distributeSamples(child, childTotal);
      remaining -= childTotal;
    }
    
    node.value = used;
    return used;
  }

  function buildEChartsFlameOption(flameData, options = {}) {
    return {
      tooltip: {
        trigger: 'item',
        formatter: function(params) {
          if (params.data.spanData) {
            const sd = params.data.spanData;
            return `
              <div style="font-weight:bold;margin-bottom:4px">${params.name}</div>
              <div>服务: ${sd.serviceName || 'N/A'}</div>
              <div>耗时: ${sd.duration || 'N/A'}ms</div>
              <div>类别: ${sd.category || 'N/A'}</div>
              ${sd.tags ? `<div>Tags: ${JSON.stringify(sd.tags)}</div>` : ''}
            `;
          }
          if (params.data.frameData) {
            const fd = params.data.frameData;
            return `
              <div style="font-weight:bold;margin-bottom:4px">${params.name}</div>
              <div>服务: ${fd.serviceName || 'N/A'}</div>
              <div>文件: ${fd.fileName || 'N/A'}</div>
              <div>行号: ${fd.lineNumber || 'N/A'}</div>
              <div>类别: ${fd.category || 'N/A'}</div>
            `;
          }
          return `
            <div style="font-weight:bold">${params.name}</div>
            <div>样本数: ${params.value}</div>
          `;
        }
      },
      series: [{
        type: 'treemap',
        id: 'flame',
        animationDurationUpdate: 1000,
        animationEasingUpdate: 'quinticInOut',
        roam: options.roam !== false,
        nodeClick: options.nodeClick || 'zoomToNode',
        breadcrumb: {
          show: true,
          height: 22,
          left: 'center',
          top: 5,
          itemStyle: {
            color: '#1890FF',
            borderColor: '#fff',
            borderWidth: 1
          }
        },
        label: {
          show: true,
          formatter: '{b}',
          fontSize: 11,
          color: '#fff'
        },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 1,
          gapWidth: 1
        },
        levels: [
          {
            itemStyle: {
              borderWidth: 3,
              borderColor: '#fff',
              gapWidth: 3
            }
          },
          {
            colorSaturation: [0.35, 0.6],
            itemStyle: {
              borderWidth: 2,
              gapWidth: 2,
              borderColorSaturation: 0.7
            }
          },
          {
            colorSaturation: [0.35, 0.6],
            itemStyle: {
              borderWidth: 1,
              gapWidth: 1,
              borderColorSaturation: 0.6
            }
          },
          {
            colorSaturation: [0.35, 0.6]
          }
        ],
        data: flameData.children && flameData.children.length > 0 
          ? flameData.children 
          : []
      }]
    };
  }

  function buildEChartsTimelineOption(logs, options = {}) {
    if (!logs || logs.length === 0) {
      return {
        title: {
          text: '暂无数据',
          left: 'center',
          top: 'center'
        }
      };
    }
    
    const timeRange = options.timeRange || {};
    const intervalMs = options.intervalMs || 60000;
    
    const minTime = timeRange.startTime || Math.min(...logs.map(l => l.timestamp));
    const maxTime = timeRange.endTime || Math.max(...logs.map(l => l.timestamp));
    
    const buckets = {};
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    
    let current = minTime;
    while (current <= maxTime) {
      const bucketKey = Math.floor(current / intervalMs) * intervalMs;
      buckets[bucketKey] = {
        time: bucketKey,
        DEBUG: 0,
        INFO: 0,
        WARN: 0,
        ERROR: 0
      };
      current += intervalMs;
    }
    
    logs.forEach(log => {
      const bucketKey = Math.floor(log.timestamp / intervalMs) * intervalMs;
      if (buckets[bucketKey]) {
        buckets[bucketKey][log.level] = (buckets[bucketKey][log.level] || 0) + 1;
      }
    });
    
    const sortedBuckets = Object.values(buckets).sort((a, b) => a.time - b.time);
    
    const series = levels.map(level => ({
      name: level,
      type: 'line',
      stack: 'logs',
      smooth: true,
      symbol: 'circle',
      symbolSize: 4,
      sampling: 'lttb',
      areaStyle: {
        opacity: 0.3
      },
      data: sortedBuckets.map(b => ({
        value: b[level],
        timestamp: b.time
      }))
    }));
    
    const colors = {
      'DEBUG': '#8C8C8C',
      'INFO': '#1890FF',
      'WARN': '#FAAD14',
      'ERROR': '#FF4D4F'
    };
    
    return {
      title: {
        text: '日志时间轴',
        left: 'left',
        top: 10,
        textStyle: {
          fontSize: 14,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        formatter: function(params) {
          if (!params || params.length === 0) return '';
          
          const time = new Date(params[0].data.timestamp);
          let result = `<div style="font-weight:bold;margin-bottom:4px">${time.toLocaleString()}</div>`;
          
          let total = 0;
          params.forEach(p => {
            if (p.data.value > 0) {
              result += `<div style="color:${colors[p.seriesName]}">${p.seriesName}: ${p.data.value}</div>`;
              total += p.data.value;
            }
          });
          
          result += `<div style="margin-top:4px;font-weight:bold">总计: ${total}</div>`;
          return result;
        }
      },
      legend: {
        data: levels,
        top: 10,
        right: 10
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: 50,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: sortedBuckets.map(b => {
          const date = new Date(b.time);
          return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        }),
        axisLabel: {
          rotate: 45,
          fontSize: 10
        }
      },
      yAxis: {
        type: 'value',
        name: '日志数量'
      },
      color: levels.map(l => colors[l]),
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100
        },
        {
          type: 'slider',
          start: 0,
          end: 100,
          bottom: 0,
          height: 20
        }
      ],
      series
    };
  }

  function buildEChartsMetricsOption(metrics, options = {}) {
    if (!metrics) {
      return {
        title: { text: '暂无指标数据', left: 'center', top: 'center' }
      };
    }
    
    const services = Object.keys(metrics);
    
    return {
      title: {
        text: '性能指标概览',
        left: 'left',
        top: 10,
        textStyle: { fontSize: 14, fontWeight: 'bold' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      legend: {
        data: ['CPU使用率', '内存使用率', '错误率'],
        top: 10,
        right: 10
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: 50,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: services
      },
      yAxis: {
        type: 'value',
        max: 100,
        name: '百分比'
      },
      series: [
        {
          name: 'CPU使用率',
          type: 'bar',
          data: services.map(s => metrics[s]?.cpu || 0),
          itemStyle: { color: '#1890FF' }
        },
        {
          name: '内存使用率',
          type: 'bar',
          data: services.map(s => metrics[s]?.memory || 0),
          itemStyle: { color: '#722ED1' }
        },
        {
          name: '错误率',
          type: 'bar',
          data: services.map(s => (metrics[s]?.error_rate || 0) * 100),
          itemStyle: { color: '#FF4D4F' }
        }
      ]
    };
  }

  return {
    parseStackTrace,
    buildFlameGraphData,
    buildTraceFlameGraph,
    generateRandomFlameData,
    buildEChartsFlameOption,
    buildEChartsTimelineOption,
    buildEChartsMetricsOption
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LogFlame;
}