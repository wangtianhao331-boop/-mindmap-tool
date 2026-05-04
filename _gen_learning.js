// 批量生成 AI 学习指南
var fs = require('fs');
var https = require('https');

var API_KEY = 'sk-e794fda655fb4b84bed114eec97ccc16';
var BATCH_SIZE = 5;
var BATCHES_TO_DO = 50;

var html = fs.readFileSync('index.html', 'utf-8');

// 读取 DETAIL keys
var dStart = html.indexOf('const DETAIL = {');
var depth = 0; var dEnd = -1; var found = false;
for (var i = dStart; i < html.length; i++) {
  if (html[i] === '{') { depth++; found = true; }
  else if (html[i] === '}') { depth--; }
  if (found && depth === 0) { dEnd = i + 1; break; }
}
var detailCode = html.substring(dStart, dEnd);
var detailKeys = [];
var eRe = /"([^"]+)":\s*\{/g;
var em;
while ((em = eRe.exec(detailCode)) !== null) {
  detailKeys.push(em[1]);
}
console.log('DETAIL 条目:', detailKeys.length);

// 读取已有的 LEARNING keys（只要有实际数据 { 的就算）
var lStart = html.indexOf('var LEARNING = {');
var existingLearning = {};
var existingText = {}; // 保存原始文本
if (lStart >= 0) {
  var lEnd = html.indexOf('function showAIGuide()');
  var lCode = html.substring(lStart, lEnd);
  // 提取每个完整的条目（支持多行嵌套）
  var inner = lCode.substring(lCode.indexOf('{\n') + 2);
  // 简单方式：用 key 匹配
  var lRe = /"([^"]+)":\s*\{/g;
  var lm;
  while ((lm = lRe.exec(lCode)) !== null) {
    existingLearning[lm[1]] = true;
  }
}
console.log('已有 LEARNING:', Object.keys(existingLearning).length);

// 找出还没生成的
var remaining = [];
for (var r = 0; r < detailKeys.length; r++) {
  if (!existingLearning[detailKeys[r]]) {
    remaining.push(detailKeys[r]);
  }
}
console.log('还需生成:', remaining.length);
console.log('本次生成:', Math.min(BATCHES_TO_DO * BATCH_SIZE, remaining.length), '个');

function callAPI(keys) {
  return new Promise(function(resolve, reject) {
    var prompt = '你是K12教育助手。请为以下每个知识点各写一份简短学习指南。每个知识点返回JSON格式：{"summary":"50-100字概述","steps":["3-5个学习步骤"],"examples":["2-3个简单例题"],"commonMistakes":["2-3个常见错误"]}。\n\n知识点列表：\n';
    for (var p = 0; p < keys.length; p++) {
      prompt += (p + 1) + '. ' + keys[p] + '\n';
    }
    prompt += '\n请严格按JSON格式返回：{"知识点1": {...}, "知识点2": {...}}\n只返回JSON，不要其他内容。';

    var data = JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是K12教育助手。只输出JSON。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 16384,
      response_format: { type: 'json_object' }
    });

    var req = https.request({
      hostname: 'api.deepseek.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + API_KEY },
      timeout: 180000
    }, function(res) {
      var body = '';
      res.on('data', function(c) { body += c; });
      res.on('end', function() {
        try {
          var json = JSON.parse(body);
          if (json.error) { reject(new Error(json.error.message)); return; }
          var content = json.choices[0].message.content;
          content = content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
          var parsed = JSON.parse(content);
          resolve(parsed);
        } catch(e) {
          console.log('PARSE ERROR:', body.substring(0, 500));
          reject(e);
        }
      });
    });
    req.on('error', function(e) { reject(e); });
    req.on('timeout', function() { req.destroy(); reject(new Error('timeout')); });
    req.write(data); req.end();
  });
}

async function main() {
  if (remaining.length === 0) {
    console.log('全部已生成！');
    return;
  }

  var todoKeys = remaining.slice(0, BATCHES_TO_DO * BATCH_SIZE);

  for (var b = 0; b < todoKeys.length; b += BATCH_SIZE) {
    var batch = todoKeys.slice(b, b + BATCH_SIZE);
    var bn = Math.floor(b / BATCH_SIZE) + 1;
    var totalBatches = Math.ceil(todoKeys.length / BATCH_SIZE);
    console.log('\n--- 第 ' + bn + '/' + totalBatches + ' 批 (' + batch.length + '个) ---');
    console.log(batch.join(', '));

    try {
      var result = await callAPI(batch);
      var keys = Object.keys(result);
      var added = 0;
      for (var k = 0; k < keys.length; k++) {
        if (result[keys[k]] && result[keys[k]].summary) {
          appendEntry(keys[k], result[keys[k]]);
          added++;
        }
      }
      console.log('本批成功:', added, '条');
    } catch(e) {
      console.log('本批失败:', e.message);
    }

    if (b + BATCH_SIZE < todoKeys.length) {
      console.log('等待 3 秒...');
      await new Promise(function(r) { setTimeout(r, 3000); });
    }
  }

  console.log('\n=== 完成 ===');
}

// 增量追加，不覆盖已有数据
function appendEntry(key, guide) {
  var h = fs.readFileSync('index.html', 'utf-8');
  var lEnd = h.indexOf('function showAIGuide()');
  if (lEnd < 0) { console.log('Cannot find showAIGuide'); return; }

  // 找到 LEARNING 闭括号 };
  var closeBrace = h.lastIndexOf('\n};', lEnd);
  if (closeBrace < 0) { console.log('Cannot find LEARNING close'); return; }

  var safeKey = JSON.stringify(key);
  var safeGuide = JSON.stringify(guide);
  var newEntry = ',\n  ' + safeKey + ': ' + safeGuide;

  h = h.substring(0, closeBrace) + newEntry + '\n};' + h.substring(closeBrace + 3);
  fs.writeFileSync('index.html', h, 'utf-8');
}

main().catch(function(e) {
  console.log('FATAL:', e.message);
  console.log(e.stack);
});
