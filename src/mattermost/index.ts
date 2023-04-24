import {
  ChatCompletionRequestMessage,
  CreateChatCompletionResponse,
  FieldValue,
  Timestamp,
  addDoc,
  createChatCompletion,
  getCollection,
  getDoc,
  onRequest,
  serverTimestamp,
  setDoc,
} from '../libs'
import { replyChat, valideteToken } from '../libs/mattermost'
import { HttpsError } from '../utils'

type RequestBody = {
  token: string
  team_id: string
  team_domain: string
  channel_id: string
  channel_name: string
  timestamp: number
  user_id: string
  user_name: string
  post_id: string
  text: string
  trigger_word: string
  file_ids: string
}

type User = {
  userName: string
  approval: boolean
}

type Message = ChatCompletionRequestMessage & {
  timestamp: FieldValue
}

export const webhook = onRequest<RequestBody>(async ({ method, body }, res) => {
  try {
    if (!valideteToken(body)) throw new HttpsError(401, 'unauthenticated')

    if (method !== 'POST') throw new HttpsError(400, 'invalid-argument')

    const { user_id: userId, user_name: userName, text, timestamp } = body as RequestBody

    await veriflyUser(userId, userName)

    if (!text) throw new HttpsError(400, 'invalid-argument')

    const messages = await getMessages(userId)

    await sendMessage(userId, text, timestamp)(messages)

    res.send('HTTP POST request sent to the webhook URL.')
  } catch (e: any) {
    res.status(e.status ?? 500).send(e.message)
  }
})

const veriflyUser = async (userId: string, userName: string): Promise<void> => {
  try {
    const doc = await getDoc<User>(`mattermost/${userId}`)

    if (doc.exists) {
      const approval = doc.data().approval

      if (!approval) throw new HttpsError(403, 'permission-denied')
    } else {
      const data = { userName, approval: true }

      await setDoc<User>(`mattermost/${userId}`, data)
    }
  } catch (e: any) {
    throw new HttpsError(e.status ?? 500, e.message)
  }
}

const getMessages = async (userId: string) => {
  try {
    const { docs } = await getCollection<Message>(
      `mattermost/${userId}/messages`,
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
  (userId: string, content: string, timestamp: number) =>
  async (historyMessages: ChatCompletionRequestMessage[]): Promise<void> => {
    let text: string | undefined

    const userMessage: ChatCompletionRequestMessage = { role: 'user', content }
    const assistantMessage: ChatCompletionRequestMessage = { role: 'assistant', content: '' }

    try {
      const messages: ChatCompletionRequestMessage[] = [...historyMessages, userMessage]

      const { data } = await recursivelyCreateChatCompletion(messages)

      text = data?.choices[0].message?.content
    } catch (e: any) {
      throw new HttpsError(500, e.response.data.error.message ?? e.message)
    }

    try {
      if (!text) {
        await saveMessages(userId, timestamp, [userMessage])

        throw new HttpsError(500, 'data-loss')
      }

      assistantMessage.content = text

      replyChat({ text })

      await saveMessages(userId, timestamp, [userMessage, assistantMessage])
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

      await addDoc<Message>(`mattermost/${userId}/messages`, {
        ...message,
        timestamp,
      })
    }
  } catch (e: any) {
    throw new HttpsError(500, e.message)
  }
}
