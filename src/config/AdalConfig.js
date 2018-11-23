// src/config/AdalConfig.js
export default {
  clientId: 'ENTER THE APPLICATION ID OF THE REGISTERED WEB APP ON AZURE',
  endpoints: {
    api: "ENTER THE APPLICATION ID OF THE REGISTERED API APP ON AZURE" // Necessary for CORS requests, for more info see https://github.com/AzureAD/azure-activedirectory-library-for-js/wiki/CORS-usage
  },
  // 'tenant' is the Azure AD instance.
  tenant: 'ENTER YOUR TENANT ID',
  // 'cacheLocation' is set to 'sessionStorage' by default (see https://github.com/AzureAD/azure-activedirectory-library-for-js/wiki/Config-authentication-context#configurable-options.
  // We change it to'localStorage' because 'sessionStorage' does not work when our app is served on 'localhost' in development.
  cacheLocation: 'localStorage'
}