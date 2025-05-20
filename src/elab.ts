
export type BacktestConfig = {
  startDate: Date,
  endDate: Date,
  initialCapital: number,
  currency: string,
  fee?: {
    type: "ratio" | "per contract" | "fixed"
    value: number
  }
};



export type TactExpr = {
  type: "const"
  name: string
} | {
  
}

export type Tactic = {
  name?: string,
  desc?: string,
  author?: string,
  config: BacktestConfig,
  vars?: Record<string, TactExpr>,
  portfolio: TactExpr
};

export type ExprType = "number" | "boolean"

function elabExprWithType(expr: any, type: ExprType): TactExpr {
  const result: any = {};

  return result as TactExpr;
}

function elabExpr(expr: any): TactExpr {
  const result: any = {};

  return result as TactExpr;
}

function elabVars(expr: any): Record<string, TactExpr> | undefined {
  const result: any = {};
  if (!expr) return;
  if (typeof expr !== "object")
    throw new Error("변수는 객체여야 합니다.");
  for (const [k, v] of Object.entries(expr)) {
    result[k] = elabExpr(v);
  }

  return result;
}

function elabConfig(config: any): BacktestConfig {
  const result: any = {};
  if (!config)
    throw new Error("설정이 필요합니다.")
  result.startDate = new Date(config["시작일"] ?? "1970-01-01");
  result.endDate = new Date(config["종료일"] ?? Date.now());
  result.initialCapital = config["초기자본"] ?? 1000000;
  result.currency = config["통화"] ?? "USD";
  if (config["수수료"]) {
    result.fee = {};
    result.fee.type = config["수수료"]["유형"];
    if (!result.fee.type)
      throw new Error("수수료 유형이 필요합니다.");
    result.fee.value = config["수수료"]["값"];
    if (!result.fee.value) 
      throw new Error("수수료 값이 필요합니다.");
  }

  return result as BacktestConfig;
}

export function elabTactic(tactic: any): Tactic {
  const result: any = {};
  result.name = tactic["이름"] ?? "이름없는 포트폴리오";
  if (typeof result.name !== "string")
    throw new Error("이름이 문자열이어야 합니다.");
  result.desc = tactic["설명"] ?? "";
  if (typeof result.desc !== "string")
    throw new Error("설명이 문자열이어야 합니다.")
  result.author = tactic["작성자"] ?? "익명";
  if (typeof result.author !== "string")
    throw new Error("작성자가 문자열이어야 합니다.");
  result.config = elabConfig(tactic["설정"]);
  result.vars = elabVars(tactic["변수"]);
  result.portfolio = elabExpr(tactic["포트폴리오"]);
  
  return result;
}

