import { Database } from "bun:sqlite";
import yahooFinance from "yahoo-finance2";

const db = new Database("cache.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS daily_adj_close (
    ticker TEXT NOT NULL,
    date INTEGER NOT NULL,
    adjclose REAL NOT NULL,
    PRIMARY KEY (ticker, date)
  )
`);

const checkDataExists = db.query(`
  SELECT *
  FROM daily_adj_close
  WHERE ticker = $ticker;
`);

const insertData = db.query(`
  INSERT INTO daily_adj_close (ticker, date, adjclose)
  VALUES ($ticker, $date, $adjclose)
  ON CONFLICT(ticker, date) DO UPDATE SET adjclose = EXCLUDED.adjclose;
`);

const getDbData = db.query(`
  SELECT ticker, date, adjclose
  FROM daily_adj_close
  WHERE ticker = $ticker
  ORDER BY date ASC;
`);

function forEachBlocks(block: any, fn: (block: any) => void) {
  let stack = [block];
  while (stack.length !== 0) {
    const top = stack.pop();
    fn(top);
    switch (top.type) {
    case "logic_compare":
    case "logic_operation":
      if (top.inputs.A?.block)
        stack.push(top.inputs.A.block);
      if (top.inputs.B?.block)
        stack.push(top.inputs.B.block);
      break;
    case "logic_negate":
      if (top.inputs.BOOL?.block)
        stack.push(top.inputs.input_value.block);
      break;
    case "logic_ternary":
      if (top.inputs.IF?.block)
        stack.push(top.inputs.IF.block);
      if (top.inputs.THEN?.block)
        stack.push(top.inputs.THEN.block);
      if (top.inputs.ELSE?.block)
        stack.push(top.inputs.ELSE.block);
      break;
    case "controls_if":
      for (const input of Object.values<any>(top.inputs)) {
        if (input.block)
          stack.push(input.block);
      }
      break;
    case "logic_boolean":
    case "logic_null":
      break;
    default:
      if (top.next?.block)
        stack.push(top.next.block);
    }
  }
}

async function cacheData(ticker: string, to: Date) {
  const cache = checkDataExists.get({ $ticker: ticker }) as { latestDate: number | null } | null;
  if (cache?.latestDate) {
    const first = cache.latestDate;
  }
  const result = await yahooFinance.chart(ticker, {
    period1: new Date(cache?.latestDate ?? 0),
    period2: to
  });

  db.transaction(() => {
    for (const { date, adjclose } of result.quotes) {
      insertData.run({ $ticker: ticker, $date: date.getTime(), $adjclose: adjclose! });
    }
  })();
}

export function getCommonTickerData(tickers: string[]): { date: number, [ticker: string]: number }[] {
  if (tickers.length === 0) {
    return [];
  }

  const tickerPlaceholders = tickers.map((_, i) => `$t${i}`).join(', ');

  const bindParams: { [key: string]: string | number } = {};
  tickers.forEach((ticker, i) => {
      bindParams[`$t${i}`] = ticker;
  });
  bindParams['$numTickers'] = tickers.length;

  const sqlQuery = `
      SELECT
          T.ticker,
          T.date,
          T.adjclose
      FROM
          daily_adj_close AS T
      JOIN (
          SELECT
              date
          FROM
              daily_adj_close
          WHERE
              ticker IN (${tickerPlaceholders})
          GROUP BY
              date
          HAVING
              COUNT(DISTINCT ticker) = $numTickers
      ) AS CommonDates
      ON T.date = CommonDates.date
      WHERE
          T.ticker IN (${tickerPlaceholders})
      ORDER BY
          T.date ASC, T.ticker ASC;
  `;

  const rows = db.query(sqlQuery).all(bindParams) as { ticker: string, date: number, adjclose: number }[];

  const result: { date: number, [ticker: string]: number }[] = [];
  let cur: { date: number, [ticker: string]: number} | null = null;
  for (const row of rows) {
    if (cur && row.date !== cur.date) {
      result.push(cur);
      cur = null;
    }
    if (cur) {
      cur[row.ticker] = row.adjclose;
    } else {
      cur = { date: row.date, [row.ticker]: row.adjclose };
    }
  }
  if (cur) result.push(cur);
  return result;
}


async function getRequiredData(blocks: any[]) {
  let assets = new Set<string>();
  blocks.forEach(block => {
    forEachBlocks(block, cur => {
      if (cur.type === "tactic_allocate_asset") {
        assets.add(cur.fields.ticker);
      }
    });
  })

  const to = new Date(Date.now());
  await Promise.all(assets.values().map(async asset =>
    cacheData(asset, to)
  ));

  if (assets.size === 0) {
    console.warn("No assets found");
  }

  return getCommonTickerData(assets.values().toArray());
}

type BacktestContext = {
  readonly initialAsset: number,
  curAsset: number,
  curCash: number,
  allocation: Map<string, number>,
  variables: any[]
};

function evalExpr(
  ctx: BacktestContext,
  data: { date: number, [ticker: string]: number }[],
  dataIdx: number,
  block: any,
  delay: number = 0,
): any {
  if (!block) return null;
  switch (block.type) {
  case "tactic_get_close":
    const ticker = block.fields.ticker;
    const dataRow = data[dataIdx-delay];
    return dataRow ? dataRow[ticker] : null;
  case "tactic_get_delayed":
    const delayv = block.fields.delay;
    return evalExpr(ctx, data, dataIdx, block.inputs.source?.block, delay+delayv);
  case "logic_boolean":
    return block.fields.BOOL === "TRUE";
  case "logic_compare":
    const OP = block.fields.OP;
    const A = evalExpr(ctx, data, dataIdx, block.inputs.A?.block, delay);
    const B = evalExpr(ctx, data, dataIdx, block.inputs.B?.block, delay);
    switch (OP) {
    case "EQ":
      return A === B;
    case "NEQ":
      return A !== B;
    case "LT":
      return A < B;
    case "LTE":
      return A <= B;
    case "GT":
      return A > B;
    case "GTE":
      return A >= B;
    }
    return null;
  case "logic_null":
    return null;
  default:
    throw new Error(`Unsupported block type '${block.type}' at '${new Date(data[dataIdx]!.date).toLocaleDateString()}`);
  }
}

