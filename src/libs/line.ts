import { request } from 'https'
import { isArray } from '../utils/assertion'
import { createHmac } from 'crypto'

export type Message = { type: string; text: string }

export const valideteSignature = (signature: any, body: any) =>
  signature ==
  createHmac('SHA256', process.env.LINE_CHANNEL_SECRET ?? '')
    .update(Buffer.from(JSON.stringify(body)))
    .digest('base64')

export const replyMessage = (replyToken: string, messages: Message | Message[]): void => {
  const url = 'https://api.line.me/v2/bot/message/reply'
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
  }

  if (!isArray(messages)) messages = [messages]

  const data = JSON.stringify({ replyToken, messages })

  const client = request(url, options)

  client.write(data)
  client.end()
}
