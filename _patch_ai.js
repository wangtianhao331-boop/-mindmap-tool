var fs = require('fs');
var html = fs.readFileSync('index.html', 'utf-8');

// === 1. HTML: 改按钮 ===
var oldBtn = '<a id="biliBtn" class="btn-bili" target="_blank" style="display:none" title="在 B 站搜索教学视频">📺 视频学习</a>';
var newBtn = '<button id="aiLearnBtn" class="btn-ai" style="display:none" title="AI 详细讲解这个知识点" onclick="showAIGuide()">🤖 AI 讲解</button>';
if (html.indexOf(oldBtn) >= 0) {
  html = html.replace(oldBtn, newBtn);
  console.log('1. HTML button replaced');
} else {
  console.log('1. FAIL: button not found');
}

// === 2. CSS: 改按钮样式 (B站粉 → AI紫) ===
var oldCss = '.btn-bili { padding: 6px 14px; font-size: 14px; border: 1px solid #fb7299; background: linear-gradient(135deg, #fff0f4, #ffe0ea); color: #d94a6e; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.2s; white-space: nowrap; text-decoration: none; display: inline-block; margin-left: 6px; }';
var newCss = '.btn-ai { padding: 6px 14px; font-size: 14px; border: 1px solid #7c3aed; background: linear-gradient(135deg, #f5f0ff, #ede0ff); color: #6d28d9; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.2s; white-space: nowrap; margin-left: 6px; }';
if (html.indexOf(oldCss) >= 0) {
  html = html.replace(oldCss, newCss);
  console.log('2. Light CSS replaced');
} else {
  console.log('2. FAIL: light CSS not found');
}

var oldCss2 = '.btn-bili:hover { background: linear-gradient(135deg, #ffe0ea, #ffcad8); transform: scale(1.03); }';
var newCss2 = '.btn-ai:hover { background: linear-gradient(135deg, #ede0ff, #ddd0ff); transform: scale(1.03); }';
if (html.indexOf(oldCss2) >= 0) {
  html = html.replace(oldCss2, newCss2);
  console.log('2b. Light hover CSS replaced');
} else {
  console.log('2b. FAIL: light hover CSS not found');
}

var oldDark = 'body.dark .btn-bili { background: linear-gradient(135deg, #3d0a16, #5c0e24); border-color: #d94a6e; color: #fca5c4; }';
var newDark = 'body.dark .btn-ai { background: linear-gradient(135deg, #1a0a3d, #2e105c); border-color: #7c3aed; color: #c4b5fd; }';
if (html.indexOf(oldDark) >= 0) {
  html = html.replace(oldDark, newDark);
  console.log('2c. Dark CSS replaced');
} else {
  console.log('2c. FAIL: dark CSS not found');
}

var oldDark2 = 'body.dark .btn-bili:hover { background: linear-gradient(135deg, #5c0e24, #7c1236); }';
var newDark2 = 'body.dark .btn-ai:hover { background: linear-gradient(135deg, #2e105c, #42187c); }';
if (html.indexOf(oldDark2) >= 0) {
  html = html.replace(oldDark2, newDark2);
  console.log('2d. Dark hover CSS replaced');
} else {
  console.log('2d. FAIL: dark hover CSS not found');
}

// === 3. JS: showBreadcrumb 里改按钮引用 ===
var oldRef = "var biliBtn = document.getElementById('biliBtn');";
var newRef = "var aiLearnBtn = document.getElementById('aiLearnBtn');";
if (html.indexOf(oldRef) >= 0) {
  html = html.replace(oldRef, newRef);
  console.log('3. Button ref replaced');
} else {
  console.log('3. FAIL: button ref not found');
}

// Replace all biliBtn → aiLearnBtn in showBreadcrumb
var oldBiliRefs = 'biliBtn';
var newBiliRefs = 'aiLearnBtn';
var count = (html.match(/biliBtn/g) || []).length;
html = html.split('biliBtn').join('aiLearnBtn');
console.log('3b. Replaced', count, 'biliBtn references');

