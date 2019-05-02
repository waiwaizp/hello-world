import React, { PureComponent, Fragment } from 'react'
import NumberFormat from 'react-number-format'
import { FormattedMessage } from 'react-intl'
import styled from 'styled-components'
import { getTodayNoon } from '../../utils/timezoneHelper'
import ColorsConstant from '../Colors/ColorsConstant'
import { EOS_TOKEN } from '../../constants/Values'

const TokenInfoTitle = styled.h6`
  font-size: 1.35rem;
  text-align: center;
  padding: 0;
  margin: 0;
`

const TokenSymbolText = styled.small`
  font-size: 1.5rem;
  color: ${props =>
    props.up
      ? ColorsConstant.Thick_green
      : props.down
      ? ColorsConstant.Thick_red
      : ColorsConstant.Thick_normal};
`

class TokenInfo extends PureComponent {
  componentDidMount = async () => {
    const { symbol, marketStore } = this.props

    await marketStore.getTokenBySymbol(symbol, getTodayNoon().getTime())
  }

  render() {
    const { marketStore, height } = this.props
    const token = marketStore.token ? marketStore.token.data.token : null
    const todayChanged = token ? token.last_price - token.last_day_price : 0.0

    return (
      <Fragment>
        {token && (
          <div
            style={{
              height,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around'
            }}>
            <div>
              <TokenInfoTitle>
                <FormattedMessage id="Last Price" />
              </TokenInfoTitle>
              <TokenSymbolText
                up={token.last_price - token.last_previous_price > 0}
                down={token.last_price - token.last_previous_price < 0}>
                <NumberFormat
                  displayType={'text'}
                  suffix=" EOS"
                  value={token.last_price}
                  fixedDecimalScale={true}
                  decimalScale={EOS_TOKEN.precision}
                />
              </TokenSymbolText>
            </div>
            <div>
              <TokenInfoTitle>
                <FormattedMessage id="Today Changed" />
              </TokenInfoTitle>
              <TokenSymbolText up={todayChanged > 0} down={todayChanged < 0}>
                <NumberFormat
                  displayType={'text'}
                  suffix=" EOS"
                  value={todayChanged}
                  fixedDecimalScale={true}
                  decimalScale={EOS_TOKEN.precision}
                />
              </TokenSymbolText>
            </div>
            <div>
              <TokenInfoTitle>
                <FormattedMessage id="Today High" />
              </TokenInfoTitle>
              <TokenSymbolText>
                <NumberFormat
                  displayType={'text'}
                  suffix=" EOS"
                  value={token.high_price_24h}
                  fixedDecimalScale={true}
                  decimalScale={EOS_TOKEN.precision}
                />
              </TokenSymbolText>
            </div>
            <div>
              <TokenInfoTitle>
                <FormattedMessage id="Today Low" />
              </TokenInfoTitle>
              <TokenSymbolText>
                <NumberFormat
                  displayType={'text'}
                  suffix=" EOS"
                  value={token.low_price_24h}
                  fixedDecimalScale={true}
                  decimalScale={EOS_TOKEN.precision}
                />
              </TokenSymbolText>
            </div>
            <div>
              <TokenInfoTitle>
                <FormattedMessage id="Today Volume" />
              </TokenInfoTitle>
              <TokenSymbolText>
                <NumberFormat
                  displayType={'text'}
                  suffix=" EOS"
                  value={token.volume_24h}
                  thousandSeparator={true}
                  fixedDecimalScale={true}
                  decimalScale={EOS_TOKEN.precision}
                />
              </TokenSymbolText>
            </div>
          </div>
        )}
      </Fragment>
    )
  }
}

export default TokenInfo
