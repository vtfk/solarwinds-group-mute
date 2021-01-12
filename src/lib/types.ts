export interface SWQueryResponse {
  results?: Array<{
    groupName: string
    groupUri: string
    memberUri: string
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
  uri: string
  isSuppressed: boolean
  mutedByScript: boolean
  parentSuppressedFrom: Date | null
  parentSuppressedUntil: Date | null
  suppressedFrom: Date | null
  suppressedUntil: Date | null
}
