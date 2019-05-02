import React, { PureComponent } from 'react'
import { Row, Col, InputGroup, InputGroupAddon, Input, Button } from 'reactstrap'
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'
import { withAlert } from 'react-alert'
import { FormattedMessage } from 'react-intl'
import Popup from 'reactjs-popup'
import ColorsConstant from '../Colors/ColorsConstant'
import { getTodayNoon } from '../../utils/timezoneHelper'
import { RightAlignCol, InfoIcon } from '../Common/Common'
import Slider from 'rc-slider'
import { toJS } from 'mobx'
import {
  EOS_TOKEN,
  SCATTER_ERROR_LOCKED,
  SCATTER_ERROR_REJECT_TRANSACTION_BY_USER,
  EOSIO_SERVER_ERROR,
  EOSIO_SERVER_ERROR_CPU_LIMIT,
  ORDER_STATUS_NOT_DEAL,
  ORDER_STATUS_PARTIAL_DEALED,
  ORDER_STATUS_ALL_DEALED,
  ORDER_STATUS_CANCELLED
} from '../../constants/Values'

import styled from 'styled-components'
import { sleep } from '../../utils/sleepHelper'
/* eslint react/no-multi-comp: 0, max-len: 0 */
import 'rc-slider/assets/index.css'

const railStyle = {
  backgroundColor: ColorsConstant.grayLighter,
  height: 6
}

const trackStyle = { backgroundColor: ColorsConstant.primary, height: 6 }
const handleStyle = {
  borderColor: ColorsConstant.primary,
  height: 16,
  width: 16,
  marginLeft: -8,
  marginTop: -5,
  backgroundColor: 'white'
}
const HandSlider = styled(Slider)`
  cursor: pointer;
`
const OrderTabPanel = styled(TabPanel)`
  font-size: 1.25rem;
`

const OrderRowPanel = styled(Row)`
  height: 40px;
  margin: 14px;
  align-items: center;
`

const OrderColPanel = styled(Col)`
  text-align: right;
  padding-right: 8px;
`

const OrderAmountRow = styled.div`
  height: 14px;
  text-align: right;
  margin-right: 25px;
`

const PrimaryOrderColPanel = styled(OrderColPanel)`
  text-align: left;
  color: ${props =>
    props.buy ? ColorsConstant.Thick_green : props.sell && ColorsConstant.Thick_red};
`

const OrderInput = styled(Input)`
  height: 40px;
  font-size: 1.25rem;
`

const OrderButton = styled(Button)`
  width: 100%;
  height: 40px;
  border: hidden;
  border-radius: 0;
  background: ${props => props.color};
  color: white;
  font-size: 16px;
  &:hover,
  &:focus,
  &:active {
    color: white;
    font-weight: 700;
  }
`

class Order extends PureComponent {
  constructor(props) {
    super(props)

    this.state = {
      tabIndex: 0,
      buyPrice: 0.1,
      buyQty: 0,
      sellPrice: 0.1,
      sellQty: 0,
      buyMarketTotalEos: 0.1,
      sellMarketAmount: 0.0001,
      tokenBalance: 0.0
    }
  }

  componentDidMount = async () => {
    const { tradeStore, accountStore, marketStore, token } = this.props

    await marketStore.getTokenBySymbol(token.symbol, getTodayNoon().getTime())

    if (accountStore.loginAccountInfo) {
      await this.getTokenBalance()
    }

    const tokenInfo = null //marketStore.token ? marketStore.token.data.token : null

    const lastPrice = tokenInfo
      ? tokenInfo.last_price > 0
        ? tokenInfo.last_price
        : 0.0001
      : 0.0001

    this.setState({
      buyPrice: lastPrice,
      sellPrice: lastPrice,
      buyQty: 0,
      sellQty: 0
    })

    this.disposerPrice = tradeStore.setWatchPrice(changed => {
      this.setState({
        buyPrice: parseFloat(changed.newValue),
        sellPrice: parseFloat(changed.newValue)
      })
    })

    this.disposerQty = tradeStore.setWatchQty(changed => {
      this.setState({
        buyQty: parseFloat(changed.newValue),
        sellQty: parseFloat(changed.newValue)
      })
    })

    this.disposerAccount = accountStore.subscribeLoginState(async changed => {
      if (changed.oldValue !== changed.newValue) {
        if (changed.newValue) {
          await this.getTokenBalance()
        } else {
          this.setState({
            tokenBalance: 0.0
          })
        }
      }
    })
  }

