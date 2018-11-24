// src/services/Api.js
import axios from 'axios'

import ApiConfig from '../config/ApiConfig'

const instance = axios.create(ApiConfig)

export default instance