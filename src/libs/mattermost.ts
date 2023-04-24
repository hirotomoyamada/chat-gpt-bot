import { request } from 'https'
import { Dict } from '../utils'

type RequestData = {
  response_type?: string
  username?: string
  icon_url?: string
  text: string
  props?: Dict
}

export const valideteToken = (body: any) => body.token === process.env.MATTERMOST_CHANNEL_TOKEN

export const replyChat = (data: RequestData): void => {
  const url = 'https://avap.codes/-/mattermost/hooks/fuhsffmr8p8utf13t4u33q7azr'
  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }

  if (!data.username) data.username = 'ChatGPT'

  if (!data.icon_url)
    data.icon_url =
      'https://obs.line-scdn.net/0hJoC2Yp6SFUB-SwdlxMhqFywWHiJNKQtLXH8BJx40ABsSECdDCX5ZJ1gjEBgYLjB9CUw8Zx00ORtSGjtqHng_JxI1LSUYB1FiQ1EBRhAbFyIVAA5MSkUc/f256x256'

  const client = request(url, options)

  client.write(JSON.stringify(data))
  client.end()
}