  componentWillReceiveProps = nextProps => {
    if (this.props.token && nextProps.token) {
      if (this.props.token.symbol !== nextProps.token.symbol) {
        this.setState({
          buyQty: 0,
          sellQty: 0
        })
      }
    }
  }

  // componentDidUpdate = async () => {
  //   await this.getTokenBalance()
  // }

  getTokenBalance = async () => {
    const { accountStore, eosioStore, token } = this.props

    if (accountStore.loginAccountInfo) {
      const tokenBalance = await eosioStore.getCurrencyBalance({
        code: token.contract,
        account: accountStore.loginAccountInfo.account_name,
        symbol: token.symbol
      })

      if (tokenBalance.length > 0) {
        const balance = tokenBalance[0].split(' ')[0]

        this.setState({
          tokenBalance: parseFloat(balance)
        })
      } else {
        this.setState({
          tokenBalance: 0.0
        })
      }
    }
  }

  componentWillUnmount = () => {
    if (this.disposerPrice) {
      this.disposerPrice()
    }

    if (this.disposerQty) {
      this.disposerQty()
    }

    if (this.disposerAccount) {
      this.disposerAccount()
    }
  }

  handleChange = name => event => {
    if (parseFloat(event.target.value) < 0) {
      return
    }

    this.setState({
      [name]: event.target.value
    })
  }

