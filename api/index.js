const axios = require('axios')

export default async function handler (request, response) {
  const { city } = request.query

  if (!city) {
    return response.status(400).json({ error: 'Missing city.' })
  }

  const { data } = await axios({
    method: 'get',
    url: 'https://elastic-leitos.saude.gov.br/leito_ocupacao/_search',

    data: JSON.stringify({
      size: 10000,
      query: { match: { municipio: city } }
    }),

    headers: {
      'Content-Type': 'application/json'
    },

    auth: {
      username: 'user-api-leitos',
      password: 'aQbLL3ZStaTr38tj'
    }
  })

  const results = (data?.hits?.hits || []).filter(item => {
    return item._source.municipio === city
  }).map(item => item._source)

  response.status(200).json(results)
}
