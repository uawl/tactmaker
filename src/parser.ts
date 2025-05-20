import type { SourcePos, TactExpr, TactLine } from "./types";

export class TactParser {
  private idx: number = 0;
  private lineNo: number = 1;
  private row: number = 1;

  private stack: { idx: number, lineNo: number, row: number }[] = [];

  constructor(public filename: string, public readonly text: string) {}

  private getSourcePos(): SourcePos {
    return {
      filename: this.filename,
      line: this.lineNo,
      row: this.row,
    }
  }

  private push() {
    this.stack.push({ idx: this.idx, lineNo: this.lineNo, row: this.row });
  }

  private pop() {
    const { idx, lineNo, row } = this.stack.pop()!;
    this.idx = idx;
    this.lineNo = lineNo;
    this.row = row;
  }

  private discard() {
    this.stack.pop();
  }

  private anyOf<T>(...args: (() => T)[]): T {
    let last;
    for (const arg of args) {
      this.push();
      try {
        const res = arg();
        this.discard();
        return res;
      } catch (e) {
        this.pop();
        last = e;
      }
    }
    throw last;
  }

  private manyOf<T>(p: () => T): T[] {
    const res: T[] = [];
    while (true) {
      try {
        this.push();
        res.push(p());
      } catch (e) {
        this.pop();
        break;
      }
      this.discard();
    }
    return res;
  }

  private advance() {
    this.assertNotEof();
    if (this.text[this.idx++] === '\n') {
      this.lineNo++;
      this.row = 1;
    } else {
      this.row++;
    }
  }

  private peekChar() {
    this.assertNotEof();
    return this.text[this.idx]!;
  }

  private getChar() {
    const ch = this.peekChar();
    this.advance();
    return ch;
  }

  private getIdent() {
    const start = this.idx;
    while (this.idx < this.text.length && /[^\]]/.test(this.text[this.idx]!))
      this.advance();
    return this.text.slice(start, this.idx);
  }

  private assertNotEof() {
    if (this.idx >= this.text.length)
      throw new Error(`Unexpected EoF at ${this.filename}:${this.lineNo}:${this.row}`);
  }

  private pchar(c: string) {
    const char = this.getChar();
    if (char !== c)
      throw new Error(`Unexpected character '${char}' expected '${c}' at ${this.filename}:${this.lineNo}:${this.row}`);
    return c;
  }

  private satisfy(pred: (c: string) => boolean) {
    const char = this.getChar();
    if (!pred(char))
      throw new Error(`Unexpected character '${char}' at ${this.filename}:${this.lineNo}:${this.row}`);
    return char;
  }

  private pstring(str: string) {
    for (const c of str)
      this.pchar(c);
    return str;
  }

  private skipWs() {
    this.manyOf(() => this.satisfy(ch => /\s/.test(ch)));
    if (this.peekChar() === "#") {
      this.manyOf(() => this.satisfy(ch => ch !== '\n'));
      this.skipWs();
    }
  }

  private ws() {
    this.satisfy(ch => /\s/.test(ch));
    this.skipWs();
  }

  private number() {
    let str = "";
    str += this.satisfy(ch => /[0-9]/.test(ch));
    this.manyOf(() => str += this.satisfy(ch => /[0-9]/.test(ch)));
    this.push();
    if (this.peekChar() === ".") {
      str += this.pchar('.');
      if (!/[0-9]/.test(this.peekChar())) {
        this.pop();
        return parseFloat(str);
      }
      this.manyOf(() => str += this.satisfy(ch => /[0-9]/.test(ch)));
    }
    return parseFloat(str);
  }

  private parseObject(): TactExpr {
    console.log('try parse object');
    this.skipWs();
    const begin = this.getSourcePos();
    this.pchar('{');
    this.skipWs();
    const lines = this.manyOf(() => this.parseLine());
    this.skipWs();
    this.pchar('}');
    const end = this.getSourcePos();

    return {
      info: { begin, end },
      type: "literal-object",
      value: lines
    }
  }

  private parseNullLiteral(): TactExpr {
    console.log('try parse null literal');
    this.skipWs();
    const begin = this.getSourcePos();
    this.pstring("없음");
    const end = this.getSourcePos();

    console.log("parsed null literal", "at", `${this.filename}:${begin.line}:${begin.row}`);
    return {
      info: { begin, end },
      type: "literal-null",
      value: null
    };
  }
  
  private parseNumberLiteral(): TactExpr {
    console.log('try parse number literal');
    this.skipWs();
    const begin = this.getSourcePos();
    const num = this.number();
    const end = this.getSourcePos();

    console.log("parsed number literal:", num, "at", `${this.filename}:${begin.line}:${begin.row}`);
    return {
      info: { begin, end },
      type: "literal-number",
      value: num
    };
  }

  private parseStringLiteral(): TactExpr {
    console.log('try parse string literal', );
    this.skipWs();
    const begin = this.getSourcePos();
    this.pchar('"');
    let str = "";
    while (this.peekChar() !== '"')
      str += this.getChar();
    this.pchar('"');
    const end = this.getSourcePos();

    console.log("parsed string literal:", `'${str}'`, "at", `${this.filename}:${begin.line}:${begin.row}`);
    return {
      info: { begin, end },
      type: "literal-string",
      value: this.text
    };
  }

  private parseExpr(): TactExpr {
    return this.anyOf(
      () => this.parseObject(),
      () => this.parseNumberLiteral(),
      () => this.parseStringLiteral(),
      () => this.parseNullLiteral(),
    );
  }
  
  private parseLine(): TactLine {
    this.skipWs();
    const begin = this.getSourcePos();
    this.pchar('[');
    const name = this.getIdent();
    this.pchar(']');
    console.log("parsing", name);
    this.satisfy(ch => ["은", "는"].includes(ch));
    this.ws();
    const expr = this.parseExpr();
    this.skipWs();
    this.pchar('.');
    const end = this.getSourcePos();

    console.log("parsed line:", name, "at", `${this.filename}:${begin.line}:${begin.row}`);
    return { info: { begin, end }, name, expr };
  }

  public parse(): TactLine[] {
    const one = this.parseLine();
    return [one, ...this.manyOf(() => this.parseLine())];
  }

};

