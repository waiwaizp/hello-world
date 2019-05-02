var long = require('long')

var nodeosUrl = 'https://api.eosnewyork.io/v1/chain/'
var contractaccount = 'chenzexin233'

export let config = {
    token_list: [],
    eos_balances: [],
    ex_balances: {},
    ex_orders: {},
    data: {}
}

function char_to_symbol(c) {
    if (c >= 'a'.charCodeAt(0) && c <= 'z'.charCodeAt(0)) {
        return c - 'a'.charCodeAt(0) + 6
    }
    if (c >= '1'.charCodeAt(0) && c <= '5'.charCodeAt(0)) {
        return c - '1'.charCodeAt(0) + 1
    }
    return 0
}

function string_to_name(str) {
    let value = new long(0, 0, true)
    var len = str.length
    for (var i = 0; i <= 12; ++i) {
        let l = new long(0, 0, true)
        if (i < len && i <= 12) {
            let n = char_to_symbol(str.charCodeAt(i))
            l = long.fromInt(n, true)
        }

        if (i < 12) {
            l = l.and(0x1f)
            l = l.shiftLeft(64 - 5 * (i + 1))
        } else {
            l = l.and(0x0f)
        }

        value = l.or(value)
    }

    return value
}

function string_to_symbol(str) {
    var result = long.fromInt(0, true)
    for (var i = 0; i < str.length; i++) {
        let c = str.charCodeAt(i)
        if (c < 'A'.charCodeAt(0) || c > 'Z'.charCodeAt(0)) {
            /// ERRORS?
        } else {
            result = result.or(c << (8 * (1 + i)))
        }
    }
    return result.or(4)
}

function token_symbol(str) {
    var ss = str.split('@')
    if (ss.length != 2) {
        throw 'token symbol error'
    }
    let l1 = string_to_symbol(ss[0])
    l1 = l1.shiftRight(8)
    let l2 = string_to_name(ss[1])
    return l1.or(l2)
}

function market_id(base, quote, isbid) {
    var bs = token_symbol(base)
    var qs = token_symbol(quote)
    var n = 1
    if (isbid) {
        n = 2
    }
    return bs.or(qs).add(n)
}

// 获取 exchange 中所有的 tokens
export const get_tokens = function() {
    return http_post(nodeosUrl + 'get_table_rows', {
        scope: contractaccount,
        code: contractaccount,
        table: 'extokens',
        json: true
    })
}

export function get_balance_symbol_precision(str) {
    var ss = str.split(' ')
    if (ss.length != 2) {
        throw 'token symbol error'
    }
    let symbol = ss[1]
    let bs = ss[0].split('.')
    if (bs.length != 2) {
        throw 'token symbol error'
    }
    let precision = bs[1].length
    let balance = parseFloat(bs[0])
    return {
        symbol,
        balance,
        precision
    }
}

export function get_token_list(rows) {
    let ret = []
    rows.forEach((e, i) => {
        let b = get_balance_symbol_precision(e.balance.quantity)
        ret.push({
            symbol: b.symbol + '@' + e.balance.contract,
            precision: b.precision,
            eos_balance: 0,
            ex_balance: 0
        })
    })
    return ret
}

export function get_code_list(tokens) {
    let token_list = []
    if (typeof tokens !== 'undefined' && tokens.length > 0) {
        token_list = tokens
    } else {
        token_list = config.token_list
    }
    if (token_list.length == 0) {
        throw 'token_list is empty'
    }

    let code_list = []
    config.eos_balances = []
    token_list.filter(function(e, i, a) {
        let code = e.balance.contract
        if (code_list.indexOf(code) == -1) {
            code_list.push(code)
            return true
        } else {
            return false
        }
    })
    return code_list
}

// invoke like: get_my_balances('w.1', bs =>{ // bs is balance list })
export const get_my_balances = function(owner, callback) {
    let token_list = []
    let code_list = []
    get_tokens()
        .then(res => {
            token_list = get_token_list(res.rows)
            code_list = get_code_list(res.rows)
            let ps = []
            for (let i = 0; i < code_list.length; i++) {
                let code = code_list[i]
                let p = http_post(nodeosUrl + 'get_currency_balance', {
                    code: code,
                    account: owner
                })
                ps.push(p)
            }
            return Promise.all(ps)
        })
        .then(ress => {
            ress.forEach((rows, i) => {
                let code = code_list[i]
                rows.forEach((row, j) => {
                    let b = get_balance_symbol_precision(row)
                    b.symbol += '@' + code
                    let inx = token_list.findIndex(e => {
                        return e.symbol == b.symbol
                    })
                    // token_list[inx].precision = b.precision
                    token_list[inx].eos_balance = b.balance
                })
            })
            return get_balances(owner)
        })
        .then(res => {
            res.rows.forEach((e, i) => {
                let b = get_balance_symbol_precision(e.balance.quantity)
                b.symbol += '@' + e.balance.contract
                let inx = token_list.findIndex(ex => {
                    return ex.symbol == b.symbol
                })
                token_list[inx].ex_balance = b.balance
            })
            callback(token_list)
        })
}

// 获取 owner 在 exchange 中所有的余额
// get_balances('w.1')
export const get_balances = function(owner) {
    return http_post(nodeosUrl + 'get_table_rows', {
        scope: owner,
        code: contractaccount,
        table: 'exaccounts',
        json: true
    })
}

export const get_marketid = function(base, quote, isbid) {
    var mid = market_id(base, quote, isbid)
    return mid.toString()
}

export const get_ordersbyid = function(mid) {
    return http_post(nodeosUrl + 'get_table_rows', {
        scope: mid,
        code: contractaccount,
        table: 'exorders',
        json: true,
        limit: 100
    })
}

// 获取所有的订单列表
// get_orders(base: 'XPA@eosio.token', quote: 'EOS@eosio.token')
export const get_orders = function(base, quote, isbid) {
    var mid = market_id(base, quote, isbid)
    let mids = mid.toString()
    return http_post(nodeosUrl + 'get_table_rows', {
        scope: mids,
        code: contractaccount,
        table: 'exorders',
        json: true,
        limit: 100
    })
    // .then(res => {
    //   config.ex_orders = res.rows
    // })
    // .catch(err => {
    //   console.log(err)
    // })
}

Date.prototype.toJSON = function() {
    let s = this.toISOString()
    let ss = s.split('.')
    return ss[0]
}

function http(url, method, data = undefined) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open(method, url)
        xhr.onreadystatechange = () => {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                resolve(JSON.parse(xhr.response))
            }
        }
        xhr.onerror = () => {
            reject({
                statusText: xhr.statusText
            })
        }

        if (data == undefined) {
            xhr.send()
        } else {
            let json = JSON.stringify(data)
            console.log(json)
            xhr.send(json)
        }
    })
}

function http_get(url) {
    console.log(url)
    return http(url, 'GET')
}

function http_post(url, data) {
    console.log(url, data)
    return http(url, 'POST', data)
}

