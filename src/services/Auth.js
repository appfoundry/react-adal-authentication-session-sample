// src/services/Auth.js
import AuthenticationContext from 'adal-angular'
import AdalConfig from '../config/AdalConfig'

// We use this to enable logging in the adal library. When you're building for production, you should know that it's best to disable the logging.
window.Logging.log = function(message) {
  console.log(message); // this enables logging to the console
}
window.Logging.level = 2 // 0 = only error, 1 = up to warnings, 2 = up to info, 3 = up to verbose

// Initialize the authentication
export default new AuthenticationContext(AdalConfig)