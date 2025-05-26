import * as Blockly from "blockly";

Blockly.common.defineBlocksWithJsonArray([
  {
    "type": "tactic_definition",
    "tooltip": "",
    "helpUrl": "",
    "message0": "전술 정의 %1 %2 %3",
    "args0": [
      {
        "type": "field_input",
        "name": "name",
        "text": "전술1"
      },
      {
        "type": "input_dummy",
        "name": "dummy"
      },
      {
        "type": "input_statement",
        "name": "tactic"
      }
    ],
    "colour": 0,
    "inputsInline": true
  },
  {
    "type": "tactic_allocate_asset",
    "tooltip": "",
    "helpUrl": "",
    "message0": "자산 할당 %1 %2 %3 %",
    "args0": [
      {
        "type": "field_input",
        "name": "ticker",
        "text": "SPY"
      },
      {
        "type": "field_number",
        "name": "pct",
        "value": 100
      },
      {
        "type": "input_dummy",
        "name": "NAME"
      }
    ],
    "colour": 0,
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
  },
  {
    "type": "tactic_get_close",
    "tooltip": "",
    "helpUrl": "",
    "message0": "%1 종가 %2",
    "args0": [
      {
        "type": "field_input",
        "name": "ticker",
        "text": "SPY"
      },
      {
        "type": "input_dummy",
        "name": ""
      }
    ],
    "output": "Number",
    "colour": 225
  },
  {
    "type": "tactic_get_delayed",
    "tooltip": "",
    "helpUrl": "",
    "message0": "%1 일전 %2",
    "args0": [
      {
        "type": "field_number",
        "name": "delay",
        "value": 0,
        "min": 0
      },
      {
        "type": "input_value",
        "name": "source"
      }
    ],
    "output": null,
    "colour": 225
  },
  
]);