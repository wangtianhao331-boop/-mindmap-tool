// 批量生成 DETAIL 条目
var fs = require('fs');
var https = require('https');

var API_KEY = 'sk-e794fda655fb4b84bed114eec97ccc16';
var BATCH_SIZE = 8;
var BATCHES_TO_DO = 200; // 跑 200 批 = 1600 个知识点（覆盖五年级以上全部）

// 1. 读取已有数据
var batch = JSON.parse(fs.readFileSync('_batch_data.json', 'utf-8'));
var allPoints = batch.points; // { "0": {point, module}, "1": {point, module}, ... }
var allIds = Object.keys(allPoints);

// 读取已生成的结果
var results = {};
try {
  results = JSON.parse(fs.readFileSync('_detail_results.json', 'utf-8'));
} catch(e) {
  results = {};
}

// 读取 HTML 中已有的 DETAIL
var html = fs.readFileSync('index.html', 'utf-8');
var dStart = html.indexOf('const DETAIL = {');
var depth = 0; var dEnd = -1; var found = false;
for (var i = dStart; i < html.length; i++) {
  if (html[i] === '{') { depth++; found = true; }
  else if (html[i] === '}') { depth--; }
  if (found && depth === 0) { dEnd = i + 1; break; }
}
var detailCode = html.substring(dStart, dEnd);
var existingInHtml = {};
var eRe = /"([^"]+)":\s*\{/g;
var em;
while ((em = eRe.exec(detailCode)) !== null) {
  existingInHtml[em[1]] = true;
}

// 2. 找出还没生成过的知识点
var remainingIds = [];
for (var j = 0; j < allIds.length; j++) {
  var id = allIds[j];
  var pointName = allPoints[id].point;
  // 检查是否已经生成（在 results 或 HTML 中）
  var converted = pointName.replace(/（/g, '(').replace(/）/g, ')');
  if (!results[pointName] && !existingInHtml[pointName] && !existingInHtml[converted]) {
    remainingIds.push(id);
  }
}

console.log('总知识点:', allIds.length);
console.log('已生成(含HTML):', allIds.length - remainingIds.length);
console.log('还缺:', remainingIds.length);
console.log('本次生成批数:', BATCHES_TO_DO, '(约', BATCHES_TO_DO * BATCH_SIZE, '个知识点)');

if (remainingIds.length === 0) {
  console.log('全部已生成！');
  process.exit(0);
}

// 3. 生成函数
function callAPI(points) {
  return new Promise(function(resolve, reject) {
    var prompt = '你是小学到高中的全科学习助手。请为以下每个知识点，各给出6-8条核心学习要点（用中文，每条20-40字，简洁实用）。\n\n';
    for (var p = 0; p < points.length; p++) {
      prompt += (p + 1) + '. ' + points[p].point + '（模块：' + points[p].module + '）\n';
    }
    prompt += '\n请严格按 JSON 格式返回：{"知识点1": ["要点1","要点2",...], "知识点2": [...]}\n只返回 JSON，不要其他内容。';

    var data = JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是一个专业的K12教育助手。只输出JSON，不输出其他内容。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 8192,
      response_format: { type: 'json_object' }
    });

    var req = https.request({
      hostname: 'api.deepseek.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY
      },
      timeout: 120000
    }, function(res) {
      var body = '';
      res.on('data', function(chunk) { body += chunk; });
      res.on('end', function() {
        try {
          var json = JSON.parse(body);
          if (json.error) {
            reject(new Error(json.error.message || JSON.stringify(json.error)));
          } else {
            var content = json.choices[0].message.content;
            // 清理 markdown 包裹
            content = content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
            var parsed = JSON.parse(content);
            resolve(parsed);
          }
        } catch(e) {
          console.log('API 返回解析失败:', body.substring(0, 500));
          reject(e);
        }
      });
    });
    req.on('error', function(e) { reject(e); });
    req.on('timeout', function() { req.destroy(); reject(new Error('timeout')); });
    req.write(data);
    req.end();
  });
}

