import { config } from './lib/config'
import { SWQueryResponse, SWQueryFormatted } from './lib/types'
import axios from 'axios'

// DEBUG
// const response: { data: SWQueryResponse } = { data: require('../sample-data/sw-response.json') }

;(async () => {
  const swApi = axios.create(config)

  const queryNodes = encodeURIComponent(`
    SELECT
      c.Name AS "groupName",
      c.Uri AS "groupUri",
      c.Members.MemberUri AS "memberUri",
      groupasup.SuppressFrom AS "groupSuppressedFrom",
      groupasup.SuppressUntil AS "groupSuppressedUntil",
      asup.SuppressFrom AS "entitySuppressedFrom",
      asup.SuppressUntil AS "entitySuppressedUntil"
    FROM Orion.Container c
    LEFT JOIN Orion.AlertSuppression groupasup
      ON c.Uri = groupasup.EntityUri
    LEFT JOIN Orion.AlertSuppression asup
      ON c.Members.MemberUri = asup.EntityUri
  `)

  const response = await swApi.get<SWQueryResponse>(`/SolarWinds/InformationService/v3/Json/Query?query=${queryNodes}`)

  if (typeof response.data.results === 'undefined') {
    throw Error('Query response is missing results property!')
  }

  const currentDate = new Date()

  const nodes = response.data.results.map<SWQueryFormatted>(node => {
    function formatDate (date: string | null): Date | null {
      return date !== null ? new Date(date) : null
    }

    function isSupressed (dateFrom: Date, dateUntil: Date | null): boolean {
      return dateFrom < currentDate && (
        dateUntil === null ||
        dateUntil > currentDate
      )
    }

    const formattedNode: SWQueryFormatted = {
      parentName: node.groupName,
      parentUri: node.groupUri,
      parentIsSuppressed: false,
      uri: node.memberUri,
      isSuppressed: false,
      parentSuppressedFrom: formatDate(node.groupSuppressedFrom),
      parentSuppressedUntil: formatDate(node.groupSuppressedUntil),
      suppressedFrom: formatDate(node.entitySuppressedFrom),
      suppressedUntil: formatDate(node.entitySuppressedUntil)
    }

    if (formattedNode.suppressedFrom !== null) {
      formattedNode.isSuppressed = isSupressed(formattedNode.suppressedFrom, formattedNode.suppressedUntil)
    }

    if (formattedNode.parentSuppressedFrom !== null) {
      formattedNode.parentIsSuppressed = isSupressed(formattedNode.parentSuppressedFrom, formattedNode.parentSuppressedUntil)
    }

    return formattedNode
  })
  const urisToBeChecked: string[] = []
  const urisToBeMuted: string[] = []
  const urisToBeUnmuted: string[] = []
  // TODO: Check if **any** parent of node is muted
  nodes.forEach(node => {
    if (
      !node.isSuppressed &&
      node.parentIsSuppressed &&
      !urisToBeMuted.includes(node.uri)
    ) {
      urisToBeMuted.push(node.uri)
    } else if (
      node.isSuppressed &&
      !node.parentIsSuppressed &&
      !urisToBeMuted.includes(node.uri) &&
      !urisToBeChecked.includes(node.uri)
    ) {
      urisToBeChecked.push(node.uri)
    }
  })

  // TODO: Check custom property of suppressed nodes
  urisToBeChecked.forEach(uri => urisToBeUnmuted.push(uri))

  urisToBeMuted.forEach(uri => {
    const node = nodes.find(node => node.uri === uri && node.parentIsSuppressed)
    if (typeof node === 'undefined') {
      console.log(`Node not found! URI: ${uri}`)
      return
    }
    const fromDate = node.parentSuppressedFrom?.toISOString() ?? currentDate.toISOString()
    const untilDate = node.parentSuppressedUntil?.toISOString() ?? null
    console.log(`Mute node "${uri}" - From: ${fromDate} - Until: ${untilDate ?? 'null'}`)
  })

  console.log(urisToBeChecked.length)
  console.log(urisToBeMuted.length)
  console.log(urisToBeUnmuted.length)

  // TODO: Update Custom properties
  // Res: https://github.com/solarwinds/OrionSDK/wiki/REST#bulkupdate-request-custom-properties

  // console.log(nodes.filter(node => node.isSuppressed))
})().catch(console.error)

/* Check if specified column exists
SELECT TOP 1
  Table,
  Field
FROM Orion.CustomPropertyValues
WHERE
  Table = 'NodesCustomProperties' AND
  Field = 'Virksomhet'
*/
