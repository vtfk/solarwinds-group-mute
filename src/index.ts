import { config } from './lib/config'
import { SWQueryResponse, SWQueryFormatted } from './lib/types'
import axios from 'axios'
import { logger } from '@vtfk/logger'

// DEBUG
const response: { data: SWQueryResponse } = { data: require('../sample-data/sw-response.json') }

;(async () => {
  logger('debug', ['index', 'starting application'])

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

  logger('debug', ['index', 'getting nodes from Solarwinds'])
  // const response = await swApi.get<SWQueryResponse>(`/SolarWinds/InformationService/v3/Json/Query?query=${queryNodes}`)

  if (typeof response.data.results === 'undefined') {
    throw Error('Query response is missing results property!')
  }

  const currentDate = new Date()

  logger('debug', ['index', `formatting ${response.data.results.length} nodes`])
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

  logger('debug', ['index', 'filtering duplicate nodes'])
  const filteredNodes: SWQueryFormatted[] = []
  nodes.forEach(currentNode => {
    const existingNodeIndex = filteredNodes.findIndex(existingNode => existingNode.uri === currentNode.uri)
    if (existingNodeIndex < 0) {
      filteredNodes.push(currentNode)
    } else {
      const existingNode = filteredNodes[existingNodeIndex]
      if (!existingNode.parentIsSuppressed && currentNode.parentIsSuppressed) {
        filteredNodes[existingNodeIndex] = currentNode
      }
    }
  })
  logger('debug', ['index', 'success', `${nodes.length}-${nodes.length - filteredNodes.length} = ${filteredNodes.length} unique nodes`])

  const urisToBeMuted: string[] = []
  const urisToBeUnmuted: string[] = []
  // TODO: This should be done in the filtering above (maybe? Or use L114 below..)
  filteredNodes.forEach(node => {
    if (
      !node.isSuppressed &&
      node.parentIsSuppressed &&
      !urisToBeMuted.includes(node.uri)
    ) {
      urisToBeMuted.push(node.uri)
    } else if (
      node.isSuppressed &&
      !node.parentIsSuppressed &&
      // !node.isMutedByScript &&
      !urisToBeMuted.includes(node.uri) &&
      !urisToBeUnmuted.includes(node.uri)
    ) {
      urisToBeUnmuted.push(node.uri)
    }
  })

  logger('info', ['index', `muting ${urisToBeMuted.length} nodes`, `unmuting ${urisToBeUnmuted.length} nodes`])

  urisToBeMuted.forEach(uri => {
    const node = nodes.find(node => node.uri === uri && node.parentIsSuppressed)
    if (typeof node === 'undefined') {
      console.log(`Node not found! URI: ${uri}`)
      return
    }
    // const fromDate = node.parentSuppressedFrom?.toISOString() ?? currentDate.toISOString()
    // const untilDate = node.parentSuppressedUntil?.toISOString() ?? null
    // console.log(`Mute node "${uri}" - From: ${fromDate} - Until: ${untilDate ?? 'null'}`)
  })

  // TODO: Update Custom properties
  // Res: https://github.com/solarwinds/OrionSDK/wiki/REST#bulkupdate-request-custom-properties
})().catch(error => logger('error', ['index', 'error in application', error.message]))

/* Check if specified column exists
SELECT TOP 1
  Table,
  Field
FROM Orion.CustomPropertyValues
WHERE
  Table = 'NodesCustomProperties' AND
  Field = 'Virksomhet'
*/
