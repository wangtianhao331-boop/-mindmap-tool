var fs = require('fs');
var html = fs.readFileSync('index.html', 'utf-8');

// === 1. HTML: 改按钮 ===
html = html.replace(
  '<a id="biliBtn" class="btn-bili" target="_blank" style="display:none" title="在 B 站搜索教学视频">📺 视频学习</a>',
  '<button id="aiLearnBtn" class="btn-ai" style="display:none" title="AI 详细讲解这个知识点" onclick="showAIGuide()">🤖 AI 讲解</button>'
);

// === 2. CSS: 按钮样式 ===
html = html.replace(
  '.btn-bili { padding: 6px 14px; font-size: 14px; border: 1px solid #fb7299; background: linear-gradient(135deg, #fff0f4, #ffe0ea); color: #d94a6e; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.2s; white-space: nowrap; text-decoration: none; display: inline-block; margin-left: 6px; }',
  '.btn-ai { padding: 6px 14px; font-size: 14px; border: 1px solid #7c3aed; background: linear-gradient(135deg, #f5f0ff, #ede0ff); color: #6d28d9; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.2s; white-space: nowrap; margin-left: 6px; }'
);
html = html.replace(
  '.btn-bili:hover { background: linear-gradient(135deg, #ffe0ea, #ffcad8); transform: scale(1.03); }',
  '.btn-ai:hover { background: linear-gradient(135deg, #ede0ff, #ddd0ff); transform: scale(1.03); }'
);
html = html.replace(
  'body.dark .btn-bili { background: linear-gradient(135deg, #3d0a16, #5c0e24); border-color: #d94a6e; color: #fca5c4; }',
  'body.dark .btn-ai { background: linear-gradient(135deg, #1a0a3d, #2e105c); border-color: #7c3aed; color: #c4b5fd; }'
);
html = html.replace(
  'body.dark .btn-bili:hover { background: linear-gradient(135deg, #5c0e24, #7c1236); }',
  'body.dark .btn-ai:hover { background: linear-gradient(135deg, #2e105c, #42187c); }'
);

// === 3. JS: 替换按钮引用 ===
html = html.split('biliBtn').join('aiLearnBtn');

// 去掉设置 URL 的代码
html = html.replace(
  "      var query = encodeURIComponent(currentView.detailKey + ' ' + currentView.subject + ' 教学');\n      aiLearnBtn.href = 'https://search.bilibili.com/all?keyword=' + query;\n      aiLearnBtn.style.display = 'inline-block';",
  "      aiLearnBtn.style.display = 'inline-block';"
);

// === 4. 插入 LEARNING 数据结构和 showAIGuide 函数 ===
var insertBefore = "\n// 再来一局\nfunction retryQuiz() {";
var newCode = '\n\n// ===== AI 讲解 =====\nvar LEARNING = {};\n\nfunction showAIGuide() {\n  var key = currentView.detailKey;\n  if (!key) return;\n  var box = document.getElementById(\"mindmapBox\");\n  var legend = document.getElementById(\"legendArea\");\n  legend.style.display = \"none\";\n\n  var guide = LEARNING[key];\n  if (!guide) {\n    box.innerHTML = \'<div class=\"empty-state\"><div class=\"icon\">🤖</div><h3>该知识点的 AI 讲解还在准备中</h3><p>暂时先看看导图里的"学什么"和"怎么做"吧～</p><button class=\"btn-back-detail\" onclick=\"goBackFromGuide()\">← 返回导图</button></div>\';\n    return;\n  }\n\n  var h = \'<div class=\"ai-guide-panel\">\';\n  h += \'<div class=\"ai-guide-title\">🤖 \\'\' + key.replace(/</g,\"&lt;\") + \'\\' 学习指南</div>\';\n\n  if (guide.summary) {\n    h += \'<div class=\"ai-guide-section\"><h3>📖 概述</h3><p>\' + guide.summary + \'</p></div>\';\n  }\n\n  if (guide.steps && guide.steps.length > 0) {\n    h += \'<div class=\"ai-guide-section\"><h3>📝 学习步骤</h3><ol>\';\n    for (var i = 0; i < guide.steps.length; i++) {\n      h += \'<li>\' + guide.steps[i] + \'</li>\';\n    }\n    h += \'</ol></div>\';\n  }\n\n  if (guide.examples && guide.examples.length > 0) {\n    h += \'<div class=\"ai-guide-section\"><h3>💡 例题</h3>\';\n    for (var j = 0; j < guide.examples.length; j++) {\n      h += \'<div class=\"ai-example\">\' + guide.examples[j] + \'</div>\';\n    }\n    h += \'</div>\';\n  }\n\n  if (guide.commonMistakes && guide.commonMistakes.length > 0) {\n    h += \'<div class=\"ai-guide-section\"><h3>⚠️ 常见错误</h3><ul>\';\n    for (var k = 0; k < guide.commonMistakes.length; k++) {\n      h += \'<li>\' + guide.commonMistakes[k] + \'</li>\';\n    }\n    h += \'</ul></div>\';\n  }\n\n  h += \'<button class=\"btn-back-detail\" onclick=\"goBackFromGuide()\" style=\"margin-top:16px\">← 返回导图</button>\';\n  h += \'</div>\';\n  box.innerHTML = h;\n}\n\nfunction goBackFromGuide() {\n  if (currentView.detailKey) {\n    renderDetail(currentView.detailKey);\n  } else {\n    renderMindmap(currentView.grade, currentView.semester);\n  }\n}\n' + insertBefore;

if (html.indexOf(insertBefore) >= 0) {
  html = html.replace(insertBefore, newCode);
  console.log('4. AI guide functions added');
} else {
  console.log('4. FAIL: insert point not found');
  process.exit(1);
}

// === 5. CSS for AI guide ===
html = html.replace(
  '.quiz-panel { max-width: 700px; margin: 0 auto; }',
  '.quiz-panel { max-width: 700px; margin: 0 auto; }\n.ai-guide-panel { max-width: 750px; margin: 0 auto; padding: 20px; }\n.ai-guide-title { font-size: 22px; font-weight: 700; color: #6d28d9; margin-bottom: 20px; }\n.ai-guide-section { margin-bottom: 18px; }\n.ai-guide-section h3 { font-size: 16px; margin-bottom: 8px; color: #333; }\n.ai-guide-section p { line-height: 1.7; color: #444; }\n.ai-guide-section ol, .ai-guide-section ul { padding-left: 20px; }\n.ai-guide-section li { line-height: 1.7; margin-bottom: 4px; color: #444; }\n.ai-example { background: #f5f0ff; border-left: 3px solid #7c3aed; padding: 8px 12px; margin-bottom: 6px; border-radius: 4px; color: #444; }\nbody.dark .ai-guide-title { color: #c4b5fd; }\nbody.dark .ai-guide-section h3 { color: #ccc; }\nbody.dark .ai-guide-section p, body.dark .ai-guide-section li { color: #aaa; }\nbody.dark .ai-example { background: #2a1a3d; border-left-color: #7c3aed; color: #aaa; }'
);

fs.writeFileSync('index.html', html, 'utf-8');
console.log('All changes applied!');
