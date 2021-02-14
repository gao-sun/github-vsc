import 'regenerator-runtime/runtime';
import React from 'react';
import ReactDOM from 'react-dom';

const App = () => {
  return <div>hello, world.</div>;
};

ReactDOM.render(<App />, document.querySelector('#root'));

export default App;
