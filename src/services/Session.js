// src/services/Session.js
import SessionHelper from 'session-helper'
import SessionConfig from '../config/SessionConfig'

export default new SessionHelper(SessionConfig.uuid,
                                 SessionConfig.cacheLocation,
                                 SessionConfig.timeoutInMinutes,
                                 SessionConfig.debugMode)
