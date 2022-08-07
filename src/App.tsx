import React from 'react';
import './App.css';
import { OISCVisualizer } from './VisualizerComponents';

class App extends React.Component {
    render() {
        return (
            <div className="App">
                <header className="App-header">
                    <h1 className="App-title">OISC Demo</h1>
                </header>
                <p className="App-intro">
                    This is an interactive demo of a new kind of computer we
                    call the OISC. The OISC is so simple that it has only one
                    instruction: <b>move</b>.
                </p>
                <p className="App-intro">
                    The first cell in the OISC's memory is the instruction
                    pointer. At each step, the machine looks at the cell at the
                    instruction pointer (
                    <b className="oisc-cell-source-pointer">from</b>, shown in
                    red) and the cell after it (
                    <b className="oisc-cell-target-pointer">to</b>, shown in
                    green). Both of these are pointers. The machine then places
                    the value pointed to by the{' '}
                    <b className="oisc-cell-source-pointer">from</b> pointer in
                    the cell pointed to by the{' '}
                    <b className="oisc-cell-target-pointer">to</b> pointer.
                    Finally, the instruction pointer is incremented by 2.
                </p>
                <p className="App-intro">
                    All other functions of the OISC are performed via special
                    memory mapped registers. The memory locations may have read
                    or write triggers. In this implementation, you can explore
                    and edit the javascript code for the memory mapped registers
                    in the configuration section at the bottom of the page.
                </p>
                <OISCVisualizer />
            </div>
        );
    }
}

export default App;
