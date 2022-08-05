import React from 'react';
import './App.css';
import './oisc';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/themes/prism-solarizedlight.css';
import Collapsible from 'react-collapsible';

import { OISC, OISCConfig } from './oisc';

const oiscviz_default_config = `
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

interface EditorProps {
    default_config: string;
    onUpdate: (config: string) => void;
}

interface EditorState {
    code: string;
}

class OISCConfigEditor extends React.Component<EditorProps, EditorState> {
    constructor(props: any) {
        super(props);
        this.state = {
            code: props.default_config,
        };
    }

    render() {
        return (
            <Collapsible trigger="Edit Configuration">
                <Editor
                    value={this.state.code}
                    onValueChange={(code) => this.setState({ code: code })}
                    highlight={(code) =>
                        Prism.highlight(
                            code,
                            Prism.languages.javascript,
                            'javascript'
                        )
                    }
                />
                <button onClick={() => this.props.onUpdate(this.state.code)}>
                    Update
                </button>
                <button
                    onClick={() => {
                        this.setState({ code: oiscviz_default_config });
                        this.props.onUpdate(oiscviz_default_config);
                    }}
                >
                    Reset
                </button>
            </Collapsible>
        );
    }
}

interface CellProps {
    machine: OISC;
    onReloadRequest: () => void;
    cell_index: number;
}
class OISCCell extends React.Component<CellProps> {
    render() {
        let classNames = '';
        if (this.props.cell_index == this.props.machine.memory[0]) {
            classNames += ' oisc-cell-source-pointer';
        } else if (this.props.cell_index == this.props.machine.memory[0] + 1) {
            classNames += ' oisc-cell-target-pointer';
        } else if (
            this.props.cell_index ==
            this.props.machine.memory[this.props.machine.memory[0]]
        ) {
            classNames += ' oisc-cell-source';
        } else if (
            this.props.cell_index ==
            this.props.machine.memory[this.props.machine.memory[0] + 1]
        ) {
            classNames += ' oisc-cell-target';
        } else if (
            this.props.machine.memory[this.props.cell_index] == 0 &&
            this.props.machine.memory.symbols_of_ix[this.props.cell_index] ==
                null
        ) {
            classNames += ' oisc-cell-empty';
        }
        return (
            <div className={'oisc-cell' + classNames}>
                <div className="oisc-cell-label">
                    <div className="oisc-label-symbol">
                        {
                            this.props.machine.memory.symbols_of_ix[
                                this.props.cell_index
                            ]
                        }
                    </div>
                    <div className="oisc-label-index">
                        ({this.props.cell_index})
                    </div>
                </div>
                <div className="oisc-cell-value">
                    <input
                        className={'oisc-value-input' + classNames}
                        type="number"
                        value={this.props.machine.memory[
                            this.props.cell_index
                        ].toString()}
                        onChange={(e) => {
                            this.props.machine.memory[
                                this.props.cell_index
                            ] = parseInt(e.target.value) || 0;
                            this.props.onReloadRequest();
                        }}
                        contentEditable={
                            this.props.machine.memory.read_callbacks[
                                this.props.cell_index
                            ] == null
                        }
                    />
                </div>
            </div>
        );
    }
}

interface TableViewProps {
    machine: OISC;
    rows: number;
    cols: number;
}

class TableView extends React.Component<TableViewProps> {
    render() {
        return (
            <table className="OISCMemory">
                <tbody className="OISCMemory-body">
                    {Array.from({ length: this.props.rows }).map(
                        (_, row_index) => (
                            <tr className="OISCMemory-row" key={row_index}>
                                {Array.from({ length: this.props.cols }).map(
                                    (_, col_index) => (
                                        <td
                                            key={
                                                row_index * this.props.cols +
                                                col_index
                                            }
                                        >
                                            <OISCCell
                                                machine={this.props.machine}
                                                cell_index={
                                                    row_index *
                                                        this.props.cols +
                                                    col_index
                                                }
                                                onReloadRequest={() => {
                                                    this.setState({});
                                                }}
                                            />
                                        </td>
                                    )
                                )}
                            </tr>
                        )
                    )}
                </tbody>
            </table>
        );
    }
}

interface OVProps {}

interface OVState {
    machine: OISC;
    config: string;
    running: boolean;
    step_count: number;
    step_delay_ms: number;
    stdin: string;
    stdout: string;
}

export class OISCVisualizer extends React.Component<OVProps, OVState> {
    constructor(props: any) {
        super(props);
        this.state = {
            machine: new OISC(this.generateOISCConfig(oiscviz_default_config)),
            config: oiscviz_default_config,
            running: false,
            step_count: 0,
            step_delay_ms: 400,
            stdin: '',
            stdout: '',
        };
    }

    putchar(ch: number) {
        this.setState({ stdout: this.state.stdout + String.fromCharCode(ch) });
    }

    getchar(): number {
        //let inputChar = this.state.stdin.charCodeAt(0);
        //this.setState({ stdin: this.state.stdin.substring(1) });
        //return inputChar;
        return 0;
    }

    generateOISCConfig(config: string): OISCConfig {
        return Function(
            'putchar',
            'getchar',
            'return (' + config + ');'
        )(this.putchar, this.getchar);
    }

    renderControls(): React.ReactNode {
        return (
            <div className="OISCControls">
                <button
                    className="OISCControls-button"
                    onClick={() => {
                        this.setState({ running: !this.state.running });
                    }}
                    disabled={this.state.machine.isDone()}
                >
                    {this.state.running ? 'Stop' : 'Run'}
                </button>
                <button
                    className="OISCControls-button"
                    onClick={() => {
                        this.state.machine.step();
                        this.setState({});
                    }}
                    disabled={this.state.machine.isDone()}
                >
                    Step
                </button>
                <button
                    className="OISCControls-button"
                    onClick={() => {
                        this.setState({
                            machine: new OISC(
                                this.generateOISCConfig(this.state.config)
                            ),
                        });
                    }}
                >
                    Reload
                </button>
                <input
                    type="range"
                    min="0"
                    max="2000"
                    value={this.state.step_delay_ms}
                    onChange={(e: any) => {
                        this.setState({
                            step_delay_ms: parseInt(e.target.value),
                        });
                    }}
                />
            </div>
        );
    }

    render(): React.ReactNode {
        return (
            <div className="OISCVisualizer">
                {this.renderControls()}

                <TableView machine={this.state.machine} rows={16} cols={16} />

                <OISCConfigEditor
                    default_config={oiscviz_default_config}
                    onUpdate={(config: string) =>
                        this.setState({
                            config: config,
                            machine: new OISC(this.generateOISCConfig(config)),
                        })
                    }
                />
            </div>
        );
    }
}
