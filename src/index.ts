import { config } from './lib/config'
import { SWQueryResponse, SWQueryFormatted } from './lib/types'
import axios, { AxiosResponse } from 'axios'
import { logger } from '@vtfk/logger'

;(async () => {
  logger('debug', ['index', 'starting application'])

  const swApi = axios.create(config)

  const queryNodes = encodeURIComponent(`
    SELECT
      c.Name AS "groupName",
      n.DisplayName AS "displayName",
      c.Uri AS "groupUri",
      c.Members.MemberUri AS "memberUri",
      cp.uri AS "memberUriCP",
      ${config.useCustomProperty ? `cp.${config.customPropertyName} AS "mutedByScript",` : ''}
      groupasup.SuppressFrom AS "groupSuppressedFrom",
      groupasup.SuppressUntil AS "groupSuppressedUntil",
      asup.SuppressFrom AS "entitySuppressedFrom",
      asup.SuppressUntil AS "entitySuppressedUntil"
    FROM Orion.Container c
    LEFT JOIN Orion.AlertSuppression groupasup
      ON c.Uri = groupasup.EntityUri
    LEFT JOIN Orion.AlertSuppression asup
      ON c.Members.MemberUri = asup.EntityUri
    LEFT JOIN Orion.Nodes n
      ON c.Members.MemberUri = n.Uri
    LEFT JOIN Orion.NodesCustomProperties cp
      ON n.NodeID = cp.NodeID
  `)

  let response: AxiosResponse<SWQueryResponse>
  try {
    logger('debug', ['index', 'getting nodes from Solarwinds'])
    const requestTime = Date.now()
    response = await swApi.get<SWQueryResponse>(`/SolarWinds/InformationService/v3/Json/Query?query=${queryNodes}`)
    logger('debug', ['index', 'Solarwinds query success', `${Date.now() - requestTime}ms`])
  } catch (error) {
    const responseMessage = error.response?.data?.Message
    if (typeof responseMessage === 'string' && responseMessage.includes('Entity Orion.NodesCustomProperties does not contain requested property')) {
      logger('error', ['index', 'failed to get nodes', 'specified custom property does not exist', 'please create it in SW or disable it in this script\'s config'])
    }
    throw error
  }

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
      name: node.displayName,
      uri: node.memberUri,
      uriCustomProperty: node.memberUriCP,
      isSuppressed: false,
      mutedByScript: typeof node.mutedByScript === 'boolean' ? node.mutedByScript : false,
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

  const nodesToMute: SWQueryFormatted[] = []
  const nodesToUnmute: SWQueryFormatted[] = []
  const nodesIgnored: SWQueryFormatted[] = []
  filteredNodes.forEach(node => {
    if (!node.isSuppressed && node.parentIsSuppressed) nodesToMute.push(node)
    else if (config.useCustomProperty && !node.mutedByScript) nodesIgnored.push(node)
    else if (node.isSuppressed && !node.parentIsSuppressed) nodesToUnmute.push(node)
    else nodesIgnored.push(node)
  })

  logger('info', [
    'index',
    `muting ${nodesToMute.length} nodes`,
    `unmuting ${nodesToUnmute.length} nodes`,
    `ignoring ${nodesIgnored.length} nodes`
  ])

  const urisToMute = nodesToMute.map(node => node.uri)
  const urisToUnmute = nodesToUnmute.map(node => node.uri)

  if (urisToMute.length > 0) {
    try {
      await swApi.post('/SolarWinds/InformationService/v3/Json/Invoke/Orion.AlertSuppression/SuppressAlerts', [urisToMute])

      if (config.useCustomProperty) {
        logger('info', ['index', 'setting custom property', config.customPropertyName, 'for muted nodes to', 'true'])
        await swApi.post('/SolarWinds/InformationService/v3/Json/BulkUpdate', {
          uris: nodesToMute.map(node => node.uriCustomProperty),
          properties: {
            [config.customPropertyName]: 'true'
          }
        })
      }
    } catch (error) {
      logger('error', ['index', 'failed to mute nodes!', 'error', error.message, 'response', error.response.data])
    }
  } else {
    logger('debug', ['index', 'no nodes to mute', 'skipping..'])
  }

  if (urisToUnmute.length > 0) {
    try {
      await swApi.post('/SolarWinds/InformationService/v3/Json/Invoke/Orion.AlertSuppression/ResumeAlerts', [urisToUnmute])

      if (config.useCustomProperty) {
        logger('info', ['index', 'setting custom property', config.customPropertyName, 'for unmuted nodes to', 'false'])
        await swApi.post('/SolarWinds/InformationService/v3/Json/BulkUpdate', {
          uris: nodesToUnmute.map(node => node.uriCustomProperty),
          properties: {
            [config.customPropertyName]: 'false'
          }
        })
      }
    } catch (error) {
      logger('error', ['index', 'failed to unmute nodes!', 'error', error.message, 'response', error.response.data])
    }
  } else {
    logger('debug', ['index', 'no nodes to unmute', 'skipping..'])
  }
})().catch(error => logger('error', ['index', 'error in application', error.message]))