// Remove the URL setting logic (aiLearnBtn is a button, not a link)
// Old: set href for bili button, now just show/hide
var oldUrlSet = "      var query = encodeURIComponent(currentView.detailKey + ' ' + currentView.subject + ' 教学');\n      aiLearnBtn.href = 'https://search.bilibili.com/all?keyword=' + query;\n      aiLearnBtn.style.display = 'inline-block';";
var newUrlSet = "      aiLearnBtn.style.display = 'inline-block';";
if (html.indexOf(oldUrlSet) >= 0) {
  html = html.replace(oldUrlSet, newUrlSet);
  console.log('3c. URL setting removed');
} else {
  console.log('3c. FAIL: URL setting not found');
  // Try to find
  var idx = html.indexOf('aiLearnBtn.href');
  if (idx >= 0) console.log('Found at:', html.substring(Math.max(0,idx-100), idx+200).replace(/\n/g,'\\n'));
}

// === 4. Add showAIGuide function and LEARNING data placeholder ===
// Find a good insertion point - after gradeQuiz or similar
var insertPoint = "function retryQuiz() {";
var showAIFunc = `
// ===== AI 讲解 =====
var LEARNING = {};

function showAIGuide() {
  var key = currentView.detailKey;
  if (!key) return;
  var box = document.getElementById('mindmapBox');
  var legend = document.getElementById('legendArea');
  legend.style.display = 'none';

  // 检查是否有预生成的学习指南
  var guide = LEARNING[key];
  if (!guide) {
    // 没有预生成内容，现场生成
    box.innerHTML = '<div class="loading">🤖 AI 正在生成「' + key.replace(/</g,'&lt;') + '」的学习指南…</div>';
    generateAIGuide(key);
    return;
  }

  var html = '<div class="ai-guide-panel">';
  html += '<div class="ai-guide-title">🤖 「' + key.replace(/</g,'&lt;') + '」学习指南</div>';

  if (guide.summary) {
    html += '<div class="ai-guide-section"><h3>📖 概述</h3><p>' + guide.summary + '</p></div>';
  }

  if (guide.steps && guide.steps.length > 0) {
    html += '<div class="ai-guide-section"><h3>📝 学习步骤</h3><ol>';
    for (var i = 0; i < guide.steps.length; i++) {
      html += '<li>' + guide.steps[i] + '</li>';
    }
    html += '</ol></div>';
  }

  if (guide.examples && guide.examples.length > 0) {
    html += '<div class="ai-guide-section"><h3>💡 例题</h3>';
    for (var j = 0; j < guide.examples.length; j++) {
      html += '<div class="ai-example">' + guide.examples[j] + '</div>';
    }
    html += '</div>';
  }

  if (guide.commonMistakes && guide.commonMistakes.length > 0) {
    html += '<div class="ai-guide-section"><h3>⚠️ 常见错误</h3><ul>';
    for (var k = 0; k < guide.commonMistakes.length; k++) {
      html += '<li>' + guide.commonMistakes[k] + '</li>';
    }
    html += '</ul></div>';
  }

  html += '<button class="btn-back-detail" onclick="goBackFromGuide()" style="margin-top:16px">← 返回导图</button>';
  html += '</div>';
  box.innerHTML = html;
}

function goBackFromGuide() {
  if (currentView.detailKey) {
    renderDetail(currentView.detailKey);
  } else {
    renderMindmap(currentView.grade, currentView.semester);
  }
}

function generateAIGuide(key) {
  // 用同步方式显示结果（异步调用 API）
  var info = lookupPointInfo(key) || { point: key, module: '未知', subject: currentView.subject || '' };
  var prompt = '请为知识点"${key}"（学科：${info.subject}，模块：${info.module}）写一份学习指南。返回JSON格式：{"summary":"概述50-100字","steps":["步骤1","步骤2",...],"examples":["例题1","例题2",...],"commonMistakes":["错误1","错误2",...]}。每项3-5条。只返回JSON。';

  // 直接使用内嵌的 API Key
  var apiKey = 'sk-e794fda655fb4b84bed114eec97ccc16';
  var xhr = new XMLHttpRequest();
  xhr.open('POST', 'https://api.deepseek.com/v1/chat/completions', true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Authorization', 'Bearer ' + apiKey);
  xhr.onload = function() {
    var box = document.getElementById('mindmapBox');
    try {
      var json = JSON.parse(xhr.responseText);
      var content = json.choices[0].message.content;
      content = content.replace(/^\`\`\`json\\s*/i, '').replace(/\`\`\`\\s*$/i, '').trim();
      var guide = JSON.parse(content);
      LEARNING[key] = guide;
      showAIGuide();
    } catch(e) {
      box.innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><h3>AI 生成失败</h3><p>' + (e.message || String(e)) + '</p><button class="btn-back-detail" onclick="goBackFromGuide()">← 返回导图</button></div>';
    }
  };
  xhr.onerror = function() {
    box.innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><h3>网络错误</h3><p>无法连接 AI 服务，请检查网络</p><button class="btn-back-detail" onclick="goBackFromGuide()">← 返回导图</button></div>';
  };
  xhr.send(JSON.stringify({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: '你是K12教育助手。只输出JSON。' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 4096,
    response_format: { type: 'json_object' }
  }));
}

function retryQuiz() {`;

