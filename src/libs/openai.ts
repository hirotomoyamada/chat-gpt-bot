import {
  Configuration,
  ConfigurationParameters,
  OpenAIApi,
  ChatCompletionRequestMessage,
  CreateChatCompletionResponse,
} from 'openai'

export { ChatCompletionRequestMessage, CreateChatCompletionResponse }

export const configuration: ConfigurationParameters = {
  organization: process.env.OPENAI_ORGANIZATION,
  apiKey: process.env.OPENAI_API_KEY,
}

export const openai = new OpenAIApi(new Configuration(configuration))

export const createChatCompletion = async (messages: ChatCompletionRequestMessage[], k = 10) => {
  messages = messages.slice(-1 * k)

  return await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    top_p: 0.95,
    presence_penalty: 1,
    frequency_penalty: 1,
    messages,
  })
}
