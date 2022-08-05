import React from 'react';
import './App.css';
import './oisc';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/themes/prism-solarizedlight.css';
import Collapsible from 'react-collapsible';
import { example_programs } from './example_programs';

import { OISC, OISCConfig } from './oisc';

interface EditorProps {
    onUpdate: (config: string) => void;
}

interface EditorState {
    code: string;
}

class OISCConfigEditor extends React.Component<EditorProps, EditorState> {
    constructor(props: any) {
        super(props);
        this.state = {
            code: example_programs.base,
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
                <select onChange={(e: any) => {
                    console.log(e.target.value);
                    if (e.target.value !== '-- Select a program --') {
                        this.props.onUpdate(e.target.value);
                        this.setState({ code: e.target.value });
                    }
                }}> 
      <option value="-- Select a program --"> -- Select a program -- </option>
      {Object.entries(example_programs).map(([name, code], ix) => <option value={code} key={ix}>{name}</option>)}
    </select>
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
                            this.props.machine.memory[this.props.cell_index] =
                                parseInt(e.target.value) || 0;
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
    cell_count: number;
}

class TableView extends React.Component<TableViewProps> {
    render() {
        return (
            <div className="OISCMemory">
                {Array.from({ length: this.props.cell_count }).map((_, ix) => (
                    <OISCCell
                        key={ix}
                        machine={this.props.machine}
                        cell_index={ix}
                        onReloadRequest={() => {
                            this.setState({});
                        }}
                    />
                ))}
            </div>
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
    protected timer: NodeJS.Timer | undefined;
    constructor(props: any) {
        super(props);
        this.state = {
            machine: new OISC(this.generateOISCConfig(example_programs.base)),
            config: example_programs.base,
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

    configure_run_timer() {
        console.log('configure_run_timer');
        clearInterval(this.timer);
        this.timer = setInterval(() => {
            console.log('step');
            try {
                this.state.machine.step();
                this.setState({ step_count: this.state.step_count + 1 });
            } catch (e) {
                clearInterval(this.timer);
                this.setState({ running: false });
            }
        }, this.state.step_delay_ms);
    }

    renderControls(): React.ReactNode {
        return (
            <div className="OISCControls">
                <button
                    className="OISCControls-button"
                    onClick={() => {
                        this.setState({ running: !this.state.running });
                        if (!this.state.running) {
                            this.setState({ running: true });
                            this.configure_run_timer();
                        } else {
                            clearInterval(this.timer);
                            this.setState({ running: false });
                        }
                    }}
                    disabled={this.state.machine.isDone()}
                >
                    {this.state.running ? 'Stop' : 'Run'}
                </button>
                <button
                    className="OISCControls-button"
                    onClick={() => {
                        this.state.machine.step();
                        this.setState({
                            step_count: this.state.step_count + 1,
                        });
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
                            step_count: 0,
                            running: false,
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
                        if (this.state.running) {
                            this.configure_run_timer();
                        }
                    }}
                />
            </div>
        );
    }

    render(): React.ReactNode {
        return (
            <div className="OISCVisualizer">
                {this.renderControls()}

                <TableView machine={this.state.machine} cell_count={256} />

                <OISCConfigEditor
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
