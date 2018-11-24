// src/services/Api.js
import ApiSauce from 'apisauce'
import { CancelToken } from 'axios'

import ApiConfig from '../config/ApiConfig'
import AdalConfig from '../config/AdalConfig'
import AuthContext from './Auth'
import SessionHelper from './Session'

// set up cancel token from axios to be able to cancel network requests
const cancelSource = CancelToken.source() // more info: https://github.com/axios/axios#cancellation
const ApiConfigWithCancelToken = {
  ...ApiConfig,
  cancelToken: cancelSource.token
}

const instance = ApiSauce.create(ApiConfigWithCancelToken)

// Add a request interceptor
instance.addAsyncRequestTransform((config) => {
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

// Add a monitor so that after each call the expiry and the timeout is reset
const timeoutMonitor = (response) => {
  // reset the expiry
  SessionHelper.setExpiry()
  // and reset the timeout function
  SessionHelper.resetExpiryTimeout()
}
instance.addMonitor(timeoutMonitor)

export default instance