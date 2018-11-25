# react-adal-authentication-session-sample
A tutorial on how to implement Authentication with ADAL in React Single Page Applications.

# Tutorial

This branch is the [first part](https://www.appfoundry.be/blog/2018/11/24/authentication-with-adal-in-react-single-page-applications/) of two parts in the tutorial regarding React SPA and Authentication and Session Management. For the second part please check [here](https://www.appfoundry.be/blog/2018/11/24/session-management-in-react-single-page-applications/) and the [Session-Management-with-ADAL-in-React-SPA](https://github.com/appfoundry/react-adal-authentication-session-sample/tree/Session-Management-with-ADAL-in-React-SPA) branch.

## First steps

1. Initialize a React app, we used [create-react-app](https://facebook.github.io/create-react-app/docs/getting-started) in this sample to reduce setup and in this case to be able to test implementations faster.
2. Add the following plugins:
  * [adal-angular](https://github.com/AzureAD/azure-activedirectory-library-for-js) (at the time of writing this tutorial the version was v1.0.17)
  * [axios](https://github.com/axios/axios) (at the time of writing this tutorial the version was v0.18.0)
  * Optional: [apisauce](https://github.com/infinitered/apisauce) (at the time of writing this tutorial the version was v1.0.0) (also contains the *axios* package so there’s no need to install *axios* separately if you install and use *Apisauce*)
3. Set up an AD in Azure with a **user or two to test with**
4. Set up the necessary application project(s) in Azure, of which we will use the **tenant ID**, the **application ID** of the **client web app**, and the **application ID** of the **API app**.
5. Set up a **config file** in your React application where we can place our Azure IDs and other configuration parameters.
```js
// src/config/AdalConfig.js
export default {
  clientId: 'ENTER THE APPLICATION ID OF THE REGISTERED WEB APP ON AZURE',
  endpoints: {
    api: "ENTER THE APPLICATION ID OF THE REGISTERED API APP ON AZURE" // Necessary for CORS requests, for more info see https://github.com/AzureAD/azure-activedirectory-library-for-js/wiki/CORS-usage
  },
  // 'tenant' is the Azure AD instance.
  tenant: 'ENTER YOUR TENANT ID',
  // 'cacheLocation' is set to 'sessionStorage' by default (see https://github.com/AzureAD/azure-activedirectory-library-for-js/wiki/Config-authentication-context#configurable-options).
  // We change it to'localStorage' because 'sessionStorage' does not work when our app is served on 'localhost' in development.
  cacheLocation: 'localStorage'
}
```
> TIP: Use custom environment variables here! See [Create React App's guide](https://facebook.github.io/create-react-app/docs/adding-custom-environment-variables) for more information.

## Initialize Adal Instance
Next up, we will initialize the adal instance with the config we just defined.

First, some necessary imports:
```js
// src/services/Auth.js
import AuthenticationContext from 'adal-angular'
import AdalConfig from '../config/AdalConfig'
```

Second, we add some code so that the adal library can log to console.
```js
// We use this to enable logging in the adal library. When you're building for production, you should know that it's best to disable the logging.
window.Logging.log = function(message) {
  console.log(message); // this enables logging to the console
}
window.Logging.level = 2 // 0 = only error, 1 = up to warnings, 2 = up to info, 3 = up to verbose
```

Then, we initialize the adal instance by combining the *AuthenticationContext* class, exported from the adal library, with the *AdalConfig* we defined in the previous step.
```js
// Initialize the authentication
export default new AuthenticationContext(AdalConfig)
```

> Don't worry if `export default new AuthenticationContext(AdalConfig)` would initialize a new instance each time you import it -> webpack will build all our javascript code in one file and imports will reference to single instances respectively.

## Initialize axios instance

To make sure our network requests use the correct base url of the API, we create a config file with a certain *baseURL* parameter which we'll later use to initialize an axios instance.
```js
// src/config/ApiConfig.js
export default {
  baseURL: "ENTER BASE URL OF API HERE" // something like "http://my-host-name.xyz/api"
}
```

Next, use the *ApiConfig* to initialize an axios instance like so:
```js
// src/services/Api.js
import axios from 'axios'

import ApiConfig from '../config/ApiConfig'

const instance = axios.create(ApiConfig)

export default instance
```

Finally, we will import the axios instance, in whichever components we need it, to make api calls, for example in the *componentDidMount* section of the 'App' component:
```js
// src/App.js
import Api from './services/Api'

class App extends Component {
  componentDidMount() {
    // Perform a network request on mount to easily test our setup
    Api.get('/todos')
  }
```

## Render the React Application or redirect to login

After we’ve initialized everything we need, we can start coding the logic to successfully render the React application or to redirect the user to Microsoft’s login page.

In index.js, import the AuthContext from our authentication service and the *AdalConfig* to be able to use the IDs.
```js
// src/index.js
import AdalConfig from './config/AdalConfig'
import AuthContext from './services/Auth'
```

Add the following code to let the **adal library handle any possible callbacks** after logging in or (re-)acquiring tokens:
```js
// Handle possible callbacks on id_token or access_token
AuthContext.handleWindowCallback()
```

Then we'll add some extra logic that we will only run when we are on the **parent window** and not in an iframe. If we were to allow it to run in iframes, which are used by adal to acquire tokens, then we would be stuck with multiple instances of our React app and we don’t want that.

If we have **no logged in user** then we will **redirect the user to Microsoft's login page**. If we have a **logged in user** then we will **acquire an access token for our API** to see that everything works, **and** we will **render our React application**.

This results in the following code:

```js
// Extra callback logic, only in the actual application, not in iframes in the app
if ((window === window.parent) && window === window.top && !AuthContext.isCallback(window.location.hash)) {
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
}
```
> As you can see in the comments in the code, you can also choose to show a public page even when there is no logged in user. Instead of calling *AuthContext.login()* you can also render another React instance, for example a public landing page which has a specific button to be able to login later on...

## Add interceptor to network requests

To make sure our network requests to the backend API remain authenticated, we will add some logic to our axios instance.

We will call adal’s *acquireToken* function each time a network request is made. Adal will return the valid access token or it will asynchronously fetch a new one if it is invalid. Once the token is available we will add it to the *Authorization* header of the network request.

First, don't forget the necessary imports:
```js
// src/services/Api.js
import AdalConfig from '../config/AdalConfig'
import AuthContext from './Auth'
```

Then we can place the re-acquiring of tokens in a request [interceptor](https://github.com/axios/axios#interceptors) of the axios instance like so:
```js
// src/services/Api.js
// Add a request interceptor
instance.interceptors.request.use((config) => {
  // Check and acquire a token before the request is sent
  return new Promise((resolve, reject) => {
    AuthContext.acquireToken(AdalConfig.endpoints.api, (message, token, msg) => {
      if (!!token) {
        config.headers.Authorization = `Bearer ${token}`
        resolve(config)
      } else {
        // Do something with error of acquiring the token
        reject(config)
      }
    })
  })
}, function(error) {
  // Do something with error of the request
  return Promise.reject(error)
})
```
And that’s it! At this moment, your React SPA is ready to use authentication with the adal-angular library and Azure's Active Directory!

## Special thanks to
I would like to take a brief moment to thank [magnuf for his example on github](https://github.com/AzureAD/azure-activedirectory-library-for-js/issues/481), originally helping me on my way figuring all of this out.

# Want to do adjustments to the session timeout?

Then follow [this link](https://www.appfoundry.be/blog/2018/11/24/session-management-in-react-single-page-applications/) and/or the [Session-Management-with-ADAL-in-React-SPA](https://github.com/appfoundry/react-adal-authentication-session-sample/tree/Session-Management-with-ADAL-in-React-SPA) branch to part 2 of this tutorial, where I explain how to add session management!

# Blogposts

This tutorial is part of a blogpost duology, of which the first part can be found [here](https://www.appfoundry.be/blog/2018/11/24/authentication-with-adal-in-react-single-page-applications/) (and the second one's links are right above).

## License

This project is licensed under the terms of the MIT license. See the [LICENSE](LICENSE) file.
