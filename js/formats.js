// 本当に開けるファイル（.docx・.xlsx・.pdf）と ZIP を、ライブラリーなしで組み立てる（DOM を使わない）。globalThis.CanaryFormats に置く
// - ZIP: 無圧縮（stored）。CRC-32 は自前。ファイル名は UTF-8（汎用フラグのビット11）。日時は MS-DOS 形式（1980年から・2秒単位・この端末の時刻）
// - Word・Excel: 開くのに要る最小の部品（[Content_Types].xml・_rels・本文・docProps/core.xml）。トークンは本文と dc:identifier に入れる
// - PDF 1.4: 標準14書体の Courier で ASCII だけ。60行ごとにページを分ける。xref の位置はバイト数で計算する。トークンは本文と Subject に入れる
// 出典: PKWARE APPNOTE.TXT（ZIP）、ECMA-376（Office Open XML）、PDF Reference 1.4
(() => {
  'use strict';

  const enc = new TextEncoder();
  const bytesOf = (d) => (typeof d === 'string' ? enc.encode(d) : d);
  const FORMATS = ['text', 'docx', 'xlsx', 'pdf'];
  const EXT_FORMAT = { docx: 'docx', xlsx: 'xlsx', pdf: 'pdf' };

  // ===== CRC-32（ZIP と同じ多項式 0xEDB88320） =====
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(data) {
    let c = 0xffffffff;
    for (const b of bytesOf(data)) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  // ===== ZIP =====
  // この端末の時刻を MS-DOS 形式に（1980〜2107年に収め、秒は2秒単位で切り捨て）
  function dosDateTime(d) {
    const year = Math.min(Math.max(d.getFullYear(), 1980), 2107);
    return {
      time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
      date: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
    };
  }

  const hasControl = (s) => [...s].some((ch) => ch.codePointAt(0) < 32 || ch.codePointAt(0) === 127);

  // ZIP の中のパスとして安全か（/ 区切り、先頭が / でない、空・.・.. の要素がない、制御文字がない）
  function isSafeZipPath(p) {
    const s = String(p);
    return s.length > 0 && s.length <= 400 && !s.startsWith('/') && !s.includes('\\') && !hasControl(s)
      && s.split('/').every((seg) => seg && seg !== '.' && seg !== '..');
  }

  // 置き場所のパスを、ZIP の中のパスにする。/home/a/.ssh/id_rsa → home/a/.ssh/id_rsa、C:\Share\x.xlsx → Share/x.xlsx、
  // \\server\HR\x → server/HR/x。置き場所が空ならファイル名だけ、区切りで終わるならファイル名を足す。.. を含むものは null
  function zipPathFromPlace(place, fileName) {
    const name = String(fileName || 'canary.txt').split(/[\\/]/).pop() || 'canary.txt';
    let p = String(place || '').trim();
    if (!p) return isSafeZipPath(name) ? name : null;
    p = p.replace(/^[A-Za-z]:/, '').replace(/^[\\/]+/, '').split('\\').join('/');
    if (p.endsWith('/') || !p) p += name;
    const segs = p.split('/').filter((seg) => seg !== '');
    const path = segs.join('/');
    return isSafeZipPath(path) ? path : null;
  }

  function u16(v) { return [v & 0xff, (v >>> 8) & 0xff]; }
  function u32(v) { return [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff]; }

  // entries: [{ path, data, date }]（date を省くと引数の date）。同じパスが2つあれば例外
  function zip(entries, date = new Date()) {
    const seen = new Set();
    const local = [];
    const central = [];
    let offset = 0;
    for (const e of entries) {
      if (!isSafeZipPath(e.path) || seen.has(e.path)) throw new Error(`bad zip path: ${e.path}`);
      seen.add(e.path);
      const name = enc.encode(e.path);
      const body = bytesOf(e.data);
      const crc = crc32(body);
      const dt = dosDateTime(e.date || date);
      // バージョン 2.0、ビット11（UTF-8 のファイル名）、無圧縮
      const common = [...u16(20), ...u16(0x0800), ...u16(0), ...u16(dt.time), ...u16(dt.date), ...u32(crc), ...u32(body.length), ...u32(body.length),
        ...u16(name.length), ...u16(0)];
      local.push(Uint8Array.from([...u32(0x04034b50), ...common]), name, body);
      central.push(Uint8Array.from([...u32(0x02014b50), ...u16(20), ...common, ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]), name);
      offset += 30 + name.length + body.length;
    }
    const cenSize = central.reduce((s, a) => s + a.length, 0);
    const end = Uint8Array.from([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(entries.length), ...u16(entries.length),
      ...u32(cenSize), ...u32(offset), ...u16(0)]);
    const parts = [...local, ...central, end];
    const out = new Uint8Array(parts.reduce((s, a) => s + a.length, 0));
    let p = 0;
    for (const a of parts) {
      out.set(a, p);
      p += a.length;
    }
    return out;
  }

  // ===== XML =====
  // XML 1.0 で使えない文字（タブ・改行以外の制御文字・U+FFFE・U+FFFF・対になっていないサロゲート）を除き、5つの記号を逃がす
  function xmlText(s) {
    let out = '';
    for (const ch of String(s ?? '')) {
      const c = ch.codePointAt(0);
      if (c === 9 || c === 10 || c === 13 || (c >= 0x20 && c <= 0xd7ff) || (c >= 0xe000 && c <= 0xfffd) || c >= 0x10000) out += ch;
    }
    return out.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const NS_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';
  const W3CDTF = (d) => d.toISOString().replace(/\.\d{3}Z$/, 'Z');

  function coreProps(meta) {
    return `${XML_HEAD}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" `
      + 'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" '
      + 'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
      + `<dc:title>${xmlText(meta.title)}</dc:title><dc:creator>${xmlText(meta.creator)}</dc:creator>`
      + `<cp:lastModifiedBy>${xmlText(meta.creator)}</cp:lastModifiedBy><dc:identifier>${xmlText(meta.token)}</dc:identifier>`
      + `<dcterms:created xsi:type="dcterms:W3CDTF">${W3CDTF(meta.created)}</dcterms:created>`
      + `<dcterms:modified xsi:type="dcterms:W3CDTF">${W3CDTF(meta.created)}</dcterms:modified></cp:coreProperties>`;
  }

  const rels = (items) => `${XML_HEAD}<Relationships xmlns="${NS_REL}">`
    + items.map(([id, type, target]) => `<Relationship Id="${id}" Type="${type}" Target="${target}"/>`).join('') + '</Relationships>';

  const OFFICE_DOC = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument';
  const CORE_PROPS = 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties';
  const CT_CORE = '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>';
  const contentTypes = (overrides) => `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + `<Default Extension="xml" ContentType="application/xml"/>${overrides}${CT_CORE}</Types>`;

  // ===== Word =====
  function docxParagraph(line) {
    if (!line) return '<w:p/>';
    const runs = line.split('\t').map((part) => (part ? `<w:t xml:space="preserve">${xmlText(part)}</w:t>` : '')).join('<w:tab/>');
    return `<w:p><w:r>${runs}</w:r></w:p>`;
  }

  function docx(lines, meta) {
    const body = lines.map(docxParagraph).join('');
    return zip([
      { path: '[Content_Types].xml',
        data: contentTypes('<Override PartName="/word/document.xml" '
          + 'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>') },
      { path: '_rels/.rels', data: rels([['rId1', OFFICE_DOC, 'word/document.xml'], ['rId2', CORE_PROPS, 'docProps/core.xml']]) },
      { path: 'word/document.xml',
        data: `${XML_HEAD}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>` },
      { path: 'docProps/core.xml', data: coreProps(meta) }
    ], meta.created);
  }

  // ===== Excel =====
  // 1行を1行に。「キー: 値」の行は2列に分ける（コロンのあとに空白があるものだけ。passwd の行は分けない）。値はすべて文字列（数式は書かない）
  function rowsFromLines(lines) {
    return lines.map((line) => {
      const m = /^([^:]{1,60}):\s+(\S.*)$/.exec(line);
      return m ? [m[1], m[2]] : [line];
    });
  }

  function colName(i) {
    let s = '';
    for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
    return s;
  }

  // シート名は31文字まで、[ ] : * ? / \ を使えない
  const sheetName = (s) => (String(s || '').replace(/[[\]:*?/\\]/g, '_').trim().slice(0, 31) || 'Sheet1');

  function xlsx(lines, meta) {
    const rows = rowsFromLines(lines);
    const sheetRows = rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => (v === ''
      ? '' : `<c r="${colName(ci)}${ri + 1}" t="inlineStr"><is><t xml:space="preserve">${xmlText(v)}</t></is></c>`)).join('')}</row>`).join('');
    const sheet = `${XML_HEAD}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`
      + '<cols><col min="1" max="1" width="40" customWidth="1"/><col min="2" max="2" width="60" customWidth="1"/></cols>'
      + `<sheetData>${sheetRows}</sheetData></worksheet>`;
    return zip([
      { path: '[Content_Types].xml',
        data: contentTypes('<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
          + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>') },
      { path: '_rels/.rels', data: rels([['rId1', OFFICE_DOC, 'xl/workbook.xml'], ['rId2', CORE_PROPS, 'docProps/core.xml']]) },
      { path: 'xl/workbook.xml',
        data: `${XML_HEAD}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" `
          + 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
          + `<sheets><sheet name="${xmlText(sheetName(meta.sheet))}" sheetId="1" r:id="rId1"/></sheets></workbook>` },
      { path: 'xl/_rels/workbook.xml.rels',
        data: rels([['rId1', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet', 'worksheets/sheet1.xml']]) },
      { path: 'xl/worksheets/sheet1.xml', data: sheet },
      { path: 'docProps/core.xml', data: coreProps(meta) }
    ], meta.created);
  }

  // ===== PDF =====
  const PDF_WRAP = 85;
  const PDF_PAGE_LINES = 60;
  // ASCII の印字できる文字とタブだけ
  const PDF_OK = /^[\t\x20-\x7e]*$/;

  // 長い行は85文字で折り返す（Courier 10pt で用紙の幅に収まる）
  function wrapLines(lines) {
    const out = [];
    for (const line of lines) {
      const s = line.split('\t').join('    ');
      if (!s) out.push('');
      for (let i = 0; i < s.length; i += PDF_WRAP) out.push(s.slice(i, i + PDF_WRAP));
    }
    return out;
  }

  const pdfString = (s) => `(${String(s).replace(/[\\()]/g, (c) => `\\${c}`)})`;
  const pdfDate = (d) => `D:${d.toISOString().replace(/[-:T]/g, '').slice(0, 14)}Z`;

  // 戻り値: { ok: true, bytes } か { ok: false, error: 'pdf.nonAscii', line }
  function pdf(lines, meta) {
    const bad = lines.findIndex((l) => !PDF_OK.test(l));
    if (bad >= 0) return { ok: false, error: 'pdf.nonAscii', line: bad + 1 };
    for (const v of [meta.title, meta.creator, meta.token]) if (!PDF_OK.test(String(v ?? ''))) return { ok: false, error: 'pdf.nonAscii', line: 0 };
    const wrapped = wrapLines(lines);
    const pages = [];
    for (let i = 0; i < Math.max(wrapped.length, 1); i += PDF_PAGE_LINES) pages.push(wrapped.slice(i, i + PDF_PAGE_LINES));
    // 1 カタログ、2 ページの木、3 書体、4 文書の情報、5 以降は各ページとその中身
    const objs = [];
    const pageIds = pages.map((_, i) => 5 + i * 2);
    objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objs[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;
    objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>';
    const date = pdfDate(meta.created);
    objs[4] = `<< /Title ${pdfString(meta.title)} /Author ${pdfString(meta.creator)} /Subject ${pdfString(meta.token)} `
      + `/CreationDate ${pdfString(date)} /ModDate ${pdfString(date)} >>`;
    pages.forEach((pageLines, i) => {
      const text = pageLines.map((l, j) => `${j === 0 ? '' : '0 -12 Td '}${pdfString(l)} Tj`).join('\n');
      const stream = `BT /F1 10 Tf 40 800 Td\n${text}\nET`;
      objs[pageIds[i]] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> '
        + `/Contents ${pageIds[i] + 1} 0 R >>`;
      objs[pageIds[i] + 1] = `<< /Length ${enc.encode(stream).length} >>\nstream\n${stream}\nendstream`;
    });
    let out = '%PDF-1.4\n';
    const offsets = [];
    for (let id = 1; id < objs.length; id++) {
      offsets[id] = enc.encode(out).length;
      out += `${id} 0 obj\n${objs[id]}\nendobj\n`;
    }
    const xref = enc.encode(out).length;
    out += `xref\n0 ${objs.length}\n0000000000 65535 f \n`;
    for (let id = 1; id < objs.length; id++) out += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
    out += `trailer\n<< /Size ${objs.length} /Root 1 0 R /Info 4 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return { ok: true, bytes: enc.encode(out) };
  }

  // ===== まとめ =====
  // 「自動」は拡張子に合わせる（docx・xlsx・pdf、それ以外はテキスト）
  const formatFor = (choice, ext) => (FORMATS.includes(choice) ? choice : (EXT_FORMAT[ext] || 'text'));

  // text は buildContent が返した本文（末尾の改行つき）。meta = { title, creator, token, created, sheet }
  function build(format, text, meta) {
    const lines = String(text).replace(/\n$/, '').split('\n');
    if (format === 'docx') return { ok: true, bytes: docx(lines, meta) };
    if (format === 'xlsx') return { ok: true, bytes: xlsx(lines, meta) };
    if (format === 'pdf') return pdf(lines, meta);
    return { ok: true, bytes: enc.encode(text) };
  }

  globalThis.CanaryFormats = {
    FORMATS, EXT_FORMAT, PDF_WRAP, PDF_PAGE_LINES,
    crc32, dosDateTime, isSafeZipPath, zipPathFromPlace, zip, xmlText, rowsFromLines, colName, sheetName, wrapLines, formatFor, build
  };
})();