function backtestStep(
  ctx: BacktestContext,
  data: { date: number, [ticker: string]: number }[],
  dataIdx: number,
  block: any
) {
  let queue = [block];
  while (queue.length !== 0) {
    const block = queue.shift();
    switch (block.type) {
    case "tactic_allocate_asset":
      const { ticker, pct } = block.fields;
      ctx.allocation.set(ticker, ctx.curAsset * pct / 100);
      if (block.next?.block)
        queue.push(block.next.block);
      break;
    case "controls_if":
      for (const [key, input] of Object.entries<any>(block.inputs)) {
        if (key.startsWith("IF")) {
          const cond = evalExpr(ctx, data, dataIdx, input.block);
          if (cond) {
            const next = block.inputs[key.replace("IF", "DO")]!.block;
            if (next) queue.push(next);
            break;
          }
        } else if (key.startsWith("ELSE")) {
          if (input.block) queue.push(input.block);
        }
      }
      if (block.next?.input.block)
        queue.push(block.next.input.block);
      break;
    default:
      console.log(block);
      throw new Error(`Unsupported block type '${block.type}' at '${new Date(data[dataIdx]!.date).toLocaleDateString()}'`);
    }
  }
}

export default async function backtest(ws: Bun.ServerWebSocket<any>, data: any) {
  const names = [];
  const blocks = [];
  const ctxs: BacktestContext[] = [];
  for (const tactic of data) {
    names.push(tactic.fields.name);
    const next = tactic.inputs?.tactic.block;
    if (next) blocks.push(next);
    ctxs.push({
      initialAsset: 10000,
      curAsset: 0,
      curCash: 10000,
      allocation: new Map(),
      variables: []
    });
  }
  
  try {
    const reqData = await getRequiredData(blocks);

    for (let rowNo = 0; rowNo < reqData.length; ++rowNo) {
      for (let i = 0; i < ctxs.length; ++i) {
        const ctx = ctxs[i]!;

        let nav = 0;
        ctx.allocation.forEach((v, k) => {
          nav += v * reqData[rowNo]![k]! / reqData[rowNo-1]![k]!;
        });
        ctx.curAsset = nav + ctx.curCash;
        ctx.allocation.clear();
        ws.send(JSON.stringify({
          name: names[i],
          date: reqData[rowNo]!.date,
          nav: ctx.curAsset
        }));

        backtestStep(ctx, reqData, rowNo, data[i].inputs?.tactic.block);
        
        ctx.curCash = ctx.curAsset;
        ctx.allocation.forEach(v => {
          ctx.curCash -= v;
        });
        ctx.curCash = Math.max(0, ctx.curCash);
      }
    }
  } catch (e) {
    console.error(e);
    ws.send(`${e}`);
  }
}