  onBuyLimitClick = async () => {
    const { eosioStore, accountStore, tradeStore, token } = this.props

    if (!accountStore.isLogin) {
      this.props.alert.show('Please login.')
      return
    }

    let eosBalance = await accountStore.getTokenBalance(EOS_TOKEN.symbol, EOS_TOKEN.contract)
    eosBalance = parseFloat(eosBalance)

    const eosAmount = parseFloat(this.state.buyPrice * this.state.buyQty).toFixed(
      EOS_TOKEN.precision
    )

    if (eosAmount < 0.1) {
      this.props.alert.show('Order is must greater then or equal to 0.1000 EOS.')
      return
    }

    if (eosAmount > eosBalance) {
      this.props.alert.show('Please check your eos balance.')
      return
    }

    const tokenPriceInEos = parseFloat(parseFloat(this.state.buyPrice).toFixed(EOS_TOKEN.precision))
    const tokenQty = parseFloat(parseFloat(this.state.buyQty).toFixed(EOS_TOKEN.precision))

    const memo = {
      type: 'BUY_LIMIT',
      symbol: token.symbol,
      market: 'EOS',
      price: tokenPriceInEos,
      qty: tokenQty,
      amount: eosAmount
    }

    const data = {
      accountName: accountStore.loginAccountInfo.account_name,
      authority: accountStore.permissions[0].perm_name,
      quantity: eosAmount,
      precision: EOS_TOKEN.precision,
      symbol: EOS_TOKEN.symbol,
      memo: JSON.stringify(memo)
    }

    let html = `BUY ${tokenQty} <b>${token.symbol}</b>`
    let successHtml
    let failHtml = '<b>Transaction</b> failed'

    Swal({
      title: 'Confirmation',
      type: 'warning',
      html,
      showCancelButton: true,
      confirmButtonText: 'Confirm',
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        try {
          const result = await eosioStore.buyToken(EOS_TOKEN.contract, data)

          if (result) {
            successHtml =
              'You <b>transaction</b> id is below, ' +
              `<a href=//eospark.com/tx/${result.transaction_id} target=_blank
          rel=noopener noreferrer>${result.transaction_id}</a> `

            this.getPollingOrderByTxId(
              result.transaction_id,
              accountStore.loginAccountInfo.account_name
            )

            await sleep(2000)
            return { isSuccess: true }
          }
        } catch (err) {
          return { err, isSuccess: false }
        }
      },
      allowOutsideClick: () => !Swal.isLoading()
    }).then(result => {
      if (result.value) {
        if (result.value.isSuccess) {
          Swal({
            title: 'Buy Registered!',
            type: 'success',
            html: successHtml
          })
        } else {
          Swal({
            title: 'Failed!',
            type: 'error',
            html: failHtml
          })
        }
      }
    })
  }

  getPollingOrderByTxId = async (txid, account_name) => {
    if (!txid) return
    let isDone = false

    const { tradeStore } = this.props
    const { getPollingOrder, setOrdersHistoryPage, getOrdersHistory, getOpenOrders } = tradeStore

    const pollingId = setInterval(async () => {
      const pollingOrder = await getPollingOrder(txid)

      if (!isDone && pollingOrder && pollingOrder.data && pollingOrder.data.order) {
        isDone = true
        clearInterval(pollingId)
        const arrivedOrderByTxId = toJS(pollingOrder.data.order)

        if (
          arrivedOrderByTxId.status === ORDER_STATUS_ALL_DEALED ||
          arrivedOrderByTxId.status === ORDER_STATUS_CANCELLED
        ) {
          setOrdersHistoryPage(1)
          getOrdersHistory(account_name)
        } else {
          getOpenOrders(
            account_name,
            JSON.stringify([ORDER_STATUS_NOT_DEAL, ORDER_STATUS_PARTIAL_DEALED])
          )
        }
      }
    }, 1000)
  }

  onBuyMarketClick = async () => {
    const { eosioStore, tradeStore, accountStore, token } = this.props

    if (!accountStore.isLogin) {
      this.props.alert.show('Please login.')
      return
    }

    const eosBalance = await accountStore.getTokenBalance(EOS_TOKEN.symbol, EOS_TOKEN.contract)

    const eosAmount = parseFloat(this.state.buyMarketTotalEos).toFixed(EOS_TOKEN.precision)

    if (eosAmount < 0.1) {
      this.props.alert.show('Order is must greater then or equal to 0.1000 EOS.')
      return
    }

    if (eosAmount > eosBalance) {
      this.props.alert.show('Please check your eos balance.')
      return
    }

    const memo = {
      type: 'BUY_MARKET',
      symbol: token.symbol,
      market: 'EOS',
      price: 0.0,
      qty: 0.0,
      amount: eosAmount
    }

    const data = {
      accountName: accountStore.loginAccountInfo.account_name,
      authority: accountStore.permissions[0].perm_name,
      quantity: eosAmount,
      precision: EOS_TOKEN.precision,
      symbol: EOS_TOKEN.symbol,
      memo: JSON.stringify(memo)
    }

    try {
      const result = await eosioStore.buyToken(EOS_TOKEN.contract, data)

      if (result) {
        this.getPollingOrderByTxId(
          result.transaction_id,
          accountStore.loginAccountInfo.account_name
        )

        const html =
          'You <b>transaction</b> id is below, ' +
          `<a href=//eospark.com/tx/${result.transaction_id} target=_blank
          rel=noopener noreferrer>${result.transaction_id}</a> `

        Swal({
          title: 'Buy Sucess!',
          type: 'success',
          html
        })
      }
    } catch (e) {
      this.handleError(e)
    }
  }

  onSellLimitClick = async () => {
    const { eosioStore, accountStore, tradeStore, token } = this.props

    if (!accountStore.isLogin) {
      this.props.alert.show('Please login.')
      return
    }

    let tokenBalance = await accountStore.getTokenBalance(token.symbol, token.contract)
    tokenBalance = parseFloat(tokenBalance)
    const tokenQty = parseFloat(this.state.sellQty)

    if (tokenQty > tokenBalance) {
      this.props.alert.show('Please check your ' + token.name + ' balance.')
      return
    }

    const tokenPriceInEos = parseFloat(parseFloat(this.state.sellPrice).toFixed(token.precision))
    const eosAmount = parseFloat((tokenPriceInEos * tokenQty).toFixed(token.precision))

    if (eosAmount < 0.1) {
      this.props.alert.show('Order is must greater then or equal to 0.1000 EOS.')
      return
    }

    const memo = {
      type: 'SELL_LIMIT',
      symbol: token.symbol,
      market: 'EOS',
      price: tokenPriceInEos,
      qty: tokenQty,
      amount: eosAmount
    }

    const data = {
      accountName: accountStore.loginAccountInfo.account_name,
      authority: accountStore.permissions[0].perm_name,
      quantity: tokenQty,
      precision: token.precision,
      symbol: token.symbol,
      memo: JSON.stringify(memo)
    }

    let html = `SELL ${tokenQty} <b>${token.symbol}</b>`
    let successHtml
    let failHtml = '<b>Transaction</b> failed'

    Swal({
      title: 'Confirmation',
      type: 'warning',
      html,
      showCancelButton: true,
      confirmButtonText: 'Confirm',
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        try {
          const result = await eosioStore.buyToken(token.contract, data)

          if (result) {
            this.getPollingOrderByTxId(
              result.transaction_id,
              accountStore.loginAccountInfo.account_name
            )

            successHtml =
              'You <b>transaction</b> id is below, ' +
              `<a href=//eospark.com/tx/${result.transaction_id} target=_blank
          rel=noopener noreferrer>${result.transaction_id}</a> `

            await sleep(2000)
            return { isSuccess: true }
          }
        } catch (err) {
          return { err, isSuccess: false }
        }
      },
      allowOutsideClick: () => !Swal.isLoading()
    }).then(result => {
      if (result.value) {
        if (result.value.isSuccess) {
          Swal({
            title: 'Sell Registered!',
            type: 'success',
            html: successHtml
          })
        } else {
          Swal({
            title: 'Failed!',
            type: 'error',
            html: failHtml
          })
        }
      }
    })
  }

  onSellMarketClick = async () => {
    const { eosioStore, accountStore, tradeStore, token } = this.props

    if (!accountStore.isLogin) {
      this.props.alert.show('Please login.')
      return
    }

    const tokenBalance = await accountStore.getTokenBalance(token.symbol, token.contract)
    const tokenQty = parseFloat(this.state.sellQty).toFixed(token.precision)

    if (tokenQty > tokenBalance) {
      this.props.alert.show('Please check your ' + token.name + ' balance.')
      return
    }

    const memo = {
      type: 'SELL_MARKET',
      symbol: token.symbol,
      market: 'EOS',
      price: 0.0,
      qty: parseFloat(tokenQty),
      amount: 0.0
    }

    const data = {
      accountName: accountStore.loginAccountInfo.account_name,
      authority: accountStore.permissions[0].perm_name,
      quantity: tokenQty,
      precision: token.precision,
      symbol: token.symbol,
      memo: JSON.stringify(memo)
    }

    try {
      const result = await eosioStore.buyToken(token.contract, data)

      if (result) {
        this.getPollingOrderByTxId(
          result.transaction_id,
          accountStore.loginAccountInfo.account_name
        )
        const html =
          'You <b>transaction</b> id is below, ' +
          `<a href=//eospark.com/tx/${result.transaction_id} target=_blank
          rel=noopener noreferrer>${result.transaction_id}</a> `

        Swal({
          title: 'Sell Sucess!',
          type: 'success',
          html
        })
        // this.props.alert.show('Success(' + result.transaction_id + ')')
      }
    } catch (e) {
      this.handleError(e)
    }
  }

  handleError = e => {
    if (e.code === SCATTER_ERROR_LOCKED) {
      this.props.alert.show('Scatter is locked.')
    } else if (e.code === SCATTER_ERROR_REJECT_TRANSACTION_BY_USER) {
      this.props.alert.show('Cancelled.')
    } else if (e.code === EOSIO_SERVER_ERROR) {
      if (e.error.code === EOSIO_SERVER_ERROR_CPU_LIMIT) {
        this.props.alert.show('You need more cpu.')
      } else {
        this.props.alert.show(e.error.what)
      }
    }
  }

  onBuySliderChange = value => {
    this.setState({
      buyQty: value
    })
  }

  onSellSliderChange = value => {
    this.setState({
      sellQty: value
    })
  }

  render() {
    const { token, accountStore } = this.props

    return (
      <Tabs selectedIndex={this.state.tabIndex} onSelect={tabIndex => this.setState({ tabIndex })}>
        <TabList>
          <Tab>
            <FormattedMessage id="Limit Order" />
          </Tab>
          {/* <Tab>
            <FormattedMessage id="Market Order" />
          </Tab> */}
        </TabList>

        <OrderTabPanel>
          <Row>
            <Col sm="6">
              <OrderRowPanel style={{ height: '32px' }}>
                <PrimaryOrderColPanel sm="5" buy="true">
                  <FormattedMessage id="Available" />
                </PrimaryOrderColPanel>
                <RightAlignCol sm="7">{`${accountStore.liquid.toFixed(4)} EOS`}</RightAlignCol>
              </OrderRowPanel>
              <OrderRowPanel>
                <OrderColPanel sm="3">
                  <FormattedMessage id="Price" />
                </OrderColPanel>
                <Col sm="9">
                  <InputGroup>
                    <OrderInput
                      type="number"
                      value={this.state.buyPrice}
                      onChange={this.handleChange('buyPrice')}
                      step="1"
                    />
                    <InputGroupAddon addonType="append">EOS</InputGroupAddon>
                  </InputGroup>
                </Col>
              </OrderRowPanel>
              <OrderRowPanel>
                <OrderColPanel sm="3">
                  <FormattedMessage id="Amount" />
                </OrderColPanel>
                <Col sm="9">
                  <InputGroup style={{ width: '100%' }}>
                    <OrderInput
                      placeholder="Amount"
                      type="number"
                      step="1"
                      onChange={this.handleChange('buyQty')}
                      value={this.state.buyQty}
                    />
                    <InputGroupAddon addonType="append">{token.symbol}</InputGroupAddon>
                  </InputGroup>
                </Col>
              </OrderRowPanel>

              <OrderRowPanel>
                <OrderColPanel sm="3" />
                <Col sm="9">
                  <div style={{ width: '100%' }}>
                    <HandSlider
                      value={this.state.buyQty}
                      min={0}
                      max={Math.floor(accountStore.liquid / this.state.buyPrice)}
                      onChange={v => this.onBuySliderChange(v)}
                      railStyle={railStyle}
                      trackStyle={trackStyle}
                      handleStyle={handleStyle}
                    />
                  </div>
                </Col>
              </OrderRowPanel>

              <OrderAmountRow>
                <FormattedMessage id="TOTAL" />
                {' : '}
                {(this.state.buyPrice * this.state.buyQty).toFixed(EOS_TOKEN.precision)}
                {' EOS'}

                <Popup
                  trigger={<InfoIcon className={'ion-ios-information'} />}
                  position="top center"
                  on="hover">
                  <div>
                    <FormattedMessage id="Taker Fee" />
                    {' : '}
                    {(token.taker_fee * 100).toFixed(1)} %
                  </div>
                </Popup>
              </OrderAmountRow>

              <OrderRowPanel>
                <OrderColPanel sm="3" />
                <Col sm="9">
                  <OrderButton onClick={this.onBuyLimitClick} color={ColorsConstant.Thick_green}>
                    <FormattedMessage id="BUY" />
                  </OrderButton>
                </Col>
              </OrderRowPanel>
            </Col>

            <Col sm="6">
              <OrderRowPanel style={{ height: '32px' }}>
                <PrimaryOrderColPanel sm="5" sell="true">
                  <FormattedMessage id="Available" />
                </PrimaryOrderColPanel>
                <RightAlignCol sm="7">
                  {this.state.tokenBalance} {token.symbol}
                </RightAlignCol>
              </OrderRowPanel>
              <OrderRowPanel>
                <OrderColPanel sm="3">
                  <FormattedMessage id="Price" />
                </OrderColPanel>
                <Col sm="9">
                  <InputGroup>
                    <OrderInput
                      type="number"
                      onChange={this.handleChange('sellPrice')}
                      value={this.state.sellPrice}
                      step="1"
                    />
                    <InputGroupAddon addonType="append">EOS</InputGroupAddon>
                  </InputGroup>
                </Col>
              </OrderRowPanel>
              <OrderRowPanel>
                <OrderColPanel sm="3">
                  <FormattedMessage id="Amount" />
                </OrderColPanel>
                <Col sm="9">
                  <InputGroup style={{ width: '100%' }}>
                    <OrderInput
                      placeholder="Amount"
                      type="number"
                      step="1"
                      onChange={this.handleChange('sellQty')}
                      value={this.state.sellQty}
                    />
                    <InputGroupAddon addonType="append">{token.symbol}</InputGroupAddon>
                  </InputGroup>
                </Col>
              </OrderRowPanel>

              <OrderRowPanel>
                <OrderColPanel sm="3" />
                <Col sm="9">
                  <div style={{ width: '100%' }}>
                    <HandSlider
                      value={this.state.sellQty}
                      min={0}
                      max={Math.floor(this.state.tokenBalance)}
                      onChange={v => this.onSellSliderChange(v)}
                      railStyle={railStyle}
                      trackStyle={trackStyle}
                      handleStyle={handleStyle}
                    />
                  </div>
                </Col>
              </OrderRowPanel>

              <OrderAmountRow>
                <div>
                  <FormattedMessage id="TOTAL" />
                  {' : '}
                  {(this.state.sellPrice * this.state.sellQty).toFixed(EOS_TOKEN.precision)}
                  {' EOS'}
                  <Popup
                    trigger={<InfoIcon className={'ion-ios-information'} />}
                    position="top center"
                    on="hover">
                    <div>
                      <FormattedMessage id="Maker Fee" />
                      {' : '}
                      {(token.maker_fee * 100).toFixed(1)} %
                    </div>
                  </Popup>
                </div>
              </OrderAmountRow>
              <OrderRowPanel>
                <OrderColPanel sm="3" />
                <Col sm="9">
                  <OrderButton onClick={this.onSellLimitClick} color={ColorsConstant.Thick_red}>
                    <FormattedMessage id="SELL" />
                  </OrderButton>
                </Col>
              </OrderRowPanel>
            </Col>
          </Row>
        </OrderTabPanel>

        {/* <OrderTabPanel>
          <Row>
            <Col sm="6">
              <OrderRowPanel>
                <PrimaryOrderColPanel sm="1" />
                <PrimaryOrderColPanel sm="5" buy="true">
                  <FormattedMessage id="Available" />
                </PrimaryOrderColPanel>
                <RightAlignCol sm="6">{`${accountStore.liquid.toFixed(4)} EOS`}</RightAlignCol>
              </OrderRowPanel>
              <OrderRowPanel>
                <OrderColPanel sm="3">
                  <FormattedMessage id="Amount" />
                </OrderColPanel>
                <Col sm="9">
                  <InputGroup style={{ width: '100%' }}>
                    <OrderInput
                      placeholder="Amount"
                      type="number"
                      step="1"
                      onChange={this.handleChange('buyMarketTotalEos')}
                      value={this.state.buyMarketTotalEos}
                    />
                    <InputGroupAddon addonType="append">EOS</InputGroupAddon>
                  </InputGroup>
                </Col>
              </OrderRowPanel>
              <OrderRowPanel>
                <OrderColPanel sm="3" />
                <Col sm="9">
                  <OrderButton onClick={this.onBuyMarketClick} color={ColorsConstant.Thick_green}>
                    <FormattedMessage id="BUY" />
                  </OrderButton>
                </Col>
              </OrderRowPanel>
            </Col>
            <Col sm="6">
              <OrderRowPanel>
                <PrimaryOrderColPanel sm="1" />
                <PrimaryOrderColPanel sm="5" sell>
                  <FormattedMessage id="Available" />
                </PrimaryOrderColPanel>
                <RightAlignCol sm="6">
                  {this.state.tokenBalance} {token.symbol}
                </RightAlignCol>
              </OrderRowPanel>
              <OrderRowPanel>
                <OrderColPanel sm="3">
                  <FormattedMessage id="Amount" />
                </OrderColPanel>
                <Col sm="9">
                  <InputGroup style={{ width: '100%' }}>
                    <OrderInput
                      placeholder="Amount"
                      type="number"
                      step="1"
                      onChange={this.handleChange('sellMarketAmount')}
                      value={this.state.sellMarketAmount}
                    />
                    <InputGroupAddon addonType="append">{token.symbol}</InputGroupAddon>
                  </InputGroup>
                </Col>
              </OrderRowPanel>
              <OrderRowPanel>
                <OrderColPanel sm="3" />
                <Col sm="9">
                  <OrderButton onClick={this.onSellMarketClick} color={ColorsConstant.Thick_red}>
                    <FormattedMessage id="SELL" />
                  </OrderButton>
                </Col>
              </OrderRowPanel>
            </Col>
          </Row>
        </OrderTabPanel> */}
      </Tabs>
    )
  }
}

export default withAlert(Order)
