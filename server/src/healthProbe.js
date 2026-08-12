export const isHealthyResponse = (status, body) =>
  Number.isInteger(status) && status >= 200 && status < 300 && body?.ok === true
