import { decorate, observable, set, toJS, computed, action } from 'mobx'
import graphql from 'mobx-apollo'
import ApiServerAgent from '../ApiServerAgent'
import { tokensQuery, findTokenQuery } from '../graphql/query/token'

class MarketStore {
  token = {
    data: {
      token: null
    },
    loading: false,
    error: null
  }
  tokens = {
    data: {
      tokens: []
    },
    loading: false,
    error: null
  }

  constructor(rootStore) {
    this.root = rootStore

    set(this, {
      get tokens() {
        return graphql({ client: ApiServerAgent, query: tokensQuery })
      }
    })
  }

  getTokens = async from => {
    this.tokens = await graphql({
      client: ApiServerAgent,
      query: tokensQuery,
      variables: { from: from }
    })
  }

  getTokenBySymbol = async (symbol, from) => {
    this.token = await graphql({
      client: ApiServerAgent,
      query: findTokenQuery,
      variables: { symbol: symbol, from: from }
    })
  }

  get error() {
    return (this.tokens.error && this.tokens.error.message) || null
  }

  get loading() {
    return this.tokens.loading
  }

  get tokenList() {
    return (this.tokens.data && toJS(this.tokens.data.tokens)) || []
  }

  get count() {
    return this.tokens.data.tokens ? this.tokens.data.tokens.length : 0
  }

  /**
   * symbol : IQ
   * market : IQ_EOS
   */
  getTokenInfo = async (symbol, market) => {
    // last price
    // 24H change
    // 24H High
    // 24H Low
    // 24H Volume
  }

  getCurrentOrder = async accountName => {}

  getOrderHistory = async accountName => {}

  getChart = async (tokenId, group) => {}
}

decorate(MarketStore, {
  tokens: observable,
  token: observable,
  error: computed,
  loading: computed,
  tokenList: computed,
  count: computed,
  getTokensById: action,
  getTokenBySymbol: action
})

export default MarketStore
