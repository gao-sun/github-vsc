import 'regenerator-runtime/runtime';
import React from 'react';
import ReactDOM from 'react-dom';
import PAT from './PAT';

const App = () => {
  return (
    <div>
      <PAT></PAT>
    </div>
  );
};

ReactDOM.render(<App />, document.querySelector('#root'));

export default App;
