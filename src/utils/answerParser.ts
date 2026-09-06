export interface ParsedAnswersResult {
  part_1: Record<number, string>;
  part_2: Record<number, Record<string, boolean>>;
  part_3: Record<number, string>;
  summary: {
    p1Count: number;
    p2Count: number;
    p3Count: number;
  };
  errors: string[];
  warnings: string[];
}

function normalizeBool(val: string): boolean | null {
  if (!val) return null;
  const v = val.trim().toLowerCase();
  if (['đ', 'd', 't', 'true', 'đúng', 'dung', '1'].includes(v)) return true;
  if (['s', 'f', 'false', 'sai', '0'].includes(v)) return false;
  return null;
}

function parsePart1(text: string, target: Record<number, string>) {
  const pairRegex = /(?:câu\s*)?(\d+)[\s.:\-_=)]*([ABCDabcd])\b/gi;
  let match;
  let hasPair = false;

  while ((match = pairRegex.exec(text)) !== null) {
    hasPair = true;
    const qNum = parseInt(match[1], 10);
    target[qNum] = match[2].toUpperCase();
  }

  if (!hasPair) {
    const letters = text.trim().split(/[\s,;]+/);
    if (letters.length > 0 && letters.every(l => /^[ABCDabcd]$/.test(l))) {
      let start = Object.keys(target).length + 1;
      letters.forEach((l, i) => { target[start + i] = l.toUpperCase(); });
    }
  }
}

function parsePart2(text: string, target: Record<number, Record<string, boolean>>) {
  const groupRegex = /(?:câu\s*)?(\d+)[\s.:\-_=)]+([ĐDTSFđdtsf][\s\-_/]*[ĐDTSFđdtsf][\s\-_/]*[ĐDTSFđdtsf][\s\-_/]*[ĐDTSFđdtsf])/gi;
  let match;
  let hasGroup = false;

  while ((match = groupRegex.exec(text)) !== null) {
    hasGroup = true;
    const qNum = parseInt(match[1], 10);
    const chars = match[2].replace(/[\s\-_/]+/g, '').toLowerCase().split('');
    if (chars.length >= 4) {
      target[qNum] = {
        a: normalizeBool(chars[0]) ?? true,
        b: normalizeBool(chars[1]) ?? false,
        c: normalizeBool(chars[2]) ?? true,
        d: normalizeBool(chars[3]) ?? false,
      };
    }
  }

  if (!hasGroup) {
    const singleRegex = /(?:câu\s*)?(\d+)?[\s.:\-_]*([abcd])[\s.:\-_=)]+(đúng|dung|sai|true|false|[đdsftFĐDS])/gi;
    while ((match = singleRegex.exec(text)) !== null) {
      const qNum = match[1] ? parseInt(match[1], 10) : (Object.keys(target).length || 1);
      const sub = match[2].toLowerCase();
      const bVal = normalizeBool(match[3]);
      if (bVal !== null) {
        if (!target[qNum]) target[qNum] = {};
        target[qNum][sub] = bVal;
      }
    }
  }
}

function parsePart3(text: string, target: Record<number, string>) {
  const numRegex = /(?:câu\s*)?(\d+)[\s.:\-_=)]+([+-]?[0-9]+(?:[.,][0-9]+)?)/gi;
  let match;

  while ((match = numRegex.exec(text)) !== null) {
    const qNum = parseInt(match[1], 10);
    const val = match[2].replace(',', '.').trim();
    target[qNum] = val;
  }
}

export function parseBatchAnswerText(
  rawText: string,
  expectedCounts?: { p1?: number; p2?: number; p3?: number }
): ParsedAnswersResult {
  const result: ParsedAnswersResult = {
    part_1: {},
    part_2: {},
    part_3: {},
    summary: { p1Count: 0, p2Count: 0, p3Count: 0 },
    errors: [],
    warnings: [],
  };

  if (!rawText || !rawText.trim()) {
    result.errors.push('Vui lòng nhập nội dung đáp án.');
    return result;
  }

  const lines = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  let currentSection: 'part_1' | 'part_2' | 'part_3' | 'auto' = 'auto';

  for (let line of lines) {
    let content = line.trim();
    if (!content) continue;

    if (/^(?:.*?)ph[aầ]n\s*(?:iii|3)[:\s\-_=]*/i.test(content)) {
      currentSection = 'part_3';
      content = content.replace(/^(?:.*?)ph[aầ]n\s*(?:iii|3)[:\s\-_=]*/i, '').trim();
    } else if (/^(?:.*?)ph[aầ]n\s*(?:ii|2)[:\s\-_=]*/i.test(content)) {
      currentSection = 'part_2';
      content = content.replace(/^(?:.*?)ph[aầ]n\s*(?:ii|2)[:\s\-_=]*/i, '').trim();
    } else if (/^(?:.*?)ph[aầ]n\s*(?:i|1)[:\s\-_=]*/i.test(content)) {
      currentSection = 'part_1';
      content = content.replace(/^(?:.*?)ph[aầ]n\s*(?:i|1)[:\s\-_=]*/i, '').trim();
    }

    if (!content) continue;

    if (currentSection === 'part_1') {
      parsePart1(content, result.part_1);
    } else if (currentSection === 'part_2') {
      parsePart2(content, result.part_2);
    } else if (currentSection === 'part_3') {
      parsePart3(content, result.part_3);
    } else {
      if (/(?:câu\s*)?\d+[\s.:\-_=)]+[ĐDTSFđdtsf][\s\-_/]*[ĐDTSFđdtsf][\s\-_/]*[ĐDTSFđdtsf][\s\-_/]*[ĐDTSFđdtsf]/i.test(content)) {
        parsePart2(content, result.part_2);
      } else if (/(?:câu\s*)?\d+[\s.:\-_=)]+[+-]?[0-9]+/i.test(content)) {
        parsePart3(content, result.part_3);
      } else {
        parsePart1(content, result.part_1);
      }
    }
  }

  if (Object.keys(result.part_1).length === 0 && Object.keys(result.part_2).length === 0 && Object.keys(result.part_3).length === 0) {
    const compact = rawText.replace(/\s+/g, '').toUpperCase();
    if (/^[ABCD]+$/.test(compact)) {
      for (let i = 0; i < compact.length; i++) {
        result.part_1[i + 1] = compact[i];
      }
    }
  }

  result.summary.p1Count = Object.keys(result.part_1).length;
  result.summary.p2Count = Object.keys(result.part_2).length;
  result.summary.p3Count = Object.keys(result.part_3).length;

  if (expectedCounts) {
    if (expectedCounts.p1 && result.summary.p1Count < expectedCounts.p1) {
      result.warnings.push(`Phần I mới nhận diện được ${result.summary.p1Count}/${expectedCounts.p1} câu.`);
    }
    if (expectedCounts.p2 && result.summary.p2Count < expectedCounts.p2) {
      result.warnings.push(`Phần II mới nhận diện được ${result.summary.p2Count}/${expectedCounts.p2} câu.`);
    }
    if (expectedCounts.p3 && result.summary.p3Count < expectedCounts.p3) {
      result.warnings.push(`Phần III mới nhận diện được ${result.summary.p3Count}/${expectedCounts.p3} câu.`);
    }
  }

  return result;
}
