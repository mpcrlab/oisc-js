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
                    call the OISC. The code can be deployed as a web page, or
                    oisc.js can be used as a standalone library implementation
                    of the 5vm OISC.
                </p>
                <OISCVisualizer />
            </div>
        );
    }
}

export default App;