// 4. 逐批生成
async function main() {
  var batches = [];
  for (var b = 0; b < BATCHES_TO_DO && remainingIds.length > 0; b++) {
    var batchIds = remainingIds.splice(0, BATCH_SIZE);
    var batchPoints = batchIds.map(function(id) { return allPoints[id]; });
    batches.push({ ids: batchIds, points: batchPoints });
  }

  for (var bn = 0; bn < batches.length; bn++) {
    var batchItem = batches[bn];
    console.log('\n--- 第 ' + (bn + 1) + '/' + batches.length + ' 批 (' + batchItem.points.length + '个) ---');
    var names = batchItem.points.map(function(p) { return p.point; });
    console.log('知识点:', names.join(', '));

    try {
      var batchResult = await callAPI(batchItem.points);

      // 合并到 results
      var added = 0;
      var resultKeys = Object.keys(batchResult);
      for (var r = 0; r < resultKeys.length; r++) {
        var key = resultKeys[r];
        if (batchResult[key] && Array.isArray(batchResult[key]) && batchResult[key].length > 0) {
          results[key] = batchResult[key];
          added++;
        }
      }

      // 增量保存
      fs.writeFileSync('_detail_results.json', JSON.stringify(results, null, 2), 'utf-8');
      console.log('本批成功:', added, '条，总计:', Object.keys(results).length, '条');
    } catch(e) {
      console.log('本批失败:', e.message);
      // 跳过失败的，继续下一批
    }

    // 批次间等待 3 秒
    if (bn < batches.length - 1) {
      console.log('等待 3 秒...');
      await new Promise(function(r) { setTimeout(r, 3000); });
    }
  }

  console.log('\n=== 生成完毕 ===');
  console.log('_detail_results.json 总计:', Object.keys(results).length, '条');

  // 5. 合并到 index.html
  console.log('\n正在合并到 index.html...');

  // 重新读取 HTML（确保最新）
  html = fs.readFileSync('index.html', 'utf-8');
  dStart = html.indexOf('const DETAIL = {');
  depth = 0; dEnd = -1; found = false;
  for (var i2 = dStart; i2 < html.length; i2++) {
    if (html[i2] === '{') { depth++; found = true; }
    else if (html[i2] === '}') { depth--; }
    if (found && depth === 0) { dEnd = i2 + 1; break; }
  }

  // 重新扫描已有
  var detailContent = html.substring(dStart, dEnd);
  var existingKeys = {};
  var km;
  while ((km = eRe.exec(detailContent)) !== null) {
    existingKeys[km[1]] = true;
  }

  // 构建新条目
  var newEntries = [];
  var rk = Object.keys(results);
  for (var n = 0; n < rk.length; n++) {
    var rkey = rk[n];
    var convertedKey = rkey.replace(/（/g, '(').replace(/）/g, ')');
    if (existingKeys[rkey] || existingKeys[convertedKey]) continue;

    var pointsData = results[rkey];
    if (!Array.isArray(pointsData) || pointsData.length === 0) continue;

    var mid = Math.ceil(pointsData.length / 2);
    var module1 = JSON.stringify(['学什么', pointsData.slice(0, mid)]);
    var module2 = JSON.stringify(['怎么做', pointsData.slice(mid)]);
    var safeKey = convertedKey; // 用半角括号的版本做 key
    var detailEntry = '\n  "' + safeKey + '": { modules: [\n    ' + module1 + ',\n    ' + module2 + '\n  ]},';
    newEntries.push(detailEntry);
  }

  console.log('新增条目:', newEntries.length);

  if (newEntries.length > 0) {
    // 找到最后一个 }; 作为插入点
    var insertPos = html.lastIndexOf('};', dEnd);
    if (insertPos >= dStart && insertPos < dEnd) {
      var newContent = newEntries.join('');
      html = html.substring(0, insertPos) + newContent + '\n' + html.substring(insertPos);
      fs.writeFileSync('index.html', html, 'utf-8');
      console.log('已写入 index.html！');
      console.log('新增后 DETAIL 条目约:', Object.keys(existingKeys).length + newEntries.length);
    } else {
      console.log('找不到插入位置');
    }
  } else {
    console.log('没有新条目可添加（所有已生成的都已在 HTML 中）');
  }
}

main().catch(function(e) {
  console.log('脚本出错:', e.message);
  console.log(e.stack);
});
