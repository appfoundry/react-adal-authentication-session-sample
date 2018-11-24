// src/services/Api.js
import axios from 'axios'

import ApiConfig from '../config/ApiConfig'
import AdalConfig from '../config/AdalConfig'
import AuthContext from './Auth'

const instance = axios.create(ApiConfig)

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

export default instance