import dotenv from 'dotenv'

dotenv.config()

function env (env: string, defaultValue?: string): string {
  const value = process.env[env]
  if (typeof value === 'string') return value
  if (typeof defaultValue === 'string') return defaultValue
  throw Error(`Missing required environment variable "${env}"!`)
}

export const config = {
  auth: {
    username: env('SW_GROUP_MUTER_USERNAME'),
    password: env('SW_GROUP_MUTER_PASSWORD')
  },
  baseURL: env('SW_BASE_URL'),
  useCustomProperty: env('SW_USE_CUSTOM_PROPERTY', 'false') === 'true',
  customPropertyName: env('SW_CUSTOM_PROPERTY_NAME', 'MutedByScript')
}
