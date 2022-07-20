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

class LazyListWithTriggers {
    constructor(values = {}, symbols = {}, read_callbacks = {}, write_callbacks = {}) {
        this.values = values;
        this.read_callbacks = read_callbacks;
        this.write_callbacks = write_callbacks;
        this.symbols = symbols;
        return new Proxy(this, {
            get: (llist, ix, proxy) => {
                ix = (ix in llist.symbols) ? llist.symbols[ix] : ix;
                if (ix in llist.read_callbacks) {
                    return llist.read_callbacks[ix](proxy);
                } else if (ix in llist.values) {
                    return llist.values[ix];
                } else if (Number.isInteger(ix) || /^\d+$/.test(ix)) {
                    return 0;
                } else if (ix in llist) {
                    return llist[ix];
                } else {
                    throw new ReferenceError(`Unknown symbol: ${ix}`);
                }
            },
            set: (llist, ix, value, proxy) => {
                ix = (ix in llist.symbols) ? llist.symbols[ix] : ix;
                if (ix in llist.write_callbacks) {
                    llist.write_callbacks[ix].forEach(f => { f(proxy,value); });
                } else if (Number.isInteger(ix) || /^\d+$/.test(ix)) {
                    llist.values[ix] = value;
                } else {
                    throw new ReferenceError(`Unknown symbol: ${ix}`);
                }
            },
            has: (llist, ix) => { 
                return ix in llist || ix in llist.values || ix in llist.read_callbacks || ix in llist.symbols;
            },
        });
    }

    register_read_callback(ix, callback) {
        ix = (ix in this.symbols) ? this.symbols[ix] : ix;
        this.read_callbacks[ix] = callback;
    }
    register_write_callback(ix, callback) {
        ix = (ix in this.symbols) ? this.symbols[ix] : ix;
        if (ix in this.write_callbacks) { 
            this.write_callbacks[ix].push(callback);
        } else {
            this.write_callbacks[ix] = [callback]; 
        }
    }
    register_symbol(name, ix) {
        this.symbols[name] = ix;
    }
} 


function oisc_step(memory) {
    memory[memory.ip] = memory[memory.ip + 1];
    memory.ip += 2;
}

const oisc_default_config = {
    0: { name: "ip", value: 16 },
    1: { name: "A", value: 0 },
    2: { name: "B", value: 0 },
    3: { name: "C", value: 0 },
    4: { name: "add", onread: (memory) => {
        return memory.A + memory.B;
    } },
    5: { name: "sub", onread: (memory) => memory.A - memory.B },
    6: { name: "mul", onread: (memory) => memory.A * memory.B },
    7: { name: "div", onread: (memory) => Math.floor(memory.A / memory.B) },
    8: { name: "gt", onread: (memory) => memory.A > memory.B ? 0 : -1 },
    9: { name: "lt", onread: (memory) => memory.A < memory.B ? 0 : -1 },
    10: { name: "eq", onread: (memory) => memory.A == memory.B ? 0 : -1 },
    11: { name: "input", onread: (memory) => 0 },
    12: { name: "outchar", onwrite: (memory, value) => { console.log(String.fromCharCode(value)); } },
    13: { name: "not", onread: (memory) => memory.C == 0 ? -1 : 0 },
    14: { name: "xor", onread: (memory) => memory.A ^ memory.B },
    15: { name: "ternary", onread: (memory) => memory.C == 0 ? memory.A : memory.B },
    16: { values: [ 19, 0 ] },
}

function load_oisc_from_config(oisc_config) {
    let memory = new LazyListWithTriggers();
    Object.entries(oisc_config).forEach(([ix,config]) => {
        if ("name" in config) {
            memory.register_symbol(config.name, ix);
        }
        if ("onread" in config) {
            memory.register_read_callback(ix, config.onread);
        }
        if ("onwrite" in config) {
            memory.register_write_callback(ix, config.onwrite);
        }
        if ("value" in config) {
            if (typeof(config.value) == "function") {
                memory.register_read_callback(ix, config.value);
            } else {
                memory[ix] = config.value;
            }
        }
        if ("values" in config) {
            for (let i = 0; i < config.values.length; i++) {
                memory[Number.parseInt(ix) + i] = config.values[i];
            }
        }
    });
    return memory;
}