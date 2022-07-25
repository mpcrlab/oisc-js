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

type LazyMemWriteCallback = (
    memory: LazyListWithTriggers,
    value: number
) => void;
type LazyMemReadCallback = (memory: LazyListWithTriggers) => number;

class LazyListWithTriggers {
    public values: Record<number, number>;
    public symbols: Record<string, number>;
    public read_callbacks: Record<number, LazyMemReadCallback>;
    public write_callbacks: Record<number, LazyMemWriteCallback>;
    public symbols_of_ix: Record<number, string[]>;
    constructor(
        values = {} as Record<number, number>,
        symbols = {} as Record<string, number>,
        read_callbacks = {} as Record<number, LazyMemReadCallback>,
        write_callbacks = {} as Record<number, LazyMemWriteCallback>
    ) {
        this.values = values;
        this.read_callbacks = read_callbacks;
        this.write_callbacks = write_callbacks;
        this.symbols = symbols;
        this.symbols_of_ix = {};
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
                    return llist.read_callbacks[ix](proxy);
                } else if (ix in llist.values) {
                    return llist.values[ix];
                } else if (Number.isInteger(ix) || /^\d+$/.test(ix as string)) {
                    return 0;
                } else if (ix in llist) {
                    return llist[ix];
                } else {
                    throw new ReferenceError(`Unknown symbol: ${String(ix)}`);
                }
            },
            set: (llist: this, ix: string | number | symbol, value, proxy) => {
                ix = ix in llist.symbols ? llist.symbols[ix as string] : ix;
                if (ix in llist.write_callbacks) {
                    llist.write_callbacks[ix].forEach((f) => {
                        f(proxy, value);
                    });
                } else if (Number.isInteger(ix) || /^\d+$/.test(ix as string)) {
                    llist.values[ix] = value;
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

    register_read_callback(ix: string | number, callback: LazyMemReadCallback) {
        ix = ix in this.symbols ? this.symbols[ix] : ix;
        this.read_callbacks[ix] = callback;
    }
    register_write_callbacks(
        ix: string | number,
        callbacks: LazyMemWriteCallback | LazyMemWriteCallback[],
        overwrite: boolean = false
    ) {
        if (typeof callbacks !== 'Array') {
            callbacks = [callbacks];
        }
        ix = ix in this.symbols ? this.symbols[ix] : ix;
        if (ix in this.write_callbacks && !overwrite) {
            this.write_callbacks[ix] = this.write_callbacks[ix].concat(
                callbacks
            );
        } else {
            this.write_callbacks[ix] = callbacks;
        }
    }
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
    value?: number | LazyMemReadCallback;
    values?: number[] | number;
    onread?: LazyMemReadCallback;
    onwrite?: LazyMemWriteCallback | LazyMemWriteCallback[];
}

interface OISCConfig {
    [key: number]: MemCellConfig;
}

export const oisc_default_config: OISCConfig = {
    0: { name: 'ip', value: 16 },
    1: { name: 'A', value: 0 },
    2: { name: 'B', value: 0 },
    3: { name: 'C', value: 0 },
    4: {
        name: 'add',
        onread: (memory) => {
            return memory['A'] + memory['B'];
        },
    },
    5: { name: 'sub', onread: (memory) => memory['A'] - memory['B'] },
    6: { name: 'mul', onread: (memory) => memory['A'] * memory['B'] },
    7: {
        name: 'div',
        onread: (memory) => Math.floor(memory['A'] / memory['B']),
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
    16: { values: [19, 0] },
};

export class OISC {
    public memory: LazyListWithTriggers;
    constructor(oisc_config = oisc_default_config) {
        this.memory = new LazyListWithTriggers();
        Object.entries(oisc_config).forEach(([ix, config]) => {
            this.configure(ix, config);
        });
    }

    register_read_callback(ix, callback) {
        this.memory.register_read_callback(ix, callback);
    }
    register_write_callbacks(ix, callbacks, overwrite = false) {
        this.memory.register_write_callbacks(ix, callbacks, overwrite);
    }
    register_write_callback(ix, callback, overwrite = false) {
        this.memory.register_write_callbacks(ix, callback, overwrite);
    }

    configure(ix, config) {
        if ('name' in config) {
            this.memory.register_symbol(config.name, ix);
        }
        if ('symbol' in config) {
            this.memory.register_symbol(config.symbol, ix);
        }
        if ('symbols' in config) {
            config.symbols.forEach((symbol) => {
                this.memory.register_symbol(symbol, ix);
            });
        }
        if ('onread' in config) {
            this.memory.register_read_callback(ix, config.onread);
        }
        if ('onwrite' in config) {
            this.memory.register_write_callbacks(
                ix,
                config.onwrite,
                true
            );
        }
        if ('value' in config) {
            if (typeof config.value == 'function') {
                this.memory.register_read_callback(ix, config.value);
            } else {
                this.memory[ix] = config.value;
            }
        }
        if ('values' in config) {
            if (typeof config.values !== 'Array') {
                config.values = [config.values];
            }
            for (let i = 0; i < config.values.length; i++) {
                this.memory[Number.parseInt(ix) + i] = config.values[i];
            }
        }
    }

    export_config(include_callbacks = true) {
        let config = {};
        for (let ix in this.memory.values) {
            config[ix] = { value: this.memory[ix] };
            if (ix in this.memory.symbols_of_ix) {
                if (this.memory.symbols_of_ix[ix].length > 1) {
                    config[ix].symbols = this.memory.symbols_of_ix[ix];
                } else {
                    config[ix].symbol = this.memory.symbols_of_ix[ix][0];
                }
            }
            if (ix in this.memory.read_callbacks && include_callbacks) {
                config[ix].onread = this.memory.read_callbacks[ix];
            }
            if (ix in this.memory.write_callbacks && include_callbacks) {
                config[ix].onwrite = this.memory.write_callbacks[ix];
            }
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
            this.memory[this.memory[0]] = this.memory[this.memory[0] + 1];
            this.memory[0] += 2;
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
