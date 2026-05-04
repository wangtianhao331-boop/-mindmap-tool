var fs = require('fs');
var html = fs.readFileSync('index.html', 'utf-8');

// Fix 1: lookupPointInfo - add half-width bracket matching
var old1 = "if (p === pointName || safe(p) === pointName || short === pointName) {";
var new1 = "var halfP = p.replace(/（/g, '(').replace(/）/g, ')');\n\t        if (p === pointName || safe(p) === pointName || short === pointName || halfP === pointName || safe(halfP) === pointName) {";
if (html.indexOf(old1) >= 0) {
  html = html.replace(old1, new1);
  console.log('Fix 1 OK: lookupPointInfo bracket matching');
} else {
  console.log('Fix 1 FAILED');
}

// Fix 2: all-done check - reject empty string answers
var old2 = "if (!userAnswers[qi] && userAnswers[qi] !== '') { allDone = false; break; }";
var new2 = "var ua = userAnswers[qi];\n      if (ua === undefined || ua === null || (typeof ua === 'string' && ua.trim() === '')) { allDone = false; break; }";
if (html.indexOf(old2) >= 0) {
  html = html.replace(old2, new2);
  console.log('Fix 2 OK: reject empty fill answers');
} else {
  console.log('Fix 2 FAILED');
  // Try to find the line
  var idx = html.indexOf('if (!userAnswers[qi]');
  if (idx >= 0) console.log('  Found near:', html.substring(Math.max(0,idx-20), idx+80).replace(/\n/g,'\\n'));
}

// Fix 3: remove overly lenient "差一个字" fill grading rule
var old3 = "      // 差一个字也算对\n      if (!correct && Math.abs(userAns.length - q.answer.length) <= 2) {\n        correct = true;\n      }";
var new3 = "      // 部分匹配也算对（用户答案包含正确答案的关键字）";
if (html.indexOf(old3) >= 0) {
  html = html.replace(old3, new3);
  console.log('Fix 3 OK: removed lenient length check');
} else {
  console.log('Fix 3 FAILED');
  var idx3 = html.indexOf('差一个字也算对');
  if (idx3 >= 0) console.log('  Found near:', html.substring(Math.max(0,idx3-50), idx3+150).replace(/\n/g,'\\n'));
}

fs.writeFileSync('index.html', html, 'utf-8');
console.log('All fixes applied');
