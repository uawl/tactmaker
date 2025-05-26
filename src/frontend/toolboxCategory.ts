export default {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: '전술',
      colour: '0',
      contents: [
        {
          type: 'tactic_definition',
          kind: 'block'
        },
        {
          type: 'tactic_allocate_asset',
          kind: 'block'
        },
        {
          type: 'tactic_get_close',
          kind: 'block'
        },
        {
          type: 'tactic_get_delayed',
          kind: 'block'
        }
      ]
    },
    {
      kind: 'sep',
    },
    {
      kind: 'category',
      name: '논리',
      categorystyle: 'logic_category',
      contents: [
        {
          type: 'controls_if',
          kind: 'block',
        },
        {
          type: 'logic_compare',
          kind: 'block',
          fields: {
            OP: 'EQ',
          },
        },
        {
          type: 'logic_operation',
          kind: 'block',
          fields: {
            OP: 'AND',
          },
        },
        {
          type: 'logic_negate',
          kind: 'block',
        },
        {
          type: 'logic_boolean',
          kind: 'block',
          fields: {
            BOOL: 'TRUE',
          },
        },
        {
          type: 'logic_null',
          kind: 'block',
          enabled: false,
        },
        {
          type: 'logic_ternary',
          kind: 'block',
        },
      ],
    },
    {
      kind: 'category',
      name: '반복',
      categorystyle: 'loop_category',
      contents: [],
    },
    {
      kind: 'category',
      name: '연산',
      categorystyle: 'math_category',
      contents: [],
    },
    {
      kind: 'category',
      name: '텍스트',
      categorystyle: 'text_category',
      contents: [],
    },
    {
      kind: 'category',
      name: '리스트',
      categorystyle: 'list_category',
      contents: [],
    },
    {
      kind: 'sep',
    },
    {
      kind: 'category',
      name: '변수',
      custom: 'VARIABLE',
      categorystyle: 'variable_category',
    },
    {
      kind: 'category',
      name: '함수',
      custom: 'PROCEDURE',
      categorystyle: 'procedure_category',
    },
  ],
};