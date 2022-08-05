export const oiscviz_default_config = `
{
    0: { name: 'IP', value: 16 },
    1: { name: 'A', value: 0 },
    2: { name: 'B', value: 0 },
    3: { name: 'C', value: 0 },
    4: { name: 'add', onread: (memory) => memory['A'] + memory['B'] },
    5: { name: 'sub', onread: (memory) => memory['A'] - memory['B'] },
    6: { name: 'mul', onread: (memory) => memory['A'] * memory['B'] },
    7: {
        name: 'div',
        onread: (memory) => memory['B'] != 0 ? Math.floor(memory['A'] / memory['B']) : 0,
    },
    8: { name: 'gt', onread: (memory) => (memory['A'] > memory['B'] ? 0 : -1) },
    9: { name: 'lt', onread: (memory) => (memory['A'] < memory['B'] ? 0 : -1) },
    10: {
        name: 'eq',
        onread: (memory) => (memory['A'] == memory['B'] ? 0 : -1),
    },
    11: { name: 'in', onread: (memory) => getchar() },
    12: {
        name: 'out',
        onwrite: (memory, value) => {
            putchar(value);
        },
    },
    13: { name: 'not', onread: (memory) => (memory['C'] == 0 ? -1 : 0) },
    14: { name: 'xor', onread: (memory) => memory['A'] ^ memory['B'] },
    15: {
        name: 'ter',
        onread: (memory) => (memory['C'] == 0 ? memory['A'] : memory['B']),
    },
    16: { values: [18, 0] },
}
`;

export const example_programs = {
    'base': oiscviz_default_config,
    'two_plus_two': oiscviz_default_config.slice(0,-2) + `
    // start at address 32
    18: 32,
    // data section
    20: { name: 'op1', value: 2 },
    21: { name: 'op2', value: 2 },
    22: { name: 'res' },
    // code section
    32: [
        20, '@A',
        21, '@B',
        '@add', '@res',
    ],
    // halt instruction
    38: [41,1,41,0],
}`,
    'fibonacci': oiscviz_default_config.slice(0,-2) + `
    // start at address 24
    18: 24,
    // data section
    19: { name: '^1', value: 1 },
    20: { name: 'sp', value: 48 },
    21: { name: 'tmp1', value: 0 },
    22: { name: 'tmp2', value: 1 },
    // code section
    24: [
        '@tmp1', '@A',
        '@tmp2', '@B',
        '@tmp2', '@tmp1',
        '@add', '@tmp2',
        '@sp', 35,
        '@tmp2', -1,
        '@sp', '@A',
        '@^1', '@B',
        '@add', '@sp',
    ],
    // loop instruction
    42: [
        44, 0, 24,
    ],
}`,
}