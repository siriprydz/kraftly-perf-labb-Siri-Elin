/** 'Anna Andersson' -> 'Anna'. Saknat namn -> '' */
export const firstName = (fullName) => {
  if (typeof fullName !== 'string') return ''
  return fullName.trim().split(' ')[0]
}
