import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

import AdalConfig from './config/AdalConfig'
import AuthContext from './services/Auth'
import SessionHelper from './services/Session'

// Handle possible callbacks on id_token or access_token
AuthContext.handleWindowCallback()

// Extra callback logic, only in the actual application, not in iframes in the app
if ((window === window.parent) && window === window.top && !AuthContext.isCallback(window.location.hash)) {
  if (!SessionHelper.isTokenExpired) { // check if the expiry time in the storage has not yet passed
    // Having both of these checks is to prevent having a token in localstorage, but no user.
    if (!AuthContext.getCachedToken(AdalConfig.clientId) || !AuthContext.getCachedUser()) {
      AuthContext.login()
      // or render something that everyone can see
      // ReactDOM.render(<PublicPartOfApp />, document.getElementById('root'))
    } else {
      AuthContext.acquireToken(AdalConfig.endpoints.api, (message, token, msg) => {
        if (token) {
          ReactDOM.render(<App />, document.getElementById('root'))
        }
      })
    }
  } else { // clear the expiry value from storage, stop the timeout function and logout the user
    SessionHelper.removeExpiry()
    SessionHelper.stopExpiryTimeout()
    AuthContext.logOut()
  }
}
