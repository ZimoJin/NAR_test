# MW System Quick Reference Card

## 快速导入

```javascript
import { 
  showMWWarnings,           // 显示警告队列
  validateSequenceInput,    // 序列验证
  validateParameterRange,   // 参数验证
  validatePerformance       // 性能验证
} from './bio_visuals_v1.0.1.js';
```

---

## 基本用法 (3 步)

### 1️⃣ 构建警告

```javascript
function buildWarnings(inputs, params) {
  const warnings = [];
  
  // 序列验证
  warnings.push(...validateSequenceInput(inputs.sequences, 'Sequence'));
  
  // 参数验证
  warnings.push(...validateParameterRange(params));
  
  // 自定义警告
  if (inputs.someCondition) {
    warnings.push({
      id: 'MODULE-MW-01',
      message: "Warning message\n\nClick OK to proceed."
    });
  }
  
  return warnings;
}
```

### 2️⃣ 显示警告

```javascript
const container = document.getElementById('module-content') || document.body;
const warnings = buildWarnings(inputs, params);

if (warnings.length > 0) {
  showMWWarnings(
    container,
    warnings,
    () => runMainLogic(),  // 确认后执行
    () => {}               // 取消
  );
} else {
  runMainLogic();
}
```

### 3️⃣ 提取主逻辑

```javascript
function runMainLogic() {
  // 原有的执行代码
}
```

---

## 常用验证函数

### 序列验证

```javascript
validateSequenceInput(
  [{label: 'Primer1', seq: 'ATGC'}, ...],
  'Primer'  // 类型描述
)
// 返回: MW-04, MW-05, MW-06
```

### 参数验证

```javascript
validateParameterRange({
  Na: 50,        // mM
  Mg: 2.0,       // mM
  conc: 500,     // nM
  targetTm: 55   // °C
})
// 返回: MW-10 ~ MW-15
```

### 性能验证

```javascript
validatePerformance(
  100,    // 项目数
  15000   // 总 bp
)
// 返回: MW-09, MW-19
```

---

## 警告 ID 快查表

### 通用警告

| ID | 描述 | 触发条件 |
|----|------|----------|
| MW-04 | 序列为空 | 标准化后长度为 0 |
| MW-05 | 非法字符 | 包含非 IUPAC 字符 |
| MW-06 | 简并碱基 | 包含 R/Y/S/W/K/M/B/D/H/V/N |
| MW-09 | 项目过多 | > 500 项 |
| MW-10 | Na⁺ 超范围 | < 10 或 > 200 mM |
| MW-11 | Mg²⁺ 超范围 | < 0.5 或 > 5 mM |
| MW-12 | 引物浓度超范围 | < 25 或 > 1000 nM |
| MW-13 | Tm 超范围 | < 45 或 > 75°C |
| MW-19 | 序列过大 | > 1 MB（约 1,000,000 bp/字符） |

### 模块特定警告

**Gibson**: `Gibson-MW-00` ~ `Gibson-MW-06`  
**Golden Gate**: `GG-MW-00` ~ `GG-MW-05`  
**Multiplex PCR**: `MPX-MW-00` ~ `MPX-MW-03`  
**Mutagenesis**: `MUT-MW-00` ~ `MUT-MW-03`  
**OE-PCR**: `OE-MW-00` ~ `OE-MW-03`  
**RE Cloning**: `RE-MW-00` ~ `RE-MW-04`  
**USER Cloning**: `USER-MW-00` ~ `USER-MW-03`

---

## 自定义警告模板

```javascript
warnings.push({
  id: 'MODULE-MW-XX',
  message:
    "Warning: [简短描述问题]\n" +
    "[详细说明和建议]\n" +
    "[影响说明]\n\n" +
    "Click Cancel to [调整建议] or OK to proceed."
});
```

---

## 完整示例

```javascript
// 导入
import { showMWWarnings, validateSequenceInput, validateParameterRange } from './bio_visuals_v1.0.1.js';

// 按钮事件
document.getElementById('run-btn').addEventListener('click', () => {
  // 收集输入
  const vectorSeq = cleanSeq(document.getElementById('vector-seq').value);
  const params = {
    Na: parseFloat(document.getElementById('na-conc').value),
    Mg: parseFloat(document.getElementById('mg-conc').value),
    conc: parseFloat(document.getElementById('primer-conc').value),
    targetTm: parseFloat(document.getElementById('target-tm').value)
  };
  
  // 构建警告
  const warnings = [];
  warnings.push(...validateSequenceInput([{label: 'Vector', seq: vectorSeq}], 'Vector'));
  warnings.push(...validateParameterRange(params));
  
  // 显示警告
  const container = document.getElementById('module-content') || document.body;
  if (warnings.length > 0) {
    showMWWarnings(container, warnings, () => runDesign(vectorSeq, params), () => {});
  } else {
    runDesign(vectorSeq, params);
  }
});

// 主逻辑
function runDesign(vectorSeq, params) {
  console.log('Running design...');
  // 原有代码
}
```

---

## 调试技巧

### 查看所有警告

```javascript
const warnings = buildWarnings(inputs, params);
console.log('Warnings:', warnings);
```

### 跳过警告 (测试用)

```javascript
// 直接执行,跳过警告
runMainLogic();
```

### 测试单个警告

```javascript
showMWWarnings(
  container,
  [{id: 'TEST', message: 'Test warning'}],
  () => console.log('Confirmed'),
  () => console.log('Cancelled')
);
```

---

## 常见问题

**Q: 如何禁用某个警告?**  
A: 在 `buildWarnings()` 中注释掉对应代码

**Q: 如何修改警告消息?**  
A: 直接修改 `message` 字段

**Q: 如何添加新警告?**  
A: 在 `buildWarnings()` 中 `warnings.push({...})`

**Q: 如何支持中英文?**  
A: 创建语言映射对象,根据 `lang` 变量选择

---

## 文档链接

- 📘 [完整集成指南](./MW_INTEGRATION_GUIDE.md)
- 📋 [实施计划](./implementation_plan.md)
- 📝 [Walkthrough](./walkthrough.md)

---

**版本**: 1.0.0  
**更新日期**: 2025-12-13
