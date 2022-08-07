// Implementation of the MPCR OISC Architecture
// Repository: https://github.com/mpcr/oisc-web
// ----------------------------------------------------------------------------
//  (C) Copyright 2022, Misha Klopukh
//
//  This program is free software: you can redistribute it and/or modify
//  it under the terms of the GNU General Public License as published by
//  the Free Software Foundation, either version 3 of the License, or
//  (at your option) any later version.
//
//  This program is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU General Public License for more details.
//
//  You should have received a copy of the GNU General Public License
//  along with this program.  If not, see <https://www.gnu.org/licenses/>
// ----------------------------------------------------------------------------
// Language: typescript
// Path: src/oisc.ts

/**
 * MPCR OISC (oisc.ts)
 * @fileoverview This file contains the implementation of the MPCR OISC Architecture.
 * @author Misha Klopukh
 * @license GPL-3.0-or-later
 */


type LazyMemWriteCallback = (
    memory: LazyListWithTriggers,
    value: number
) => void;
type LazyMemReadCallback = (memory: LazyListWithTriggers) => number;

class LazyListWithTriggers {
    [key: number | string]: number;
    // @ts-ignore
    public values: Record<number, number>;
    // @ts-ignore
    public symbols: Record<string, number>;
    // @ts-ignore
    public read_callbacks: Record<number, LazyMemReadCallback>;
    // @ts-ignore
    public write_callbacks: Record<number, LazyMemWriteCallback[]>;
    // @ts-ignore
    public symbols_of_ix: Record<number, string[]>;
    // @ts-ignore
    public _cached: Record<number, number>;
    constructor(
        values = {} as Record<number, number>,
        symbols = {} as Record<string, number>,
        read_callbacks = {} as Record<number, LazyMemReadCallback>,
        write_callbacks = {} as Record<number, LazyMemWriteCallback[]>
    ) {
        this.values = values;
        this.read_callbacks = read_callbacks;
        this.write_callbacks = write_callbacks;
        this.symbols = symbols;
        this.symbols_of_ix = {};
        this._cached = values;
        for (let [name, ix] of Object.entries(symbols)) {
            if (ix in this.symbols_of_ix) {
                this.symbols_of_ix[ix].push(name);
            } else {
                this.symbols_of_ix[ix] = [name];
            }
        }
        return new Proxy(this, {
            get: (llist: this, ix: string | number | symbol, proxy) => {
                ix = ix in llist.symbols ? llist.symbols[ix as string] : ix;
                if (ix in llist.read_callbacks) {
                    llist._cached[ix as number] = llist.read_callbacks[
                        ix as number
                    ](proxy);
                    return llist._cached[ix as number];
                } else if (ix in llist.values) {
                    return llist.values[ix as number];
                } else if (Number.isInteger(ix) || /^\d+$/.test(ix as string)) {
                    return 0;
                } else if (ix in llist) {
                    return llist[ix as string];
                } else {
                    throw new ReferenceError(`Unknown symbol: ${String(ix)}`);
                }
            },
            set: (llist: this, ix: string | number | symbol, value, proxy) => {
                ix = ix in llist.symbols ? llist.symbols[ix as string] : ix;
                if (Number.isInteger(ix) || /^\d+$/.test(ix as string)) {
                    llist._cached[ix as number] = value;
                    llist.values[ix as number] = value;
                    if (ix in llist.write_callbacks) {
                        llist.write_callbacks[ix as number].forEach((f) => {
                            f(proxy, value);
                        });
                    }
                } else {
                    throw new ReferenceError(`Unknown symbol: ${String(ix)}`);
                }
                return true;
            },
            has: (llist: this, ix: string | number | symbol) => {
                return (
                    ix in llist ||
                    ix in llist.values ||
                    ix in llist.read_callbacks ||
                    ix in llist.symbols
                );
            },
        });
    }