if (html.indexOf(insertPoint) >= 0) {
  html = html.replace(insertPoint, showAIFunc);
  console.log('4. showAIGuide and LEARNING added');
} else {
  console.log('4. FAIL: insert point not found');

  // Try alternative insert point
  var alt = "// 再来一局\nfunction retryQuiz() {";
  if (html.indexOf(alt) >= 0) {
    html = html.replace(alt, showAIFunc.replace('function retryQuiz() {', ''));
    console.log('4. (alt) Inserted');
  } else {
    console.log('4. (alt) Also failed');
  }
}

// === 5. Add CSS for AI guide panel ===
var cssInsert = '.quiz-panel { max-width: 700px; margin: 0 auto; }';
var aiCss = '.ai-guide-panel { max-width: 750px; margin: 0 auto; padding: 20px; }\n.ai-guide-title { font-size: 22px; font-weight: 700; color: #6d28d9; margin-bottom: 20px; }\n.ai-guide-section { margin-bottom: 18px; }\n.ai-guide-section h3 { font-size: 16px; margin-bottom: 8px; color: #333; }\n.ai-guide-section p { line-height: 1.7; color: #444; }\n.ai-guide-section ol, .ai-guide-section ul { padding-left: 20px; }\n.ai-guide-section li { line-height: 1.7; margin-bottom: 4px; color: #444; }\n.ai-example { background: #f5f0ff; border-left: 3px solid #7c3aed; padding: 8px 12px; margin-bottom: 6px; border-radius: 4px; color: #444; }\nbody.dark .ai-guide-title { color: #c4b5fd; }\nbody.dark .ai-guide-section h3 { color: #ccc; }\nbody.dark .ai-guide-section p, body.dark .ai-guide-section li { color: #aaa; }\nbody.dark .ai-example { background: #2a1a3d; border-left-color: #7c3aed; color: #aaa; }';
if (html.indexOf(cssInsert) >= 0) {
  html = html.replace(cssInsert, cssInsert + '\n' + aiCss);
  console.log('5. AI guide CSS added');
} else {
  console.log('5. FAIL: CSS insert point not found');
}

// Also hide AI button when in quiz mode
// The showBreadcrumb already handles show/hide for the button

fs.writeFileSync('index.html', html, 'utf-8');
console.log('All changes applied!');
