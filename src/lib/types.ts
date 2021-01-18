export interface SWQueryResponse {
  results?: Array<{
    groupName: string
    displayName: string
    groupUri: string
    memberUri: string
    memberUriCP: string
    mutedByScript?: boolean
    groupSuppressedFrom: string | null
    groupSuppressedUntil: string | null
    entitySuppressedFrom: string | null
    entitySuppressedUntil: string | null
  }>
}

export interface SWQueryFormatted {
  parentName: string
  parentUri: string
  parentIsSuppressed: boolean
  name: string
  uri: string
  uriCustomProperty: string
  isSuppressed: boolean
  mutedByScript: boolean
  parentSuppressedFrom: Date | null
  parentSuppressedUntil: Date | null
  suppressedFrom: Date | null
  suppressedUntil: Date | null
}