    // @ts-ignore
    register_read_callback(ix: string | number, callback: LazyMemReadCallback) {
        ix = ix in this.symbols ? this.symbols[ix] : ix;
        this.read_callbacks[ix as number] = callback;
    }
    // @ts-ignore
    register_write_callbacks(
        ix: string | number,
        callbacks: LazyMemWriteCallback | LazyMemWriteCallback[],
        overwrite: boolean = false
    ) {
        // @ts-ignore
        callbacks = (typeof callbacks !== 'Array'
            ? [callbacks]
            : callbacks) as LazyMemWriteCallback[];
        ix = ix in this.symbols ? this.symbols[ix] : ix;
        if (ix in this.write_callbacks && !overwrite) {
            callbacks.push(...this.write_callbacks[ix as number]);
        }
        this.write_callbacks[
            ix as number
        ] = callbacks as LazyMemWriteCallback[];
    }
    // @ts-ignore
    register_symbol(name: string, ix: number) {
        this.symbols[name] = ix;
        if (ix in this.symbols_of_ix) {
            this.symbols_of_ix[ix].push(name);
        } else {
            this.symbols_of_ix[ix] = [name];
        }
    }
}

interface MemCellConfig {
    name?: string;
    symbol?: string;
    symbols?: string[] | string;
    value?: number | string | LazyMemReadCallback;
    values?:
        | (number | string)[]
        | number
        | ((ix: number) => (number | string)[] | number);
    onread?: LazyMemReadCallback;
    onwrite?: LazyMemWriteCallback | LazyMemWriteCallback[];
}

export type OISCConfig = Record<number, MemCellConfig | number | number[]>;

export const oisc_default_config: OISCConfig = {
    0: { name: 'ip', value: 16 },
    1: { name: 'A', value: 0 },
    2: { name: 'B', value: 0 },
    3: { name: 'C', value: 0 },
    4: {
        name: 'add',
        onread: (memory) => {
            return (memory['A'] as number) + (memory['B'] as number);
        },
    },
    5: { name: 'sub', onread: (memory) => memory['A'] - memory['B'] },
    6: { name: 'mul', onread: (memory) => memory['A'] * memory['B'] },
    7: {
        name: 'div',
        onread: (memory) =>
            memory['B'] != 0 ? Math.floor(memory['A'] / memory['B']) : 0,
    },
    8: { name: 'gt', onread: (memory) => (memory['A'] > memory['B'] ? 0 : -1) },
    9: { name: 'lt', onread: (memory) => (memory['A'] < memory['B'] ? 0 : -1) },
    10: {
        name: 'eq',
        onread: (memory) => (memory['A'] == memory['B'] ? 0 : -1),
    },
    11: { name: 'input', onread: (memory) => 0 },
    12: {
        name: 'outchar',
        onwrite: (memory, value) => {
            console.log(String.fromCharCode(value));
        },
    },
    13: { name: 'not', onread: (memory) => (memory['C'] == 0 ? -1 : 0) },
    14: { name: 'xor', onread: (memory) => memory['A'] ^ memory['B'] },
    15: {
        name: 'ternary',
        onread: (memory) => (memory['C'] == 0 ? memory['A'] : memory['B']),
    },
    16: { values: [18, 0] },
};

export class OISC {
    public memory: LazyListWithTriggers;
    constructor(oisc_config: OISCConfig = oisc_default_config) {
        this.memory = new LazyListWithTriggers();
        for (let ix in oisc_config) {
            // @ts-ignore
            this.configure(ix, oisc_config[ix]);
        }
    }

    register_read_callback(ix: string | number, callback: LazyMemReadCallback) {
        this.memory.register_read_callback(ix, callback);
    }
    register_write_callbacks(
        ix: string | number,
        callbacks: LazyMemWriteCallback | LazyMemWriteCallback[],
        overwrite: boolean = false
    ) {
        this.memory.register_write_callbacks(ix, callbacks, overwrite);
    }
    register_write_callback(
        ix: string | number,
        callback: LazyMemWriteCallback,
        overwrite: boolean = false
    ) {
        this.memory.register_write_callbacks(ix, callback, overwrite);
    }

