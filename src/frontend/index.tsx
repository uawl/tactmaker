import { signal, useSignal, useSignalEffect } from "@preact/signals"
import { useRef } from "preact/hooks";
import * as Blockly from "blockly";
import * as Ko from "blockly/msg/ko";
import toolboxCategory from "./toolboxCategory";
import "./blockDefinition";
import HighCharts, { type SeriesOptionsType } from "highcharts/highstock";


const ws = signal<WebSocket | null>(null);
let data: Record<string, [string, number][]> = {};

export function App () {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const workspace = useSignal<Blockly.WorkspaceSvg | null>(null);
  const lastUpdate = useSignal(Date.now());
  
  useSignalEffect(() => {
    Blockly.setLocale(Ko as any);
    workspace.value = Blockly.inject(ref.current!, {
      trashcan: true,
      toolbox: toolboxCategory,
      grid: {
        spacing: 20,
        length: 3,
        colour: "#ccc",
        snap: true
      }
    });
  });

  const backtest = () => {
    if (!workspace.value) return;
    if (ws.value) {
      ws.value.close();
      ws.value = null;
    }
    data = {};
    lastUpdate.value = Date.now();
    const req = JSON.stringify(
      workspace.value.getBlocksByType('tactic_definition')
      .map(block => Blockly.serialization.blocks.save(block))
    );
    ws.value = new WebSocket("/ws");
    ws.value.onopen = () => {
      ws.value!.send(req);
    };
    ws.value.onmessage = (ev) => {
      const res = JSON.parse(ev.data);
      data[res.name] ??= [];
      data[res.name]!.push([new Date(res.date).toISOString(), res.nav]);
      const now = Date.now();
      if (now - lastUpdate.value > 16) {
        lastUpdate.value = now;
      }
    };
    ws.value.onclose = (ev) => {
      lastUpdate.value = Date.now();
    };
  };

  useSignalEffect(() => {
    lastUpdate.value;
    HighCharts.stockChart(chartRef.current!, {
      title: {
        text: undefined
      },
      series: Object.entries(data).map(([k, v]): SeriesOptionsType => {
        return {
          type: "line",
          name: k,
          data: v,
          animation: false
        };
      }),
      xAxis: {
        type: "datetime"
      },
      yAxis: {
        type: "linear",
        title: {
          text: "NAV"
        }
      }
    });
  })

  return <div
    style={{
      height: "100%",
      overflowY: "auto"
    }}
  >
    <div ref={ref} style={{ width: "100%", height: "80dvh" }} />
    <div style={{ height: "100dvh" }}>
      <button onClick={() => {backtest()}}>백테스트</button>
      <div ref={chartRef}></div>
    </div>
  </div>
}
