import { API_SERVER_REST_URI } from '../../../constants/Values'

var rp = require('request-promise').defaults({ json: true })

const api_root = API_SERVER_REST_URI
const history = {}

export default {
  history: history,

  getBars: function(symbolInfo, resolution, from, to, first, limit) {
    const split_symbol = symbolInfo.name.split(/[:/]/)
    const token_id = symbolInfo.token_id
    const statistic_type = this.getStatisticType(resolution)
    const url = `/bars?token_id=${token_id}&statistic_type=${statistic_type}&from=${from}&to=${to}`
    // const url =
    //   resolution === 'D'
    //     ? '/data/histoday'
    //     : resolution >= 60
    //       ? '/data/histohour'
    //       : '/data/histominute'
    // const qs = {
    //   e: split_symbol[0],
    //   fsym: split_symbol[1],
    //   tsym: split_symbol[2],
    //   toTs: to ? to : '',
    //   limit: limit ? limit : 2000
    // aggregate: 1//resolution
    // }

    return rp({
      url: `${api_root}${url}`
      //qs
    }).then(data => {
      if (data && data.bars && data.bars.length) {
        var bars = data.bars.reverse().map(el => {
          return {
            time: new Date(el.start_time), //TradingView requires bar time in ms
            low: el.low_price,
            high: el.high_price,
            open: el.opening_price,
            close: el.close_price,
            volume: el.volume
          }
        })

        if (first) {
          var lastBar = bars[bars.length - 1]
          history[symbolInfo.name] = { lastBar: lastBar }
        }

        return bars
      }

      return []
      // if (data.Data.length) {
      //   console.log(
      //     `Actually returned: ${new Date(data.TimeFrom * 1000).toISOString()} - ${new Date(
      //       data.TimeTo * 1000
      //     ).toISOString()}`
      //   )

      //   var bars = data.Data.map(el => {
      //     return {
      //       time: el.time * 1000, //TradingView requires bar time in ms
      //       low: el.low,
      //       high: el.high,
      //       open: el.open,
      //       close: el.close,
      //       volume: el.volumefrom
      //     }
      //   })
      //   if (first) {
      //     var lastBar = bars[bars.length - 1]
      //     history[symbolInfo.name] = { lastBar: lastBar }
      //   }
      //   return bars
      // } else {
      //   return []
      // }
    })
  },

  getStatisticType: function(resolution) {
    switch (resolution) {
    case '1': {
      return '1MIN'
    }
    case '5': {
      return '5MIN'
    }
    case '15': {
      return '15MIN'
    }
    case '30': {
      return '30MIN'
    }
    case '60': {
      return '1HOUR'
    }
    case '1440': {
      return '1DAY'
    }
    case '10080': {
      return '1WEEK'
    }
    case '43200': {
      return '1MON'
    }
    case '525600': {
      return '1YEAR'
    }
    default: {
      return '15MIN'
    }
    }
  }
}