    configure(
        ix: number,
        config:
            | MemCellConfig
            | number
            | number[]
            | ((ix: number) => (number | string)[] | number)
    ): void {
        if (
            typeof config === 'number' ||
            typeof config === 'function' ||
            Array.isArray(config)
        ) {
            config = { values: config };
        }
        if (typeof config.name === 'string') {
            this.memory.register_symbol(config.name, ix);
        }
        if (typeof config.symbol === 'string') {
            this.memory.register_symbol(config.symbol, ix);
        }
        if (Array.isArray(config.symbols)) {
            config.symbols.forEach((symbol: string) => {
                this.memory.register_symbol(symbol, ix);
            });
        }
        if (config.onread !== undefined) {
            this.memory.register_read_callback(ix, config.onread);
        }
        if (config.onwrite !== undefined) {
            this.memory.register_write_callbacks(ix, config.onwrite, true);
        }
        if (typeof config.value == 'function') {
            this.memory.register_read_callback(ix, config.value);
        } else if (typeof config.value === 'number') {
            this.memory[ix] = config.value;
        } else if (typeof config.value === 'string') {
            if (/^\d+$/.test(config.value)) {
                this.memory[ix] = parseInt(config.value);
            } else if (config.value.length === 1) {
                this.memory[ix] = config.value.charCodeAt(0);
            } else if (
                config.value.startsWith('@') &&
                config.value.slice(1) in this.memory.symbols
            ) {
                this.memory[ix] = this.memory.symbols[config.value.slice(1)];
            } else {
                throw new Error('String must be a single character');
            }
        }

        if (config.values !== undefined) {
            if (typeof ix === 'string') {
                ix = parseInt(ix);
            }
            if (typeof config.values === 'function') {
                config.values = config.values(ix);
            }
            if (!Array.isArray(config.values)) {
                config.values = [config.values];
            }

            config.values.forEach((value: number | string, i: number) => {
                if (typeof value === 'number') {
                    this.memory[ix + i] = value;
                } else if (typeof value === 'string') {
                    if (/^\d+$/.test(value)) {
                        this.memory[ix] = parseInt(value);
                    } else if (value.length == 1) {
                        this.memory[ix + i] = value.charCodeAt(0);
                    } else if (value.startsWith('^') && value.length == 2) {
                        this.memory[ix + i] = this.memory.symbols[
                            value.charCodeAt(1)
                        ];
                    } else if (
                        value.startsWith('@') &&
                        value.slice(1) in this.memory.symbols
                    ) {
                        this.memory[ix + i] = this.memory.symbols[
                            value.slice(1)
                        ];
                    } else {
                        throw new Error('String must be a single character');
                    }
                }
            });
        }
    }

    export_config(include_callbacks = true) {
        let config = {} as OISCConfig;
        for (let ix in this.memory.values) {
            let cell_config: MemCellConfig = { value: this.memory[ix] };
            if (ix in this.memory.symbols_of_ix) {
                if (this.memory.symbols_of_ix[ix].length > 1) {
                    cell_config.symbols = this.memory.symbols_of_ix[ix];
                } else {
                    cell_config.symbol = this.memory.symbols_of_ix[ix][0];
                }
            }
            if (ix in this.memory.write_callbacks && include_callbacks) {
                cell_config.onwrite = this.memory.write_callbacks[ix];
            }
            config[ix] = cell_config;
        }
        for (let ix in this.memory.read_callbacks) {
            let cell_config: MemCellConfig = {
                onread: this.memory.read_callbacks[ix],
            };
            if (ix in this.memory.symbols_of_ix) {
                if (this.memory.symbols_of_ix[ix].length > 1) {
                    cell_config.symbols = this.memory.symbols_of_ix[ix];
                } else {
                    cell_config.symbol = this.memory.symbols_of_ix[ix][0];
                }
            }
            if (ix in this.memory.write_callbacks && include_callbacks) {
                cell_config.onwrite = this.memory.write_callbacks[ix];
            }
            config[ix] = cell_config;
        }
        return config;
    }

    isDone() {
        return this.memory[0] == 0;
    }

    step() {
        if (this.isDone()) {
            throw new Error('Program has ended');
        } else {
            this.memory[0] += 2;
            this.memory[this.memory[this.memory[0] - 1]] = this.memory[
                this.memory[this.memory[0] - 2]
            ];
        }
    }

    run(max_steps = Infinity) {
        let step_count = 0;
        while (!this.isDone()) {
            this.step();
            if (step_count++ > max_steps) {
                return false;
            }
        }
        return step_count;
    }
}
