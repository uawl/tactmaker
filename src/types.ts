
export type SourcePos = {
  filename: string,
  line: number,
  row: number
};

export type SourceInfo = {
  begin: SourcePos,
  end: SourcePos
};

export type TactExpr = {
  info: SourceInfo,
  type: "const",
  name: string
} | {
  info: SourceInfo,
  type: "var",
  name: string
} | {
  info: SourceInfo,
  type: "application",
  fn: TactExpr,
  arg: TactExpr
} | {
  info: SourceInfo,
  type: "lambda",
  varName: string,
  body: TactExpr
} | {
  info: SourceInfo,
  type: "literal-number",
  value: number
} | {
  info: SourceInfo,
  type: "literal-string",
  value: string
} | {
  info: SourceInfo,
  type: "literal-boolean",
  value: boolean
} | {
  info: SourceInfo,
  type: "literal-array",
  value: TactExpr[]
} | {
  info: SourceInfo,
  type: "literal-object",
  value: TactLine[]
} | {
  info: SourceInfo,
  type: "literal-null",
  value: null
};

export type TactLine = {
  info: SourceInfo,
  name: string,
  expr: TactExpr
};
