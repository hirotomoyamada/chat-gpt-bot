import {
  onRequest,
  setDoc,
  replyMessage,
  valideteSignature,
  createChatCompletion,
  ChatCompletionRequestMessage,
  getDoc,
  getCollection,
  serverTimestamp,
  addDoc,
  FieldValue,
  CreateChatCompletionResponse,
  Timestamp,
} from '../libs'
import { HttpsError } from '../utils'

type Event = {
  type: string
  message?: {
    type: string
    id: string
    text: string
  }
  timestamp: number
  source: {
    type: string
    userId: string
  }
  replyToken: string
  mode: string
  webhookEventId: string
  deliveryContext: {
    isRedelivery: boolean
  }
}

type RequestBody = {
  destination: string
  events: Event[]
}

type User = {
  approval: boolean
}

type Message = ChatCompletionRequestMessage & {
  timestamp: FieldValue
}

export const webhook = onRequest<RequestBody>(async ({ method, headers, body }, res) => {
  try {
    if (!valideteSignature(headers['x-line-signature'], body))
      throw new HttpsError(401, 'unauthenticated')

    if (method !== 'POST') throw new HttpsError(400, 'invalid-argument')

    const { events = [] } = body as RequestBody

    if (events.length) {
      const { source, replyToken } = events[0]

      await veriflyUser(source.userId, replyToken)

      const messages = await getMessages(source.userId)

      for await (const event of events) {
        switch (event.type) {
          case 'follow':
            break

          case 'message':
            await sendMessage(event)(messages)

            break

          case 'unfollow':
            break

          default:
            break
        }
      }
    }

    res.send('HTTP POST request sent to the webhook URL.')
  } catch (e: any) {
    res.status(e.status ?? 500).send(e.message)
  }
})

const veriflyUser = async (userId: string, replyToken: string): Promise<void> => {
  try {
    const doc = await getDoc<User>(`line/${userId}`)

    const sendMessage = async (content: string) => {
      try {
        const messages: ChatCompletionRequestMessage[] = [{ role: 'user', content }]

        const { data } = await createChatCompletion(messages)

        const text = data.choices[0].message?.content

        if (text) replyMessage(replyToken, { type: 'text', text })
      } catch (e: any) {
        throw new HttpsError(500, e.response.data.error.message ?? e.message)
      }
    }

    if (doc.exists) {
      const approval = doc.data().approval

      if (!approval) {
        await sendMessage('神様が承認するまでお待ちください。\n上記の文章を面白くしてください')

        throw new HttpsError(403, 'permission-denied')
      }
    } else {
      const data = { approval: false }

      await setDoc<User>(`line/${userId}`, data)

      await sendMessage('神様が承認するまでお待ちください。\n上記の文章を面白くしてください')

      throw new HttpsError(403, 'permission-denied')
    }
  } catch (e: any) {
    throw new HttpsError(e.status ?? 500, e.message)
  }
}

const getMessages = async (userId: string) => {
  try {
    const { docs } = await getCollection<Message>(
      `line/${userId}/messages`,
      ['timestamp', 'desc'],
      undefined,
      10,
    )

    const messages: ChatCompletionRequestMessage[] = docs.map((doc) => {
      const { role, content } = doc.data()

      return { role, content }
    })

    return messages
  } catch (e: any) {
    throw new HttpsError(500, e.message)
  }
}

const sendMessage =
  ({ source, type, message, replyToken, timestamp }: Event) =>
  async (historyMessages: ChatCompletionRequestMessage[]): Promise<void> => {
    let text: string | undefined

    const userMessage: ChatCompletionRequestMessage = { role: 'user', content: '' }
    const assistantMessage: ChatCompletionRequestMessage = { role: 'assistant', content: '' }

    try {
      if (type !== 'message' || !message || message.type !== 'text') {
        userMessage.content = '返答はテキストのみ対応しています。\n上記の文章を面白くしてください'

        const messages: ChatCompletionRequestMessage[] = [userMessage]

        const { data } = await createChatCompletion(messages)

        text = data.choices[0].message?.content
      } else {
        userMessage.content = message.text

        const messages: ChatCompletionRequestMessage[] = [...historyMessages, userMessage]

        const { data } = await recursivelyCreateChatCompletion(messages)

        text = data?.choices[0].message?.content
      }
    } catch (e: any) {
      throw new HttpsError(500, e.response.data.error.message ?? e.message)
    }

    try {
      historyMessages.push(userMessage)

      if (!text) {
        await saveMessages(source.userId, timestamp, [userMessage])

        throw new HttpsError(500, 'data-loss')
      }

      assistantMessage.content = text

      replyMessage(replyToken, { type: 'text', text })

      historyMessages.push(assistantMessage)

      await saveMessages(source.userId, timestamp, [userMessage, assistantMessage])
    } catch (e: any) {
      throw new HttpsError(500, e.message)
    }
  }

const recursivelyCreateChatCompletion = async (
  messages: ChatCompletionRequestMessage[],
  k = 10,
): Promise<{ data: CreateChatCompletionResponse }> => {
  if (k < 0) k = 0

  try {
    const { data } = await createChatCompletion(messages, k)

    return { data }
  } catch (e: any) {
    if (e.response.data.error.code === 'context_length_exceeded') {
      return await recursivelyCreateChatCompletion(messages, k - 1)
    } else {
      throw new HttpsError(500, e.response.data.error.message ?? e.message)
    }
  }
}

const saveMessages = async (
  userId: string,
  _timestamp: number,
  messages: ChatCompletionRequestMessage[],
) => {
  try {
    for await (const message of messages) {
      const isUser = message.role === 'user'
      const timestamp = isUser ? Timestamp.fromDate(new Date(_timestamp)) : serverTimestamp()

      await addDoc<Message>(`line/${userId}/messages`, {
        ...message,
        timestamp,
      })
    }
  } catch (e: any) {
    throw new HttpsError(500, e.message)
  }
}
