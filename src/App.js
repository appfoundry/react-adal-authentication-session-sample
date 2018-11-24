import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

import AuthContext from './services/Auth'
import Api from './services/Api'

class App extends Component {
  componentDidMount() {
    // Perform a network request on mount to easily test our setup
    Api.get('/todos')
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={ logo } className="App-logo" alt="logo" />
          <h1 className="App-title">React Adal Authentication Session Sample</h1>
        </header>
        <p className="App-intro">
          You should only be able to view this when you are logged in.
        </p>
        <div>
          <p>
            Open the browser's developer tools and go to the network tab. Then click this button and see that the access token is in the Authorization header of the network request,
            and if the backend accepts it.
          </p>
          <button onClick={ () => Api.get('/todos') }>Test GET data</button>
        </div>
        <div>
          <p>Press this button to logout.</p>
          <button onClick={ () => AuthContext.logOut() }>Logout</button>
        </div>
      </div>
    )
  }
}

export default App;
