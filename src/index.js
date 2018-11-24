import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

import AdalConfig from './config/AdalConfig'
import AuthContext from './services/Auth'

// Handle possible callbacks on id_token or access_token
AuthContext.handleWindowCallback()

ReactDOM.render(<App />, document.getElementById('root'));
