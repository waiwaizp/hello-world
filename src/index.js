import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'mobx-react'
import { IntlProvider, addLocaleData } from 'react-intl'
import initLocale, { getUserLocale } from 'react-intl-locale'
import { CookiesProvider } from 'react-cookie'
import en from 'react-intl/locale-data/en'
import ko from 'react-intl/locale-data/ko'
import locale from './locales/locale'

import * as Utils from './utils/Utils'
import * as Values from './constants/Values'

import 'bootstrap/dist/css/bootstrap.css'
import 'ionicons/css/ionicons.css'

import eosAgent from './EosAgent'
import RootStore from './stores'
import { Provider as AlertProvider } from 'react-alert'
import AlertTemplate from 'react-alert-template-basic'

import App from './App'
import './index.scss'

const alertOptions = {
  position: 'bottom center',
  timeout: 5000,
  offset: '30px',
  transition: 'scale'
}

initLocale('en-US', Values.supportLanguage.slice())
addLocaleData([...en, ...ko])

const root = new RootStore()
const lang = Utils.getJsonFromUrl().ln

let i18nLang

if (lang) {
  i18nLang = lang.split('-')[0]
  localStorage.setItem('locale', lang)
} else {
  const savedLocale = localStorage.getItem('locale')

  if (savedLocale) {
    i18nLang = savedLocale.split('-')[0]
  } else {
    const userLocale = getUserLocale()
    i18nLang = userLocale.split('-')[0]
  }
}

document.addEventListener('scatterLoaded', async scatterExtension => {
  console.log('scatterloaded')

  if (window.scatter) {
    eosAgent.initScatter(window.scatter)

    if (window.scatter.identity) {
      //eosAgent.initEosAgent(window.scatter.identity)
      await root.accountStore.login()
    }
  }
})

ReactDOM.render(
  <Provider {...root}>
    <IntlProvider key={i18nLang} locale={i18nLang} messages={locale[i18nLang]}>
      <AlertProvider template={AlertTemplate} {...alertOptions}>
        <CookiesProvider>
          <App />
        </CookiesProvider>
      </AlertProvider>
    </IntlProvider>
  </Provider>,
  document.getElementById('app')
)
