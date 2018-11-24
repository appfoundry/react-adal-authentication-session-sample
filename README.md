# react-adal-authentication-session-sample
A tutorial on how to implement Authentication and Session Management with ADAL in React Single Page Applications.

This branch is the [second part](https://www.appfoundry.be/blog/2018/11/24/session-management-in-react-single-page-applications/) of the tutorial regarding React SPA and Authentication and Session Management. For the first part please check [here](https://www.appfoundry.be/blog/2018/11/24/authentication-with-adal-in-react-single-page-applications/) and the [Authentication-with-ADAL-in-React-SPA](https://github.com/appfoundry/react-adal-authentication-session-sample/tree/Authentication-with-ADAL-in-React-SPA) branch.

# Tutorial

Before we start, I want to let you know that instead of axios we will be using [ApiSauce](https://github.com/infinitered/apisauce). It's not that different than axios since it is, and I quote, “a low-fat wrapper for the amazing axios http client library”. Essentially, it will make things easier and faster to achieve for us. Shout out to [@skellock](https://twitter.com/skellock) for this helpful library!

To make the switch easier I have made an “in between tutorial”-branch called [with-ApiSauce](https://github.com/appfoundry/react-adal-authentication-session-sample/tree/with-ApiSauce). You can use it to see which code of part 1 has been refactored with ApiSauce.

## Part 2

On to part 2: we will add an automatic logout after *30 minutes* (configurable), but we will keep the session valid and postpone the expiry time as long as the user is actively doing network requests in those 30 minutes.

To achieve this we will save an expiry time value in the local- or sessionstorage and with each network request we will check if that time hasn't expired yet, plus we'll add (and reset) a timer function which will effectively log out the user automatically after 30 minutes of inactivity.

I have written a npm package called [Session-Helper](https://www.npmjs.com/package/session-helper) containg a bit of code to help us out with that. I won't go into much detail as I think its readme is self-explanatory enough.


## Initialize Session-Helper

Add a session config file for the session helper:
```js
// src/config/SessionConfig.js
export default {
  uuid: "ENTER UUID HERE", // replace with your own uuid, for example using https://www.uuidgenerator.net
  timeoutInMinutes: 30,
  cacheLocation: 'localStorage',
  debugMode: true // boolean to show or hide console log statements, useful while developing
}
```

We'll create a session service which will initialize the session helper with our session configuration, and export it for usage in our application.

In practice this results in the following file:
```js
// src/services/Session.js
import SessionHelper from 'session-helper'
import SessionConfig from '../config/SessionConfig'

export default new SessionHelper(SessionConfig.uuid,
                                 SessionConfig.cacheLocation,
                                 SessionConfig.timeoutInMinutes,
                                 SessionConfig.debugMode)
```
> Don't worry if `export default new SessionHelper(SessionConfig...)` would initialize a new instance each time you import it -> webpack will build all our javascript code in one single file and imports will reference to single instances respectively.

## Stop automatic login

To achieve full session management, we will first stop the automatic login by [ADAL](https://github.com/AzureAD/azure-activedirectory-library-for-js). Edit the index.js file and add a check if the expiry time in the storage has not yet passed:
```js
// src/index.js
// Extra callback logic to be called only in the actual application, not in iframes in the app
if (window === window.parent && window === window.top && !AuthContext.isCallback(window.location.hash)) {
  if (!SessionHelper.isTokenExpired) { // check if the expiry time in the storage has not yet passed
    ...
  } else { // clear the expiry value from storage, stop the timeout function and logout the user
    SessionHelper.removeExpiry()
    SessionHelper.stopExpiryTimeout()
    AuthContext.logOut()
  }
}
```
> By checking if our expiry value has expired we can logout a previously logged in user, effectively blocking automatic logins. In practice, this happens when a user was logged in before and closed the tab before the automatic logout function was called.

Following on that, if a user is logged in and we are ready to render the authenticated part of our application, set the expiry value in the storage and start the timeout to automatically logout.

You could also do these things later in some componentDidMount function in your app, but then it's possible that it ("it" being the lack of an expiry value in the storage before rendering the application) trips up logic protecting our authenticated backend calls.

If the token is not expired or is null (while it actually should not be null, and expired) at the moment the timeout is triggered, we restart it to try again later (granted, this isn't handled that well but for a first version it'll do and we'll later see why). This can happen when an other tab has reset the expiry, but obviously can't reset the timer in the original tab, causing the original tab to be in a 'limbo' state: its user is logged out but the application is still shown. Restarting and retrying later is our way of making sure all tabs are, eventually, on the “login page” of Microsoft.

```js
// src/index.js
  AuthContext.acquireToken(AdalConfig.endpoints.api, (message, token, msg) => {
        if (token) {
          // Set the expiry time out 30 minutes from now
          SessionHelper.setExpiry()
          // At the initialisation of our app we start a session timeout function, which will be triggered after the amount of minutes set in our adal config.
          // But first we'll provide a callback to execute at the timeout.
          // On the callback we will check the token expiry time and log out the user if necessary.
          SessionHelper.expiryTimeoutCallback = function() {
            if (SessionHelper.isTokenExpiredOrNull) {
              // clear the session helper
              SessionHelper.removeExpiry()
              SessionHelper.stopExpiryTimeout()
              AuthContext.logOut()
            } else {
              SessionHelper.resetExpiryTimeout() // try again later
            }
          }
          // Then we'll start the timer
          SessionHelper.startExpiryTimeout()
          // After we've prepared everything for the session helper we render the authenticated part of our app
          ReactDOM.render(<App />, document.getElementById('root'))
        }
      })
```
> In another step we will also make sure that users can't do any network requests in tabs which are in this 'limbo' situation. (See [Guardians of the limbo](#guardians-of-the-limbo) below)

## I want to live forever

To prolong the session window, the expiry and the timeout should be reset after each network request. We'll add a monitor to the api service which will do exactly this:
```js
// src/services/Api.js
// Add a monitor so that after each call the expiry and the timeout is reset
const timeoutMonitor = (response) => {
  // reset the expiry
  SessionHelper.setExpiry()
  // and reset the timeout function
  SessionHelper.resetExpiryTimeout()
}
instance.addMonitor(timeoutMonitor)
```
> Don't forget to `import SessionHelper from './Session'` at the top of the file.

## Guardians of the limbo

Our final step is to block network requests when the expiry from our storage has passed. (See [Stop automatic login](#stop-automatic-login) above)

We can add this protection by adding a [request transform](https://github.com/infinitered/apisauce#request-transforms), which will double check if the expiry from the session helper has been expired or is null (is null means that a user was already logged out, for example when there were multiple tabs of the SPA opened and one of them triggered the timeout after enough inactivity) in combination with the [CancelToken](https://github.com/axios/axios#cancellation) of axios. This CancelToken gives us the opportunity to block these network requests, just in case.

First, we will set up the *CancelToken*, which we will need to import from axios, in the Api.js file under /services.
```js
// src/services/Api.js
import { CancelToken } from 'axios'
```

Second, we will set it up to use later:
```js
// set up cancel token from axios to be able to cancel network requests
const cancelSource = CancelToken.source() // more info: https://github.com/axios/axios#cancellation
const ApiConfigWithCancelToken = {
  ...ApiConfig,
  cancelToken: cancelSource.token
}

const instance = ApiSauce.create(ApiConfigWithCancelToken)
```

Then we can set up the request transform so that it will perform the check before each network request to the API. If the expiry has passed or is null, we will clean our session helper, logout the user and cancel the request. You would think the user is logged out before a request could be completed by the API, but it's a race condition, so that's why it's important to effectively cancel the request.
```js
// Add check before each request, to see if our session expiry isn't passed and if so, abort the request and log out
instance.addRequestTransform(request => {
  // check if token has expired or is null.
  // If it is null, it means that it has already expired in another tab of the browser and the user has already been logged out.
  if (SessionHelper.isTokenExpiredOrNull) {
    // clear the session helper
    SessionHelper.removeExpiry()
    SessionHelper.stopExpiryTimeout()
    // log out user
    AuthContext.logOut()
    // cancel the request because the logout is in a race with the request being sent out
    cancelSource.cancel()
  }
})
```
And that's it! Your SPA now has
* a session time of 30 minutes
* which can be prolonged as long as the user is active
* with automatic logout and blocking network requests once expired
* and disables automatic login via ADAL!

# Blogpost

A blogpost of this tutorial can be found [here](https://www.appfoundry.be/blog/2018/11/24/session-management-in-react-single-page-applications/).

## License

This project is licensed under the terms of the MIT license. See the [LICENSE](LICENSE) file.
