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
    preset: string;
}

class OISCConfigEditor extends React.Component<EditorProps, EditorState> {
    constructor(props: any) {
        super(props);
        this.state = {
            code: example_programs.base,
            preset: 'base',
        };
    }

    render() {
        return (
            <Collapsible trigger="Edit Configuration">
                <Editor
                    value={this.state.code}
                    onValueChange={(code) =>
                        this.setState({ code: code, preset: 'custom' })
                    }
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
                <select
                    value={this.state.preset}
                    onChange={(e: any) => {
                        if (e.target.value in example_programs) {
                            this.props.onUpdate(
                                example_programs[e.target.value]
                            );
                            this.setState({
                                code: example_programs[e.target.value],
                            });
                        }
                        this.setState({ preset: e.target.value });
                    }}
                >
                    <option value="custom">-- Select a program --</option>
                    {Object.entries(example_programs).map(([name, _], ix) => (
                        <option value={name} key={ix}>
                            {name}
                        </option>
                    ))}
                </select>
            </Collapsible>
        );
    }
}

class IOStream {
    public get: () => string;
    public set: (s: string) => void;
    public clear: () => void;
    public readonly: boolean;
    public value: string = '';
    public readonly name: string;
    constructor({
        name,
        value = '',
        readonly = false,
    }: {
        name: string;
        value?: string | (() => string);
        readonly?: boolean;
    }) {
        if (typeof value === 'string') {
            this.value = value;
            this.get = () => this.value;
        } else {
            this.get = value;
        }
        this.set = (s: string) => {
            this.value = s;
        };
        this.clear = () => {
            this.set('');
        };
        this.name = name;
        this.readonly = readonly;
    }
}

interface IOBarProps {
    streams: IOStream[];
}

class IOBar extends React.Component<IOBarProps> {
    render() {
        return (
            <div className="IODisplay">
                {this.props.streams.map((stream) => {
                    if (!stream.readonly) {
                        stream.set = (s: string) => {
                            stream.value = s;
                            this.setState({});
                        };
                    }
                    return (
                        <div
                            className={
                                'IOStream ' +
                                (stream.readonly ? 'readonly ' : '') +
                                stream.name
                            }
                            key={stream.name}
                        >
                            <div className={'IOBarLabel ' + stream.name}>
                                {stream.name}
                            </div>
                            <textarea
                                className={
                                    'IOBarInput ' +
                                    (stream.readonly ? 'readonly ' : '') +
                                    stream.name
                                }
                                onChange={(e) => {
                                    stream.set(e.target.value);
                                }}
                                value={stream.get()}
                                readOnly={stream.readonly}
                            ></textarea>
                        </div>
                    );
                })}
            </div>
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
            this.props.machine.memory._cached[this.props.machine.memory[0]]
        ) {
            classNames += ' oisc-cell-source';
        } else if (
            this.props.cell_index ==
            this.props.machine.memory._cached[this.props.machine.memory[0] + 1]
        ) {
            classNames += ' oisc-cell-target';
        } else if (
            this.props.machine.memory._cached[this.props.cell_index] == 0 &&
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
                        value={
                            this.props.machine.memory._cached[
                                this.props.cell_index
                            ] || 0
                        }
                        onChange={(e) => {
                            this.props.machine.memory._cached[
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
}

export class OISCVisualizer extends React.Component<OVProps, OVState> {
    protected timer: NodeJS.Timer | undefined;
    private io: IOStream[] = [
        new IOStream({ name: 'stdin' }),
        new IOStream({ name: 'stdout', readonly: true }),
    ];
    constructor(props: any) {
        super(props);
        this.state = {
            machine: new OISC(this.generateOISCConfig(example_programs.base)),
            config: example_programs.base,
            running: false,
            step_count: 0,
            step_delay_ms: 400,
        };
    }

    generateOISCConfig(config: string): OISCConfig {
        if (!config.match(/.*;\s*$/s)) {
            config = 'return (' + config + ');';
        }
        return Function('This', config)(this);
    }

    configure_run_timer() {
        clearInterval(this.timer);
        this.timer = setInterval(() => {
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
                        this.io.forEach((stream) => {
                            stream.clear();
                        });
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
                <IOBar streams={this.io} />
                <TableView machine={this.state.machine} cell_count={256} />

                <OISCConfigEditor
                    onUpdate={(config: string) => {
                        this.io.forEach((stream) => {
                            stream.clear();
                        });
                        this.setState({
                            config: config,
                            machine: new OISC(this.generateOISCConfig(config)),
                        });
                    }}
                />
            </div>
        );
    }
}
